export type InventoryCategory = 'flowers' | 'plants' | 'hearing-aid-devices';

export interface InventoryItem {
  id: string;
  category: InventoryCategory;
  name: string;
  image: string;
  sku: string;
  unitPrice: number;
  stock: number;
  reorderLevel: number;
}

export const INVENTORY: InventoryItem[] = [
  {
    id: 'flower-rose-red',
    category: 'flowers',
    name: 'Red Rose Bouquet',
    image: '??',
    sku: 'FLW-ROSE-RED-001',
    unitPrice: 25,
    stock: 5,
    reorderLevel: 2,
  },
  {
    id: 'haid-consultation-sync',
    category: 'hearing-aid-devices',
    name: 'Hearing Aid and sync with consultation panel',
    image: '??',
    sku: 'HAD-CONSULT-SYNC-001',
    unitPrice: 1200,
    stock: 5,
    reorderLevel: 2,
  },
];

export function getInventoryByCategory(category: InventoryCategory): InventoryItem[] {
  return INVENTORY.filter((item) => item.category === category);
}

export function getLowStockItems(): InventoryItem[] {
  return INVENTORY.filter((item) => item.stock <= item.reorderLevel);
}
