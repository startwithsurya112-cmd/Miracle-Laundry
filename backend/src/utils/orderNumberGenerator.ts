import Order from '../models/Order';
import Setting from '../models/Setting';

export const generateOrderNumber = async (): Promise<string> => {
  let prefix = 'ORD-';
  try {
    const setting = await Setting.findOne();
    if (setting && setting.invoicePrefix) {
      prefix = setting.invoicePrefix;
    }
  } catch (err) {
    // fallback
  }

  // Find max numerical order number in database (e.g. from ORD-411/26 or ORD-411)
  const orders = await Order.find({}, { orderNumber: 1 });
  let maxNum = 0;
  orders.forEach((o) => {
    if (o.orderNumber) {
      const match = o.orderNumber.match(/ORD-(\d+)/i) || o.orderNumber.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  const nextNum = maxNum > 0 ? maxNum + 1 : 1;
  const currentYearSuffix = new Date().getFullYear().toString().slice(-2); // e.g. 26 for 2026

  return `${prefix}${nextNum}/${currentYearSuffix}`;
};
