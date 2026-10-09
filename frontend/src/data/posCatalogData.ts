export interface POSCatalogItem {
  id: string;
  name: string;
  price: number;
  subCategory: string;
}

export interface POSGroup {
  groupName: 'Regular' | 'Men' | 'Women' | 'Kids' | 'Household' | 'Others';
  subCategories: {
    name: string;
    items: POSCatalogItem[];
  }[];
}

export const mainServicesList = [
  'Wash and Fold',
  'Ironing',
  'Laundry',
  'Premium Laundry',
  'Dry Cleaning',
  'Starch + Ironing',
  'Wash + Starch + Ironing',
  'Saree Polishing',
  'Saree Pre-pleating',
  'Shoes Cleaning',
  'Bag Cleaning',
] as const;

export interface KgServiceRate {
  id?: string;
  name: string;
  ratePerKg: number;
}

export const defaultKgServicesList: KgServiceRate[] = [
  { id: 'kg-1', name: 'Wash & Iron', ratePerKg: 120 },
  { id: 'kg-2', name: 'Express Laundry', ratePerKg: 199 },
  { id: 'kg-3', name: 'Premium Laundry', ratePerKg: 159 },
  { id: 'kg-4', name: 'Premium Express Laundry', ratePerKg: 299 },
];

export const getKgServicesList = (): KgServiceRate[] => {
  try {
    const saved = localStorage.getItem('kgServicesList');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse kgServicesList from localStorage', e);
  }
  return defaultKgServicesList;
};

