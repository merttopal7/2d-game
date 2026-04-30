import { BaseMap } from './BaseMap';
import { Plant } from '../entities/Plant';

export class SamandagMap extends BaseMap {
  constructor(renderer: any) {
    super(renderer);
  }

  async initPlants() {
    this.renderer.plants = [];
    const W = this.renderer.MAP_W;

    // Samandağ specific trees (Palm Trees)
    for (let i = 100; i < W; i += 300) {
      this.renderer.plants.push(new Plant(i, 880 + (Math.random() - 0.5) * 40, 'palm', false));
      this.renderer.plants.push(new Plant(i + 150, 920 + (Math.random() - 0.5) * 40, 'palm', false));
    }
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // 1. Sand (Beach)
    ctx.fillStyle = '#f3e5ab'; // Light sand color
    ctx.fillRect(0, 0, W, H);

    // 2. Sea (Ocean)
    // The sea starts from the top and goes down to about 30% of the map
    const seaHeight = H * 0.30;
    const seaGrad = ctx.createLinearGradient(0, 0, 0, seaHeight);
    seaGrad.addColorStop(0, '#1e3c72');
    seaGrad.addColorStop(1, '#2a5298');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, W, seaHeight);

    // 3. Waves (White foam)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 30]);
    for (let i = 0; i < 5; i++) {
        const y = seaHeight - 10 - i * 5;
        const offset = Math.sin(Date.now() * 0.001 + i) * 20;
        ctx.beginPath();
        ctx.moveTo(-50 + offset, y);
        for (let x = 0; x < W + 100; x += 100) {
            ctx.quadraticCurveTo(x + 50 + offset, y - 10, x + 100 + offset, y);
        }
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // 4. Common Background (Sidewalk, Road, Garden, Cars)
    this.drawCommonBackground(ctx, W, H);

    // 6. Beach Umbrellas (Moved away from seating area)
    this.drawUmbrella(ctx, 400, 480, '#e74c3c');
    this.drawUmbrella(ctx, 800, 520, '#3498db');
    this.drawUmbrella(ctx, 1200, 490, '#f1c40f');

    // 7. Balık Ekmekçi Büfesi & Seating Area
    this.drawRoof(ctx, 1600, 360, 450, 140); // Shelter for stove and tables
    this.drawSeatingArea(ctx, 1700, 440);
    this.drawStove(ctx, 1620, 440);
    this.drawBuffet(ctx, 2100, 380);

    // 8. Cars
    this.renderer.cars.forEach((car: any) => car.draw(ctx));
  }

  private drawSeatingArea(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Two large prominent tables on sand
    const tables = [
      { x: x, y: y },
      { x: x + 180, y: y }
    ];

    tables.forEach(t => {
      // Large Table top
      ctx.fillStyle = '#795548';
      ctx.fillRect(t.x, t.y, 120, 60);
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 3;
      ctx.strokeRect(t.x, t.y, 120, 60);
      
      // Long benches on sides
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(t.x - 20, t.y + 5, 18, 50); // Left bench
      ctx.fillRect(t.x + 122, t.y + 5, 18, 50); // Right bench
    });
  }

  private drawStove(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Soba (Stove) body
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, 40, 60);
    
    // Soba pipe
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 15, y - 40, 10, 40);
    
    // Fire glow effect (animated)
    const glow = Math.sin(Date.now() / 200) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(231, 76, 60, ${0.4 + glow * 0.4})`;
    ctx.beginPath();
    ctx.arc(x + 20, y + 40, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Metallic details
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 40, 60);
    
    // Firewood below
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x + 5, y + 55, 10, 5);
    ctx.fillRect(x + 25, y + 55, 10, 5);
  }

  private drawRoof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // Pillars
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(x, y, 6, h + 40);
    ctx.fillRect(x + w - 6, y, 6, h + 40);
    
    // Thin Roof structure
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 20, y - 10, w + 40, 12);
    ctx.strokeStyle = '#2c1e0f';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 20, y - 10, w + 40, 12);
    
    // Some planks texture
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    for(let px = x - 10; px < x + w + 20; px += 40) {
      ctx.moveTo(px, y - 10);
      ctx.lineTo(px, y + 2);
    }
    ctx.stroke();
  }

  private drawBuffet(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // 1. Structure (Wooden Shack) - Larger size
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x, y, 220, 140); // Main body
    
    // Roof - Larger and more prominent
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x + 110, y - 50);
    ctx.lineTo(x + 235, y);
    ctx.closePath();
    ctx.fill();

    // 2. Counter / Window - Larger
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x + 25, y + 35, 170, 60);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 25, y + 35, 170, 60);

    // 3. Signage - Larger
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x + 35, y - 12, 150, 30);
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 35, y - 12, 150, 30);
    
    // Draw Fish Icon on Sign
    ctx.save();
    ctx.translate(x + 55, y + 2);
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); // body
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-12, -4); ctx.lineTo(-12, 4); ctx.closePath(); ctx.fill(); // tail
    ctx.restore();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BALIK EKMEKÇİ', x + 115, y + 8);

    // 4. Decorations (Replacing 🥪 and 🐟 emojis with drawings)
    
    // Draw Fish Decoration
    ctx.save();
    ctx.translate(x + 155, y + 65);
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#34495e';
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-15, -5); ctx.lineTo(-15, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -1, 1.5, 0, Math.PI*2); ctx.fill(); // eye
    ctx.restore();

    // Draw Sandwich Decoration
    ctx.save();
    ctx.translate(x + 65, y + 65);
    ctx.scale(1.2, 1.2);
    // Bread
    ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.roundRect(-12, -8, 24, 16, 3); ctx.fill();
    // Lettuce
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(-12, -1, 24, 3);
    // Meat/Filling
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(-12, 2, 24, 4);
    ctx.restore();
  }

  private drawUmbrella(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    // Stick
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 6; // Thicker stick
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 140); // Taller pole
    ctx.stroke();

    // Top (Canopy)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 110, y - 100); // Wider canopy
    ctx.quadraticCurveTo(x, y - 190, x + 110, y - 100);
    ctx.closePath();
    ctx.fill();
    
    // Stripes on umbrella
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    for(let i=-2; i<=2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i*15, y - 165);
        ctx.lineTo(x + i*50, y - 105);
        ctx.stroke();
    }
  }

  drawMiniMap(ctx: CanvasRenderingContext2D, mmX: number, mmY: number, mmW: number, mmH: number, scale: number) {
    // Sand
    ctx.fillStyle = '#f3e5ab';
    ctx.fillRect(mmX, mmY, mmW, mmH);

    // Sea
    ctx.fillStyle = '#1e3c72';
    ctx.fillRect(mmX, mmY, mmW, mmH * 0.30);

    // Common Zones
    this.drawCommonMiniMap(ctx, mmX, mmY, mmW, mmH, scale);

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 8px Outfit';
    ctx.fillText('SAMANDAĞ', mmX + 6, mmY + 12);

    // Buffet dot/rect on minimap
    ctx.fillRect(mmX + 2100 * scale, mmY + 420 * scale, 180 * scale, 120 * scale);
    
    // Red dot for interaction point
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(mmX + 2190 * scale, mmY + 480 * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
