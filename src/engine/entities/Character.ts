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

protected drawHead(ctx: CanvasRenderingContext2D, style: number) {
  ctx.save();
  
  // Reposition and Scale to match body
  ctx.translate(0, -30); 
  ctx.scale(0.55, 0.55);

  // --- Yardımcı: Gerçekçi göz çiz ---
  const drawEye = (x: number, y: number, irisColor: string) => {
    // Göz akı
    ctx.fillStyle = '#f8f4ee';
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c4a07a';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // İris
    ctx.fillStyle = irisColor;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + 0.5, y - 0.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x + 1, y - 1.8, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Üst kirpik çizgisi
    ctx.strokeStyle = '#2c1a10';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 6.5, y - 0.5);
    ctx.quadraticCurveTo(x, y - 5.5, x + 6.5, y - 0.5);
    ctx.stroke();
  };

  // --- Yardımcı: Burun çiz ---
  const drawNose = () => {
    ctx.save();
    ctx.fillStyle = 'rgba(180, 120, 70, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Burun delikleri
    ctx.beginPath();
    ctx.ellipse(-2.5, 9.5, 2, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Burun delikleri
    ctx.beginPath();
    ctx.ellipse(2.5, 9.5, 2, 1.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // --- Yardımcı: Kaş çiz ---
  const drawBrow = (x: number, color: string, thickness: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x < 0 ? x - 5 : x - 6, -10);
    ctx.quadraticCurveTo(x, -14, x < 0 ? x + 6 : x + 5, -9);
    ctx.stroke();
  };

  // --------- BOYUN ---------
  ctx.fillStyle = '#f0c898';
  ctx.beginPath();
  ctx.roundRect(-7, 24, 14, 12, 3);
  ctx.fill();

  // --------- KAFA ŞEKLI ---------
  // Her stil için saç ve yüz katmanları sırayla çizilecek
  switch (style) {

    // ---- Case 0: Doktor ----
    case 0: {
      // Kumral uzun saç (Selin stili)
      ctx.fillStyle = '#8d6e63'; 
      ctx.beginPath(); ctx.ellipse(0, -20, 28, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-25, 8, 8, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(25, 8, 8, 24, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yanak pembesi
      ctx.fillStyle = 'rgba(230,130,130,0.22)';
      ctx.beginPath(); ctx.ellipse(-15, 8, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(15, 8, 8, 6, 0, 0, Math.PI * 2); ctx.fill();

      drawEye(-9, -2, '#5b3a1a'); // Kahverengi göz (kumral saçla uyumlu)
      drawEye(9, -2, '#5b3a1a');
      drawBrow(-9, '#5d4037', 1.5);
      drawBrow(9, '#5d4037', 1.5);
      drawNose();

      // Dudaklar
      ctx.fillStyle = 'rgba(220,100,100,0.7)';
      ctx.beginPath(); ctx.ellipse(0, 16, 7.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c0506a';
      ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-7.5, 15); ctx.quadraticCurveTo(0, 22, 7.5, 15); ctx.stroke();
      break;
    }

    // ---- Case 1: Yaşlı Kadın (Müzeyyen) ----
    case 1: {
      // Gri saç hacimli
      ctx.fillStyle = '#b0b8c0';
      ctx.beginPath(); ctx.ellipse(0, -22, 27, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-23, -4, 8, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(23, -4, 8, 20, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Kırışıklıklar
      ctx.strokeStyle = 'rgba(180,120,70,0.45)';
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      [[-15, 8, -10, 11, -8, 9], [8, 9, 10, 11, 15, 8]].forEach(([x1, y1, cx, cy, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(-20, -2); ctx.quadraticCurveTo(-22, 2, -20, 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, -2); ctx.quadraticCurveTo(22, 2, 20, 5); ctx.stroke();

      drawEye(-9, -3, '#6b8a6b');
      drawEye(9, -3, '#6b8a6b');
      drawBrow(-9, '#888', 1.5);
      drawBrow(9, '#888', 1.5);
      drawNose();

      ctx.strokeStyle = '#b87050';
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, 17); ctx.quadraticCurveTo(0, 22, 6, 17); ctx.stroke();
      break;
    }

    // ---- Case 2: Yaşlı Adam (Hasan) ----
    case 2: {
      // Kel kafa, yan saç
      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 29, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yan saç (gri)
      ctx.fillStyle = '#8c8c8c';
      ctx.beginPath(); ctx.ellipse(-22, -10, 7, 16, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(22, -10, 7, 16, -0.2, 0, Math.PI * 2); ctx.fill();

      // Kırışıklıklar
      ctx.strokeStyle = 'rgba(160,100,60,0.45)';
      ctx.lineWidth = 0.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-22, 4); ctx.quadraticCurveTo(-24, 8, -22, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(22, 4); ctx.quadraticCurveTo(24, 8, 22, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, -16); ctx.quadraticCurveTo(0, -18, 10, -16); ctx.stroke();

      drawEye(-9, -5, '#5a4020');
      drawEye(9, -5, '#5a4020');
      drawBrow(-9, '#777', 3);
      drawBrow(9, '#777', 3);

      // Güçlü burun
      ctx.fillStyle = 'rgba(180,120,70,0.45)';
      ctx.beginPath(); ctx.ellipse(0, 6, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-3, 10, 2.5, 1.8, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3, 10, 2.5, 1.8, 0.3, 0, Math.PI * 2); ctx.fill();

      // Sakal (beyaz)
      ctx.fillStyle = '#d0d0d0';
      ctx.beginPath(); ctx.ellipse(0, 22, 21, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-15, 15, 8, 11, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(15, 15, 8, 11, -0.2, 0, Math.PI * 2); ctx.fill();
      // Bıyık
      ctx.fillStyle = '#aaa';
      ctx.beginPath(); ctx.ellipse(0, 13, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }

    // ---- Case 3: Genç Kadın (Selin) ----
    case 3: {
      // Mor uzun saç
      ctx.fillStyle = '#7d3c98';
      ctx.beginPath(); ctx.ellipse(0, -20, 28, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-25, 8, 8, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(25, 8, 8, 24, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yanak pembesi
      ctx.fillStyle = 'rgba(230,130,130,0.22)';
      ctx.beginPath(); ctx.ellipse(-15, 8, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(15, 8, 8, 6, 0, 0, Math.PI * 2); ctx.fill();

      drawEye(-9, -2, '#6c3483');
      drawEye(9, -2, '#6c3483');
      drawBrow(-9, '#5b2c6f', 1.5);
      drawBrow(9, '#5b2c6f', 1.5);
      drawNose();

      // Dudaklar
      ctx.fillStyle = 'rgba(220,100,100,0.7)';
      ctx.beginPath(); ctx.ellipse(0, 16, 7.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c0506a';
      ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-7.5, 15); ctx.quadraticCurveTo(0, 22, 7.5, 15); ctx.stroke();
      break;
    }

    // ---- Case 4: Genç Adam (Deniz) ----
    case 4: {
      // Koyu saç
      ctx.fillStyle = '#2c1a0e';
      ctx.beginPath(); ctx.ellipse(0, -19, 25, 14, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 29, 0, 0, Math.PI * 2);
      ctx.fill();

      drawEye(-9, -3, '#3d2008');
      drawEye(9, -3, '#3d2008');
      drawBrow(-9, '#2c1a0e', 2.2);
      drawBrow(9, '#2c1a0e', 2.2);
      drawNose();

      ctx.strokeStyle = '#b87050';
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, 16); ctx.quadraticCurveTo(0, 20, 6, 16); ctx.stroke();

      // Hafif sakal gölgesi
      ctx.fillStyle = 'rgba(100,60,20,0.12)';
      ctx.beginPath(); ctx.ellipse(0, 18, 17, 9, 0, 0, Math.PI * 2); ctx.fill();

      // Şapka
      ctx.fillStyle = '#e67e22';
      ctx.beginPath(); ctx.ellipse(0, -20, 27, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-27, -32, 54, 13);
      // Şapka siperliği
      ctx.fillStyle = '#cf6d17';
      ctx.beginPath();
      ctx.ellipse(-4, -30, 21, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ---- Case 5: Ece ----
    case 5: {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.ellipse(0, -20, 27, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-25, 4, 7, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(25, 4, 7, 18, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Topuz
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(17, -30, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a93226';
      ctx.beginPath(); ctx.arc(17, -30, 7, 0, Math.PI * 2); ctx.fill();

      // Yanak
      ctx.fillStyle = 'rgba(220,120,120,0.2)';
      ctx.beginPath(); ctx.ellipse(-15, 8, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(15, 8, 8, 6, 0, 0, Math.PI * 2); ctx.fill();

      drawEye(-9, -2, '#1a5276');
      drawEye(9, -2, '#1a5276');
      drawBrow(-9, '#922b21', 1.8);
      drawBrow(9, '#922b21', 1.8);
      drawNose();

      ctx.fillStyle = 'rgba(210,90,90,0.65)';
      ctx.beginPath(); ctx.ellipse(0, 16, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c0506a';
      ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-7, 15); ctx.quadraticCurveTo(0, 22, 7, 15); ctx.stroke();
      break;
    }

    // ---- Case 6: Görkem ----
    case 6: {
      ctx.fillStyle = '#3d3d3d';
      ctx.beginPath(); ctx.ellipse(0, -19, 26, 17, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 29, 0, 0, Math.PI * 2);
      ctx.fill();

      drawEye(-9, -5, '#4a3520');
      drawEye(9, -5, '#4a3520');
      drawBrow(-9, '#3d3d3d', 2.5);
      drawBrow(9, '#3d3d3d', 2.5);

      ctx.fillStyle = 'rgba(180,120,70,0.45)';
      ctx.beginPath(); ctx.ellipse(0, 6, 3.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-2.5, 10, 2, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(2.5, 10, 2, 1.5, 0.3, 0, Math.PI * 2); ctx.fill();

      // Gri bıyık
      ctx.fillStyle = '#8a8a8a';
      ctx.beginPath(); ctx.ellipse(0, 12, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-9, 11, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, 11, 5, 4, 0, 0, Math.PI * 2); ctx.fill();

      // Hafif sakal gölgesi
      ctx.fillStyle = 'rgba(100,100,100,0.18)';
      ctx.beginPath(); ctx.ellipse(0, 19, 18, 9, 0, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#b87050';
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-5, 17); ctx.quadraticCurveTo(0, 20, 5, 17); ctx.stroke();
      break;
    }

    // ---- Case 7: Ayşe ----
    case 7: {
      // Siyah kıvırcık hacimli saç
      ctx.fillStyle = '#1a1008';
      ctx.beginPath(); ctx.ellipse(0, -24, 31, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-27, -4, 10, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(27, -4, 10, 24, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Kıvırcık doku
      ctx.fillStyle = '#2c1a08';
      [[-18,-28], [18,-28], [0,-36], [-28,-14], [28,-14]].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
        ctx.globalAlpha = 0.45;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      drawEye(-9, -2, '#1a0a00');
      drawEye(9, -2, '#1a0a00');
      drawBrow(-9, '#1a1008', 2);
      drawBrow(9, '#1a1008', 2);
      drawNose();

      ctx.fillStyle = 'rgba(210,90,90,0.62)';
      ctx.beginPath(); ctx.ellipse(0, 16, 7.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c0506a';
      ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-7.5, 15); ctx.quadraticCurveTo(0, 23, 7.5, 15); ctx.stroke();
      break;
    }

    // ---- Case 8: Tayfun ----
    case 8: {
      ctx.fillStyle = '#1a1008';
      ctx.beginPath(); ctx.ellipse(0, -21, 26, 17, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 29, 0, 0, Math.PI * 2);
      ctx.fill();

      drawEye(-9, -5, '#2c1a0e');
      drawEye(9, -5, '#2c1a0e');
      drawBrow(-9, '#1a1008', 2.8);
      drawBrow(9, '#1a1008', 2.8);

      // Güçlü burun
      ctx.fillStyle = 'rgba(170,110,60,0.5)';
      ctx.beginPath(); ctx.ellipse(0, 5, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-3, 9.5, 2.5, 1.8, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3, 9.5, 2.5, 1.8, 0.3, 0, Math.PI * 2); ctx.fill();

      // Tam sakal koyu
      ctx.fillStyle = '#1a1008';
      ctx.beginPath(); ctx.ellipse(0, 22, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-16, 14, 9, 13, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(16, 14, 9, 13, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c1a08';
      ctx.beginPath(); ctx.ellipse(0, 19, 16, 8, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
      // Bıyık
      ctx.fillStyle = '#1a1008';
      ctx.beginPath(); ctx.ellipse(0, 11, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }

    // ---- Case 9: Lale ----
    case 9: {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.ellipse(0, -19, 27, 20, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fce2c4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 29, 0, 0, Math.PI * 2);
      ctx.fill();

      // Saç yan katmanı
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.ellipse(0, -14, 23, 14, 0, 0, Math.PI * 2); ctx.fill();
      // At kuyrukları
      ctx.beginPath(); ctx.ellipse(-29, -16, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(29, -16, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
      // Lastikler
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(-22, -9, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(22, -9, 3.5, 0, Math.PI * 2); ctx.fill();

      // Çiller
      ctx.fillStyle = 'rgba(200,130,80,0.5)';
      [[-12, 5], [12, 5], [-8, 8], [8, 8], [-16, 8], [16, 8]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.arc(cx, cy, 1.1, 0, Math.PI * 2); ctx.fill();
      });

      drawEye(-9, -2, '#1a5276');
      drawEye(9, -2, '#1a5276');
      drawBrow(-9, '#922b21', 1.8);
      drawBrow(9, '#922b21', 1.8);
      drawNose();

      ctx.strokeStyle = '#c0506a';
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8, 15); ctx.quadraticCurveTo(0, 24, 8, 15); ctx.stroke();
      ctx.fillStyle = 'rgba(210,100,100,0.55)';
      ctx.beginPath(); ctx.ellipse(0, 15, 8, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }

  ctx.restore();
}
}

export class Player extends Character {
  public doctorInteractTimer: number = 0;
  public clickTime: number = 0;
  public eatTimer: number = 0;
  public eatEmoji: string = '🥪';

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

    if (this.eatTimer > 0) {
      this.eatTimer -= dt;
      this.bobPhase += dt * 10; // Rapid chewing
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
    this.drawHead(ctx, 0); // Doctor uses style 0

    // Eating visual
    if (this.eatTimer > 0) {
      ctx.font = '28px serif';
      const chewBob = Math.sin(this.bobPhase * 2) * 5;
      ctx.fillText(this.eatEmoji, 0, -65 + chewBob);
    }

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

    // Head
    this.drawHead(ctx, this.profile.headStyle ?? 0);

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
