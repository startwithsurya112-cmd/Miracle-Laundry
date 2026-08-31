import { Request, Response } from 'express';
import Expense from '../models/Expense';
import Payment from '../models/Payment';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { generateVoucherNumber } from '../utils/voucherNumberGenerator';

// --- Shop Expenses Endpoints ---
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { category, paymentMethod, search, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let query: any = {};
    if (req.targetShopId) {
      query.shopId = req.targetShopId;
    }

    if (category) query.category = category;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { voucherNumber: searchRegex },
        { description: searchRegex },
        { paidTo: searchRegex },
        { category: searchRegex },
      ];
    }

    if (dateFrom || dateTo) {
      query.expenseDate = {};
      if (dateFrom) query.expenseDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.expenseDate.$lte = new Date(dateTo as string);
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Compute Summary Stats
    const allMatching = await Expense.find(query);
    const totalExpenseAmount = allMatching.reduce((acc, item) => acc + item.amount, 0);
    const cashExpenses = allMatching.filter((e) => e.paymentMethod === 'Cash').reduce((acc, item) => acc + item.amount, 0);
    const bankExpenses = allMatching.filter((e) => e.paymentMethod !== 'Cash').reduce((acc, item) => acc + item.amount, 0);

    res.json({
      success: true,
      expenses,
      summary: {
        totalExpenseAmount,
        cashExpenses,
        bankExpenses,
      },
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

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { category, description, amount, paymentMethod, paidTo, expenseDate, notes, shopId } = req.body;

    if (!category || !description || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Category, description, and valid amount are required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const voucherNumber = await generateVoucherNumber();

    const expense = new Expense({
      shopId: req.targetShopId || shopId || null,
      voucherNumber,
      category,
      description,
      amount: numAmount,
      paymentMethod: paymentMethod || 'Cash',
      paidTo: paidTo || '',
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes: notes || '',
    });

    await expense.save();

    res.status(201).json({
      success: true,
      message: 'Shop expense recorded successfully',
      expense,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { category, description, amount, paymentMethod, paidTo, expenseDate, notes, shopId } = req.body;

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    if (category) expense.category = category;
    if (description) expense.description = description;
    if (amount !== undefined) expense.amount = Number(amount);
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (paidTo !== undefined) expense.paidTo = paidTo;
    if (expenseDate) expense.expenseDate = new Date(expenseDate);
    if (notes !== undefined) expense.notes = notes;
    if (shopId !== undefined) expense.shopId = shopId;

    await expense.save();

    res.json({
      success: true,
      message: 'Expense record updated successfully',
      expense,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Expense record deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Combined Order & Accounts Summary Endpoint ---
export const getAccountsSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, paymentMethod } = req.query;

    let paymentQuery: any = {};
    let orderQuery: any = {};
    let expenseQuery: any = {};

    if (req.targetShopId) {
      paymentQuery.shopId = req.targetShopId;
      orderQuery.shopId = req.targetShopId;
      expenseQuery.shopId = req.targetShopId;
    }

    if (dateFrom || dateTo) {
      paymentQuery.paidAt = {};
      orderQuery.orderDate = {};
      expenseQuery.expenseDate = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        paymentQuery.paidAt.$gte = fromDate;
        orderQuery.orderDate.$gte = fromDate;
        expenseQuery.expenseDate.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo as string);
        paymentQuery.paidAt.$lte = toDate;
        orderQuery.orderDate.$lte = toDate;
        expenseQuery.expenseDate.$lte = toDate;
      }
    }

    if (paymentMethod) {
      paymentQuery.paymentMethod = paymentMethod;
      orderQuery.paymentMethod = paymentMethod;
      expenseQuery.paymentMethod = paymentMethod;
    }

    const payments = await Payment.find(paymentQuery).sort({ paidAt: -1 }).lean();
    const orders = await Order.find(orderQuery).sort({ createdAt: -1 }).lean();
    const expenses = await Expense.find(expenseQuery).sort({ expenseDate: -1 }).lean();

    const incomeMap = new Map<string, any>();

    payments.forEach((p) => {
      const ref = p.orderNumber ? `#${p.orderNumber}` : `PAY-${p._id.toString().slice(-6)}`;
      const key = p.orderNumber || (p.orderId ? p.orderId.toString() : p._id.toString());
      if (!incomeMap.has(key)) {
        incomeMap.set(key, {
          id: p._id.toString(),
          refNumber: ref,
          date: p.paidAt,
          type: 'Income' as const,
          category: 'Order Payment',
          description: `Order #${p.orderNumber || ''} payment from ${p.customerName || 'Customer'}`,
          paymentMethod: p.paymentMethod || 'Cash',
          amount: p.amount,
        });
      }
    });

    orders.forEach((o: any) => {
      const amt = o.paymentStatus === 'Paid' ? o.totalAmount : (o.advancePaid > 0 ? o.advancePaid : 0);
      const ref = `#${o.orderNumber}`;
      const oNum = o.orderNumber;
      const oId = o._id.toString();
      if (amt > 0 && !incomeMap.has(oNum) && !incomeMap.has(oId)) {
        incomeMap.set(oNum || oId, {
          id: oId,
          refNumber: ref,
          date: o.orderDate || o.createdAt,
          type: 'Income' as const,
          category: 'Order Payment',
          description: `Order #${o.orderNumber} payment from ${o.customerSnapshot?.name || 'Customer'}`,
          paymentMethod: o.paymentMethod || 'Cash',
          amount: amt,
        });
      }
    });

    const incomeTransactions = Array.from(incomeMap.values());
    const expenseTransactions = expenses.map((e) => ({
      id: e._id.toString(),
      refNumber: e.voucherNumber,
      date: e.expenseDate,
      type: 'Expense' as const,
      category: e.category,
      description: e.description + (e.paidTo ? ` (Paid to: ${e.paidTo})` : ''),
      paymentMethod: e.paymentMethod,
      amount: e.amount,
    }));

    const transactions = [...incomeTransactions, ...expenseTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate Totals
    const totalIncome = incomeTransactions.reduce((acc, p) => acc + p.amount, 0);
    const totalExpenses = expenseTransactions.reduce((acc, e) => acc + e.amount, 0);

    const cashIncome = incomeTransactions.filter((p) => p.paymentMethod === 'Cash').reduce((acc, p) => acc + p.amount, 0);
    const cashExpenses = expenseTransactions.filter((e) => e.paymentMethod === 'Cash').reduce((acc, e) => acc + e.amount, 0);
    const cashBalance = cashIncome - cashExpenses;

    const bankIncome = incomeTransactions.filter((p) => p.paymentMethod !== 'Cash').reduce((acc, p) => acc + p.amount, 0);
    const bankExpenses = expenseTransactions.filter((e) => e.paymentMethod !== 'Cash').reduce((acc, e) => acc + e.amount, 0);
    const bankBalance = bankIncome - bankExpenses;

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        cashBalance,
        bankBalance,
        cashIncome,
        cashExpenses,
        bankIncome,
        bankExpenses,
      },
      transactions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