export const saveKgServicesList = (list: KgServiceRate[]): void => {
  try {
    localStorage.setItem('kgServicesList', JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save kgServicesList to localStorage', e);
  }
};

export const kgServicesList: KgServiceRate[] = getKgServicesList();

/**
 * Dynamic Service-Based Pricing Calculator
 * Returns the exact unit price for a garment item depending on the selected Service Category
 */
export const getItemPriceForService = (
  item: { name: string; price?: number; defaultPrice?: number; category?: string; servicePrices?: Record<string, number> },
  serviceName: string
): number => {
  if (item.servicePrices && typeof item.servicePrices === 'object') {
    const customRate = (item.servicePrices as any)[serviceName] !== undefined
      ? (item.servicePrices as any)[serviceName]
      : typeof (item.servicePrices as any).get === 'function' ? (item.servicePrices as any).get(serviceName) : undefined;

    if (customRate !== undefined && customRate !== null && !isNaN(Number(customRate)) && Number(customRate) >= 0) {
      return Number(customRate);
    }
  }

  const name = (item.name || '').toLowerCase();
  const rawPrice = item.price !== undefined ? item.price : item.defaultPrice;
  const base = rawPrice && rawPrice > 0 ? rawPrice : 15;

  switch (serviceName) {
    case 'Ironing':
      if (name.includes('shirt') || name.includes('pant') || name.includes('top') || name.includes('t-shirt') || name.includes('jeans') || name.includes('short')) return 10;
      if (name.includes('dhoti') || name.includes('lungi') || name.includes('pajama') || name.includes('night suit')) return 12;
      if (name.includes('saree') || name.includes('kurta') || name.includes('lehenga') || name.includes('frock')) return 20;
      if (name.includes('blazer') || name.includes('coat') || name.includes('suit')) return 25;
      return Math.max(8, Math.round(base * 0.65));

    case 'Laundry': // Wash & Iron
      if (name.includes('shirt') || name.includes('pant') || name.includes('top') || name.includes('t-shirt') || name.includes('jeans')) return 20;
      if (name.includes('dhoti') || name.includes('kurta') || name.includes('frock') || name.includes('short')) return 25;
      if (name.includes('saree') || name.includes('lehenga') || name.includes('gown')) return 35;
      if (name.includes('blazer') || name.includes('coat') || name.includes('suit')) return 45;
      return Math.max(12, Math.round(base * 1.35));

    case 'Premium Laundry':
      if (name.includes('shirt') || name.includes('pant') || name.includes('top') || name.includes('jeans')) return 30;
      if (name.includes('kurta') || name.includes('frock') || name.includes('dhoti')) return 40;
      if (name.includes('saree') || name.includes('lehenga')) return 50;
      if (name.includes('blazer') || name.includes('coat') || name.includes('suit')) return 75;
      return Math.max(20, Math.round(base * 2.0));

    case 'Dry Cleaning':
      if (name.includes('shirt') || name.includes('pant') || name.includes('t-shirt') || name.includes('top')) return 60;
      if (name.includes('kurta') || name.includes('sherwani') || name.includes('lehenga')) return 120;
      if (name.includes('silk saree')) return 200;
      if (name.includes('saree')) return 150;
      if (name.includes('blazer') || name.includes('suit') || name.includes('coat')) return 180;
      if (name.includes('blanket') || name.includes('quilt') || name.includes('comforter')) return 180;
      if (name.includes('shoe')) return 250;
      if (name.includes('bag')) return 200;
      return Math.max(50, Math.round(base * 4.0));

    case 'Starch + Ironing':
      if (name.includes('shirt') || name.includes('pant') || name.includes('top')) return 25;
      if (name.includes('dhoti') || name.includes('kurta')) return 35;
      if (name.includes('saree')) return 40;
      return Math.max(15, Math.round(base * 1.6));

    case 'Wash + Starch + Ironing':
      if (name.includes('shirt') || name.includes('pant') || name.includes('top')) return 35;
      if (name.includes('dhoti') || name.includes('kurta')) return 45;
      if (name.includes('saree')) return 60;
      return Math.max(25, Math.round(base * 2.3));

    case 'Saree Polishing':
      if (name.includes('silk saree')) return 120;
      if (name.includes('designer saree') || name.includes('heavy saree')) return 150;
      if (name.includes('half saree')) return 90;
      return 80;

    case 'Saree Pre-pleating':
      if (name.includes('silk saree')) return 150;
      if (name.includes('designer saree')) return 180;
      return 100;

    case 'Shoes Cleaning':
      if (name.includes('leather') || name.includes('boot')) return 250;
      if (name.includes('canvas')) return 180;
      return 200;

    case 'Bag Cleaning':
      if (name.includes('trolley') || name.includes('suitcase') || name.includes('travel')) return 400;
      if (name.includes('backpack')) return 250;
      return 200;

    case 'Wash and Fold':
    default:
      return base;
  }
};

export const posGroupCatalog: POSGroup[] = [
  {
    groupName: "Regular",
    subCategories: [
      {
        name: "Clothing",
        items: [
          {
                    "id": "ex-1",
                    "name": "T shirt",
                    "price": 150.0,
                    "subCategory": "Clothing"
          },
          {
                    "id": "ex-2",
                    "name": "Shirt",
                    "price": 2.0,
                    "subCategory": "Clothing"
          },
          {
                    "id": "ex-3",
                    "name": "Shorts",
                    "price": 10.0,
                    "subCategory": "Clothing"
          },
          {
                    "id": "ex-132",
                    "name": "kurta bottom",
                    "price": 20.0,
                    "subCategory": "Clothing"
          },
          {
                    "id": "ex-133",
                    "name": "kurta bottom",
                    "price": 20.0,
                    "subCategory": "Clothing"
          },
          {
                    "id": "ex-150",
                    "name": "Gown",
                    "price": 25.0,
                    "subCategory": "Clothing"
          },
          {
                    "id": "ex-233",
                    "name": "washing only",
                    "price": 25.0,
                    "subCategory": "Clothing"
          },
          {
                    "id": "ex-235",
                    "name": "wasing only ",
                    "price": 25.0,
                    "subCategory": "Clothing"
          },
          {
                    "id": "ex-236",
                    "name": "Wasing only",
                    "price": 25.0,
                    "subCategory": "Clothing"
          }
]
      },
      {
        name: "Regular - Cloths",
        items: [
          {
                    "id": "ex-139",
                    "name": "Shirt",
                    "price": 15.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-140",
                    "name": "Pant",
                    "price": 15.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-141",
                    "name": "Dhoti",
                    "price": 20.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-142",
                    "name": "Top",
                    "price": 20.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-143",
                    "name": "Bottom",
                    "price": 20.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-144",
                    "name": "Shawl",
                    "price": 10.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-145",
                    "name": "Saree",
                    "price": 40.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-146",
                    "name": "Blouse",
                    "price": 10.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-147",
                    "name": "T Shirt",
                    "price": 15.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-148",
                    "name": "Track Pant",
                    "price": 10.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-149",
                    "name": "Shorts",
                    "price": 10.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-151",
                    "name": "Skirt",
                    "price": 20.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-152",
                    "name": "Gown",
                    "price": 25.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-153",
                    "name": "Towel",
                    "price": 10.0,
                    "subCategory": "Regular - Cloths"
          },
          {
                    "id": "ex-154",
                    "name": "Blanket",
                    "price": 30.0,
                    "subCategory": "Regular - Cloths"
          }
]
      }
    ]
  },
  {
    groupName: "Men",
    subCategories: [
      {
        name: "Men - Upper Wear",
        items: [
          {
                    "id": "ex-4",
                    "name": "T-shirt",
                    "price": 13.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-5",
                    "name": "White Shirt",
                    "price": 15.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-6",
                    "name": "Shirt (Formal / Casual)",
                    "price": 12.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-7",
                    "name": "Branded Shirt",
                    "price": 15.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-8",
                    "name": "Sweatshirt",
                    "price": 15.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-9",
                    "name": "Hoodie",
                    "price": 15.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-10",
                    "name": "Sweater",
                    "price": 15.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-11",
                    "name": "Jacket",
                    "price": 15.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-12",
                    "name": "Blazer",
                    "price": 25.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-13",
                    "name": "Coat / Overcoat",
                    "price": 20.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-38",
                    "name": "Handkerchief",
                    "price": 5.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-135",
                    "name": "silk shirt",
                    "price": 18.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-156",
                    "name": "Sports Uniform",
                    "price": 20.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-157",
                    "name": "Lab Coat",
                    "price": 20.0,
                    "subCategory": "Men - Upper Wear"
          },
          {
                    "id": "ex-190",
                    "name": "Bed Sheet King Six\\ze",
                    "price": 35.0,
                    "subCategory": "Men - Upper Wear"
          }
]
      },
      {
        name: "Men - Ethnic",
        items: [
          {
                    "id": "ex-14",
                    "name": "Kurta top",
                    "price": 25.0,
                    "subCategory": "Men - Ethnic"
          },
          {
                    "id": "ex-15",
                    "name": "Sherwani",
                    "price": 25.0,
                    "subCategory": "Men - Ethnic"
          },
          {
                    "id": "ex-24",
                    "name": "Pajama",
                    "price": 15.0,
                    "subCategory": "Men - Ethnic"
          },
          {
                    "id": "ex-25",
                    "name": "Pathani Suit",
                    "price": 50.0,
                    "subCategory": "Men - Ethnic"
          },
          {
                    "id": "ex-134",
                    "name": "kurta bottom",
                    "price": 25.0,
                    "subCategory": "Men - Ethnic"
          }
]
      },
      {
        name: "Men - Lower Wear",
        items: [
          {
                    "id": "ex-16",
                    "name": "Jeans",
                    "price": 15.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-17",
                    "name": "Pant",
                    "price": 12.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-18",
                    "name": "Chinos",
                    "price": 12.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-19",
                    "name": "Shorts",
                    "price": 10.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-20",
                    "name": "Track Pants / Joggers",
                    "price": 12.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-21",
                    "name": "Single Dhoti",
                    "price": 20.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-22",
                    "name": "Double Dhoti",
                    "price": 25.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-23",
                    "name": "Lungi",
                    "price": 20.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-155",
                    "name": "School Uniform",
                    "price": 20.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-210",
                    "name": "T-Shirt",
                    "price": 12.0,
                    "subCategory": "Men - Lower Wear"
          },
          {
                    "id": "ex-217",
                    "name": "School Uniform",
                    "price": 20.0,
                    "subCategory": "Men - Lower Wear"
          }
]
      },
      {
        name: "Men - Inner/Night",
        items: [
          {
                    "id": "ex-26",
                    "name": "Briefs",
                    "price": 5.0,
                    "subCategory": "Men - Inner/Night"
          },
          {
                    "id": "ex-27",
                    "name": "Boxers",
                    "price": 5.0,
                    "subCategory": "Men - Inner/Night"
          },
          {
                    "id": "ex-28",
                    "name": "Trunks",
                    "price": 5.0,
                    "subCategory": "Men - Inner/Night"
          },
          {
                    "id": "ex-29",
                    "name": "Vest",
                    "price": 10.0,
                    "subCategory": "Men - Inner/Night"
          },
          {
                    "id": "ex-30",
                    "name": "Night suit",
                    "price": 15.0,
                    "subCategory": "Men - Inner/Night"
          },
          {
                    "id": "ex-31",
                    "name": "Bathrobe",
                    "price": 20.0,
                    "subCategory": "Men - Inner/Night"
          },
          {
                    "id": "ex-36",
                    "name": "Tie",
                    "price": 10.0,
                    "subCategory": "Men - Inner/Night"
          }
]
      },
      {
        name: "Men - Active/Sports",
        items: [
          {
                    "id": "ex-32",
                    "name": "Track Pant",
                    "price": 12.0,
                    "subCategory": "Men - Active/Sports"
          },
          {
                    "id": "ex-33",
                    "name": "Sports T-shirt",
                    "price": 10.0,
                    "subCategory": "Men - Active/Sports"
          },
          {
                    "id": "ex-34",
                    "name": "Compression wear",
                    "price": 10.0,
                    "subCategory": "Men - Active/Sports"
          }
]
      },
      {
        name: "Institutional - Upper Wear",
        items: [
          {
                    "id": "ex-158",
                    "name": "Scrub",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-159",
                    "name": "Patient Gown",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-160",
                    "name": "Doctor Coat",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-161",
                    "name": "Nurse Uniform",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-162",
                    "name": "Safety Jacket",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-164",
                    "name": "Boiler Suit",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-165",
                    "name": "Reflective Vest",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-166",
                    "name": "Office Shirt",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-167",
                    "name": "Formal Trouser",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-168",
                    "name": "Blazer",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-169",
                    "name": "ID Jacket",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-170",
                    "name": "Chef Coat",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-171",
                    "name": "Chef Apron",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-172",
                    "name": "Housekeeping Uniform",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          },
          {
                    "id": "ex-173",
                    "name": "Reception Uniform",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          }
]
      },
      {
        name: "Others - Upper Wear",
        items: [
          {
                    "id": "ex-174",
                    "name": "Unisex Wear",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-175",
                    "name": "Plus Size Garment",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-176",
                    "name": "Winter Wear",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-177",
                    "name": "Sweater",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-178",
                    "name": "Cardigan",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-179",
                    "name": "Shawl",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-183",
                    "name": "Socks",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          }
]
      }
    ]
  },
  {
    groupName: "Women",
    subCategories: [
      {
        name: "Women - Upper Wear",
        items: [
          {
                    "id": "ex-39",
                    "name": "Top",
                    "price": 15.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-40",
                    "name": "T-shirt",
                    "price": 12.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-41",
                    "name": "Shirt",
                    "price": 12.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-42",
                    "name": "Blouse",
                    "price": 10.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-43",
                    "name": "Tunic",
                    "price": 20.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-44",
                    "name": "Crop top",
                    "price": 15.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-45",
                    "name": "Sweater",
                    "price": 20.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-46",
                    "name": "Sweatshirt",
                    "price": 15.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-47",
                    "name": "Hoodie",
                    "price": 20.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-48",
                    "name": "Jacket",
                    "price": 20.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-49",
                    "name": "Blazer",
                    "price": 20.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-50",
                    "name": "Cardigan",
                    "price": 20.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-136",
                    "name": "chudi top",
                    "price": 15.0,
                    "subCategory": "Women - Upper Wear"
          },
          {
                    "id": "ex-138",
                    "name": "designer fancy top",
                    "price": 30.0,
                    "subCategory": "Women - Upper Wear"
          }
]
      },
      {
        name: "Women - Lower Wear",
        items: [
          {
                    "id": "ex-51",
                    "name": "Jeans",
                    "price": 20.0,
                    "subCategory": "Women - Lower Wear"
          },
          {
                    "id": "ex-52",
                    "name": "Leggings",
                    "price": 12.0,
                    "subCategory": "Women - Lower Wear"
          },
          {
                    "id": "ex-53",
                    "name": "Trousers",
                    "price": 20.0,
                    "subCategory": "Women - Lower Wear"
          },
          {
                    "id": "ex-54",
                    "name": "Palazzo",
                    "price": 12.0,
                    "subCategory": "Women - Lower Wear"
          },
          {
                    "id": "ex-55",
                    "name": "Skirt",
                    "price": 40.0,
                    "subCategory": "Women - Lower Wear"
          },
          {
                    "id": "ex-56",
                    "name": "Shorts",
                    "price": 20.0,
                    "subCategory": "Women - Lower Wear"
          },
          {
                    "id": "ex-57",
                    "name": "Jeggings",
                    "price": 20.0,
                    "subCategory": "Women - Lower Wear"
          },
          {
                    "id": "ex-58",
                    "name": "Culottes",
                    "price": 20.0,
                    "subCategory": "Women - Lower Wear"
          },
          {
                    "id": "ex-137",
                    "name": "chudi bottom",
                    "price": 15.0,
                    "subCategory": "Women - Lower Wear"
          }
]
      },
      {
        name: "Women - Sets",
        items: [
          {
                    "id": "ex-59",
                    "name": "Dress",
                    "price": 20.0,
                    "subCategory": "Women - Sets"
          },
          {
                    "id": "ex-60",
                    "name": "Gown",
                    "price": 20.0,
                    "subCategory": "Women - Sets"
          },
          {
                    "id": "ex-61",
                    "name": "Jumpsuit",
                    "price": 20.0,
                    "subCategory": "Women - Sets"
          },
          {
                    "id": "ex-62",
                    "name": "Playsuit",
                    "price": 20.0,
                    "subCategory": "Women - Sets"
          },
          {
                    "id": "ex-63",
                    "name": "Co-ord set",
                    "price": 20.0,
                    "subCategory": "Women - Sets"
          }
]
      },
      {
        name: "Women - Ethnic",
        items: [
          {
                    "id": "ex-64",
                    "name": "Silk Saree",
                    "price": 40.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-65",
                    "name": "Blouse",
                    "price": 12.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-66",
                    "name": "Lehenga",
                    "price": 20.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-67",
                    "name": "Choli",
                    "price": 20.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-68",
                    "name": "Salwar suit",
                    "price": 20.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-69",
                    "name": "Churidar suit",
                    "price": 20.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-70",
                    "name": "Anarkali suit",
                    "price": 20.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-71",
                    "name": "Kurti",
                    "price": 1.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-72",
                    "name": "Dupatta",
                    "price": 20.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-73",
                    "name": "Ghagra",
                    "price": 20.0,
                    "subCategory": "Women - Ethnic"
          },
          {
                    "id": "ex-74",
                    "name": "Sharara suit",
                    "price": 20.0,
                    "subCategory": "Women - Ethnic"
          }
]
      },
      {
        name: "Women - Inner/Night",
        items: [
          {
                    "id": "ex-75",
                    "name": "Bra",
                    "price": 20.0,
                    "subCategory": "Women - Inner/Night"
          },
          {
                    "id": "ex-76",
                    "name": "Panties",
                    "price": 15.0,
                    "subCategory": "Women - Inner/Night"
          },
          {
                    "id": "ex-77",
                    "name": "Camisole",
                    "price": 20.0,
                    "subCategory": "Women - Inner/Night"
          },
          {
                    "id": "ex-78",
                    "name": "Shapewear",
                    "price": 20.0,
                    "subCategory": "Women - Inner/Night"
          },
          {
                    "id": "ex-79",
                    "name": "Nighty",
                    "price": 20.0,
                    "subCategory": "Women - Inner/Night"
          },
          {
                    "id": "ex-80",
                    "name": "Night suit",
                    "price": 20.0,
                    "subCategory": "Women - Inner/Night"
          },
          {
                    "id": "ex-81",
                    "name": "Robe",
                    "price": 20.0,
                    "subCategory": "Women - Inner/Night"
          }
]
      },
      {
        name: "Women - Active/Sports",
        items: [
          {
                    "id": "ex-82",
                    "name": "Sports bra",
                    "price": 20.0,
                    "subCategory": "Women - Active/Sports"
          },
          {
                    "id": "ex-83",
                    "name": "Track pants",
                    "price": 15.0,
                    "subCategory": "Women - Active/Sports"
          },
          {
                    "id": "ex-84",
                    "name": "Gym leggings",
                    "price": 20.0,
                    "subCategory": "Women - Active/Sports"
          },
          {
                    "id": "ex-85",
                    "name": "Sports T-shirt",
                    "price": 15.0,
                    "subCategory": "Women - Active/Sports"
          },
          {
                    "id": "ex-87",
                    "name": "Yoga pants",
                    "price": 15.0,
                    "subCategory": "Women - Active/Sports"
          }
]
      },
      {
        name: "Women - Accessories",
        items: [
          {
                    "id": "ex-90",
                    "name": "Shawl",
                    "price": 10.0,
                    "subCategory": "Women - Accessories"
          },
          {
                    "id": "ex-92",
                    "name": "Socks",
                    "price": 10.0,
                    "subCategory": "Women - Accessories"
          },
          {
                    "id": "ex-94",
                    "name": "Handkerchief",
                    "price": 5.0,
                    "subCategory": "Women - Accessories"
          }
]
      },
      {
        name: "Clothing",
        items: [
          {
                    "id": "ex-130",
                    "name": "Bottom",
                    "price": 20.0,
                    "subCategory": "Clothing"
          }
]
      }
    ]
  },
  {
    groupName: "Kids",
    subCategories: [
      {
        name: "Kids - Premium Wash",
        items: [
          {
                    "id": "ex-211",
                    "name": "Shirt",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-212",
                    "name": "Short",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-213",
                    "name": "Jean",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-214",
                    "name": "Track Pant",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-215",
                    "name": "Kurta",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-216",
                    "name": "Dhoti Set",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-218",
                    "name": "Frock",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-219",
                    "name": "Top",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-220",
                    "name": "Legging",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-221",
                    "name": "Skirt",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-222",
                    "name": "Silk Skirt",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-223",
                    "name": "Half Saree",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-224",
                    "name": "Ethnic Gown",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-225",
                    "name": "Romper",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-226",
                    "name": "Bodysuit",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-227",
                    "name": "Onesie",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-228",
                    "name": "Jabla",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-229",
                    "name": "Baby Frock",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-230",
                    "name": "Diaper Short",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-231",
                    "name": "Cap",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          },
          {
                    "id": "ex-232",
                    "name": "Mitten",
                    "price": 20.0,
                    "subCategory": "Kids - Premium Wash"
          }
]
      }
    ]
  },
  {
    groupName: "Household",
    subCategories: [
      {
        name: "Household - Bedroom",
        items: [
          {
                    "id": "ex-95",
                    "name": "Bedsheet Single",
                    "price": 30.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-96",
                    "name": "Pillow cover",
                    "price": 10.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-97",
                    "name": "Pillow",
                    "price": 20.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-98",
                    "name": "Cushion cover",
                    "price": 20.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-99",
                    "name": "Cushion",
                    "price": 20.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-100",
                    "name": "Blanket Single",
                    "price": 20.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-101",
                    "name": "Quilt / Razai Single",
                    "price": 20.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-102",
                    "name": "Comforter King",
                    "price": 20.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-103",
                    "name": "Mattress protector",
                    "price": 20.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-104",
                    "name": "Bedspread",
                    "price": 20.0,
                    "subCategory": "Household - Bedroom"
          },
          {
                    "id": "ex-105",
                    "name": "Bedsheet Double",
                    "price": 75.0,
                    "subCategory": "Household - Bedroom"
          }
]
      },
      {
        name: "Household - Bathroom",
        items: [
          {
                    "id": "ex-106",
                    "name": "Bath towel",
                    "price": 20.0,
                    "subCategory": "Household - Bathroom"
          },
          {
                    "id": "ex-107",
                    "name": "Hand towel",
                    "price": 10.0,
                    "subCategory": "Household - Bathroom"
          },
          {
                    "id": "ex-108",
                    "name": "Face towel",
                    "price": 10.0,
                    "subCategory": "Household - Bathroom"
          },
          {
                    "id": "ex-109",
                    "name": "Bath mat",
                    "price": 20.0,
                    "subCategory": "Household - Bathroom"
          },
          {
                    "id": "ex-110",
                    "name": "Bathrobe",
                    "price": 20.0,
                    "subCategory": "Household - Bathroom"
          }
]
      },
      {
        name: "Household - Dining",
        items: [
          {
                    "id": "ex-111",
                    "name": "Table cloth",
                    "price": 20.0,
                    "subCategory": "Household - Dining"
          },
          {
                    "id": "ex-112",
                    "name": "Table mat / Placemat",
                    "price": 20.0,
                    "subCategory": "Household - Dining"
          },
          {
                    "id": "ex-113",
                    "name": "Table runner",
                    "price": 20.0,
                    "subCategory": "Household - Dining"
          },
          {
                    "id": "ex-114",
                    "name": "Napkin",
                    "price": 20.0,
                    "subCategory": "Household - Dining"
          },
          {
                    "id": "ex-115",
                    "name": "Apron",
                    "price": 20.0,
                    "subCategory": "Household - Dining"
          },
          {
                    "id": "ex-116",
                    "name": "Kitchen towel",
                    "price": 20.0,
                    "subCategory": "Household - Dining"
          },
          {
                    "id": "ex-117",
                    "name": "Oven mitt",
                    "price": 1.0,
                    "subCategory": "Household - Dining"
          }
]
      },
      {
        name: "Household - Living",
        items: [
          {
                    "id": "ex-118",
                    "name": "Curtains Large",
                    "price": 100.0,
                    "subCategory": "Household - Living"
          },
          {
                    "id": "ex-119",
                    "name": "Door curtains XL",
                    "price": 150.0,
                    "subCategory": "Household - Living"
          },
          {
                    "id": "ex-120",
                    "name": "Sofa cover",
                    "price": 20.0,
                    "subCategory": "Household - Living"
          },
          {
                    "id": "ex-121",
                    "name": "Chair cover",
                    "price": 20.0,
                    "subCategory": "Household - Living"
          },
          {
                    "id": "ex-122",
                    "name": "Cushion",
                    "price": 20.0,
                    "subCategory": "Household - Living"
          },
          {
                    "id": "ex-123",
                    "name": "Carpet per sq ft",
                    "price": 35.0,
                    "subCategory": "Household - Living"
          },
          {
                    "id": "ex-124",
                    "name": "Rug",
                    "price": 20.0,
                    "subCategory": "Household - Living"
          },
          {
                    "id": "ex-125",
                    "name": "Floor mat",
                    "price": 30.0,
                    "subCategory": "Household - Living"
          }
]
      },
      {
        name: "Household - Misc",
        items: [
          {
                    "id": "ex-126",
                    "name": "Bag",
                    "price": 20.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-127",
                    "name": "Ironing board cover",
                    "price": 20.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-128",
                    "name": "Mosquito net",
                    "price": 20.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-129",
                    "name": "Dust cover",
                    "price": 1.0,
                    "subCategory": "Household - Misc"
          }
]
      }
    ]
  },
  {
    groupName: "Others",
    subCategories: [
      {
        name: "Men - Active/Sports",
        items: [
          {
                    "id": "ex-35",
                    "name": "Swim Suit",
                    "price": 20.0,
                    "subCategory": "Men - Active/Sports"
          }
]
      },
      {
        name: "Men - Inner/Night",
        items: [
          {
                    "id": "ex-37",
                    "name": "Muffler / Scarf",
                    "price": 10.0,
                    "subCategory": "Men - Inner/Night"
          }
]
      },
      {
        name: "Women - Active/Sports",
        items: [
          {
                    "id": "ex-86",
                    "name": "Swimwear",
                    "price": 20.0,
                    "subCategory": "Women - Active/Sports"
          }
]
      },
      {
        name: "Women - Accessories",
        items: [
          {
                    "id": "ex-88",
                    "name": "Scarf",
                    "price": 1.0,
                    "subCategory": "Women - Accessories"
          },
          {
                    "id": "ex-89",
                    "name": "Stole",
                    "price": 20.0,
                    "subCategory": "Women - Accessories"
          },
          {
                    "id": "ex-91",
                    "name": "Gloves",
                    "price": 20.0,
                    "subCategory": "Women - Accessories"
          },
          {
                    "id": "ex-93",
                    "name": "Cap",
                    "price": 20.0,
                    "subCategory": "Women - Accessories"
          }
]
      },
      {
        name: "Clothing",
        items: [
          {
                    "id": "ex-131",
                    "name": "Swim suit",
                    "price": 20.0,
                    "subCategory": "Clothing"
          }
]
      },
      {
        name: "Institutional - Upper Wear",
        items: [
          {
                    "id": "ex-163",
                    "name": "Coverall",
                    "price": 20.0,
                    "subCategory": "Institutional - Upper Wear"
          }
]
      },
      {
        name: "Others - Upper Wear",
        items: [
          {
                    "id": "ex-180",
                    "name": "Monkey Cap",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-181",
                    "name": "Raincoat",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-182",
                    "name": "Swimwear",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-184",
                    "name": "Glove",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-185",
                    "name": "Scarf",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-186",
                    "name": "Stole",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-187",
                    "name": "Belt",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-188",
                    "name": "Cap",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          },
          {
                    "id": "ex-189",
                    "name": "Mask",
                    "price": 20.0,
                    "subCategory": "Others - Upper Wear"
          }
]
      },
      {
        name: "Household - Misc",
        items: [
          {
                    "id": "ex-191",
                    "name": "Pillow Cover",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-192",
                    "name": "Cushion Cover",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-193",
                    "name": "Blanket",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-194",
                    "name": "Quilt",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-195",
                    "name": "Comforter",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-196",
                    "name": "Mattress Protector",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-197",
                    "name": "Towel",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-198",
                    "name": "Bath Towel",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-199",
                    "name": "Hand Towel",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-200",
                    "name": "Face Towel",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-201",
                    "name": "Bathrobe",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-202",
                    "name": "Apron",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-203",
                    "name": "Kitchen Towel",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-204",
                    "name": "Table Cloth",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-205",
                    "name": "Table Runner",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-206",
                    "name": "Napkin",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-207",
                    "name": "Curtain",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-208",
                    "name": "Sofa Cover",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          },
          {
                    "id": "ex-209",
                    "name": "Door Curtain",
                    "price": 23.0,
                    "subCategory": "Household - Misc"
          }
]
      },
      {
        name: "Regular - Cloths",
        items: [
          {
                    "id": "ex-234",
                    "name": "SHOES CLEAN ",
                    "price": 200.0,
                    "subCategory": "Regular - Cloths"
          }
]
      }
    ]
  }
];
