import { BaseMap } from './BaseMap';

export class MarketMap extends BaseMap {
  constructor(renderer: any) {
    super(renderer);
  }

  async initPlants() {
    this.renderer.plants = [];
    // Maybe some indoor plants later
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // 1. Floor (Tiled market floor)
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(0, 0, W, H);
    
    // Draw tiles
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for(let x=0; x<W; x+=80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for(let y=0; y<H; y+=80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // 2. Common Background (Sidewalk, Road, etc.)
    this.drawCommonBackground(ctx, W, H);

    // 3. Market Structure
    this.drawMarketBuilding(ctx, 1000, 300);

    // 4. Shelves / Aisles
    this.drawShelves(ctx, 400, 450);
    this.drawShelves(ctx, 700, 450);

    // 5. Checkout Counter
    this.drawCheckout(ctx, 1600, 450);

    // 6. Cars
    this.renderer.cars.forEach((car: any) => car.draw(ctx));
  }

  private drawMarketBuilding(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Glass front building
    ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
    ctx.fillRect(100, 100, 2000, 600);
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 4;
    ctx.strokeRect(100, 100, 2000, 600);
    
    // Entrance
    ctx.fillStyle = '#34495e';
    ctx.fillRect(1000, 650, 200, 20);
  }

  private drawShelves(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(x, y, 60, 200);
    ctx.strokeStyle = '#7f8c8d';
    ctx.strokeRect(x, y, 60, 200);
    
    // Items on shelves
    ctx.fillStyle = '#3498db';
    for(let sy = y + 20; sy < y + 180; sy += 30) {
      ctx.fillRect(x + 10, sy, 40, 15);
    }
  }

  private drawCheckout(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Counter
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x, y, 180, 80);
    ctx.strokeStyle = '#1a252f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 180, 80);

    // Cash register
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(x + 120, y - 25, 40, 25);
    
    // Sign
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x + 20, y - 40, 140, 30);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('TEKNİK MARKET', x + 90, y - 20);
  }

  drawMiniMap(ctx: CanvasRenderingContext2D, mmX: number, mmY: number, mmW: number, mmH: number, scale: number) {
    // Floor
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(mmX, mmY, mmW, mmH);

    // Common Zones
    this.drawCommonMiniMap(ctx, mmX, mmY, mmW, mmH, scale);

    // Label
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 8px Outfit';
    ctx.fillText('MARKET', mmX + 6, mmY + 12);

    // Interaction point
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(mmX + 1690 * scale, mmY + 490 * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
