// ─── main.ts — Entry point ────────────────────────────────────────────────────

import { GameLoop } from './engine/core/GameLoop';

// ── Particle system for title screen ─────────────────────────────────────────
function spawnParticles() {
  const container = document.getElementById('title-particles');
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 8 + 4;
    p.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${Math.random() * 100}%`,
      `animation-duration:${6 + Math.random() * 10}s`,
      `animation-delay:${Math.random() * 8}s`,
    ].join(';');
    container.appendChild(p);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  spawnParticles();

  const game = new GameLoop();
  game.init();

  // Title screen buttons
  document.getElementById('btn-play')!.addEventListener('click', () => {
    // Auto-fullscreen on start if not already
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      }).catch(() => {});
    }
    game.startGame();
  });

  document.getElementById('btn-howto')!.addEventListener('click', () => {
    game.showScreen('screen-howto');
  });

  document.getElementById('btn-howto-back')!.addEventListener('click', () => {
    game.showScreen('screen-title');
  });
});
