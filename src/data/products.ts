import type { Product, ProductId } from '../types';

export const PRODUCTS: Product[] = [
  {
    id: 'CIC',
    name: 'Tamamen Kanal İçi',
    shortName: 'CIC',
    icon: '🔵',
    price: 850,
    description: 'Neredeyse görünmez. Hafif işitme kaybı için en iyisi.',
    badgeClass: 'cic',
    suitableFor: ['mild'],
    unlockDay: 1,
    color: '#9b59b6',
  },
  {
    id: 'RIC',
    name: 'Kanal İçi Alıcı',
    shortName: 'RIC',
    icon: '🟡',
    price: 1200,
    description: 'Estetik ve konforlu. Hafiften ortaya.',
    badgeClass: 'ric',
    suitableFor: ['mild', 'moderate'],
    unlockDay: 1,
    color: '#f5c518',
  },
  {
    id: 'ITE',
    name: 'Kulak İçi',
    shortName: 'ITE',
    icon: '🟢',
    price: 1500,
    description: 'Özel kalıp. Hafiften ortaya kayıp.',
    badgeClass: 'ite',
    suitableFor: ['mild', 'moderate'],
    unlockDay: 1,
    color: '#27ae60',
  },
  {
    id: 'BTE',
    name: 'Kulak Arkası',
    shortName: 'BTE',
    icon: '🔷',
    price: 1800,
    description: 'Güçlü ve çok yönlü. Hafiften ileriye.',
    badgeClass: 'bte',
    suitableFor: ['mild', 'moderate', 'severe'],
    unlockDay: 1,
    color: '#4f8ef7',
  },
  {
    id: 'BCH',
    name: 'Kemik Yolu',
    shortName: 'BCH',
    icon: '🔴',
    price: 2200,
    description: 'Dış kulağı devre dışı bırakır. İletim tipi kayıp için.',
    badgeClass: 'bch',
    suitableFor: ['conductive'],
    unlockDay: 3,
    color: '#e74c3c',
  },
  {
    id: 'SMART',
    name: 'Premium Akıllı',
    shortName: 'SMART',
    icon: '🌟',
    price: 3500,
    description: 'Yapay zeka destekli, Bluetooth. İleri ve çok ileri.',
    badgeClass: 'prem',
    suitableFor: ['severe', 'profound'],
    unlockDay: 5,
    color: '#00c9a7',
  },
];

export const PRODUCT_MAP = new Map<ProductId, Product>(
  PRODUCTS.map(p => [p.id, p])
);

export function getAvailableProducts(unlockedDay: number): Product[] {
  return PRODUCTS.filter(p => p.unlockDay <= unlockedDay);
}
