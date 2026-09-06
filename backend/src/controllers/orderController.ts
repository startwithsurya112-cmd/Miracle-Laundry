import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order, { OrderStatus, PaymentStatus } from '../models/Order';
import Customer from '../models/Customer';
import Payment from '../models/Payment';
import Setting from '../models/Setting';
import Shop from '../models/Shop';
import { AuthRequest } from '../middleware/auth';
import { generateOrderNumber } from '../utils/orderNumberGenerator';
import { generateQRCodeDataUrl } from '../utils/qrGenerator';
import { sendAutomatedWhatsAppMessage, sendAutomatedWhatsAppDocument } from '../services/whatsappGateway';
import { generateInvoicePDFBuffer } from '../utils/pdfGenerator';

export const getPublicOrderByNumber = async (req: Request, res: Response) => {
  try {
    let orderNum = (req.query.r as string) || (req.query.orderNumber as string) || req.params.orderNumber || (req.params as any)[0];

    if (!orderNum && req.url) {
      orderNum = req.url.replace(/^\/(public-receipt|public)\/?/, '').split('?')[0];
    }

    if (orderNum) {
      orderNum = decodeURIComponent(orderNum).replace(/^\/+/, '').trim();
    }

    if (!orderNum) {
      return res.status(400).json({ success: false, message: 'Order number is required' });
    }

    let order = await Order.findOne({ orderNumber: orderNum }).populate('shopId');
    if (!order) {
      order = await Order.findOne({ orderNumber: new RegExp('^' + orderNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }).populate('shopId');
    }
    if (!order) {
      const digits = orderNum.replace(/\D/g, '');
      if (digits) {
        order = await Order.findOne({ orderNumber: new RegExp(digits + '(/|$)') }).populate('shopId');
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    const payments = await Payment.find({ orderId: order._id }).sort({ paidAt: -1 });
    res.json({ success: true, order, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, paymentStatus, search, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let query: any = {};

    if (req.targetShopId) {
      query.shopId = req.targetShopId;
    }

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { 'customerSnapshot.name': searchRegex },
        { 'customerSnapshot.mobile': searchRegex },
      ];
    }

    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) query.orderDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.orderDate.$lte = new Date(dateTo as string);
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('customer', 'name mobile address email')
      .populate('shopId', 'name code region phone')
      .sort({ orderDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    let query: any = { _id: req.params.id };
    if (req.targetShopId) {
      query.shopId = req.targetShopId;
    }
    const order = await Order.findOne(query).populate('customer').populate('shopId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const payments = await Payment.find({ orderId: order._id }).sort({ paidAt: -1 });

    res.json({ success: true, order, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerId,
      newCustomer,
      items,
      expectedDeliveryDate,
      discount = 0,
      taxPercent = 0,
      advancePaid = 0,
      paymentMethod = 'Pending',
      notes = '',
      shopId,
    } = req.body;

    let assignedShopId = req.user?.role === 'super_admin' ? (req.targetShopId || shopId || null) : req.targetShopId;

    if (!assignedShopId) {
      const defaultShop = await Shop.findOne({ isActive: true }).sort({ createdAt: 1 });
      if (defaultShop) {
        assignedShopId = defaultShop._id.toString();
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one laundry item is required' });
    }

    let customerObj: any = null;

    const custData = newCustomer || req.body.customerSnapshot;

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      customerObj = await Customer.findById(customerId);
    }
    
    if (!customerObj && custData && (custData.name || custData.mobile)) {
      const mob = custData.mobile || '9876543210';
      let existing = await Customer.findOne({ mobile: mob });
      if (existing) {
        customerObj = existing;
      } else {
        customerObj = new Customer({
          shopId: assignedShopId,
          name: custData.name || 'Walk-in Customer',
          mobile: mob,
          address: custData.address || 'Local',
          email: custData.email || '',
        });
        await customerObj.save();
      }
    }

    if (!customerObj) {
      let existing = await Customer.findOne({ mobile: '9876543210' });
      if (existing) {
        customerObj = existing;
      } else {
        customerObj = new Customer({
          shopId: assignedShopId,
          name: 'Walk-in Customer',
          mobile: '9876543210',
          address: 'Local Shop',
        });
        await customerObj.save();
      }
    }

    // Process items & subtotal
    const processedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      return {
        itemId: item.itemId ? String(item.itemId) : undefined,
        itemName: item.itemName || 'Laundry Item',
        serviceId: item.serviceId ? String(item.serviceId) : undefined,
        serviceName: item.serviceName || 'Wash & Press',
        quantity: qty,
        unitPrice: price,
        subtotal: item.subtotal !== undefined && item.subtotal !== null ? Number(item.subtotal) : Math.round(qty * price),
      };
    });

    const subtotal = processedItems.reduce((acc: number, item: any) => acc + item.subtotal, 0);
    const disc = Number(discount) || 0;
    const taxPct = Number(taxPercent) || 0;
    const taxableAmount = Math.max(0, subtotal - disc);
    const taxAmount = (taxableAmount * taxPct) / 100;
    const totalAmount = Math.round(taxableAmount + taxAmount);

    const advPaid = Number(advancePaid) || 0;
    const remainingBalance = Math.max(0, totalAmount - advPaid);

    let paymentStatus: PaymentStatus = 'Pending';
    if (advPaid >= totalAmount) {
      paymentStatus = 'Paid';
    } else if (advPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    const orderNumber = await generateOrderNumber(assignedShopId);

    // QR Content for digital receipt
    const qrData = JSON.stringify({
      orderNumber,
      customer: customerObj.name,
      mobile: customerObj.mobile,
      totalAmount,
      balance: remainingBalance,
    });
    const qrCodeUrl = await generateQRCodeDataUrl(qrData);

    const deliveryDate = expectedDeliveryDate
      ? new Date(expectedDeliveryDate)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const order = new Order({
      orderNumber,
      shopId: assignedShopId,
      customer: customerObj._id,
      customerSnapshot: {
        name: customerObj.name,
        mobile: customerObj.mobile,
        address: customerObj.address,
        email: customerObj.email,
      },
      items: processedItems,
      status: 'Received',
      statusHistory: [
        {
          status: 'Received',
          timestamp: new Date(),
          note: 'Order created & received in shop',
        },
      ],
      orderDate: new Date(),
      expectedDeliveryDate: deliveryDate,
      discount: disc,
      taxPercent: taxPct,
      taxAmount,
      subtotal,
      totalAmount,
      advancePaid: advPaid,
      remainingBalance,
      paymentStatus,
      paymentMethod: advPaid > 0 ? paymentMethod : 'Pending',
      notes,
      qrCodeUrl,
    });

    await order.save();

    // Update Customer statistics
    customerObj.totalOrders += 1;
    customerObj.totalSpent += totalAmount;
    await customerObj.save();

    // Record initial payment if advance paid
    if (advPaid > 0) {
      const payment = new Payment({
        shopId: assignedShopId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: customerObj._id,
        customerName: customerObj.name,
        amount: advPaid,
        paymentMethod: paymentMethod === 'Pending' ? 'Cash' : paymentMethod,
        note: 'Advance Payment',
        paidAt: new Date(),
      });
      await payment.save();
    }


    // Automated Background WhatsApp Notification on Order Creation
    if (customerObj && customerObj.mobile) {
      const receiptUrl = `https://intellingentlaundry-1.onrender.com/receipt/${order.orderNumber}?r=${order.orderNumber}`;
      const msg = `Hello *${customerObj.name}*,\n\nYour official laundry invoice & receipt for Order *#${order.orderNumber}* is ready!\n\n📋 *Invoice Summary*:\n• Order Date: ${new Date(order.orderDate).toLocaleDateString('en-GB')}\n• Status: ${order.status}\n• Total Amount: ₹${order.totalAmount}\n• Advance Paid: ₹${order.advancePaid}\n• Remaining Balance: ₹${order.remainingBalance}\n\n🔗 *View & Print Invoice Directly*:\n${receiptUrl}\n\nThank you for choosing Intelligent Laundry!`;
      sendAutomatedWhatsAppMessage(customerObj.mobile, msg);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && order.shopId && String(order.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this order belongs to another branch.' });
    }

    const validStatuses: OrderStatus[] = [
      'Received',
      'Washing',
      'Drying',
      'Ironing',
      'Packing',
      'Ready for Delivery',
      'Ready for Pickup',
      'Delivered',
      'Cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    order.status = status;
    if (status.toLowerCase() === 'delivered') {
      order.deliveredAt = new Date();
    }

    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`,
    });

    await order.save();

    // Automated Background WhatsApp Invoice Delivery on Order Completion / Delivery
    let whatsappSent = false;
    let whatsappMsg = '';

    if (status.toLowerCase() === 'delivered') {
      let mobile = order.customerSnapshot?.mobile;
      if (!mobile && order.customer) {
        const cust = await Customer.findById(order.customer);
        if (cust) mobile = cust.mobile;
      }

      if (mobile) {
        try {
          const setting = await Setting.findOne();

          // Send ONLY the PDF document attachment over WhatsApp
          const pdfBuffer = await generateInvoicePDFBuffer(order, setting);
          const fileName = `Invoice_${order.orderNumber.replace(/[\/\\]/g, '_')}.pdf`;
          whatsappSent = await sendAutomatedWhatsAppDocument(mobile, pdfBuffer, fileName);

          if (whatsappSent) {
            whatsappMsg = `Invoice PDF sent automatically to +${mobile} via WhatsApp!`;
          } else {
            whatsappMsg = `WhatsApp gateway is not connected. Connect in Settings to send automated PDF invoices.`;
          }
          console.log(`[WhatsApp Order Delivered PDF]: ${whatsappMsg}`);
        } catch (pdfErr: any) {
          console.error('[WhatsApp Delivered PDF Error]:', pdfErr.message);
          whatsappMsg = `PDF Error: ${pdfErr.message}`;
        }
      } else {
        whatsappMsg = `No mobile number found for order ${order.orderNumber}`;
        console.log(`[WhatsApp Order Delivered PDF]: ${whatsappMsg}`);
      }
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
      whatsappSent,
      whatsappMsg,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendOrderWhatsAppPDF = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && order.shopId && String(order.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this order belongs to another branch.' });
    }

    let mobile = order.customerSnapshot?.mobile;
    if (!mobile && order.customer) {
      const cust = await Customer.findById(order.customer);
      if (cust) mobile = cust.mobile;
    }

    if (!mobile) {
      return res.status(400).json({ success: false, message: 'No mobile number found for this order' });
    }

    const setting = await Setting.findOne();
    const shop = order.shopId ? await Shop.findById(order.shopId) : null;
    const pdfBuffer = await generateInvoicePDFBuffer(order, setting, shop);
    const fileName = `Invoice_${order.orderNumber.replace(/[\/\\]/g, '_')}.pdf`;

    const sent = await sendAutomatedWhatsAppDocument(mobile, pdfBuffer, fileName);

    if (sent) {
      res.json({ success: true, message: `PDF Invoice sent successfully to +${mobile} over WhatsApp!` });
    } else {
      res.status(400).json({ success: false, message: 'WhatsApp Gateway is not connected. Scan QR code in Settings.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderPDF = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && order.shopId && String(order.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this order belongs to another branch.' });
    }

    const setting = await Setting.findOne();
    const shop = order.shopId ? await Shop.findById(order.shopId) : null;
    const pdfBuffer = await generateInvoicePDFBuffer(order, setting, shop);
    const fileName = `Invoice_${order.orderNumber.replace(/[\/\\]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordOrderPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, paymentMethod, transactionId, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && order.shopId && String(order.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this order belongs to another branch.' });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid positive payment amount' });
    }

    const newAdvance = order.advancePaid + payAmount;
    order.advancePaid = newAdvance;
    order.remainingBalance = Math.max(0, order.totalAmount - newAdvance);

    if (order.remainingBalance === 0) {
      order.paymentStatus = 'Paid';
    } else {
      order.paymentStatus = 'Partially Paid';
    }
    order.paymentMethod = paymentMethod;

    await order.save();

    const payment = new Payment({
      shopId: order.shopId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customer,
      customerName: order.customerSnapshot.name,
      amount: payAmount,
      paymentMethod,
      transactionId: transactionId || '',
      note: note || 'Subsequent Payment',
      paidAt: new Date(),
    });
    await payment.save();

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      order,
      payment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && order.shopId && String(order.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this order belongs to another branch.' });
    }

    await Order.findByIdAndDelete(req.params.id);
    await Payment.deleteMany({ orderId: req.params.id });

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, status, paymentStatus, paymentMethod, advancePaid, expectedDeliveryDate, notes, discount } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && order.shopId && String(order.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this order belongs to another branch.' });
    }

    if (items && Array.isArray(items)) {
      order.items = items;
      const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.subtotal) || Number(item.price || 0) * Number(item.quantity || 1)), 0);
      const disc = Number(discount !== undefined ? discount : order.discount || 0);
      order.discount = disc;
      order.subtotal = subtotal;
      order.totalAmount = Math.max(0, subtotal - disc);
    } else if (discount !== undefined) {
      const disc = Number(discount);
      order.discount = disc;
      order.totalAmount = Math.max(0, order.subtotal - disc);
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (advancePaid !== undefined) order.advancePaid = Number(advancePaid);
    if (expectedDeliveryDate) order.expectedDeliveryDate = new Date(expectedDeliveryDate);
    if (notes !== undefined) order.notes = notes;

    order.remainingBalance = Math.max(0, order.totalAmount - order.advancePaid);

    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
