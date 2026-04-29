import { BaseMap } from './BaseMap';
import { Plant } from '../entities/Plant';
import { db } from '../core/Database';

export class CafeMap extends BaseMap {
  async initPlants() {
    this.renderer.plants = [];
    const W = this.renderer.MAP_W, H = this.renderer.MAP_H;

    const savedPlants = await db.plants.where('map').equals('cafe').toArray();
    if (savedPlants.length > 0) {
      this.renderer.plants = savedPlants.map((s) => {
        const plant = new Plant(s.x, s.y, s.type as any, s.type === 'flower');
        plant.waterLevel = s.waterLevel;
        plant.lastWatered = s.lastWatered ?? Date.now();
        plant.isWatered = plant.waterLevel > 20;
        return plant;
      });
    } else {
      // Default Cafe Trees
      for (let i = 100; i < W; i += 250) {
        this.renderer.plants.push(new Plant(i, 880 + (Math.random() - 0.5) * 40, 'tree', false));
        this.renderer.plants.push(new Plant(i + 120, 920 + (Math.random() - 0.5) * 40, 'tree', false));
      }

      for (const p of this.renderer.plants) {
        await db.plants.add({
          map: 'cafe', x: p.x, y: p.y, type: p.type, waterLevel: p.waterLevel, lastWatered: p.lastWatered
        });
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const sidewalkY = 560;
    const roadY = 640;
    const gardenY = 800;

    // Floor
    const plankW = 120, plankH = 40;
    for (let y = 0; y < sidewalkY; y += plankH) {
      for (let x = 0; x < W; x += plankW) {
        ctx.fillStyle = (Math.floor(x/plankW) + Math.floor(y/plankH)) % 2 === 0 ? '#3e2723' : '#4e342e';
        ctx.fillRect(x, y, plankW, plankH);
      }
    }

    // Interior Details (Counter, Tables)
    ctx.fillStyle = '#2c1b0e';
    this.roundRect(ctx, 100, 100, 600, 80, 10);
    ctx.fill();

    const tables = [
      {x: 1000, y: 250}, {x: 1400, y: 250}, {x: 1800, y: 250},
      {x: 1000, y: 450}, {x: 1400, y: 450}, {x: 1800, y: 450}
    ];
    tables.forEach(t => {
      ctx.fillStyle = '#5d4037';
      ctx.beginPath(); ctx.arc(t.x, t.y, 60, 0, Math.PI * 2); ctx.fill();
    });

    // Exterior
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, sidewalkY, W, roadY - sidewalkY);
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, roadY, W, gardenY - roadY);
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(0, gardenY, W, H - gardenY);

    this.renderer.cars.forEach((car: any) => car.draw(ctx));

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('☕ STARBUCKS CAFE', 400, 160);
  }

  drawMiniMap(ctx: CanvasRenderingContext2D, mmX: number, mmY: number, mmW: number, mmH: number, scale: number) {
    ctx.save();

    // Background card
    ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
    this.roundRect(ctx, mmX, mmY, mmW, mmH, 12);
    ctx.fill();

    // === ZONES ===
    // Interior floor (warm wood tones)
    ctx.fillStyle = '#2c1b0e';
    ctx.fillRect(mmX, mmY, mmW, 560 * scale);

    // Tables in cafe
    const tables = [
      {x: 1000, y: 250}, {x: 1400, y: 250}, {x: 1800, y: 250},
      {x: 1000, y: 450}, {x: 1400, y: 450}, {x: 1800, y: 450}
    ];
    ctx.fillStyle = 'rgba(0, 201, 167, 0.35)';
    tables.forEach(t => {
      ctx.beginPath();
      ctx.arc(mmX + t.x * scale, mmY + t.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Counter area
    ctx.fillStyle = 'rgba(139, 90, 43, 0.5)';
    ctx.fillRect(mmX + 2, mmY + 4, mmW * 0.25, 8 * scale);

    // Sidewalk (grey strip)
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(mmX, mmY + 560 * scale, mmW, 80 * scale);

    // Road (dark asphalt)
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(mmX, mmY + 640 * scale, mmW, 100 * scale);
    // Road lane dashes
    ctx.fillStyle = '#f6e05e';
    for (let lx = mmX + 10; lx < mmX + mmW - 10; lx += 14 * scale + 6) {
      ctx.fillRect(lx, mmY + 690 * scale, 10 * scale, 2 * scale);
    }

    // Garden / grass strip
    ctx.fillStyle = '#276742';
    ctx.fillRect(mmX, mmY + 740 * scale, mmW, (this.renderer.MAP_H - 740) * scale);
    // Garden texture dots
    ctx.fillStyle = '#38a169';
    for (let gx = mmX + 4; gx < mmX + mmW - 4; gx += 8 * scale) {
      ctx.fillRect(gx, mmY + 760 * scale, 3 * scale, 3 * scale);
    }

    ctx.restore();

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 8px Outfit';
    ctx.fillText('KAFE', mmX + 6, mmY + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '7px Outfit';
    ctx.fillText('BAHÇE', mmX + 6, mmY + mmH - 6);
  }
}
