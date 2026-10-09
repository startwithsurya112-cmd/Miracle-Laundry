const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/miraclelaundry';

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;

  const payments = await db.collection('payments').find().sort({ paidAt: -1 }).toArray();
  const orders = await db.collection('orders').find().sort({ createdAt: -1 }).toArray();

  const incomeMap = new Map();

  payments.forEach((p) => {
    const ref = p.orderNumber ? `#${p.orderNumber}` : `PAY-${p._id.toString().slice(-6)}`;
    const key = p.orderNumber || (p.orderId ? p.orderId.toString() : p._id.toString());
    if (!incomeMap.has(key)) {
      incomeMap.set(key, {
        id: p._id.toString(),
        refNumber: ref,
        date: p.paidAt,
        type: 'Income',
        category: 'Order Payment',
        description: `Order #${p.orderNumber || ''} payment from ${p.customerName || 'Customer'}`,
        paymentMethod: p.paymentMethod || 'Cash',
        amount: p.amount,
      });
    }
  });

  orders.forEach((o) => {
    const amt = o.paymentStatus === 'Paid' ? o.totalAmount : (o.advancePaid > 0 ? o.advancePaid : 0);
    const ref = `#${o.orderNumber}`;
    const oNum = o.orderNumber;
    const oId = o._id.toString();
    if (amt > 0 && !incomeMap.has(oNum) && !incomeMap.has(oId)) {
      incomeMap.set(oNum || oId, {
        id: oId,
        refNumber: ref,
        date: o.orderDate || o.createdAt,
        type: 'Income',
        category: 'Order Payment',
        description: `Order #${o.orderNumber} payment from ${o.customerSnapshot?.name || 'Customer'}`,
        paymentMethod: o.paymentMethod || 'Cash',
        amount: amt,
      });
    }
  });

  const transactions = Array.from(incomeMap.values());
  const totalIncome = transactions.reduce((acc, t) => acc + t.amount, 0);

  console.log('Total Income Transactions Count:', transactions.length);
  console.log('Total Income Amount:', totalIncome);
  console.log('First 5 Transactions:');
  transactions.slice(0, 5).forEach(t => {
    console.log(`  - ${t.refNumber}: ${t.description} (Amount: ₹${t.amount})`);
  });

  process.exit(0);
});
