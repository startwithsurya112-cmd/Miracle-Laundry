import Order from '../models/Order';
import Setting from '../models/Setting';
import Shop from '../models/Shop';

export const generateOrderNumber = async (shopId?: any): Promise<string> => {
  let shop: any = null;
  let prefix = 'ORD-';

  try {
    if (shopId) {
      shop = await Shop.findById(shopId);
    }
    if (!shop) {
      // Fallback to default/first active shop
      shop = await Shop.findOne({ isActive: true }).sort({ createdAt: 1 });
    }

    if (shop) {
      if (shop.invoicePrefix && shop.invoicePrefix.trim()) {
        prefix = shop.invoicePrefix.trim();
      } else if (shop.code) {
        prefix = shop.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      }
    } else {
      const setting = await Setting.findOne();
      if (setting && setting.invoicePrefix) {
        prefix = setting.invoicePrefix.trim();
      }
    }

    // Ensure trailing separator
    if (!prefix.endsWith('-') && !prefix.endsWith('/')) {
      prefix = `${prefix}-`;
    }

    // Disambiguate if multiple shops share generic prefix ('ORD-' or 'ML-')
    if (shop && shop.code && (prefix === 'ORD-' || prefix === 'ML-')) {
      const otherShopWithSamePrefix = await Shop.findOne({
        _id: { $ne: shop._id },
        invoicePrefix: shop.invoicePrefix,
      });
      if (otherShopWithSamePrefix) {
        const cleanCode = shop.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        prefix = `${prefix.replace(/-$/, '')}-${cleanCode}-`;
      }
    }
  } catch (err) {
    // fallback
    if (!prefix.endsWith('-') && !prefix.endsWith('/')) {
      prefix = `${prefix}-`;
    }
  }

  // Find orders belonging to THIS branch only to maintain strictly isolated sequence counters starting from 1
  let query: any = {};
  if (shop) {
    const isMainOrFirstShop =
      !shop.code ||
      shop.code === 'MAIN-01' ||
      (await Shop.countDocuments({ createdAt: { $lt: shop.createdAt } })) === 0;

    if (isMainOrFirstShop) {
      query = {
        $or: [
          { shopId: shop._id },
          { shopId: null },
          { shopId: { $exists: false } },
        ],
      };
    } else {
      query = { shopId: shop._id };
    }
  }

  const branchOrders = await Order.find(query, { orderNumber: 1 });
  let maxNum = 0;

  branchOrders.forEach((o) => {
    if (o.orderNumber) {
      // Strip year suffix if present (e.g. "/26" or "/2026")
      const withoutYear = o.orderNumber.trim().replace(/\/\d+$/, '');
      // Extract the sequence digits from the end of the order number identifier
      const match = withoutYear.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  // Each branch starts from 1 if no existing orders exist for this branch
  let nextNum = maxNum > 0 ? maxNum + 1 : 1;
  const currentYearSuffix = new Date().getFullYear().toString().slice(-2); // e.g. 26 for 2026

  let candidate = `${prefix}${String(nextNum).padStart(3, '0')}/${currentYearSuffix}`;

  // Ensure candidate is strictly unique against any concurrent insertions in DB
  let collisionAttempt = 0;
  while (await Order.exists({ orderNumber: candidate })) {
    nextNum++;
    candidate = `${prefix}${String(nextNum).padStart(3, '0')}/${currentYearSuffix}`;
    collisionAttempt++;
    if (collisionAttempt > 200) {
      candidate = `${prefix}${String(nextNum).padStart(3, '0')}-${Date.now().toString().slice(-4)}/${currentYearSuffix}`;
      break;
    }
  }

  return candidate;
};
