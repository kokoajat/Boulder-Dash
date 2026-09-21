/* Boulder Dash - ohjaus: nuolinäppäimet (d-pad), peukalojoystick ja näppäimistö. */
(function () {
  'use strict';

  const KEYMAP = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
  };

  class Input {
    /**
     * @param {object} els { dpad, joystick, joyBase, joyKnob }
     * @param {object} cb  { onPause(), onAnyInput() }
     */
    constructor(els, cb) {
      this.els = els;
      this.cb = cb || {};
      this.mode = 'dpad';
      this.touch = { active: false, dx: 0, dy: 0 };
      this.keys = [];
      this.activeId = null;
      this.joy = { cx: 0, cy: 0, radius: 48, dead: 14 };
      this.dpadDead = 0.18;
      this.bindDpad();
      this.bindJoystick();
      this.bindKeyboard();
    }

    setMode(mode) {
      this.mode = mode;
      this.els.dpad.hidden = mode !== 'dpad';
      this.els.joystick.hidden = mode !== 'joystick';
      this.clearTouch();
    }

    /** Herkkyys: 'low' | 'medium' | 'high'. Pienempi kuollut alue ja liikematka = herkempi. */
    setSensitivity(level) {
      const cfg = {
        low: { radius: 62, dead: 24, dpad: 0.3 },
        medium: { radius: 48, dead: 14, dpad: 0.18 },
        high: { radius: 34, dead: 7, dpad: 0.08 },
      }[level] || { radius: 48, dead: 14, dpad: 0.18 };
      this.joy.radius = cfg.radius;
      this.joy.dead = cfg.dead;
      this.dpadDead = cfg.dpad;
      const size = cfg.radius * 2 + 16;
      const base = this.els.joyBase;
      base.style.width = size + 'px';
      base.style.height = size + 'px';
      base.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
    }

    getDir() {
      if (this.touch.active) return { dx: this.touch.dx, dy: this.touch.dy };
      if (this.keys.length) {
        const k = KEYMAP[this.keys[this.keys.length - 1]];
        return { dx: k[0], dy: k[1] };
      }
      return { dx: 0, dy: 0 };
    }

    clearTouch() {
      this.touch.active = false; this.touch.dx = 0; this.touch.dy = 0;
      this.activeId = null;
      for (const b of this.els.dpad.querySelectorAll('.dbtn')) b.classList.remove('on');
      this.els.joyBase.hidden = true;
    }

    setTouchDir(dx, dy) {
      this.touch.active = true; this.touch.dx = dx; this.touch.dy = dy;
    }

    // ---- D-pad ----
    bindDpad() {
      const el = this.els.dpad;
      const update = (e) => {
        const r = el.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        let dx = 0, dy = 0;
        if (Math.hypot(nx, ny) >= this.dpadDead) {
          if (Math.abs(nx) > Math.abs(ny)) dx = nx > 0 ? 1 : -1; else dy = ny > 0 ? 1 : -1;
        }
        this.setTouchDir(dx, dy);
        for (const b of el.querySelectorAll('.dbtn')) {
          b.classList.toggle('on', +b.dataset.dx === dx && +b.dataset.dy === dy && (dx || dy));
        }
      };
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.cb.onAnyInput) this.cb.onAnyInput();
        this.activeId = e.pointerId;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        update(e);
      });
      el.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.activeId) return;
        e.preventDefault();
        update(e);
      });
      const end = (e) => {
        if (e.pointerId !== this.activeId) return;
        this.clearTouch();
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('lostpointercapture', end);
    }

    // ---- Joystick ----
    bindJoystick() {
      const zone = this.els.joystick;
      const base = this.els.joyBase;
      const knob = this.els.joyKnob;
      const J = this.joy;

      const place = (e) => {
        const r = zone.getBoundingClientRect();
        const m = J.radius + 8;
        J.cx = Math.min(Math.max(e.clientX - r.left, m), r.width - m);
        J.cy = Math.min(Math.max(e.clientY - r.top, m), r.height - m);
        base.style.left = J.cx + 'px';
        base.style.top = J.cy + 'px';
        base.hidden = false;
      };
      const update = (e) => {
        const r = zone.getBoundingClientRect();
        let vx = (e.clientX - r.left) - J.cx;
        let vy = (e.clientY - r.top) - J.cy;
        const len = Math.hypot(vx, vy);
        if (len > J.radius) { vx = vx / len * J.radius; vy = vy / len * J.radius; }
        knob.style.transform = `translate(${vx}px, ${vy}px)`;
        let dx = 0, dy = 0;
        if (len >= J.dead) {
          if (Math.abs(vx) > Math.abs(vy)) dx = vx > 0 ? 1 : -1; else dy = vy > 0 ? 1 : -1;
        }
        this.setTouchDir(dx, dy);
        base.dataset.dir = dx === 1 ? 'r' : dx === -1 ? 'l' : dy === 1 ? 'd' : dy === -1 ? 'u' : '';
      };
      zone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.cb.onAnyInput) this.cb.onAnyInput();
        this.activeId = e.pointerId;
        try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        place(e);
        update(e);
        zone.classList.add('active');
      });
      zone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.activeId) return;
        e.preventDefault();
        update(e);
      });
      const end = (e) => {
        if (e.pointerId !== this.activeId) return;
        knob.style.transform = '';
        zone.classList.remove('active');
        this.clearTouch();
      };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);
      zone.addEventListener('lostpointercapture', end);
    }

    // ---- Näppäimistö ----
    bindKeyboard() {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          if (this.cb.onPause) this.cb.onPause();
          return;
        }
        if (!KEYMAP[e.key]) return;
        e.preventDefault();
        if (this.cb.onAnyInput) this.cb.onAnyInput();
        if (!this.keys.includes(e.key)) this.keys.push(e.key);
      });
      window.addEventListener('keyup', (e) => {
        const i = this.keys.indexOf(e.key);
        if (i >= 0) this.keys.splice(i, 1);
      });
      window.addEventListener('blur', () => { this.keys.length = 0; this.clearTouch(); });
    }
  }

  window.BD = window.BD || {};
  window.BD.Input = Input;
})();
