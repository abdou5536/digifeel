// Web Audio synthesized sound effects & Haptic API for ultra-immersive customer micro-interactions
class SoundFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Haptic feedback helper
  triggerHaptic(pattern: number | number[] = [20]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Fallback safely if unsupported
      }
    }
  }

  // Toggle sound mute
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.playHoverTick();
      this.triggerHaptic([15]);
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  // Futuristic NFC Induction Tap Chime
  playNfcTap() {
    if (this.isMuted) return;
    this.triggerHaptic([30, 40, 80]);
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

      osc2.frequency.setValueAtTime(1760, now);
      osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.38);
      osc2.stop(now + 0.38);
    } catch {
      // Ignore
    }
  }

  // Star Rating Selection Chime (Scales musical pitch with star rating 1★ -> 5★)
  playStarSelect(stars: number) {
    this.triggerHaptic([15 + Math.round(stars * 8)]);
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Pentatonic crystal frequencies for 1 to 5 stars
      const starFrequencies: Record<number, number[]> = {
        1: [440, 554.37],          // A4
        2: [554.37, 659.25],       // C#5
        2.5: [587.33, 739.99],     // D5
        3: [659.25, 830.61],       // E5
        3.5: [739.99, 932.33],     // F#5
        4: [880, 1108.73],         // A5
        4.5: [987.77, 1244.51],    // B5
        5: [1046.50, 1318.51, 1567.98] // C6 - E6 - G6 Grand Accord Suprême
      };

      const freqs = starFrequencies[stars] || [659.25, 830.61];

      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = stars >= 4.5 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.02);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + idx * 0.02 + 0.15);

        gain.gain.setValueAtTime(0.001, now + idx * 0.02);
        gain.gain.linearRampToValueAtTime(stars >= 5 ? 0.18 : 0.12, now + idx * 0.02 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.02 + (stars >= 5 ? 0.45 : 0.28));

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.02);
        osc.stop(now + idx * 0.02 + (stars >= 5 ? 0.5 : 0.32));
      });
    } catch {
      // Ignore
    }
  }

  // Compliment Tag Toggle Micro-Interaction
  playTagToggle(isAdding: boolean) {
    this.triggerHaptic(isAdding ? [22] : [12]);
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      if (isAdding) {
        // Upward pop: 600Hz -> 1150Hz
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1150, now + 0.06);
      } else {
        // Downward pop: 900Hz -> 480Hz
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.06);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // Ignore
    }
  }

  // Tip Selection / Calculation Chime
  playTipChime(percentOrAmt: number) {
    this.triggerHaptic([25]);
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = percentOrAmt > 15 ? 1200 : percentOrAmt > 5 ? 960 : 780;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.33, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  // Slider Granular Tick
  playSliderTick() {
    this.triggerHaptic([8]);
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.015);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // Ignore
    }
  }

  // Instant Biometric / Tip Success Chime
  playSuccessChime() {
    this.triggerHaptic([40, 30, 80]);
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
      });
    } catch {
      // Ignore
    }
  }

  // Subtle futuristic hover tick
  playHoverTick() {
    this.triggerHaptic([10]);
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.03);

      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Ignore
    }
  }

  // Automated Email & Notification Dispatch Chime
  playNotificationAlert() {
    this.triggerHaptic([30, 50]);
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1318.5, now + 0.08);

      osc2.frequency.setValueAtTime(1760, now);
      osc2.frequency.setValueAtTime(2637, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.42);
      osc2.stop(now + 0.42);
    } catch {
      // Ignore
    }
  }

  // Realistic Digital Camera Shutter Sound & Haptic
  playCameraShutter() {
    this.triggerHaptic([40, 60]);
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Click 1 (shutter opening)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.05);

      // Click 2 (shutter closing)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(800, now + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(200, now + 0.12);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.25, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.15);
    } catch {
      // Ignore
    }
  }
}

export const soundFX = new SoundFX();
