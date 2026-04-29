import type { CustomerProfile, HearingLossLevel, ProductId } from '../types';

type CustomerTemplate = Omit<CustomerProfile, 'id'>;

const TEMPLATES: CustomerTemplate[] = [
  {
    name: 'Müzeyyen', age: 72, emoji: '👵',
    description: 'Emekli öğretmen — konuşmaları duymakta zorlanıyor',
    lossLevel: 'moderate', isConductive: false, idealProduct: 'ITE',
    patience: 45, waitColor: '#27ae60',
  },
  {
    name: 'Hasan', age: 80, emoji: '👴',
    description: 'Eski asker — on yıllarca yüksek gürültüye maruz kalmış',
    lossLevel: 'severe', isConductive: false, idealProduct: 'BTE',
    patience: 55, waitColor: '#27ae60',
  },
  {
    name: 'Selin', age: 34, emoji: '👩',
    description: 'Müzik öğretmeni — hafif yüksek frekans kaybı',
    lossLevel: 'mild', isConductive: false, idealProduct: 'RIC',
    patience: 35, waitColor: '#f5c518',
  },
  {
    name: 'Deniz', age: 28, emoji: '🧑',
    description: 'Yazılım mühendisi — gizli çözüm istiyor',
    lossLevel: 'mild', isConductive: false, idealProduct: 'CIC',
    patience: 30, waitColor: '#f5c518',
  },
  {
    name: 'Ece', age: 45, emoji: '👱‍♀️',
    description: 'Otoskleroz ile doğmuş — kemik yolu sorunu',
    lossLevel: 'conductive', isConductive: true, idealProduct: 'BCH',
    patience: 50, waitColor: '#27ae60',
  },
  {
    name: 'Görkem', age: 88, emoji: '🧓',
    description: 'İleri derece işitme kaybı — maksimum güçlendirme gerekiyor',
    lossLevel: 'profound', isConductive: false, idealProduct: 'SMART',
    patience: 60, waitColor: '#27ae60',
  },
  {
    name: 'Ayşe', age: 55, emoji: '👩‍🦱',
    description: 'Sık konserlere gider — orta derece çift taraflı kayıp',
    lossLevel: 'moderate', isConductive: false, idealProduct: 'BTE',
    patience: 40, waitColor: '#f5c518',
  },
  {
    name: 'Tayfun', age: 62, emoji: '🧔',
    description: 'İnşaat işçisi — düşük frekanslı işitme hasarı',
    lossLevel: 'severe', isConductive: false, idealProduct: 'BTE',
    patience: 45, waitColor: '#27ae60',
  },
  {
    name: 'Lale', age: 19, emoji: '👧',
    description: 'Üniversite öğrencisi — kulaklık kaynaklı hafif kayıp',
    lossLevel: 'mild', isConductive: false, idealProduct: 'CIC',
    patience: 25, waitColor: '#e74c3c',
  },
  {
    name: 'Rıfat', age: 76, emoji: '👨‍🦳',
    description: 'Yaşa bağlı işitme kaybı — presbiakuzi',
    lossLevel: 'moderate', isConductive: false, idealProduct: 'RIC',
    patience: 50, waitColor: '#27ae60',
  },
];

let _nextId = 1;

export function spawnCustomer(day: number): CustomerProfile {
  // Progressively harder: earlier days favor simpler cases
  const maxIdx = Math.min(TEMPLATES.length - 1, 3 + (day - 1) * 2);
  const idx = Math.floor(Math.random() * (maxIdx + 1));
  const t = TEMPLATES[idx];
  return { ...t, id: _nextId++ };
}

export function resetCustomerIds(): void {
  _nextId = 1;
}

/** Generate synthetic audiogram data for a given loss level */
export const AUDIOGRAM_PROFILES: Record<HearingLossLevel, Record<number, boolean>> = {
  normal:     { 250: true,  500: true,  1000: true,  2000: true,  4000: true,  8000: true  },
  mild:       { 250: true,  500: true,  1000: true,  2000: true,  4000: false, 8000: false },
  moderate:   { 250: true,  500: true,  1000: false, 2000: false, 4000: false, 8000: false },
  severe:     { 250: true,  500: false, 1000: false, 2000: false, 4000: false, 8000: false },
  profound:   { 250: false, 500: false, 1000: false, 2000: false, 4000: false, 8000: false },
  conductive: { 250: false, 500: false, 1000: true,  2000: true,  4000: true,  8000: true  },
};

export const IDEAL_PRODUCT_FOR: Record<ProductId, string[]> = {
  CIC:   ['Mild, discreet preference'],
  RIC:   ['Mild to moderate, comfort-focused'],
  ITE:   ['Mild to moderate, custom fit'],
  BTE:   ['Moderate to severe, powerful'],
  BCH:   ['Conductive or single-sided loss'],
  SMART: ['Severe to profound, premium tech'],
};
