import { Entity } from './Character';

export class Plant extends Entity {
  public waterLevel: number = 80 + Math.random() * 20;
  public isWatered: boolean = true;
  public type: 'flower' | 'bush' | 'tree' | 'palm' = 'flower';
  public lastWatered: number = Date.now();
  public lastClickTime: number = 0;
  public scale: number = 1;
  public isInteractive: boolean = true;
  private wateredEffectTimer: number = 0;

  constructor(x: number, y: number, type: 'flower' | 'bush' | 'tree' | 'palm' = 'flower', isInteractive: boolean = true) {
    super(x, y);
    this.type = type;
    this.isInteractive = isInteractive;
    if (!isInteractive) {
      this.waterLevel = 100;
    }
  }

  update(dt: number) {
    if (this.isInteractive) {
      // Water decreases over time (simulated)
      // 100 to 20 in 60 seconds => 80 / 60 = 1.333 units/sec
      this.waterLevel = Math.max(0, this.waterLevel - dt * 1.333);
    }
    
    this.isWatered = this.waterLevel > 20;
    
    if (this.wateredEffectTimer > 0) {
      this.wateredEffectTimer -= dt;
    }

    // Slight breathing animation if healthy
    if (this.isWatered) {
      const effectScale = this.wateredEffectTimer > 0 ? 0.2 * (this.wateredEffectTimer / 1.5) : 0;
      this.scale = 1 + Math.sin(performance.now() / 1000) * 0.05 + effectScale;
    } else {
      this.scale = 0.9; // Wilted look
    }
  }

  water() {
    if (!this.isInteractive) return;
    this.waterLevel = 100;
    this.lastWatered = Date.now();
    this.isWatered = true; // immediately clear thirsty state
    this.lastClickTime = performance.now();
    this.wateredEffectTimer = 1.5; // 1.5 seconds of "happy" effect
  }

  draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
    const s = this.scale;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);

    if (this.type === 'flower') {
      this.drawFlower(ctx);
    } else if (this.type === 'bush') {
      this.drawBush(ctx);
    } else if (this.type === 'tree') {
      this.drawTree(ctx);
    } else if (this.type === 'palm') {
      this.drawPalm(ctx);
    }

    // Happy particles when watered
    if (this.wateredEffectTimer > 0) {
      ctx.fillStyle = '#00c9a7';
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = this.wateredEffectTimer / 1.5;
      ctx.fillText('💧', 0, -50 - (1.5 - this.wateredEffectTimer) * 40);
    }

    // If thirsty, show a small icon or tint
    if (!this.isWatered && this.isInteractive) {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'rgba(231, 76, 60, 0.9)';
      ctx.beginPath();
      ctx.arc(0, -45, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -41);
    }

    ctx.restore();
  }

  private drawFlower(ctx: CanvasRenderingContext2D) {
    // Pot
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(-12, 0, 24, 18);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-14, -4, 28, 6);

    // Stem
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -25); ctx.stroke();

    // Leaves
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.ellipse(-5, -15, 8, 4, Math.PI/4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -15, 8, 4, -Math.PI/4, 0, Math.PI*2); ctx.fill();

    // Petals
    const color = this.isWatered ? '#e91e63' : '#880e4f';
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 8, -25 + Math.sin(angle) * 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center
    ctx.fillStyle = '#fdd835';
    ctx.beginPath(); ctx.arc(0, -25, 5, 0, Math.PI * 2); ctx.fill();
  }

  private drawBush(ctx: CanvasRenderingContext2D) {
    // Pot
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(-15, 0, 30, 20);

    // Leaves
    ctx.fillStyle = this.isWatered ? '#1b5e20' : '#3e2723';
    ctx.beginPath(); ctx.arc(0, -15, 20, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-15, -25, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, -25, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -35, 18, 0, Math.PI * 2); ctx.fill();
  }

  private drawTree(ctx: CanvasRenderingContext2D) {
    // Trunk
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-8, 0, 16, 40);
    ctx.fillRect(-12, 35, 24, 10); // Base

    // Foliage
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.arc(0, -20, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-20, -40, 25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -40, 25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -60, 28, 0, Math.PI * 2); ctx.fill();
    
    // Some highlights on leaves
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(10, -50, 10, 0, Math.PI * 2); ctx.fill();
  }

  private drawPalm(ctx: CanvasRenderingContext2D) {
    // Trunk (slanted)
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-15, -40, -5, -80);
    ctx.lineTo(5, -80);
    ctx.quadraticCurveTo(-5, -40, 15, 0);
    ctx.fill();

    // Leaves (Fronds)
    ctx.fillStyle = '#2e7d32';
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.save();
      ctx.translate(-5, -80);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(20, -10, 45, 10);
      ctx.quadraticCurveTo(20, 15, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }
}
