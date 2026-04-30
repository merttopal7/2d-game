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

    // Interior Details (Seating Area)
    const tables = [
      {x: 1000, y: 200}, {x: 1450, y: 200}, {x: 1900, y: 200},
      {x: 1000, y: 430}, {x: 1450, y: 430}, {x: 1900, y: 430}
    ];
    tables.forEach(t => {
      // Chairs (4 around each table)
      const chairDistance = 75;
      const chairRadius = 22;
      const chairPositions = [
        {dx: -chairDistance, dy: 0},
        {dx: chairDistance, dy: 0},
        {dx: 0, dy: -chairDistance},
        {dx: 0, dy: chairDistance}
      ];
      
      chairPositions.forEach(pos => {
        ctx.fillStyle = '#3e2723'; // Chair frame/legs
        ctx.beginPath(); ctx.arc(t.x + pos.dx, t.y + pos.dy, chairRadius + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5d4037'; // Chair seat
        ctx.beginPath(); ctx.arc(t.x + pos.dx, t.y + pos.dy, chairRadius, 0, Math.PI * 2); ctx.fill();
      });

      // Larger Table
      ctx.fillStyle = '#5d4037';
      ctx.beginPath(); ctx.arc(t.x, t.y, 70, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Table detail
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.arc(t.x, t.y, 60, 0, Math.PI * 2); ctx.stroke();
    });

    // ─── RECTANGULAR MODERN BUFFET ───
    const bx = 100, by = 60, bw = 600, bh = 200;
    
    // 1. Back Wall & Shelves
    ctx.fillStyle = '#2c1b0e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
    
    // Shelves with items
    for(let sy = by + 50; sy < by + bh - 40; sy += 60) {
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(bx + 10, sy, bw - 20, 8);
      // Small decorative boxes on shelves
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(bx + 40, sy - 20, 30, 20);
      ctx.fillRect(bx + 120, sy - 20, 25, 20);
    }

    // 2. The Cashier (Full Character Style)
    const cx = bx + 180, cy = by + bh - 80;
    ctx.save();
    ctx.translate(cx, cy);
    
    // Body (Character Style)
    ctx.fillStyle = '#2c3e50'; // Apron/Uniform
    ctx.beginPath();
    ctx.moveTo(-22, 25);
    ctx.bezierCurveTo(-25, -25, 25, -25, 22, 25);
    ctx.fill();
    // Arms
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-25, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(25, 20); ctx.stroke();
    
    // Head (Matching Ayşe - Case 7)
    ctx.save();
    ctx.translate(0, -35);
    ctx.scale(0.55, 0.55);
    
    // Ayşe's Hair (Black curly voluminous)
    ctx.fillStyle = '#1a1008';
    ctx.beginPath(); ctx.ellipse(0, -24, 31, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-27, -4, 10, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(27, -4, 10, 24, 0, 0, Math.PI * 2); ctx.fill();

    // Face
    ctx.fillStyle = '#fce2c4';
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2); ctx.fill();

    // Eyes & Face details (Ayşe style)
    const drawEye = (ex: number, ey: number, color: string) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex, ey, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
    };
    drawEye(-9, -2, '#1a0a00');
    drawEye(9, -2, '#1a0a00');
    
    // Lips
    ctx.fillStyle = 'rgba(210,90,90,0.62)';
    ctx.beginPath(); ctx.ellipse(0, 16, 7.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();

    // Chef Hat (Keep it on top of Ayşe's hair)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(-22, -58, 44, 20, 4); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -60, 26, 16, 0, 0, Math.PI * 2); ctx.fill();
    
    ctx.restore();
    ctx.restore();

    // 3. Rectangular Counter
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(bx - 20, by + bh - 40, bw + 40, 60);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 4;
    ctx.strokeRect(bx - 20, by + bh - 40, bw + 40, 60);
    
    // 4. Coffee Cups on Top
    const cupX = bx + bw - 150;
    const cupY = by + bh - 45;
    for(let i=0; i<3; i++) {
      ctx.save();
      ctx.translate(cupX + i*40, cupY);
      // Cup shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(0, 5, 12, 4, 0, 0, Math.PI*2); ctx.fill();
      // Cup body
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(10, -18); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
      // Sleeve (brown)
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-9, -12, 18, 8);
      // Lid
      ctx.fillStyle = '#333';
      ctx.fillRect(-11, -20, 22, 4);
      ctx.restore();
    }

    // 5. Signage
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('STARBUCKS CAFE', bx + bw/2, by + 30);

    // Exterior (Sidewalk, Road, Garden, Cars)
    this.drawCommonBackground(ctx, W, H);
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

    // Interior Details
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

    // Counter area on minimap
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(mmX + 100 * scale, mmY + 80 * scale, 600 * scale, 140 * scale);
    
    // Interactive dot
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(mmX + 400 * scale, mmY + 150 * scale, 4, 0, Math.PI * 2);
    ctx.fill();

    this.drawCommonMiniMap(ctx, mmX, mmY, mmW, mmH, scale);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText('KAFE', mmX + 6, mmY + 12);

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
