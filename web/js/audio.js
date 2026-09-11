/* Boulder Dash - yksinkertainen syntetisoitu äänimaailma (WebAudio). */
(function () {
  'use strict';

  class Audio {
    constructor(isEnabled) {
      this.isEnabled = isEnabled;
      this.ctx = null;
      this.lastPlayed = {};
      this.noiseBuf = null;
    }

    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    tone(freq, dur, type, vol, freqEnd, delay) {
      const c = this.ctx; if (!c) return;
      const t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }

    noise(dur, vol, filterFreq, delay) {
      const c = this.ctx; if (!c) return;
      const t0 = c.currentTime + (delay || 0);
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = filterFreq || 800;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(c.destination);
      s.start(t0); s.stop(t0 + dur + 0.02);
    }

    play(name) {
      if (!this.isEnabled() || !this.ctx) return;
      const now = performance.now();
      const minGap = { dig: 90, boulder: 60, diamondLand: 60, push: 120, tick: 200 }[name] || 0;
      if (minGap && now - (this.lastPlayed[name] || 0) < minGap) return;
      this.lastPlayed[name] = now;
      switch (name) {
        case 'dig': this.noise(0.05, 0.08, 500); break;
        case 'diamond': this.tone(880, 0.08, 'square', 0.12); this.tone(1320, 0.12, 'square', 0.12, null, 0.06); break;
        case 'boulder': this.tone(110, 0.14, 'sine', 0.35, 40); this.noise(0.1, 0.15, 300); break;
        case 'diamondLand': this.tone(1500, 0.05, 'triangle', 0.08, 900); break;
        case 'push': this.noise(0.08, 0.12, 400); break;
        case 'explosion': this.noise(0.5, 0.5, 1200); this.tone(80, 0.4, 'sawtooth', 0.2, 30); break;
        case 'exitOpen':
          [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, null, i * 0.08)); break;
        case 'won':
          [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.15, 'square', 0.12, null, i * 0.1)); break;
        case 'tick': this.tone(1000, 0.04, 'square', 0.1); break;
        case 'spawn': this.tone(400, 0.08, 'square', 0.1, 800); break;
        case 'magic': [1200, 1600, 2000].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.1, null, i * 0.05)); break;
        case 'amoebaDiamond': [660, 990, 1320].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.12, null, i * 0.05)); break;
        case 'amoebaBoulder': this.tone(90, 0.4, 'sawtooth', 0.25, 50); break;
        default: break;
      }
    }
  }

  window.BD = window.BD || {};
  window.BD.Audio = Audio;
})();
