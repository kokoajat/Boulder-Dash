/* Pelimoottorin yksikkötestit. Ajo: node tests/engine.test.js */
const fs = require('fs'); const vm = require('vm');
const ctx = { document: {}, performance: { now: () => 0 }, console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine.js', 'caves.js']) vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'web', 'js', f), 'utf8'), ctx, { filename: f });
const BD = ctx.window.BD, T = BD.T;
function mk(rows, extra) {
  const h = rows.length, w = rows[0].length; const cells = new Uint8Array(w * h);
  rows.forEach((r, y) => [...r].forEach((c, x) => cells[y * w + x] = BD.CH[c]));
  const def = Object.assign({ w, h, seed: 1, needed: 1, value: 10, extra: 20, time: 100, speed: 160, amoebaTime: 1, magicTime: 5, name: 't' }, extra);
  const cave = new BD.Cave(def, cells, {}); cave.state = 'playing';
  for (let i = 0; i < cells.length; i++) if (cells[i] === T.INBOX) cells[i] = T.ROCKFORD;
  return cave;
}
const run = (c, n, d) => { for (let i = 0; i < n; i++) c.tick(d || { dx: 0, dy: 0 }); };
const row = (c, y) => [...Array(c.w)].map((_, x) => c.get(x, y)).join(',');
let fails = 0; const check = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) fails++; };

// 1. Taikaseinä: kivi -> timantti
let c = mk(['#######', '#..r..#', '#.. ..#', '#..M..#', '#.. ..#', '#.....#', '#P....#', '#######']);
run(c, 6);
check('magic wall converts boulder to diamond', c.get(3, 4) === T.DIAMOND && c.magic.state === 'on');

// 2. Perhonen räjähtää timanteiksi kiven alle
c = mk(['#######', '#..r..#', '#.. ..#', '#.. ..#', '#WWbWW#', '#.....#', '#P....#', '#######']);
c.cells[c.idx(3,4)] = T.BUTTERFLY; c.aux[c.idx(3,4)] = 2;
run(c, 8);
let diamonds = 0; for (let i = 0; i < c.cells.length; i++) if (c.cells[i] === T.DIAMOND || c.cells[i] === T.DIAMOND_F) diamonds++;
check('butterfly explodes into diamonds (' + diamonds + ')', diamonds >= 6);

// 3. Ameeba suljettuna -> timantit
c = mk(['#######', '#WWWWW#', '#Waa W#', '#WWWWW#', '#.....#', '#P....#', '#######']);
run(c, 60);
check('enclosed amoeba turns to diamonds', c.get(2, 2) === T.DIAMOND && c.get(3, 2) === T.DIAMOND);

// 4. Rockford kerää timantin ja uloskäynti aukeaa, uloskäynti -> won
c = mk(['#######', '#P.dX.#', '#.....#', '#######']);
run(c, 3, { dx: 1, dy: 0 });
check('diamond collected and exit opened', c.collected === 1 && c.exitOpen);
run(c, 2, { dx: 1, dy: 0 });
check('entering exit wins', c.state === 'won');

// 5. Kivi tappaa Rockfordin
c = mk(['#######', '#..r..#', '#.. ..#', '#..P..#', '#######']);
run(c, 8);
check('falling boulder kills rockford', c.state === 'dead');

// 6. Tulikärpänen räjähtää kohdatessaan Rockfordin
c = mk(['#######', '#     #', '# f   #', '#     #', '#  P  #', '#######']);
run(c, 30);
check('firefly kills rockford when touching', c.state === 'dead' || c.state === 'dying');

// 7. Kiven työntäminen
c = mk(['#######', '#P r  #', '#######']);
run(c, 3, { dx: 1, dy: 0 });
check('boulder pushed', c.get(5, 1) === T.BOULDER && c.rf.x === 4);

// 8. Aika loppuu -> kuolema
c = mk(['#######', '#P    #', '#######'], { time: 2 });
run(c, 40);
check('time out kills', c.state === 'dead' && c.timeLeft === 0);

process.exit(fails ? 1 : 0);
