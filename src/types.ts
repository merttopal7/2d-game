// ─── Shared Types ─────────────────────────────────────────────────────────────

export type HearingLossLevel = 'normal' | 'mild' | 'moderate' | 'severe' | 'profound' | 'conductive';
export type ProductId = 'CIC' | 'RIC' | 'ITE' | 'BTE' | 'BCH' | 'SMART';

export interface FrequencyResult {
  freq: number;
  canHear: boolean;
}

export interface AudiogramData {
  results: FrequencyResult[];
  lossLevel: HearingLossLevel;
  isConductive: boolean;
}

export interface Product {
  id: ProductId;
  name: string;
  shortName: string;
  icon: string;
  price: number;
  description: string;
  badgeClass: string;
  suitableFor: HearingLossLevel[];
  unlockDay: number;
  color: string;
}

export interface CustomerProfile {
  id: number;
  name: string;
  age: number;
  emoji: string;
  description: string;
  lossLevel: HearingLossLevel;
  isConductive: boolean;
  idealProduct: ProductId;
  patience: number;     // seconds before they leave
  waitColor: string;    // color of patience bar
  headStyle: number;    // index for drawing custom head (0-9)
}

export interface SaleRecord {
  customerId: number;
  productId: ProductId;
  isPerfect: boolean;
  earnings: number;
}

export interface GameState {
  day: number;
  money: number;
  score: number;
  totalServed: number;
  dayEarnings: number;
  dayServed: number;
  dayPerfect: number;
  daySales: SaleRecord[];
  unlockedProducts: Set<ProductId>;
  isPaused: boolean;
  isRunning: boolean;
  dayDuration: number;   // seconds
  dayTimeLeft: number;
  highScore: number;
  bestEarnings: number;
}

export type ScreenId =
  | 'screen-title'
  | 'screen-howto'
  | 'screen-game'
  | 'screen-summary'
  | 'screen-gameover'
  | 'screen-pause';
