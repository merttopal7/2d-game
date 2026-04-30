// ─── AudioEngine: Web Audio API tone generator ───────────────────────────────

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private current: { osc: OscillatorNode; gain: GainNode } | null = null;
  public isMuted: boolean = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(mute: boolean) {
    this.isMuted = mute;
    if (mute) this.stopTone();
  }

  /** Play a sine-wave tone at the given frequency (Hz). Duration in seconds. */
  playTone(freq: number, duration = 1.5): void {
    if (this.isMuted) return;
    this.stopTone();
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);

    this.current = { osc, gain };
    osc.onended = () => { this.current = null; };
  }

  /** Play a short UI success chime */
  playSuccess(): void {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const freqs = [523.25, 659.25, 783.99]; // C5 E5 G5
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.1;
      osc.frequency.value = f;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /** Play a short UI error buzz */
  playError(): void {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  /** Play coin jingle */
  playCoin(): void {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    [880, 1320].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.08;
      osc.frequency.value = f;
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  playClick(): void {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1000;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  stopTone(): void {
    if (this.current) {
      try { this.current.osc.stop(); } catch { /* already stopped */ }
      this.current = null;
    }
  }
}
