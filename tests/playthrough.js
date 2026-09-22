/* Pelaa jokaisen luolan läpi botilla oikealla pelimoottorilla (kivet putoavat, ötökät
   liikkuvat, aika kuluu). Botti etsii turvallisen reitin lähimpään timanttiin ja lopuksi
   uloskäynnille, suunnittelee joka askeleella uudelleen ja yrittää useita kertoja.
   Ajo: node tests/playthrough.js [yritykset] [verbose] */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ctx = { document: {}, performance: { now: () => 0 }, console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'caves.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'js', f), 'utf8'), ctx, { filename: f });
}
const BD = ctx.window.BD, T = BD.T;
const ATTEMPTS = +(process.argv[2] || 40);
const VERBOSE = process.argv.includes('verbose');
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const walkable = (t) => t === T.DIRT || t === T.EMPTY || t === T.DIAMOND || t === T.DIAMOND_F;
const isBoulder = (t) => t === T.BOULDER || t === T.BOULDER_F;
const isFalling = (t) => t === T.BOULDER_F || t === T.DIAMOND_F;
const isEnemy = (t) => t === T.FIREFLY || t === T.BUTTERFLY;

/** Onko ruutu vaarallinen astua: putoava esine yläpuolella tyhjän kautta. */
function fallingOnto(c, x, y) {
  for (let yy = y - 1; yy >= 0; yy--) {
    const t = c.get(x, yy);
    if (t === T.EMPTY) continue;
    return isFalling(t);
  }
  return false;
}
/** Voiko kivi vieriä ruutuun (x,y): viereisessä yläruudussa kivi pyöreän esineen päällä ja välissä tyhjää. */
function rollOnto(c, x, y) {
  if (c.get(x, y - 1) !== T.EMPTY) return false;
  for (const dx of [-1, 1]) {
    const t = c.get(x + dx, y - 1);
    if (isBoulder(t) || t === T.DIAMOND) {
      const below = c.get(x + dx, y);
      if (below === T.BOULDER || below === T.DIAMOND || below === T.WALL) return true;
    }
  }
  return false;
}

function enemyDist(c) {
  const d = new Int16Array(c.w * c.h).fill(99);
  const q = [];
  for (let i = 0; i < c.cells.length; i++) if (isEnemy(c.cells[i])) { d[i] = 0; q.push(i); }
  let h = 0;
  while (h < q.length) {
    const i = q[h++]; if (d[i] >= 3) continue;
    const x = i % c.w, y = (i / c.w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= c.w || ny >= c.h) continue;
      const j = ny * c.w + nx; const t = c.cells[j];
      if (t === T.STEEL || t === T.WALL || t === T.MAGIC) continue; // ötökät eivät kulje seinien läpi
      if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); }
    }
  }
  return d;
}

/** Ötököiden alue: tyhjät ruudut, joihin ötökkä voi liikkua (2), ja niiden naapurit (1). */
function enemyZone(c) {
  const z = new Uint8Array(c.w * c.h);
  const q = [];
  for (let i = 0; i < c.cells.length; i++) if (isEnemy(c.cells[i])) { z[i] = 2; q.push(i); }
  let h = 0;
  while (h < q.length) {
    const i = q[h++]; const x = i % c.w, y = (i / c.w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= c.w || ny >= c.h) continue;
      const j = ny * c.w + nx;
      if (c.cells[j] === T.EMPTY) { if (z[j] !== 2) { z[j] = 2; q.push(j); } }
      else if (!z[j]) z[j] = 1;
    }
  }
  return z;
}

/** Dijkstra Rockfordista; palauttaa etäisyydet, vanhemmat ja seuraavan askeleen laskijan. */
function plan(c, rng, targetFn) {
  const w = c.w, h = c.h;
  const ed = enemyDist(c);
  const zone = enemyZone(c);
  const dist = new Int32Array(w * h).fill(1e9), parent = new Int32Array(w * h).fill(-1);
  const s = c.rf.y * w + c.rf.x; dist[s] = 0;
  const pq = [[0, s]];
  const order = DIRS.slice().sort(() => rng() - 0.5);
  let best = -1;
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, i] = pq.shift();
    if (d > dist[i]) continue;
    if (i !== s && targetFn(c.cells[i], i)) { best = i; break; }
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of order) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; const t = c.cells[j];
      if (i === s && stepDanger(c, dx, dy)) continue; // ensimmäinen askel: sama sääntö kuin toteutuksessa
      let cost = 1;
      if (t === T.EXIT_OPEN) cost = 1;
      else if (walkable(t)) cost = t === T.DIRT ? 1.2 : 1;
      else if (t === T.BOULDER && dy === 0 && c.get(nx + dx, ny) === T.EMPTY) cost = 4; // työntö
      else continue;
      if (ed[j] <= 2) cost += 40;                       // ötökän lähellä
      if (zone[j] === 2 && !targetFn(t, j)) continue;   // ötököiden liikkuma-alue: ei mennä
      if (zone[j] === 1) cost += 60;                    // ötökän mahdollinen kosketusruutu
      if (fallingOnto(c, nx, ny)) cost += 200;          // putoava esine yläpuolella
      if (rollOnto(c, nx, ny)) cost += 30;
      if (dy === 1) {                                   // alas: yläpuolen kivi seuraa
        const above = c.get(x, y - 1);
        if (isBoulder(above) || above === T.DIAMOND || above === T.DIAMOND_F || fallingOnto(c, x, y)) cost += 300;
      }
      if (dist[i] + cost < dist[j]) { dist[j] = dist[i] + cost; parent[j] = i; pq.push([dist[j], j]); }
    }
  }
  if (best < 0) return null;
  let i = best; while (parent[i] !== s && parent[i] !== -1) i = parent[i];
  const nx = i % w, ny = (i / w) | 0;
  return { dx: nx - c.rf.x, dy: ny - c.rf.y, cost: dist[best], target: best };
}

