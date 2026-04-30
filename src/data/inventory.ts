export type InventoryCategory = 'flowers' | 'plants' | 'hearing-aid-devices' | 'food';

export interface InventoryItem {
  id: string;
  category: InventoryCategory;
  name: string;
  image: string;
  sku: string;
  unitPrice: number;
  purchasePrice: number; // New field for buying at market
  stock: number;
  reorderLevel: number;
}

export const INVENTORY: InventoryItem[] = [
  {
    id: 'food-fish-bread',
    category: 'food',
    name: 'Balık Ekmek',
    image: 'sandwich',
    sku: 'FOD-FISH-BREAD-001',
    unitPrice: 35,
    purchasePrice: 35,
    stock: 0,
    reorderLevel: 5,
  },
  {
    id: 'kahve',
    category: 'food',
    name: 'Kahve',
    image: 'coffee',
    sku: 'FOD-COFFEE-001',
    unitPrice: 15,
    purchasePrice: 15,
    stock: 0,
    reorderLevel: 10,
  },
  {
    id: 'flower-rose-red',
    category: 'flowers',
    name: 'Kırmızı Gül Buketi',
    image: 'flower-2',
    sku: 'FLW-ROSE-RED-001',
    unitPrice: 25,
    purchasePrice: 25,
    stock: 5,
    reorderLevel: 2,
  },
  {
    id: 'plant-snake',
    category: 'plants',
    name: 'Paşa Kılıcı',
    image: 'flower-2',
    sku: 'PLN-SNAKE-001',
    unitPrice: 45,
    purchasePrice: 45,
    stock: 3,
    reorderLevel: 1,
  },
  // İşitme Cihazları
  {
    id: 'CIC',
    category: 'hearing-aid-devices',
    name: 'Tamamen Kanal İçi (CIC)',
    image: 'ear',
    sku: 'HAD-CIC-001',
    unitPrice: 850,
    purchasePrice: 1,
    stock: 5,
    reorderLevel: 2,
  },
  {
    id: 'RIC',
    category: 'hearing-aid-devices',
    name: 'Kanal İçi Alıcı (RIC)',
    image: 'ear',
    sku: 'HAD-RIC-001',
    unitPrice: 1200,
    purchasePrice: 1,
    stock: 5,
    reorderLevel: 2,
  },
  {
    id: 'ITE',
    category: 'hearing-aid-devices',
    name: 'Kulak İçi (ITE)',
    image: 'ear',
    sku: 'HAD-ITE-001',
    unitPrice: 1500,
    purchasePrice: 1,
    stock: 5,
    reorderLevel: 2,
  },
  {
    id: 'BTE',
    category: 'hearing-aid-devices',
    name: 'Kulak Arkası (BTE)',
    image: 'ear',
    sku: 'HAD-BTE-001',
    unitPrice: 1800,
    purchasePrice: 1,
    stock: 5,
    reorderLevel: 2,
  },
  {
    id: 'BCH',
    category: 'hearing-aid-devices',
    name: 'Kemik Yolu (BCH)',
    image: 'ear',
    sku: 'HAD-BCH-001',
    unitPrice: 2200,
    purchasePrice: 1,
    stock: 2,
    reorderLevel: 1,
  },
  {
    id: 'SMART',
    category: 'hearing-aid-devices',
    name: 'Premium Akıllı (SMART)',
    image: 'ear',
    sku: 'HAD-SMART-001',
    unitPrice: 3500,
    purchasePrice: 1,
    stock: 1,
    reorderLevel: 0,
  },
];

export function getInventoryByCategory(category: InventoryCategory): InventoryItem[] {
  return INVENTORY.filter((item) => item.category === category);
}

export function getLowStockItems(): InventoryItem[] {
  return INVENTORY.filter((item) => item.stock <= item.reorderLevel);
}
