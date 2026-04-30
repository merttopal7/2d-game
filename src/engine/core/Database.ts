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

  async exportData() {
    const gameState = await this.gameState.toArray();
    const plants = await this.plants.toArray();
    return JSON.stringify({ gameState, plants, timestamp: Date.now(), version: 2 });
  }

  async importData(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.gameState || !data.plants) throw new Error("Geçersiz yedek dosyası");
      
      await this.transaction('rw', this.gameState, this.plants, async () => {
        await this.gameState.clear();
        await this.plants.clear();
        // Remove IDs to avoid conflicts and let auto-increment handle it
        const cleanGS = data.gameState.map((i: any) => { const {id, ...rest} = i; return rest; });
        const cleanPlants = data.plants.map((i: any) => { const {id, ...rest} = i; return rest; });
        
        await this.gameState.bulkAdd(cleanGS);
        await this.plants.bulkAdd(cleanPlants);
      });
      return true;
    } catch (e) {
      console.error("Backup Import Error:", e);
      return false;
    }
  }
}

export const db = new ShopDatabase();
