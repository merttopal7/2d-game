import type { CustomerProfile } from '../../types';

export abstract class Entity {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  abstract update(dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D, canvasHeight: number): void;

  protected lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  protected moveTowards(dt: number, speed: number) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 2) {
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
      return true;
    } else {
      this.x = this.targetX;
      this.y = this.targetY;
      return false;
    }
  }
}

export class Character extends Entity {
  public bobPhase: number = Math.random() * Math.PI * 2;
  public state: 'walking' | 'waiting' | 'served' | 'leaving' = 'walking';
  public alpha: number = 1;

  constructor(x: number, y: number) {
    super(x, y);
  }

  update(dt: number) {
    // Basic bobbing logic
    this.bobPhase += dt * 2;
  }

  draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
    // Base draw logic (shadow, etc.)
  }

  protected getBaseScale(canvasHeight: number): number {
    return Math.max(1.2, canvasHeight / 525);
  }

  protected drawShadow(ctx: CanvasRenderingContext2D, scale: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 42, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Player extends Character {
  public doctorInteractTimer: number = 0;
  public clickTime: number = 0;

  constructor(x: number, y: number) {
    super(x, y);
  }

  update(dt: number) {
    const isWalking = this.moveTowards(dt, 200);
    if (isWalking) {
      this.bobPhase += dt * 3;
    } else {
      this.bobPhase += dt * 1.5;
    }

    if (this.doctorInteractTimer > 0) {
      this.doctorInteractTimer -= dt;
      this.bobPhase += dt * 8;
    }
  }

  draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
    const baseScale = this.getBaseScale(canvasHeight);
    const isWalking = Math.abs(this.targetX - this.x) > 2 || Math.abs(this.targetY - this.y) > 2;
    const bob = isWalking ? Math.sin(this.bobPhase) * 4 : 0;

    ctx.save();
    ctx.translate(this.x, this.y + bob * baseScale);
    ctx.scale(baseScale, baseScale);

    this.drawShadow(ctx, baseScale);

    // Legs
    const legSwing = isWalking ? Math.sin(this.bobPhase) * 12 : 0;
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-10 + legSwing, 38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(10 - legSwing, 38); ctx.stroke();

    // Shoes
    ctx.fillStyle = '#0a0d14';
    ctx.beginPath(); ctx.ellipse(-10 + legSwing + (legSwing > 0 ? 3 : -1), 40, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10 - legSwing + (-legSwing > 0 ? 3 : -1), 40, 7, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Body (White Lab Coat)
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.moveTo(-22, 20);
    ctx.bezierCurveTo(-25, -22, 25, -22, 22, 20);
    ctx.closePath();
    ctx.fill();

    // Hands UP state
    const isInteracting = this.doctorInteractTimer > 0;
    const armRaise = isInteracting ? -25 : 0;
    const interactionSwing = isInteracting ? Math.sin(performance.now() / 100 * 1.5) * 5 : 0;

    // Arms
    const armSwing = isWalking ? Math.sin(this.bobPhase) * 10 : interactionSwing;
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    ctx.beginPath(); ctx.moveTo(-20, 2); ctx.quadraticCurveTo(-30, 8 + armRaise/2, -26 + armSwing, 24 + armRaise); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 2); ctx.quadraticCurveTo(30, 8 + armRaise/2, 26 - armSwing, 24 + armRaise); ctx.stroke();

    // Hands
    ctx.fillStyle = '#ffdbac'; 
    ctx.beginPath(); ctx.arc(-26 + armSwing, 26 + armRaise, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(26 - armSwing, 26 + armRaise, 4, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.fillStyle = '#fce2c4';
    ctx.beginPath(); ctx.arc(0, -26, 15, 0, Math.PI * 2); ctx.fill();
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👧', 0, -26);

    // Name tag
    ctx.fillStyle = '#fff';
    ctx.fillRect(-22, 6, 44, 14);
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.fillText('DOKTOR', 0, 16);

    ctx.restore();
  }
}

export class Customer extends Character {
  public profile: CustomerProfile;
  public waitTimer: number;
  public selected: boolean = false;
  public slot: number;
  public wanderTimer: number = 0;

  constructor(profile: CustomerProfile, slot: number, x: number, y: number) {
    super(x, y);
    this.profile = profile;
    this.slot = slot;
    this.waitTimer = profile.patience;
  }

  update(dt: number) {
    this.bobPhase += dt * 2;
    const isMoving = (this.state === 'walking' || this.state === 'leaving' || this.state === 'served');
    const speed = (this.state === 'leaving' || this.state === 'served') ? 220 : 150;
    
    this.moveTowards(dt, speed);

    if (this.state === 'walking' && Math.hypot(this.targetX - this.x, this.targetY - this.y) < 2) {
      this.state = 'waiting';
      this.wanderTimer = 2.0 + Math.random() * 4;
    }

    if (this.state === 'waiting') {
      this.waitTimer -= dt;
      if (this.wanderTimer > 0) {
        this.wanderTimer -= dt;
      }
    }

    if (this.state === 'served' || this.state === 'leaving') {
      this.alpha = Math.max(0, this.alpha - dt * 0.35);
    }
  }

  draw(ctx: CanvasRenderingContext2D, canvasHeight: number) {
    const baseScale = this.getBaseScale(canvasHeight);
    const bob = Math.sin(this.bobPhase) * (this.state === 'walking' ? 4 : 2);
    const scale = baseScale * (1 + (this.selected ? 0.08 : 0));

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y + bob * baseScale);
    ctx.scale(scale, scale);

    this.drawShadow(ctx, scale);

    // Legs
    const legSwing = (this.state === 'walking' || this.state === 'leaving' || this.state === 'served') ? Math.sin(this.bobPhase) * 12 : 0;
    ctx.strokeStyle = '#4a69bd'; 
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-10 + legSwing, 38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(10 - legSwing, 38); ctx.stroke();

    // Shoes
    ctx.fillStyle = '#0a0d14';
    ctx.beginPath(); ctx.ellipse(-10 + legSwing + (legSwing > 0 ? 3 : -1), 40, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10 - legSwing + (-legSwing > 0 ? 3 : -1), 40, 7, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Body
    const colors = ['#2c4a7a', '#2a5a3a', '#5a2a4a', '#4a3a1a', '#1a4a5a'];
    const bodyColor = colors[this.slot % colors.length];
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-22, 20); ctx.bezierCurveTo(-25, -22, 25, -22, 22, 20); ctx.closePath();
    ctx.fill();

    // Arms
    const armSwing = (this.state === 'walking' || this.state === 'leaving' || this.state === 'served') ? Math.sin(this.bobPhase) * 10 : 1;
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, 2); ctx.quadraticCurveTo(-28, 12, -24 + armSwing, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 2); ctx.quadraticCurveTo(28, 12, 24 - armSwing, 24); ctx.stroke();

    // Hands
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath(); ctx.arc(-24 + armSwing, 26, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24 - armSwing, 26, 4, 0, Math.PI * 2); ctx.fill();

    // Face
    ctx.fillStyle = '#fce2c4';
    ctx.beginPath(); ctx.arc(0, -26, 15, 0, Math.PI * 2); ctx.fill();
    ctx.font = '36px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.profile.emoji, 0, -26);

    // Name tag
    ctx.fillStyle = '#fff';
    ctx.fillRect(-22, 6, 44, 14);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.fillText(this.profile.name.toUpperCase(), 0, 16);

    // Patience bar
    if (this.state === 'waiting') {
      const pct = this.waitTimer / this.profile.patience;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-25, 40, 50, 6);
      ctx.fillStyle = pct > 0.5 ? '#27ae60' : pct > 0.25 ? '#f5c518' : '#e74c3c';
      ctx.fillRect(-25, 40, 50 * pct, 6);
    }

    ctx.restore();
  }
}
