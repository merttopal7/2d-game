export abstract class BaseMap {
  constructor(protected renderer: any) {}

  abstract draw(ctx: CanvasRenderingContext2D, W: number, H: number): void;
  abstract drawMiniMap(ctx: CanvasRenderingContext2D, mmX: number, mmY: number, mmW: number, mmH: number, scale: number): void;
  abstract initPlants(): Promise<void>;

  protected roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  protected drawCommonBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const sidewalkY = 560;
    const roadY = 640;
    const gardenY = 800;

    // 1. Sidewalk
    ctx.fillStyle = '#34495e'; // Grey concrete
    ctx.fillRect(0, sidewalkY, W, roadY - sidewalkY);

    // 2. Road
    ctx.fillStyle = '#1c1c1c'; // Dark asphalt
    ctx.fillRect(0, roadY, W, gardenY - roadY);
    
    // Road stripes
    ctx.fillStyle = '#f1c40f';
    const roadMid = roadY + (gardenY - roadY) / 2;
    for (let i = 0; i < W; i += 80) ctx.fillRect(i, roadMid - 2, 40, 4);

    // 3. Garden
    ctx.fillStyle = '#1b5e20'; // Grass green
    ctx.fillRect(0, gardenY, W, H - gardenY);

    // 4. Draw Cars (All maps now draw cars from renderer)
    this.renderer.cars.forEach((car: any) => car.draw(ctx));
  }

  protected drawCommonMiniMap(ctx: CanvasRenderingContext2D, mmX: number, mmY: number, mmW: number, mmH: number, scale: number) {
    const H = this.renderer.MAP_H;
    
    // Sidewalk
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(mmX, mmY + 560 * scale, mmW, 80 * scale);

    // Road
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(mmX, mmY + 640 * scale, mmW, 160 * scale);
    // Road stripes
    ctx.fillStyle = '#f6e05e';
    for (let lx = mmX + 10; lx < mmX + mmW - 10; lx += 14 * scale + 6) {
      ctx.fillRect(lx, mmY + 720 * scale, 10 * scale, 2 * scale);
    }

    // Garden
    ctx.fillStyle = '#276742';
    ctx.fillRect(mmX, mmY + 800 * scale, mmW, (H - 800) * scale);
  }
}
