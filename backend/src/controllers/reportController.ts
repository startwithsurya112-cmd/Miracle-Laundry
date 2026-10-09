import { Request, Response } from 'express';
import Order from '../models/Order';
import Customer from '../models/Customer';
import Service from '../models/Service';
import Payment from '../models/Payment';
import Expense from '../models/Expense';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const {
      preset,
      paymentStatus,
      status,
      dateType = 'orderDate',
      dateFrom,
      dateTo,
    } = req.query;

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (preset === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (preset === 'current_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'current_month' || preset === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'current_year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (preset === 'last_7_days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === 'last_30_days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === 'last_365_days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 365);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (dateFrom || dateTo) {
      if (dateFrom) {
        startDate = new Date(dateFrom as string);
        startDate.setHours(0, 0, 0, 0);
      }
      if (dateTo) {
        endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // Build filter query for orders
    let orderQuery: any = {};

    if (paymentStatus) {
      orderQuery.paymentStatus = paymentStatus;
    }

    if (status) {
      orderQuery.status = status;
    }

    const field = dateType === 'expectedDeliveryDate' ? 'expectedDeliveryDate' : 'orderDate';
    if (startDate || endDate) {
      orderQuery[field] = {};
      if (startDate) orderQuery[field].$gte = startDate;
      if (endDate) orderQuery[field].$lte = endDate;
    }

    // 1. Total Orders List & Count
    const totalOrdersCount = await Order.countDocuments(orderQuery);
    const ordersList = await Order.find(orderQuery).sort({ orderDate: -1, createdAt: -1 }).lean();

    // 2. Payments Received List & Total
    let paymentMatch: any = {};
    if (startDate || endDate) {
      paymentMatch.paidAt = {};
      if (startDate) paymentMatch.paidAt.$gte = startDate;
      if (endDate) paymentMatch.paidAt.$lte = endDate;
    }
    let paymentsList = await Payment.find(paymentMatch).sort({ paidAt: -1 }).lean();
    const periodPayments = await Payment.aggregate([
      { $match: paymentMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const periodRevenue = periodPayments[0]?.total || 0;

    // 3. Active Orders List & Count (Respects active date filter if selected)
    const activeQuery: any = {
      ...orderQuery,
      status: { $in: ['Received', 'Washing', 'Drying', 'Ironing', 'Packing', 'Ready for Delivery', 'Ready for Pickup'] },
    };

    const activeOrdersCount = await Order.countDocuments(activeQuery);
    const activeOrdersList = await Order.find(activeQuery).sort({ orderDate: -1, createdAt: -1 }).lean();

    // 4. New Customers List & Count
    let customerQuery: any = {};
    if (startDate || endDate) {
      customerQuery.createdAt = {};
      if (startDate) customerQuery.createdAt.$gte = startDate;
      if (endDate) customerQuery.createdAt.$lte = endDate;
    }
    const newCustomersCount = await Customer.countDocuments(customerQuery);
    const newCustomersList = await Customer.find(customerQuery).sort({ createdAt: -1, _id: -1 }).lean();

    // 5. Overdue Orders List & Count (Respects active date filter if selected)
    const overdueQuery: any = {
      ...orderQuery,
      status: { $nin: ['Delivered', 'Cancelled'] },
    };

    const overdueOrdersCount = await Order.countDocuments(overdueQuery);
    const overdueOrdersList = await Order.find(overdueQuery).sort({ expectedDeliveryDate: 1 }).lean();

    // 6. Delivered Orders List, Count & Delivered Income (Actual Money Collected on Delivered Orders)
    const deliveredQuery: any = {
      ...orderQuery,
      status: { $regex: /^delivered$/i },
    };

    const deliveredOrdersCount = await Order.countDocuments(deliveredQuery);
    const deliveredOrdersList = await Order.find(deliveredQuery).sort({ deliveredAt: -1, orderDate: -1 }).lean();
    
    // Sum only actual money collected on delivered orders (deducting unpaid balance)
    const deliveredRevenue = deliveredOrdersList.reduce((sum, ord: any) => {
      const paid = ord.paymentStatus === 'Paid' ? Number(ord.totalAmount || 0) : Number(ord.advancePaid || 0);
      return sum + paid;
    }, 0);

    // Calculate revenue from payments & order totals
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const [todayPayments, todayOrdersSum] = await Promise.all([
      Payment.aggregate([
        { $match: { paidAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Order.aggregate([
        { $match: { orderDate: { $gte: todayStart, $lte: todayEnd } } },
        {
          $group: {
            _id: null,
            totalAdv: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', '$advancePaid']
              }
            }
          }
        },
      ]),
    ]);
    
    const todayPayTotal = todayPayments[0]?.total || 0;
    const todayAdvTotal = todayOrdersSum[0]?.totalAdv || 0;
    const todayRevenue = todayPayTotal > 0 ? todayPayTotal : todayAdvTotal;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const [monthPayments, monthOrdersSum] = await Promise.all([
      Payment.aggregate([
        { $match: { paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Order.aggregate([
        { $match: { orderDate: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            totalAdv: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', '$advancePaid']
              }
            }
          }
        },
      ]),
    ]);
    
    const monthPayTotal = monthPayments[0]?.total || 0;
    const monthAdvTotal = monthOrdersSum[0]?.totalAdv || 0;
    const monthlyRevenue = monthPayTotal > 0 ? monthPayTotal : monthAdvTotal;

    const periodRev = periodRevenue > 0 ? periodRevenue : todayRevenue;

    // If paymentsList is empty, derive payment records strictly from orders with collected money > 0
    if (paymentsList.length === 0 && ordersList.length > 0) {
      paymentsList = ordersList
        .filter((o) => o.paymentStatus === 'Paid' || o.advancePaid > 0)
        .map((o) => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          customerName: o.customerSnapshot?.name || 'Customer',
          paymentMethod: o.paymentMethod || 'Cash',
          paidAt: o.orderDate,
          amount: o.paymentStatus === 'Paid' ? o.totalAmount : o.advancePaid,
        })) as any;
    }

    res.json({
      success: true,
      stats: {
        totalOrders: totalOrdersCount,
        orders: totalOrdersCount,
        paymentsReceived: periodRev,
        activeOrders: activeOrdersCount,
        newCustomers: newCustomersCount,
        overdueOrders: overdueOrdersCount,
        todayOrders: totalOrdersCount,
        pendingOrders: activeOrdersCount,
        inProgress: activeOrdersCount,
        readyForPickup: activeOrdersCount,
        deliveredOrders: deliveredOrdersCount,
        deliveredRevenue: deliveredRevenue,
        todayRevenue,
        monthlyRevenue,
        periodRevenue: periodRev,
        totalCustomers: newCustomersCount,
      },
      ordersList,
      paymentsList,
      activeOrdersList,
      deliveredOrdersList,
      newCustomersList,
      overdueOrdersList,
      pendingReminders: overdueOrdersList,
      recentOrders: ordersList,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const { period = '30days', preset } = req.query;
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    const activePreset = (preset as string) || (period as string);

    if (activePreset === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (activePreset === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else if (activePreset === '12months' || activePreset === 'current_year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (activePreset === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (activePreset === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (activePreset === 'last_3_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (activePreset === 'all') {
      startDate = new Date(2020, 0, 1);
    } else {
      startDate.setDate(now.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    // 1. Daily Chart Data: Group payments or orders by date
    let chartData = await Payment.aggregate([
      { $match: { paidAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    if (chartData.length === 0) {
      chartData = await Order.aggregate([
        { $match: { orderDate: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
            revenue: { $sum: { $cond: [{ $gt: ['$advancePaid', 0] }, '$advancePaid', '$totalAmount'] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    // 2. Service Breakdown
    let serviceBreakdown = await Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.serviceName',
          totalAmount: { $sum: '$items.subtotal' },
          itemCount: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // 3. Top Customers
    const topCustomers = await Customer.find().sort({ totalSpent: -1 }).limit(10);

    res.json({
      success: true,
      chartData: chartData.map((d) => ({ date: d._id, revenue: d.revenue, count: d.count })),
      serviceBreakdown: serviceBreakdown.map((s) => ({
        service: s._id || 'Standard Wash',
        amount: s.totalAmount,
        quantity: s.itemCount,
      })),
      topCustomers,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfitAndLossReport = async (req: Request, res: Response) => {
  try {
    const { preset = 'current_month', dateFrom, dateTo } = req.query;

    const now = new Date();
    let startDate: Date = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    let endDate: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (preset === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (preset === 'last_3_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'current_year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (preset === 'all') {
      startDate = new Date(2020, 0, 1);
      endDate = new Date();
    } else if (dateFrom || dateTo) {
      if (dateFrom) {
        startDate = new Date(dateFrom as string);
        startDate.setHours(0, 0, 0, 0);
      }
      if (dateTo) {
        endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // 1. Calculate Gross Payments Revenue within period
    const payments = await Payment.find({
      paidAt: { $gte: startDate, $lte: endDate },
    }).lean();

    let grossRevenue = 0;
    let cashIncome = 0;
    let upiIncome = 0;
    let cardIncome = 0;

    payments.forEach((p) => {
      grossRevenue += p.amount || 0;
      if (p.paymentMethod === 'Cash') cashIncome += p.amount || 0;
      else if (p.paymentMethod === 'UPI') upiIncome += p.amount || 0;
      else if (p.paymentMethod === 'Card') cardIncome += p.amount || 0;
    });

    // Fallback if no payment models, calculate from orders
    if (grossRevenue === 0) {
      const orders = await Order.find({
        orderDate: { $gte: startDate, $lte: endDate },
      }).lean();
      orders.forEach((o: any) => {
        const amt = o.paymentStatus === 'Paid' ? (o.totalAmount || 0) : (o.advancePaid || 0);
        grossRevenue += amt;
        if (o.paymentMethod === 'Cash') cashIncome += amt;
        else if (o.paymentMethod === 'UPI') upiIncome += amt;
        else if (o.paymentMethod === 'Card') cardIncome += amt;
        else cashIncome += amt;
      });
    }

    // 2. Calculate Operating Expenses within period
    const expenses = await Expense.find({
      expenseDate: { $gte: startDate, $lte: endDate },
    }).lean();

    let totalExpenses = 0;
    let cashExpenses = 0;
    let bankExpenses = 0;
    const categoryTotals: { [key: string]: number } = {};

    expenses.forEach((e) => {
      totalExpenses += e.amount || 0;
      if (e.paymentMethod === 'Cash') cashExpenses += e.amount || 0;
      else bankExpenses += e.amount || 0;

      const cat = e.category || 'Miscellaneous';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
    });

    // 3. Compute Net Profit & Margin
    const netProfit = grossRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? Number(((netProfit / grossRevenue) * 100).toFixed(1)) : 0;

    // 4. Expense Breakdown List
    const expenseBreakdown = Object.keys(categoryTotals).map((cat) => ({
      category: cat,
      amount: categoryTotals[cat],
      percentage: totalExpenses > 0 ? Number(((categoryTotals[cat] / totalExpenses) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // 5. Monthly Comparison (Last 6 Months) in parallel with Promise.all
    const monthIndexes = [5, 4, 3, 2, 1, 0];
    const monthlyTrends = await Promise.all(
      monthIndexes.map(async (i) => {
        const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const monthLabel = mStart.toLocaleString('default', { month: 'short', year: '2-digit' });

        const [mPayments, mExpenses] = await Promise.all([
          Payment.find({ paidAt: { $gte: mStart, $lte: mEnd } }).lean(),
          Expense.find({ expenseDate: { $gte: mStart, $lte: mEnd } }).lean(),
        ]);

        let mRev = mPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (mRev === 0) {
          const mOrders = await Order.find({ orderDate: { $gte: mStart, $lte: mEnd } }).lean();
          mRev = mOrders.reduce(
            (sum, o: any) => sum + (o.paymentStatus === 'Paid' ? (o.totalAmount || 0) : (o.advancePaid || 0)),
            0
          );
        }

        const mExp = mExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const mNet = mRev - mExp;

        return {
          month: monthLabel,
          revenue: mRev,
          expenses: mExp,
          netProfit: mNet,
        };
      })
    );

    res.json({
      success: true,
      period: {
        preset,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      },
      summary: {
        grossRevenue,
        cashIncome,
        upiIncome,
        cardIncome,
        totalExpenses,
        cashExpenses,
        bankExpenses,
        netProfit,
        profitMargin,
        isProfit: netProfit >= 0,
      },
      expenseBreakdown,
      monthlyTrends,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportCSV = async (req: Request, res: Response) => {
  try {
    const { type = 'orders' } = req.query;

    if (type === 'pnl') {
      const payments = await Payment.find();
      const expenses = await Expense.find();

      let grossRev = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      let totalExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      let net = grossRev - totalExp;

      let csv = 'PROFIT & LOSS FINANCIAL STATEMENT\n';
      csv += `Generated Date,${new Date().toISOString().slice(0, 10)}\n\n`;
      csv += 'FINANCIAL SUMMARY,AMOUNT (INR)\n';
      csv += `Gross Income (Payments Collected),${grossRev}\n`;
      csv += `Total Operating Expenses,${totalExp}\n`;
      csv += `NET PROFIT / LOSS,${net}\n\n`;

      csv += 'EXPENSE BREAKDOWN BY CATEGORY,AMOUNT (INR)\n';
      const catTotals: { [k: string]: number } = {};
      expenses.forEach((e) => {
        catTotals[e.category || 'Miscellaneous'] = (catTotals[e.category || 'Miscellaneous'] || 0) + (e.amount || 0);
      });
      Object.keys(catTotals).forEach((cat) => {
        csv += `"${cat}",${catTotals[cat]}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="laundry_profit_loss_statement.csv"');
      return res.send(csv);
    } else if (type === 'orders') {
      const orders = await Order.find().sort({ createdAt: -1 });

      let csv = 'Order Number,Customer Name,Customer Mobile,Order Date,Expected Delivery,Status,Payment Status,Total Amount,Advance Paid,Remaining Balance\n';
      orders.forEach((o) => {
        const orderDate = new Date(o.orderDate).toISOString().slice(0, 10);
        const delivDate = new Date(o.expectedDeliveryDate).toISOString().slice(0, 10);
        csv += `"${o.orderNumber}","${o.customerSnapshot?.name || ''}","${o.customerSnapshot?.mobile || ''}","${orderDate}","${delivDate}","${o.status}","${o.paymentStatus}",${o.totalAmount},${o.advancePaid},${o.remainingBalance}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="laundry_orders.csv"');
      return res.send(csv);
    } else if (type === 'customers') {
      const customers = await Customer.find().sort({ name: 1 });
      let csv = 'Name,Mobile,Address,Email,Total Orders,Total Spent,Created At\n';
      customers.forEach((c) => {
        csv += `"${c.name}","${c.mobile}","${c.address}","${c.email || ''}",${c.totalOrders},${c.totalSpent},"${new Date(c.createdAt).toISOString().slice(0, 10)}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="laundry_customers.csv"');
      return res.send(csv);
    }

    return res.status(400).json({ success: false, message: 'Invalid export type' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