/** Välitön vaara: onko askel (dx,dy) juuri nyt tappava? */
function stepDanger(c, dx, dy) {
  const nx = c.rf.x + dx, ny = c.rf.y + dy;
  if (fallingOnto(c, nx, ny)) return true;
  if (dy === 1) {
    const above = c.get(c.rf.x, c.rf.y - 1);
    if (isBoulder(above) || above === T.DIAMOND || above === T.DIAMOND_F) return true;
  }
  const ed = enemyDist(c);
  if (ed[ny * c.w + nx] <= 1) return true;
  return false;
}

function playCave(def, seed) {
  const rng = BD.mulberry32(seed);
  const cells = BD.generateCave(def);
  const c = new BD.Cave(def, cells, {});
  const maxTicks = Math.round((def.time + 10) * c.tps);
  let idle = 0, lastCollected = 0, lastPos = -1, stuckTicks = 0;
  for (let t = 0; t < maxTicks; t++) {
    let input = { dx: 0, dy: 0 };
    if (c.state === 'playing') {
      const wantExit = c.collected >= c.needed;
      const p = plan(c, rng, wantExit
        ? (tt) => tt === T.EXIT_OPEN
        : (tt) => tt === T.DIAMOND || tt === T.DIAMOND_F);
      const ed = enemyDist(c);
      const underFalling = fallingOnto(c, c.rf.x, c.rf.y);
      if (underFalling || ed[c.rf.y * c.w + c.rf.x] <= 2) {
        // Väistä: putoava esine yläpuolella tai ötökkä lähellä -> paras turvallinen naapuri
        let bestScore = -1e9;
        for (const [dx, dy] of DIRS) {
          const nx = c.rf.x + dx, ny = c.rf.y + dy;
          if (!walkable(c.get(nx, ny)) || stepDanger(c, dx, dy)) continue;
          let score = ed[ny * c.w + nx] * 10 + (dy === 0 ? 5 : 0) - (dy === 1 ? 20 : 0);
          if (p && dx === p.dx && dy === p.dy) score += 3;
          if (score > bestScore) { bestScore = score; input = { dx, dy }; }
        }
      } else if (p && !stepDanger(c, p.dx, p.dy)) {
        input = { dx: p.dx, dy: p.dy };
        idle = 0;
      } else {
        idle++;
        if (idle > 12) {
          // Ei reittiä: ota satunnainen turvallinen askel, jotta tilanne muuttuu
          const zone = enemyZone(c);
          const opts = DIRS.filter(([dx, dy]) => walkable(c.get(c.rf.x + dx, c.rf.y + dy)) && !stepDanger(c, dx, dy)
            && !zone[(c.rf.y + dy) * c.w + c.rf.x + dx]);
          if (opts.length) { const [dx, dy] = opts[(rng() * opts.length) | 0]; input = { dx, dy }; }
        }
      }
    }
    c.tick(input);
    const pos = c.rf.y * c.w + c.rf.x;
    if (pos === lastPos && c.collected === lastCollected) stuckTicks++; else stuckTicks = 0;
    lastPos = pos; lastCollected = c.collected;
    if (c.state === 'won') return { ok: true, ticks: t, timeLeft: c.timeLeft, collected: c.collected, score: c.score };
    if (c.state === 'dead') return { ok: false, reason: c.timeLeft <= 0 ? 'aika loppui' : 'kuoli', ticks: t, collected: c.collected, needed: c.needed };
    if (stuckTicks > 60 * c.tps) return { ok: false, reason: 'jumissa', ticks: t, collected: c.collected, needed: c.needed };
  }
  return { ok: false, reason: 'aika loppui', collected: c.collected, needed: c.needed };
}

let allOk = true;
const MIN_RATE = 0.4; // vähintään 40 % yrityksistä läpi (botti on ihmistä varovaisempi ja jää joskus jumiin)
BD.CAVES.forEach((def, li) => {
  let wins = 0, best = null; const reasons = {};
  for (let a = 0; a < ATTEMPTS; a++) {
    const r = playCave(def, 1000 + a * 7 + li);
    if (r.ok) { wins++; if (!best || r.timeLeft > best.timeLeft) best = r; }
    else {
      reasons[r.reason] = (reasons[r.reason] || 0) + 1;
      if (VERBOSE) console.log(`   yritys ${a + 1}: ${r.reason} (timantteja ${r.collected}/${r.needed}, tick ${r.ticks})`);
    }
  }
  const rate = wins / ATTEMPTS;
  const ok = wins > 0 && rate >= MIN_RATE;
  if (!ok) allOk = false;
  console.log(`${String(li + 1).padStart(2)}. ${def.name.padEnd(18)} ${ok ? 'OK ' : 'EI '} läpi ${wins}/${ATTEMPTS}` +
    (best ? ` paras: aikaa jäljellä ${best.timeLeft}s, timantteja ${best.collected}/${def.needed}` : '') +
    (Object.keys(reasons).length ? ` epäonnistumiset: ${JSON.stringify(reasons)}` : ''));
});
console.log(allOk ? 'KAIKKI LUOLAT LÄPÄISTÄVISSÄ' : 'ONGELMIA');
process.exit(allOk ? 0 : 1);
