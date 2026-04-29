// ─── HearingTestUI: auto-simulates customer reaction per frequency ─────────────

import type { CustomerProfile, FrequencyResult, AudiogramData } from '../../types';
import { AUDIOGRAM_PROFILES } from '../../data/customers';
import { AudioEngine } from '../core/AudioEngine';

const FREQS = [250, 500, 1000, 2000, 4000, 8000];
export const TONE_DURATION = 1.8; // seconds the tone plays before auto-recording

export class HearingTestUI {
  private audio: AudioEngine;
  private customer: CustomerProfile | null = null;
  private results: Map<number, boolean> = new Map();
  private activeFreq: number | null = null;
  private testing = false;

  private waveCanvas: HTMLCanvasElement;
  private waveCtx: CanvasRenderingContext2D;
  private audiogramCanvas: HTMLCanvasElement;
  private audiogramCtx: CanvasRenderingContext2D;

  private waveTime = 0;
  private waveAnimId = 0;
  private reactionTimeout = 0;

  private onDoneCallback?: (data: AudiogramData) => void;
  private onToneStartCallback?: (duration: number) => void;

  constructor(audio: AudioEngine) {
    this.audio = audio;
    this.waveCanvas = document.getElementById('freq-wave') as HTMLCanvasElement;
    this.waveCtx = this.waveCanvas.getContext('2d')!;
    this.audiogramCanvas = document.getElementById('audiogram') as HTMLCanvasElement;
    this.audiogramCtx = this.audiogramCanvas.getContext('2d')!;
    this.bindButtons();
  }

  onDone(cb: (data: AudiogramData) => void) { this.onDoneCallback = cb; }
  onToneStart(cb: (duration: number) => void) { this.onToneStartCallback = cb; }
  onAction(cb: () => void) { this.onActionCallback = cb; }

  start(customer: CustomerProfile) {
    this.customer = customer;
    this.results.clear();
    this.activeFreq = null;
    this.testing = false;
    clearTimeout(this.reactionTimeout);

    this.resetFreqButtons();
    this.updateDoneButton();
    this.drawAudiogram();
    this.stopWave();
    this.drawIdleWave();

    this.setLabel('🎧 Test başlatın.');
    this.hideReaction();
  }

