/* Boulder Dash - pelimoottori. Toteuttaa klassiset luolasäännöt:
   putoavat ja vierivät kivet, timantit, tulikärpäset, perhoset, ameeba,
   taikaseinä, räjähdykset sekä Rockfordin liikkumisen. */
(function () {
  'use strict';

  const T = {
    EMPTY: 0, DIRT: 1, WALL: 2, STEEL: 3,
    BOULDER: 4, BOULDER_F: 5, DIAMOND: 6, DIAMOND_F: 7,
    ROCKFORD: 8, INBOX: 9, EXIT_CLOSED: 10, EXIT_OPEN: 11,
    FIREFLY: 12, BUTTERFLY: 13, AMOEBA: 14, MAGIC: 15, EXPL: 16,
  };

  // Suunnat: 0 = ylös, 1 = oikea, 2 = alas, 3 = vasen
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];

  const SPAWN_TICKS = 12;
  const AMOEBA_MAX = 200;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Cave {
    /**
     * @param {object} def   luolan määrittely (ks. caves.js)
     * @param {Uint8Array} cells  generoitu ruudukko
     * @param {object} hooks  { onSound(name), }
     */
    constructor(def, cells, hooks) {
      this.def = def;
      this.w = def.w; this.h = def.h;
      this.cells = cells;
      this.aux = new Uint8Array(this.w * this.h);
      this.scanned = new Uint8Array(this.w * this.h);
      this.hooks = hooks || {};
      this.rng = mulberry32((def.seed * 7919 + 12345) | 0);

      this.tps = 1000 / def.speed;          // tickejä sekunnissa
      this.ticksPerSecond = this.tps;
      this.timeLeft = def.time;              // sekunteja
      this.timeAcc = 0;
      this.collected = 0;
      this.needed = def.needed;
      this.score = 0;
      this.diamondValue = def.value;
      this.state = 'spawning';              // spawning | playing | dying | dead | won
      this.stateTicks = 0;
      this.tickCount = 0;
      this.exitOpen = false;

      this.magic = { state: 'off', ticks: 0 };
      this.amoeba = { count: 0, canGrow: true, ticks: 0, fast: false, done: false };

      this.rf = { x: 0, y: 0, facing: 1, moved: false, anim: 0 };
      this.lastMove = 0;
      this.timeBonus = 0;

      // Etsi aloituspaikka
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] === T.INBOX) { this.rf.x = i % this.w; this.rf.y = (i / this.w) | 0; }
      }
      // Alusta ötököiden suunnat
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] === T.FIREFLY) this.aux[i] = 3;      // aloittaa vasemmalle
        else if (cells[i] === T.BUTTERFLY) this.aux[i] = 2;
      }
    }

    idx(x, y) { return y * this.w + x; }
    get(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T.STEEL;
      return this.cells[y * this.w + x];
    }
    set(x, y, v, a) {
      const i = y * this.w + x;
      this.cells[i] = v;
      this.aux[i] = a || 0;
      this.scanned[i] = 1;
    }
    sound(name) { if (this.hooks.onSound) this.hooks.onSound(name); }

    isRounded(t) {
      return t === T.BOULDER || t === T.DIAMOND || t === T.WALL;
    }
    isEmptyish(t) { return t === T.EMPTY; }

    // ---- Räjähdys 3x3 ----
    explode(cx, cy, kind) {
      this.sound('explosion');
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (let x = cx - 1; x <= cx + 1; x++) {
          const t = this.get(x, y);
          if (t === T.STEEL || t === T.EXIT_CLOSED || t === T.EXIT_OPEN || t === T.INBOX) continue;
          if (t === T.ROCKFORD) this.killPlayer();
          this.set(x, y, T.EXPL, (kind << 2) | 0);
        }
      }
    }

    killPlayer() {
      if (this.state === 'playing' || this.state === 'spawning') {
        this.state = 'dying';
        this.stateTicks = 0;
      }
    }

    // ---- Putoava esine (kivi tai timantti) ----
    processFalling(x, y, t) {
      const falling = (t === T.BOULDER_F || t === T.DIAMOND_F);
      const isBoulder = (t === T.BOULDER || t === T.BOULDER_F);
      const restT = isBoulder ? T.BOULDER : T.DIAMOND;
      const fallT = isBoulder ? T.BOULDER_F : T.DIAMOND_F;
      const below = this.get(x, y + 1);

      if (below === T.EMPTY) {
        this.set(x, y, T.EMPTY);
        this.set(x, y + 1, fallT);
        return;
      }
      if (falling) {
        if (below === T.ROCKFORD) { this.explode(x, y + 1, 0); return; }
        if (below === T.FIREFLY) { this.explode(x, y + 1, 0); return; }
        if (below === T.BUTTERFLY) { this.explode(x, y + 1, 1); return; }
        if (below === T.MAGIC) {
          if (this.magic.state === 'off') {
            this.magic.state = 'on';
            this.magic.ticks = Math.round(this.def.magicTime * this.tps);
            this.sound('magic');
          }
          if (this.magic.state === 'on') {
            const bb = this.get(x, y + 2);
            if (bb === T.EMPTY) {
              this.set(x, y, T.EMPTY);
              this.set(x, y + 2, isBoulder ? T.DIAMOND_F : T.BOULDER_F);
            }
            // muuten odotetaan seinän päällä (pysyy putoavana)
          } else {
            this.set(x, y, T.EMPTY); // kulunut taikaseinä nielaisee esineen
          }
          return;
        }
        if (this.isRounded(below) && this.tryRoll(x, y, fallT)) return;
        this.cells[this.idx(x, y)] = restT;
        this.sound(isBoulder ? 'boulder' : 'diamondLand');
        return;
      }
      // lepäävä esine pyöreän päällä vierii
      if (this.isRounded(below)) this.tryRoll(x, y, fallT);
    }

    tryRoll(x, y, fallT) {
      if (this.get(x - 1, y) === T.EMPTY && this.get(x - 1, y + 1) === T.EMPTY) {
        this.set(x, y, T.EMPTY); this.set(x - 1, y, fallT); return true;
      }
      if (this.get(x + 1, y) === T.EMPTY && this.get(x + 1, y + 1) === T.EMPTY) {
        this.set(x, y, T.EMPTY); this.set(x + 1, y, fallT); return true;
      }
      return false;
    }

    // ---- Tulikärpänen / perhonen ----
    processCreature(x, y, t) {
      const i = this.idx(x, y);
      const dir = this.aux[i] & 3;
      // Koskettaako Rockfordia tai ameebaa?
      for (let d = 0; d < 4; d++) {
        const n = this.get(x + DX[d], y + DY[d]);
        if (n === T.ROCKFORD || n === T.AMOEBA) {
          this.explode(x, y, t === T.BUTTERFLY ? 1 : 0);
          return;
        }
      }
      const turn = (t === T.FIREFLY) ? 3 : 1; // tulikärpänen kääntyy vasemmalle, perhonen oikealle
      const d1 = (dir + turn) & 3;
      if (this.get(x + DX[d1], y + DY[d1]) === T.EMPTY) {
        this.set(x, y, T.EMPTY);
        this.set(x + DX[d1], y + DY[d1], t, d1);
        return;
      }
      if (this.get(x + DX[dir], y + DY[dir]) === T.EMPTY) {
        this.set(x, y, T.EMPTY);
        this.set(x + DX[dir], y + DY[dir], t, dir);
        return;
      }
      this.aux[i] = (dir + 4 - turn) & 3; // käänny toiseen suuntaan paikallaan
    }

    // ---- Ameeba ----
    processAmoeba(x, y) {
      this.amoeba.count++;
      let grow = false;
      for (let d = 0; d < 4; d++) {
        const n = this.get(x + DX[d], y + DY[d]);
        if (n === T.EMPTY || n === T.DIRT) { this.amoeba.canGrow = true; grow = true; }
      }
      if (!grow) return;
      const p = this.amoeba.fast ? (1 / 16) : (1 / 128);
      if (this.rng() < p) {
        const d = (this.rng() * 4) | 0;
        const n = this.get(x + DX[d], y + DY[d]);
        if (n === T.EMPTY || n === T.DIRT) this.set(x + DX[d], y + DY[d], T.AMOEBA);
      }
    }

    // ---- Rockford ----
    processRockford(x, y, input) {
      this.rf.moved = false;
      if (!input || (input.dx === 0 && input.dy === 0)) return;
      const dx = input.dx, dy = input.dy;
      const nx = x + dx, ny = y + dy;
      const target = this.get(nx, ny);
      if (dx !== 0) this.rf.facing = dx;

      const move = () => {
        this.set(x, y, T.EMPTY);
        this.set(nx, ny, T.ROCKFORD);
        this.rf.x = nx; this.rf.y = ny; this.rf.moved = true;
      };

      switch (target) {
        case T.EMPTY: move(); break;
        case T.DIRT: move(); this.sound('dig'); break;
        case T.DIAMOND:
        case T.DIAMOND_F:
          this.collectDiamond(); move(); break;
        case T.BOULDER:
          if (dy === 0 && this.get(nx + dx, ny) === T.EMPTY) {
            this.set(nx + dx, ny, T.BOULDER);
            move();
            this.sound('push');
          }
          break;
        case T.EXIT_OPEN:
          move();
          this.state = 'won';
          this.stateTicks = 0;
          this.timeBonus = Math.max(0, Math.floor(this.timeLeft)) * (this.def.timeBonus || 1);
          this.score += this.timeBonus;
          this.sound('won');
          break;
        default: break;
      }
    }

    collectDiamond() {
      this.collected++;
      this.score += (this.collected > this.needed) ? this.def.extra : this.def.value;
      this.sound('diamond');
      if (!this.exitOpen && this.collected >= this.needed) this.openExit();
    }

    openExit() {
      this.exitOpen = true;
      for (let i = 0; i < this.cells.length; i++) {
        if (this.cells[i] === T.EXIT_CLOSED) this.cells[i] = T.EXIT_OPEN;
      }
      this.sound('exitOpen');
    }

    // ---- Yksi pelitick ----
    tick(input) {
      this.tickCount++;
      this.stateTicks++;
      this.scanned.fill(0);
      this.amoeba.count = 0;
      this.amoeba.canGrow = false;

      if (this.state === 'playing') {
        this.timeAcc += 1 / this.tps;
        if (this.timeAcc >= 1) {
          this.timeAcc -= 1;
          this.timeLeft--;
          if (this.timeLeft <= 10 && this.timeLeft > 0) this.sound('tick');
          if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.explode(this.rf.x, this.rf.y, 0);
          }
        }
        if (this.magic.state === 'on') {
          if (--this.magic.ticks <= 0) this.magic.state = 'expired';
        }
        if (!this.amoeba.fast) {
          this.amoeba.ticks++;
          if (this.amoeba.ticks >= this.def.amoebaTime * this.tps) this.amoeba.fast = true;
        }
      }

      const w = this.w, h = this.h;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (this.scanned[i]) continue;
          const t = this.cells[i];
          switch (t) {
            case T.BOULDER: case T.BOULDER_F:
            case T.DIAMOND: case T.DIAMOND_F:
              this.processFalling(x, y, t); break;
            case T.FIREFLY: case T.BUTTERFLY:
              this.processCreature(x, y, t); break;
            case T.AMOEBA:
              if (!this.amoeba.done) this.processAmoeba(x, y);
              break;
            case T.ROCKFORD:
              if (this.state === 'playing') this.processRockford(x, y, input);
              break;
            case T.INBOX:
              if (this.state === 'spawning' && this.stateTicks >= SPAWN_TICKS) {
                this.cells[i] = T.ROCKFORD;
                this.state = 'playing';
                this.stateTicks = 0;
                this.sound('spawn');
              }
              break;
            case T.EXPL: {
              const stage = this.aux[i] & 3;
              const kind = this.aux[i] >> 2;
              if (stage >= 2) {
                this.cells[i] = kind ? T.DIAMOND : T.EMPTY;
                this.aux[i] = 0;
              } else {
                this.aux[i] = (kind << 2) | (stage + 1);
              }
              break;
            }
            default: break;
          }
        }
      }

      // Ameeban lopputulos
      if (!this.amoeba.done && this.amoeba.count > 0) {
        if (this.amoeba.count >= AMOEBA_MAX) {
          this.convertAmoeba(T.BOULDER); this.amoeba.done = true;
        } else if (!this.amoeba.canGrow) {
          this.convertAmoeba(T.DIAMOND); this.amoeba.done = true;
        }
      }

      if (this.state === 'dying' && this.stateTicks >= 6) {
        this.state = 'dead';
        this.stateTicks = 0;
      }
      if (this.rf.moved) this.rf.anim = (this.rf.anim + 1) % 2;
    }

    convertAmoeba(to) {
      for (let i = 0; i < this.cells.length; i++) {
        if (this.cells[i] === T.AMOEBA) this.cells[i] = to;
      }
      this.sound(to === T.DIAMOND ? 'amoebaDiamond' : 'amoebaBoulder');
    }
  }

  window.BD = window.BD || {};
  window.BD.T = T;
  window.BD.Cave = Cave;
  window.BD.mulberry32 = mulberry32;
})();
