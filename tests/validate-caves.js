/* Tarkistaa, että jokaisessa luolassa on aloituspaikka, uloskäynti, reitti sinne ja riittävästi timantteja.
   Ajo: node tests/validate-caves.js [maps] */
const fs = require('fs');
const vm = require('vm');
const ctx = { document: {}, performance: { now: () => 0 }, console }; ctx.window = ctx;

vm.createContext(ctx);
for (const f of ['engine.js', 'caves.js']) vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'web', 'js', f), 'utf8'), ctx, { filename: f });
const BD = ctx.window.BD, T = BD.T;
let ok = true;
BD.CAVES.forEach((def, li) => {
  const cells = BD.generateCave(def);
  const w = def.w, h = def.h;
  let start = -1, exit = -1, diamonds = 0, boulders = 0, bfly = 0, magic = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === T.INBOX) start = i;
    if (cells[i] === T.EXIT_CLOSED) exit = i;
    if (cells[i] === T.DIAMOND) diamonds++;
    if (cells[i] === T.BOULDER) boulders++;
    if (cells[i] === T.BUTTERFLY) bfly++;
    if (cells[i] === T.MAGIC) magic++;
  }
  // BFS reachability over passable cells
  const pass = (t) => t === T.DIRT || t === T.EMPTY || t === T.DIAMOND || t === T.INBOX || t === T.EXIT_CLOSED || t === T.BOULDER;
  const seen = new Uint8Array(cells.length); const q = [start]; seen[start] = 1;
  let reachDiamonds = 0;
  while (q.length) {
    const i = q.shift(); const x = i % w, y = (i / w) | 0;
    if (cells[i] === T.DIAMOND) reachDiamonds++;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (seen[j] || !pass(cells[j])) continue; seen[j] = 1; q.push(j);
    }
  }
  const reachExit = seen[exit] === 1;
  // simulate 600 ticks with random input to catch crashes
  const cave = new BD.Cave(def, cells.slice(), {});
  const rng = BD.mulberry32(5);
  for (let t = 0; t < 600; t++) {
    const d = (rng() * 5) | 0;
    cave.tick({ dx: [0,1,-1,0,0][d], dy: [0,0,0,1,-1][d] });
    if (cave.state === 'dead' || cave.state === 'won') break;
  }
  const line = `${li + 1}. ${def.name.padEnd(18)} need=${def.needed} diamonds=${diamonds} reachable=${reachDiamonds} boulders=${boulders} bfly=${bfly} magic=${magic} start=${start >= 0} exit=${exit >= 0} exitReachable=${reachExit} simState=${cave.state} t=${cave.timeLeft}`;
  console.log(line);
  if (start < 0 || exit < 0 || !reachExit || reachDiamonds < def.needed) { ok = false; console.log('   !!! PROBLEM'); }
  // print map
  let s = '';
  const ch = { [T.EMPTY]: ' ', [T.DIRT]: '.', [T.WALL]: 'W', [T.STEEL]: '#', [T.BOULDER]: 'r', [T.DIAMOND]: 'd', [T.INBOX]: 'P', [T.EXIT_CLOSED]: 'X', [T.FIREFLY]: 'f', [T.BUTTERFLY]: 'b', [T.AMOEBA]: 'a', [T.MAGIC]: 'M' };
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) s += ch[cells[y * w + x]] ?? '?'; s += '\n'; }
  if (process.argv[2] === 'maps') console.log(s);
});
console.log(ok ? 'ALL OK' : 'PROBLEMS FOUND');
process.exit(ok ? 0 : 1);