  private bindButtons() {
    document.querySelectorAll('.freq-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.testing) return;
        const freq = parseInt((btn as HTMLElement).dataset.freq!);
        if (this.results.has(freq)) return; // already done
        this.testFrequency(freq);
      });
    });

    document.getElementById('btn-test-done')!.addEventListener('click', () => this.finish());
  }

  private testFrequency(freq: number) {
    if (!this.customer) return;
    this.testing = true;
    this.activeFreq = freq;

    // Disable all buttons while testing
    this.setFreqButtonsEnabled(false);

    const freqLabel = freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`;
    this.setLabel(`🔊 Çalınıyor ${freqLabel}...`);
    this.audio.playTone(freq, TONE_DURATION);
    this.startWave(freq);
    this.onToneStartCallback?.(TONE_DURATION);
    this.onActionCallback?.();

    // Show "thinking" reaction first
    this.showReaction('🤔', 'Dinliyor...', '#8b949e');

    // After tone plays, show the actual result
    this.reactionTimeout = setTimeout(() => {
      this.revealResult(freq);
    }, TONE_DURATION * 1000) as unknown as number;
  }

  private revealResult(freq: number) {
    if (!this.customer) return;

    // Determine result from the customer's actual hearing profile
    const profile = AUDIOGRAM_PROFILES[this.customer.lossLevel];
    const canHear = profile[freq] ?? true;

    // Record it
    this.results.set(freq, canHear);

    // Visual reaction
    if (canHear) {
      this.showReaction('😊', 'Sesi duydu!', '#27ae60');
      this.audio.playSuccess();
    } else {
      this.showReaction('😕', 'Sesi duyamadı!', '#e74c3c');
      this.audio.playError();
    }

    // Update the frequency button
    document.querySelectorAll('.freq-btn').forEach(b => {
      if (parseInt((b as HTMLElement).dataset.freq!) === freq) {
        b.classList.remove('active');
        b.classList.add(canHear ? 'done' : 'failed');
      }
    });

    this.stopWave();
    this.drawIdleWave();
    this.drawAudiogram();
    this.updateDoneButton();

    // Re-enable after short delay so player can read reaction
    setTimeout(() => {
      this.testing = false;
      this.activeFreq = null;
      this.setFreqButtonsEnabled(true);

      const remaining = FREQS.filter(f => !this.results.has(f));
      if (remaining.length > 0) {
        this.setLabel(`🎧 ${remaining.length} frekans kaldı`);
      } else {
        this.setLabel('✅ Tüm frekanslar test edildi!');
        this.hideReaction();
      }
    }, 1200) as unknown as number;
  }

  private finish() {
    if (!this.customer || this.results.size < FREQS.length) return;

    const freqResults: FrequencyResult[] = Array.from(this.results.entries())
      .map(([freq, canHear]) => ({ freq, canHear }));

    // Derive loss level from actual results
    const lossLevel = this.customer.lossLevel;
    const isConductive = this.customer.isConductive;
    const data: AudiogramData = { results: freqResults, lossLevel, isConductive };
    this.onDoneCallback?.(data);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private setLabel(text: string) {
    (document.getElementById('freq-label') as HTMLElement).textContent = text;
  }

  private showReaction(emoji: string, text: string, color: string) {
    const bubble = document.getElementById('doctor-chat-bubble')!;
    const label = document.getElementById('chat-bubble-text')!;
    label.textContent = `${emoji} ${text}`;
    bubble.classList.remove('hidden');
  }

  private hideReaction() {
    document.getElementById('doctor-chat-bubble')!.classList.add('hidden');
  }

  private setFreqButtonsEnabled(enabled: boolean) {
    document.querySelectorAll('.freq-btn').forEach(b => {
      (b as HTMLButtonElement).disabled = !enabled || this.results.has(
        parseInt((b as HTMLElement).dataset.freq!)
      );
    });
  }

  private updateDoneButton() {
    const btn = document.getElementById('btn-test-done') as HTMLButtonElement;
    btn.disabled = this.results.size < FREQS.length;
  }

  private resetFreqButtons() {
    document.querySelectorAll('.freq-btn').forEach(b => {
      b.classList.remove('active', 'done', 'failed');
      (b as HTMLButtonElement).disabled = false;
    });
    (document.getElementById('btn-test-done') as HTMLButtonElement).disabled = true;
  }

  // ── Audiogram ──────────────────────────────────────────────────────────────
  private drawAudiogram() {
    const ctx = this.audiogramCtx;
    const W = this.audiogramCanvas.width, H = this.audiogramCanvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 38, padR = 10, padT = 20, padB = 28;
    const plotW = W - padL - padR, plotH = H - padT - padB;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (i / 4) * plotH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    }
    for (let i = 0; i < FREQS.length; i++) {
      const x = padL + (i / (FREQS.length - 1)) * plotW;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
    }

    // Y labels (dB HL)
    ctx.fillStyle = '#8b949e'; ctx.font = '9px Outfit,sans-serif'; ctx.textAlign = 'right';
    ['0', '25', '50', '75', '100'].forEach((label, i) => {
      ctx.fillText(label, padL - 4, padT + (i / 4) * plotH + 4);
    });

    // X labels (freq)
    ctx.textAlign = 'center';
    FREQS.forEach((f, i) => {
      const x = padL + (i / (FREQS.length - 1)) * plotW;
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x, H - 4);
    });

    // Loss zone bands
    [
      { color: 'rgba(0,201,167,0.07)',  top: 0,    bot: 0.25 },
      { color: 'rgba(245,197,24,0.05)', top: 0.25, bot: 0.5  },
      { color: 'rgba(231,120,60,0.05)', top: 0.5,  bot: 0.75 },
      { color: 'rgba(231,76,60,0.06)',  top: 0.75, bot: 1    },
    ].forEach(z => {
      ctx.fillStyle = z.color;
      ctx.fillRect(padL, padT + z.top * plotH, plotW, (z.bot - z.top) * plotH);
    });

    // Zone labels
    const zoneLabels = ['Normal', 'Hafif', 'Orta', 'İleri'];
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '8px Outfit,sans-serif'; ctx.textAlign = 'left';
    zoneLabels.forEach((l, i) => {
      ctx.fillText(l, padL + 3, padT + (i * 0.25) * plotH + 10);
    });

    // Axis title
    ctx.save(); ctx.translate(10, padT + plotH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#8b949e'; ctx.font = '9px Outfit,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('dB HL', 0, 0); ctx.restore();

    if (this.results.size === 0) return;

    // Plot results as audiogram curve
    const points: [number, number, boolean][] = [];
    FREQS.forEach((f, i) => {
      const canHear = this.results.get(f);
      if (canHear === undefined) return;
      const x = padL + (i / (FREQS.length - 1)) * plotW;
      // Map: can hear → 15 dB (normal range), cannot → 75 dB (loss range)
      const dbHL = canHear ? 15 : 75;
      const y = padT + (dbHL / 100) * plotH;
      points.push([x, y, canHear]);
    });

    // Line
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = '#00c9a7'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]); ctx.stroke(); ctx.setLineDash([]);
    }

    // Data points
    points.forEach(([x, y, canHear]) => {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = canHear ? '#27ae60' : '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      // O = can hear, X = cannot
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Outfit,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(canHear ? 'O' : 'X', x, y + 3);
    });
  }

  // ── Waveform ───────────────────────────────────────────────────────────────
  private startWave(freq: number) {
    cancelAnimationFrame(this.waveAnimId);
    const draw = () => {
      this.waveTime += 0.05;
      this.drawWave(freq);
      this.waveAnimId = requestAnimationFrame(draw);
    };
    draw();
  }

  private stopWave() { cancelAnimationFrame(this.waveAnimId); }

  private drawIdleWave() {
    const ctx = this.waveCtx;
    const W = this.waveCanvas.width, H = this.waveCanvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,201,167,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  }

  private drawWave(freq: number) {
    const ctx = this.waveCtx;
    const W = this.waveCanvas.width, H = this.waveCanvas.height;
    ctx.clearRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,201,167,0.03)');
    grad.addColorStop(0.5, 'rgba(0,201,167,0.08)');
    grad.addColorStop(1, 'rgba(0,201,167,0.03)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const cycles = freq >= 4000 ? 8 : freq >= 1000 ? 5 : 3;
    ctx.strokeStyle = '#00c9a7';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5c0';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let px = 0; px <= W; px++) {
      const t = (px / W) * cycles * Math.PI * 2;
      const y = H / 2 + Math.sin(t - this.waveTime * 6) * (H * 0.38);
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
