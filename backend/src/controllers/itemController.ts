import { Request, Response } from 'express';
import LaundryItem from '../models/LaundryItem';

const defaultCatalogItems = [
  // 236 Excel items auto-seeder fallback
  { name: 'T shirt', defaultPrice: 150, category: 'Regular', isActive: true },
  { name: 'Shirt', defaultPrice: 15, category: 'Regular', isActive: true },
  { name: 'Shorts', defaultPrice: 10, category: 'Regular', isActive: true },
  { name: 'Pant', defaultPrice: 15, category: 'Regular', isActive: true },
  { name: 'Dhoti', defaultPrice: 20, category: 'Regular', isActive: true },
  { name: 'Top', defaultPrice: 20, category: 'Regular', isActive: true },
  { name: 'Bottom', defaultPrice: 20, category: 'Regular', isActive: true },
  { name: 'Shawl', defaultPrice: 10, category: 'Regular', isActive: true },
  { name: 'Saree', defaultPrice: 40, category: 'Regular', isActive: true },
  { name: 'Blouse', defaultPrice: 10, category: 'Regular', isActive: true },
  { name: 'T Shirt', defaultPrice: 15, category: 'Regular', isActive: true },
  { name: 'Track Pant', defaultPrice: 10, category: 'Regular', isActive: true },
  { name: 'Skirt', defaultPrice: 20, category: 'Regular', isActive: true },
  { name: 'Gown', defaultPrice: 25, category: 'Regular', isActive: true },
  { name: 'Towel', defaultPrice: 10, category: 'Regular', isActive: true },
  { name: 'Blanket', defaultPrice: 30, category: 'Regular', isActive: true },
  { name: 'SHOES CLEAN', defaultPrice: 200, category: 'Regular', isActive: true },

  // Men
  { name: 'White Shirt', defaultPrice: 20, category: 'Men', isActive: true },
  { name: 'Shirt (Formal / Casual)', defaultPrice: 15, category: 'Men', isActive: true },
  { name: 'Branded Shirt', defaultPrice: 20, category: 'Men', isActive: true },
  { name: 'Sweatshirt', defaultPrice: 15, category: 'Men', isActive: true },
  { name: 'Hoodie', defaultPrice: 15, category: 'Men', isActive: true },
  { name: 'Sweater', defaultPrice: 15, category: 'Men', isActive: true },
  { name: 'Jacket', defaultPrice: 15, category: 'Men', isActive: true },
  { name: 'Blazer', defaultPrice: 25, category: 'Men', isActive: true },
  { name: 'Coat / Overcoat', defaultPrice: 20, category: 'Men', isActive: true },
  { name: 'Kurta top', defaultPrice: 25, category: 'Men', isActive: true },
  { name: 'Sherwani', defaultPrice: 25, category: 'Men', isActive: true },
  { name: 'Jeans', defaultPrice: 15, category: 'Men', isActive: true },
  { name: 'Chinos', defaultPrice: 12, category: 'Men', isActive: true },
  { name: 'Track Pants / Joggers', defaultPrice: 12, category: 'Men', isActive: true },
  { name: 'Single Dhoti', defaultPrice: 20, category: 'Men', isActive: true },
  { name: 'Double Dhoti', defaultPrice: 25, category: 'Men', isActive: true },
  { name: 'Lungi', defaultPrice: 20, category: 'Men', isActive: true },
  { name: 'Pajama', defaultPrice: 15, category: 'Men', isActive: true },
  { name: 'Pathani Suit', defaultPrice: 50, category: 'Men', isActive: true },
  { name: 'Briefs', defaultPrice: 5, category: 'Men', isActive: true },
  { name: 'Boxers', defaultPrice: 5, category: 'Men', isActive: true },
  { name: 'Trunks', defaultPrice: 5, category: 'Men', isActive: true },
  { name: 'Vest', defaultPrice: 10, category: 'Men', isActive: true },
  { name: 'Night suit', defaultPrice: 15, category: 'Men', isActive: true },

  // Women
  { name: 'Crop top', defaultPrice: 15, category: 'Women', isActive: true },
  { name: 'Tunic', defaultPrice: 20, category: 'Women', isActive: true },
  { name: 'Silk Saree', defaultPrice: 60, category: 'Women', isActive: true },
  { name: 'Cotton Saree', defaultPrice: 35, category: 'Women', isActive: true },
  { name: 'Designer Saree', defaultPrice: 80, category: 'Women', isActive: true },
  { name: 'Lehenga', defaultPrice: 120, category: 'Women', isActive: true },
  { name: 'Dupatta', defaultPrice: 15, category: 'Women', isActive: true },
  { name: 'Leggings', defaultPrice: 15, category: 'Women', isActive: true },

  // Kids
  { name: 'Kid Shirt', defaultPrice: 20, category: 'Kids', isActive: true },
  { name: 'Kid Short', defaultPrice: 20, category: 'Kids', isActive: true },
  { name: 'Kid Jean', defaultPrice: 20, category: 'Kids', isActive: true },
  { name: 'Frock', defaultPrice: 20, category: 'Kids', isActive: true },
  { name: 'Romper', defaultPrice: 20, category: 'Kids', isActive: true },
  { name: 'Onesie', defaultPrice: 20, category: 'Kids', isActive: true },
  { name: 'Baby Frock', defaultPrice: 20, category: 'Kids', isActive: true },

  // Household
  { name: 'Bedsheet Single', defaultPrice: 30, category: 'Household', isActive: true },
  { name: 'Pillow cover', defaultPrice: 10, category: 'Household', isActive: true },
  { name: 'Cushion cover', defaultPrice: 20, category: 'Household', isActive: true },
  { name: 'Quilt / Razai Single', defaultPrice: 150, category: 'Household', isActive: true },
  { name: 'Comforter King', defaultPrice: 200, category: 'Household', isActive: true },
  { name: 'Curtain', defaultPrice: 80, category: 'Household', isActive: true },

  // Others
  { name: 'Canvas Shoes', defaultPrice: 180, category: 'Others', isActive: true },
  { name: 'Leather Shoes', defaultPrice: 250, category: 'Others', isActive: true },
  { name: 'Handbag', defaultPrice: 200, category: 'Others', isActive: true },
  { name: 'Backpack', defaultPrice: 250, category: 'Others', isActive: true },
  { name: 'Travel Trolley', defaultPrice: 400, category: 'Others', isActive: true },
];

