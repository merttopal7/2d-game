import { BaseMap } from './BaseMap';
import { Plant } from '../entities/Plant';
import { db } from '../core/Database';

export class ShopMap extends BaseMap {
  async initPlants() {
    this.renderer.plants = [];
    const W = this.renderer.MAP_W, H = this.renderer.MAP_H;
    const floorY = H * 0.20;
    const midX = W * 0.70;
    const sidewalkY = 560;

    const savedPlants = await db.plants.where('map').equals('shop').toArray();
    if (savedPlants.length > 0) {
      this.renderer.plants = savedPlants.map((s) => {
        const plant = new Plant(s.x, s.y, s.type as any, s.type === 'flower');
        plant.waterLevel = s.waterLevel;
        plant.lastWatered = s.lastWatered ?? Date.now();
        plant.isWatered = plant.waterLevel > 20;
        return plant;
      });
    } else {
      // Do not add any flowers to the room on first open
      // Only add trees as before
      for (let i = 100; i < W; i += 250) {
        this.renderer.plants.push(new Plant(i, 880 + (Math.random() - 0.5) * 40, 'tree', false));
        this.renderer.plants.push(new Plant(i + 120, 920 + (Math.random() - 0.5) * 40, 'tree', false));
      }
      for (const p of this.renderer.plants) {
        await db.plants.add({
          map: 'shop', x: p.x, y: p.y, type: p.type, waterLevel: p.waterLevel, lastWatered: p.lastWatered
        });
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const midX = W * 0.70;
    const tileSize = 60;
    const cols = Math.ceil(W / tileSize);
    const rows = Math.ceil(H / tileSize);
    const sidewalkY = 560;
    const roadY = 640;
    const gardenY = 800;
    const floorY = H * 0.20;

    // 1. Floors
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        if (y >= sidewalkY) continue;
        if (x < midX) {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#1f1b18' : '#26211e';
        } else {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#162436' : '#1a2a3e';
        }
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // 2. Common Background (Sidewalk, Road, Garden, Cars)
    this.drawCommonBackground(ctx, W, H);

    // 3. New Objects: Benches (Waiting Room)
    [0.15, 0.45].forEach((xr) => {
      const bx = W * xr, by = floorY + 100;
      // Bench Frame
      ctx.fillStyle = '#2c3e50';
      this.roundRect(ctx, bx, by, 160, 45, 8); ctx.fill();
      ctx.fillStyle = '#1a252f';
      ctx.fillRect(bx + 10, by + 45, 10, 20); // legs
      ctx.fillRect(bx + 140, by + 45, 10, 20);
    });

    // 4. New Objects: Computer Desk & Monitor (Consultation Room)
    const deskX = midX + 100, deskY = floorY + 120;
    // Desk
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(deskX, deskY, 150, 10); // top
    ctx.fillStyle = '#2c1b0e';
    ctx.fillRect(deskX + 10, deskY + 10, 10, 50); // legs
    ctx.fillRect(deskX + 130, deskY + 10, 10, 50);

    // Monitor (using renderer helper)
    this.renderer.drawMonitor(ctx, deskX + 30, deskY - 70);

    // 5. Existing Props (Vending Machine, Display Case, etc.)
    this.renderer.drawVendingMachine(ctx, W * 0.05, floorY + 20);
    this.renderer.drawDisplayCase(ctx, midX - 180, floorY + 20);
    this.renderer.drawFilingCabinet(ctx, W - 100, floorY + 20);

    // Sign
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SONA İŞİTME MERKEZİ', midX / 2, 40);
  }

  drawMiniMap(ctx: CanvasRenderingContext2D, mmX: number, mmY: number, mmW: number, mmH: number, scale: number) {
    const W = this.renderer.MAP_W;
    ctx.save();

    // Background card
    ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
    this.roundRect(ctx, mmX, mmY, mmW, mmH, 12);
    ctx.fill();

    // === ZONES ===
    // Interior floor (darker warm tile)
    ctx.fillStyle = '#2a1f14';
    ctx.fillRect(mmX, mmY, mmW * 0.70, 560 * scale);

    // Waiting area (slightly lighter)
    ctx.fillStyle = '#312515';
    ctx.fillRect(mmX + mmW * 0.70, mmY, mmW * 0.30, 560 * scale);

    this.drawCommonMiniMap(ctx, mmX, mmY, mmW, mmH, scale);

    // Divider line (interior wall)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mmX + mmW * 0.70, mmY);
    ctx.lineTo(mmX + mmW * 0.70, mmY + 560 * scale);
    ctx.stroke();

    // Exam / clinic room
    ctx.fillStyle = 'rgba(79, 142, 247, 0.25)';
    ctx.fillRect(mmX + 4, mmY + 4, mmW * 0.30, 200 * scale);

    ctx.restore();

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 8px Outfit';
    ctx.fillText('MAĞAZA', mmX + 6, mmY + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '7px Outfit';
    ctx.fillText('BAHÇE', mmX + 6, mmY + mmH - 6);
  }
}
