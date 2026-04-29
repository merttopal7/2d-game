import { Entity } from './Character';

export class Car extends Entity {
  public id: string;
  public color: string;
  public type: 'taxi' | 'passenger';
  public alpha: number = 1;
  public isLeaving: boolean = false;

  constructor(id: string, x: number, y: number, color: string, type: 'taxi' | 'passenger') {
    super(x, y);
    this.id = id;
    this.color = color;
    this.type = type;
  }

  update(dt: number) {
    const speed = 300;
    this.moveTowards(dt, speed);
    
    if (this.isLeaving) {
      if (Math.abs(this.targetX - this.x) < 5) {
        this.alpha = Math.max(0, this.alpha - dt * 2);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    
    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(0, 0, 140, 60, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Cabin
    ctx.fillStyle = 'rgba(20,30,40,0.8)';
    ctx.beginPath();
    ctx.roundRect(30, 5, 80, 50, 5);
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#111';
    ctx.fillRect(20, -5, 30, 10);
    ctx.fillRect(90, -5, 30, 10);
    ctx.fillRect(20, 55, 30, 10);
    ctx.fillRect(90, 55, 30, 10);
    
    // Taxi Sign
    if (this.type === 'taxi') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(55, 20, 30, 20);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 70, 34);
    }
    
    // Lights
    ctx.fillStyle = '#fff';
    ctx.fillRect(130, 5, 10, 15);
    ctx.fillRect(130, 40, 10, 15);
    ctx.fillStyle = '#f00';
    ctx.fillRect(0, 5, 10, 15);
    ctx.fillRect(0, 40, 10, 15);
    
    ctx.restore();
  }
}
