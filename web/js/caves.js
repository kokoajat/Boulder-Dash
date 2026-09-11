/* Boulder Dash - luolat.
   Jokainen luola määritellään satunnaistäytön todennäköisyyksillä (siemenluku tekee
   täytöstä toistettavan) sekä käsin piirretyillä rakenteilla.

   Merkit:  ' ' tyhjä  '.' maa  'W' tiiliseinä  '#' terässeinä  'r' kivi  'd' timantti
            'P' Rockfordin alku  'X' uloskäynti  'f' tulikärpänen  'b' perhonen
            'a' ameeba  'M' taikaseinä
*/
(function () {
  'use strict';
  const T = BD.T;

  const CH = {
    ' ': T.EMPTY, '.': T.DIRT, 'W': T.WALL, '#': T.STEEL, 'r': T.BOULDER,
    'd': T.DIAMOND, 'P': T.INBOX, 'X': T.EXIT_CLOSED, 'f': T.FIREFLY,
    'b': T.BUTTERFLY, 'a': T.AMOEBA, 'M': T.MAGIC,
  };

  const W = 40, H = 22;

  const base = (o) => Object.assign({
    w: W, h: H, seed: 1, needed: 10, value: 10, extra: 20, time: 150, speed: 160,
    amoebaTime: 30, magicTime: 25, timeBonus: 1,
    fill: { boulder: 0.10, diamond: 0.06, firefly: 0, butterfly: 0, empty: 0.05 },
    objects: [],
  }, o);

  const CAVES = [
    base({
      name: 'Timanttikaivos', seed: 11, needed: 12, value: 10, extra: 15, time: 150,
      fill: { boulder: 0.10, diamond: 0.08, empty: 0.06 },
      objects: [
        ['P', 3, 3], ['X', 39, 18],
        ['line', 8, 8, 20, 8, 'W'], ['line', 25, 14, 33, 14, 'W'],
        ['pts', 'd', [10, 7], [11, 7], [12, 7], [28, 13], [29, 13]],
      ],
    }),
    base({
      name: 'Vierivät kivet', seed: 23, needed: 15, value: 10, extra: 20, time: 140,
      fill: { boulder: 0.22, diamond: 0.06, empty: 0.06 },
      objects: [
        ['P', 2, 2], ['X', 20, 21],
        ['line', 5, 6, 15, 6, 'W'], ['line', 24, 5, 34, 5, 'W'],
        ['line', 5, 12, 15, 12, 'W'], ['line', 24, 12, 34, 12, 'W'],
        ['line', 10, 17, 30, 17, 'W'],
        ['line', 6, 5, 14, 5, 'r'], ['line', 25, 4, 33, 4, 'r'],
        ['line', 11, 16, 29, 16, 'd'],
      ],
    }),
    base({
      name: 'Tulikärpäset', seed: 37, needed: 14, value: 15, extra: 25, time: 150,
      fill: { boulder: 0.12, diamond: 0.06, empty: 0.04 },
      objects: [
        ['P', 2, 2], ['X', 39, 3],
        // Kolme tulikärpäshuonetta
        ['rect', 8, 6, 8, 5, 'W'], ['fill', 9, 7, 6, 3, ' '], ['pt', 10, 8, 'f'], ['pt', 13, 8, 'f'],
        ['rect', 22, 12, 9, 5, 'W'], ['fill', 23, 13, 7, 3, ' '], ['pt', 24, 14, 'f'], ['pt', 28, 14, 'f'],
        ['rect', 30, 3, 6, 4, 'W'], ['fill', 31, 4, 4, 2, ' '], ['pt', 32, 4, 'f'],
        ['pts', 'd', [9, 5], [16, 5], [22, 11], [31, 11], [30, 2]],
        ['line', 8, 5, 15, 5, 'r'], ['line', 23, 11, 30, 11, 'r'],
      ],
    }),
    base({
      name: 'Perhoset', seed: 41, needed: 16, value: 10, extra: 25, time: 160,
      fill: { boulder: 0.14, diamond: 0.04, empty: 0.05 },
      objects: [
        ['P', 20, 2], ['X', 0, 20],
        ['rect', 4, 8, 8, 6, 'W'], ['fill', 5, 9, 6, 4, ' '], ['pt', 6, 10, 'b'], ['pt', 9, 11, 'b'],
        ['rect', 28, 8, 8, 6, 'W'], ['fill', 29, 9, 6, 4, ' '], ['pt', 30, 10, 'b'], ['pt', 33, 11, 'b'],
        ['line', 5, 7, 10, 7, 'r'], ['line', 29, 7, 34, 7, 'r'],
        ['pt', 7, 8, ' '], ['pt', 32, 8, ' '],
        ['line', 14, 16, 26, 16, 'W'], ['line', 15, 15, 25, 15, 'd'],
      ],
    }),
    base({
      name: 'Taikaseinä', seed: 53, needed: 20, value: 10, extra: 20, time: 180, magicTime: 30,
      fill: { boulder: 0.16, diamond: 0.03, empty: 0.06 },
      objects: [
        ['P', 2, 2], ['X', 39, 20],
        ['line', 6, 12, 33, 12, 'M'],
        ['fill', 6, 13, 28, 2, ' '],
        ['line', 6, 15, 33, 15, 'W'],
        ['fill', 6, 8, 28, 4, 'r'],
        ['fill', 6, 6, 28, 2, '.'],
        ['pt', 5, 12, 'W'], ['pt', 34, 12, 'W'],
        ['pt', 5, 13, 'W'], ['pt', 34, 13, 'W'], ['pt', 5, 14, 'W'], ['pt', 34, 14, 'W'],
        ['pts', 'd', [3, 18], [10, 18], [17, 19], [24, 18], [31, 19], [36, 17], [12, 3], [26, 3]],
      ],
    }),
    base({
      name: 'Ameeba', seed: 67, needed: 18, value: 15, extra: 25, time: 200, amoebaTime: 40,
      fill: { boulder: 0.12, diamond: 0.05, empty: 0.06 },
      objects: [
        ['P', 2, 19], ['X', 39, 2],
        ['rect', 30, 14, 9, 7, 'W'], ['fill', 31, 15, 7, 5, ' '], ['fill', 33, 16, 3, 3, 'a'],
        ['pt', 30, 17, '.'],
        ['line', 8, 4, 8, 10, 'W'], ['line', 16, 12, 16, 18, 'W'], ['line', 24, 4, 24, 10, 'W'],
        ['pts', 'd', [9, 4], [9, 5], [15, 12], [15, 13], [25, 4], [25, 5], [36, 4], [36, 5]],
      ],
    }),
    base({
      name: 'Labyrintti', seed: 71, needed: 20, value: 15, extra: 30, time: 200, speed: 150,
      fill: { boulder: 0.06, diamond: 0.06, empty: 0.02 },
      objects: [
        ['P', 1, 1], ['X', 39, 20],
        ['maze', 2, 2, 36, 18],
        ['pt', 1, 2, ' '], ['pt', 2, 1, ' '],
        ['pts', 'f', [19, 10], [11, 6], [27, 14]],
        ['pts', 'd', [19, 9], [11, 5], [27, 13], [37, 19], [3, 19], [37, 3]],
      ],
    }),
    base({
      name: 'Kivisade', seed: 83, needed: 22, value: 15, extra: 30, time: 170, speed: 150,
      fill: { boulder: 0.05, diamond: 0.05, empty: 0.05 },
      objects: [
        ['P', 20, 20], ['X', 0, 1],
        ['line', 4, 1, 4, 8, 'r'], ['line', 8, 1, 8, 10, 'r'], ['line', 12, 1, 12, 8, 'r'],
        ['line', 16, 1, 16, 10, 'r'], ['line', 24, 1, 24, 10, 'r'], ['line', 28, 1, 28, 8, 'r'],
        ['line', 32, 1, 32, 10, 'r'], ['line', 36, 1, 36, 8, 'r'],
        ['line', 4, 9, 4, 10, 'd'], ['line', 12, 9, 12, 10, 'd'], ['line', 28, 9, 28, 10, 'd'], ['line', 36, 9, 36, 10, 'd'],
        ['line', 2, 13, 37, 13, 'W'], ['pt', 20, 13, '.'],
        ['line', 3, 12, 36, 12, 'd'],
      ],
    }),
    base({
      name: 'Perhoshuone', seed: 97, needed: 24, value: 15, extra: 30, time: 180, speed: 150,
      fill: { boulder: 0.14, diamond: 0.04, empty: 0.05 },
      objects: [
        ['P', 2, 2], ['X', 39, 11],
        ['rect', 12, 6, 16, 10, 'W'], ['fill', 13, 7, 14, 8, ' '],
        ['pts', 'b', [15, 8], [24, 8], [15, 13], [24, 13], [19, 10]],
        ['line', 13, 5, 26, 5, 'r'], ['line', 13, 4, 26, 4, 'r'],
        ['pts', ' ', [16, 6], [20, 6], [24, 6]],
        ['pts', 'd', [3, 18], [36, 18], [3, 10], [36, 3], [10, 19], [30, 19]],
      ],
    }),
    base({
      name: 'Kaksoisuhka', seed: 101, needed: 25, value: 15, extra: 30, time: 190, speed: 140,
      fill: { boulder: 0.12, diamond: 0.06, firefly: 0.006, empty: 0.08 },
      objects: [
        ['P', 20, 11], ['X', 39, 1],
        ['rect', 17, 8, 7, 7, 'W'], ['fill', 18, 9, 5, 5, '.'],
        ['pt', 20, 8, '.'],
        ['rect', 2, 2, 8, 5, 'W'], ['fill', 3, 3, 6, 3, ' '], ['pt', 4, 4, 'b'], ['pt', 7, 4, 'b'],
        ['rect', 30, 15, 8, 5, 'W'], ['fill', 31, 16, 6, 3, ' '], ['pt', 32, 17, 'b'], ['pt', 35, 17, 'b'],
        ['line', 3, 1, 8, 1, 'r'], ['line', 31, 14, 36, 14, 'r'],
        ['pt', 5, 2, ' '], ['pt', 33, 15, ' '],
      ],
    }),
    base({
      name: 'Ameeban syleily', seed: 113, needed: 28, value: 20, extra: 35, time: 220, speed: 140,
      amoebaTime: 35, magicTime: 40,
      fill: { boulder: 0.15, diamond: 0.04, empty: 0.06 },
      objects: [
        ['P', 2, 2], ['X', 39, 20],
        ['line', 20, 1, 20, 20, 'W'], ['pt', 20, 3, '.'], ['pt', 20, 19, '.'],
        ['rect', 4, 12, 7, 7, 'W'], ['fill', 5, 13, 5, 5, ' '], ['fill', 6, 14, 3, 3, 'a'], ['pt', 4, 15, '.'],
        ['line', 24, 10, 36, 10, 'M'], ['fill', 24, 11, 13, 2, ' '], ['line', 24, 13, 36, 13, 'W'],
        ['fill', 24, 6, 13, 4, 'r'], ['fill', 24, 4, 13, 2, '.'],
        ['pt', 23, 10, 'W'], ['pt', 37, 10, 'W'], ['pt', 23, 11, 'W'], ['pt', 37, 11, 'W'], ['pt', 23, 12, 'W'], ['pt', 37, 12, 'W'],
        ['pts', 'f', [28, 17], [33, 17]],
        ['pts', 'd', [3, 8], [12, 5], [16, 18], [30, 2], [36, 16]],
      ],
    }),
    base({
      name: 'Viimeinen kaivos', seed: 131, needed: 30, value: 20, extra: 40, time: 240, speed: 130,
      amoebaTime: 30, magicTime: 30,
      fill: { boulder: 0.16, diamond: 0.06, firefly: 0.005, butterfly: 0.004, empty: 0.06 },
      objects: [
        ['P', 20, 1], ['X', 20, 21],
        ['line', 12, 4, 28, 4, 'W'], ['line', 12, 4, 12, 8, 'W'], ['line', 28, 4, 28, 8, 'W'],
        ['fill', 13, 5, 15, 3, '.'], ['pt', 20, 4, '.'],
        ['rect', 2, 14, 7, 6, 'W'], ['fill', 3, 15, 5, 4, ' '], ['fill', 4, 16, 3, 2, 'a'], ['pt', 8, 17, '.'],
        ['rect', 31, 14, 7, 6, 'W'], ['fill', 32, 15, 5, 4, ' '], ['pts', 'b', [33, 16], [36, 17]],
        ['line', 32, 13, 36, 13, 'r'], ['pt', 34, 14, ' '],
        ['line', 14, 15, 26, 15, 'M'], ['fill', 14, 16, 13, 2, ' '], ['line', 14, 18, 26, 18, 'W'],
        ['fill', 14, 11, 13, 4, 'r'], ['fill', 14, 9, 13, 2, '.'],
        ['pt', 13, 15, 'W'], ['pt', 27, 15, 'W'], ['pt', 13, 16, 'W'], ['pt', 27, 16, 'W'], ['pt', 13, 17, 'W'], ['pt', 27, 17, 'W'],
        ['pts', 'd', [3, 3], [36, 3], [3, 11], [36, 11], [10, 20], [30, 20]],
      ],
    }),
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /** Rakentaa luolan ruudukon määrittelystä. */
  function generate(def) {
    const w = def.w, h = def.h;
    const cells = new Uint8Array(w * h);
    const rng = BD.mulberry32(def.seed);
    const f = def.fill;
    const pB = f.boulder || 0, pD = f.diamond || 0, pF = f.firefly || 0, pBf = f.butterfly || 0, pE = f.empty || 0;

    const put = (x, y, ch) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      cells[y * w + x] = CH[ch];
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { cells[y * w + x] = T.STEEL; continue; }
        const r = rng();
        let t = T.DIRT;
        if (r < pB) t = T.BOULDER;
        else if (r < pB + pD) t = T.DIAMOND;
        else if (r < pB + pD + pF) t = T.FIREFLY;
        else if (r < pB + pD + pF + pBf) t = T.BUTTERFLY;
        else if (r < pB + pD + pF + pBf + pE) t = T.EMPTY;
        cells[y * w + x] = t;
      }
    }

    let start = null;
    // Aloituspaikka ja uloskäynti sijoitetaan viimeisenä, jotta muut rakenteet eivät peitä niitä.
    const ordered = def.objects.filter((o) => o[0] !== 'P' && o[0] !== 'X')
      .concat(def.objects.filter((o) => o[0] === 'P' || o[0] === 'X'));
    for (const o of ordered) {
      const k = o[0];
      if (k === 'P') { start = [o[1], o[2]]; put(o[1], o[2], 'P'); }
      else if (k === 'X') put(o[1], o[2], 'X');
      else if (k === 'pt') put(o[1], o[2], o[3]);
      else if (k === 'pts') { for (let i = 2; i < o.length; i++) put(o[i][0], o[i][1], o[1]); }
      else if (k === 'line') {
        const [, x1, y1, x2, y2, ch] = o;
        const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        for (let i = 0; i <= n; i++) {
          put(Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n), ch);
        }
      } else if (k === 'rect') {
        const [, x, y, rw, rh, ch] = o;
        for (let i = 0; i < rw; i++) { put(x + i, y, ch); put(x + i, y + rh - 1, ch); }
        for (let j = 0; j < rh; j++) { put(x, y + j, ch); put(x + rw - 1, y + j, ch); }
      } else if (k === 'fill') {
        const [, x, y, rw, rh, ch] = o;
        for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) put(x + i, y + j, ch);
      } else if (k === 'maze') {
        // Tiiliseinäruudukko, jossa satunnaisia aukkoja: parillisilla riveillä/sarakkeilla seinä.
        const [, x, y, mw, mh] = o;
        for (let j = 0; j < mh; j++) {
          for (let i = 0; i < mw; i++) {
            const gx = x + i, gy = y + j;
            if (j % 4 === 0 && (i % 6) !== 3) put(gx, gy, 'W');
            if (i % 6 === 0 && (j % 4) !== 2) put(gx, gy, 'W');
          }
        }
      }
    }

    // Turvallinen aloitusalue: ei kiviä tai ötököitä aloituspaikan vieressä eikä yläpuolella
    if (start) {
      const [sx, sy] = start;
      for (let y = sy - 2; y <= sy + 1; y++) {
        for (let x = sx - 1; x <= sx + 1; x++) {
          if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1) continue;
          if (x === sx && y === sy) continue;
          const t = cells[y * w + x];
          if (t === T.BOULDER || t === T.FIREFLY || t === T.BUTTERFLY || t === T.DIAMOND) cells[y * w + x] = T.DIRT;
        }
      }
    }

    // Varmista että timantteja on riittävästi
    let diamonds = 0;
    for (let i = 0; i < cells.length; i++) if (cells[i] === T.DIAMOND) diamonds++;
    let guard = 0;
    while (diamonds < def.needed + 4 && guard++ < 5000) {
      const x = 1 + ((rng() * (w - 2)) | 0), y = 1 + ((rng() * (h - 2)) | 0);
      const i = y * w + x;
      if (cells[i] === T.DIRT && cells[(y - 1) * w + x] !== T.BOULDER) { cells[i] = T.DIAMOND; diamonds++; }
    }
    return cells;
  }

  window.BD.CAVES = CAVES;
  window.BD.generateCave = generate;
  window.BD.CH = CH;
  window.BD.clamp = clamp;
})();
