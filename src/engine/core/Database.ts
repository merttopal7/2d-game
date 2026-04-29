import Dexie, { type Table } from 'dexie';

export interface GameState {
  id?: number;
  key: string;
  value: any;
}

export interface PlantState {
  id?: number;
  map: string;
  x: number;
  y: number;
  type: string;
  waterLevel: number;
  lastWatered: number;
}

export class ShopDatabase extends Dexie {
  gameState!: Table<GameState>;
  plants!: Table<PlantState>;

  constructor() {
    super('ShopGameDB');
    this.version(1).stores({
      gameState: '++id, key',
      plants: '++id, map, type'
    });
    this.version(2).stores({
      gameState: '++id, key',
      plants: '++id, map, type, lastWatered'
    });
  }

  async setVal(key: string, value: any) {
    const existing = await this.gameState.where('key').equals(key).first();
    if (existing) {
      await this.gameState.update(existing.id!, { value });
    } else {
      await this.gameState.add({ key, value });
    }
  }

  async getVal(key: string, defaultValue: any = null) {
    const item = await this.gameState.where('key').equals(key).first();
    return item ? item.value : defaultValue;
  }
}

export const db = new ShopDatabase();