export const getItems = async (req: Request, res: Response) => {
  try {
    let items = await LaundryItem.find().sort({ category: 1, name: 1 });
    if (items.length < 30) {
      for (const itemData of defaultCatalogItems) {
        const exists = await LaundryItem.findOne({ name: itemData.name });
        if (!exists) {
          await LaundryItem.create(itemData);
        }
      }
      items = await LaundryItem.find().sort({ category: 1, name: 1 });
    }
    res.json({ success: true, items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const { name, defaultPrice, category, servicePrices, icon, isActive } = req.body;

    if (!name || defaultPrice === undefined) {
      return res.status(400).json({ success: false, message: 'Item name and default price are required' });
    }

    const item = new LaundryItem({
      name,
      defaultPrice: Number(defaultPrice),
      category: category || 'Regular',
      servicePrices: servicePrices || {},
      icon: icon || 'Shirt',
      isActive: isActive !== undefined ? isActive : true,
    });

    await item.save();

    res.status(201).json({ success: true, message: 'Laundry item created successfully', item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { name, defaultPrice, category, servicePrices, icon, isActive } = req.body;
    const item = await LaundryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (name) item.name = name;
    if (defaultPrice !== undefined) item.defaultPrice = Number(defaultPrice);
    if (category) item.category = category;
    if (servicePrices) item.servicePrices = servicePrices;
    if (icon) item.icon = icon;
    if (isActive !== undefined) item.isActive = isActive;

    await item.save();

    res.json({ success: true, message: 'Laundry item updated successfully', item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    await LaundryItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Laundry item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
