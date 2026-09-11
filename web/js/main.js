/* Boulder Dash - sovelluksen päälogiikka: ruudut, pelisilmukka ja piirto. */
(function () {
  'use strict';
  const T = BD.T;
  const $ = (s) => document.querySelector(s);
  const VERSION = '1.0.0';

  const app = {
    save: null, sprites: null, tile: 32, dpr: 1,
    cave: null, level: 1, mode: 'menu', // menu | intro | play | pause | dead | won
    cam: { x: 0, y: 0, init: false }, acc: 0, last: 0,
    hud: { d: '', t: '', s: '', c: '' },
  };

  // ---------- Alustus ----------
  function init() {
    app.save = BD.Storage.load();
    app.canvas = $('#game');
    app.ctx = app.canvas.getContext('2d');
    app.audio = new BD.Audio(() => app.save.settings.sound);
    app.input = new BD.Input({
      dpad: $('#dpad'), joystick: $('#joystick'), joyBase: $('#joyBase'), joyKnob: $('#joyKnob'),
    }, {
      onPause: () => { if (app.mode === 'play') pauseGame(); else if (app.mode === 'pause') resumeGame(); },
      onAnyInput: () => { app.audio.unlock(); },
    });

    const hasTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    document.body.classList.toggle('touch', hasTouch);

    document.addEventListener('pointerdown', () => app.audio.unlock(), { passive: true });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden && app.mode === 'play') pauseGame(); });

    $('#btnPause').addEventListener('click', () => { if (app.mode === 'play') pauseGame(); });
    $('#btnReset').addEventListener('click', resetProgress);
    $('#optDpad').addEventListener('click', () => setControls('dpad'));
    $('#optJoy').addEventListener('click', () => setControls('joystick'));
    $('#optSound').addEventListener('click', toggleSound);
    $('#btnContinue').addEventListener('click', () => startLevel(app.save.selected));
    $('#version').textContent = 'v' + VERSION;

    applySettings();
    buildMenu();
    resize();
    showScreen('menu');
    requestAnimationFrame(frame);

    // Service worker vain selaimessa (ei Android-WebView'ssä, jossa tiedostot tulevat asseteista).
    const isWebView = /\bwv\b/.test(navigator.userAgent);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !isWebView) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function saveNow() { BD.Storage.save(app.save); }

  function applySettings() {
    app.input.setMode(app.save.settings.controls);
    $('#optDpad').classList.toggle('sel', app.save.settings.controls === 'dpad');
    $('#optJoy').classList.toggle('sel', app.save.settings.controls === 'joystick');
    $('#optSound').textContent = app.save.settings.sound ? 'Ääni: päällä' : 'Ääni: pois';
    $('#optSound').classList.toggle('sel', app.save.settings.sound);
  }
  function setControls(mode) { app.save.settings.controls = mode; saveNow(); applySettings(); }
  function toggleSound() { app.save.settings.sound = !app.save.settings.sound; saveNow(); applySettings(); }

  function resetProgress() {
    if (!window.confirm('Nollataanko kaikki edistyminen ja pisteet?')) return;
    const settings = app.save.settings;
    app.save = BD.Storage.reset();
    app.save.settings = settings;
    saveNow();
    buildMenu();
  }

  // ---------- Ruudut ----------
  function showScreen(name) {
    $('#menu').hidden = name !== 'menu';
    $('#gameScreen').hidden = name !== 'game';
  }

  function showOverlay(title, text, buttons, cls) {
    const ov = $('#overlay');
    ov.className = cls || '';
    $('#ovTitle').textContent = title;
    $('#ovText').innerHTML = text;
    const box = $('#ovButtons');
    box.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = 'btn' + (b.primary ? ' primary' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', (e) => { e.stopPropagation(); b.onClick(); });
      box.appendChild(btn);
    }
    ov.hidden = false;
  }
  function hideOverlay() { $('#overlay').hidden = true; }

  function buildMenu() {
    const grid = $('#levels');
    grid.innerHTML = '';
    let total = 0;
    BD.CAVES.forEach((cave, i) => {
      const n = i + 1;
      const locked = n > app.save.unlocked;
      const btn = document.createElement('button');
      btn.className = 'lvl' + (locked ? ' locked' : '') + (app.save.completed[n] ? ' done' : '');
      const best = app.save.best[n] || 0;
      total += best;
      btn.innerHTML = `<span class="num">${n}</span><span class="name">${locked ? '🔒' : cave.name}</span>` +
        (best ? `<span class="best">${best}</span>` : '');
      btn.disabled = locked;
      btn.addEventListener('click', () => startLevel(n));
      grid.appendChild(btn);
    });
    $('#totalScore').textContent = total;
    $('#deaths').textContent = app.save.deaths;
    const sel = Math.min(app.save.selected, BD.CAVES.length);
    $('#btnContinue').textContent = `Pelaa: ${sel}. ${BD.CAVES[sel - 1].name}`;
  }

  // ---------- Pelin kulku ----------
  function startLevel(n) {
    app.level = n;
    app.save.selected = n;
    saveNow();
    const def = BD.CAVES[n - 1];
    const cells = BD.generateCave(def);
    app.cave = new BD.Cave(def, cells, { onSound: (s) => app.audio.play(s) });
    app.cam.init = false;
    app.acc = 0;
    app.input.clearTouch();
    showScreen('game');
    resize();
    app.mode = 'intro';
    showOverlay(`Luola ${n}: ${def.name}`,
      `Kerää <b>${def.needed}</b> timanttia avataksesi uloskäynnin.<br>Aikaa <b>${def.time}</b> s.`,
      [{ label: 'Aloita', primary: true, onClick: beginPlay }], 'intro');
  }

  function beginPlay() {
    hideOverlay();
    app.audio.unlock();
    app.mode = 'play';
    app.last = performance.now();
    requestFullscreenIfPossible();
  }

  function requestFullscreenIfPossible() {
    if (!document.body.classList.contains('touch')) return;
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
  }

  function pauseGame() {
    app.mode = 'pause';
    app.input.clearTouch();
    showOverlay('Tauko', `Luola ${app.level}: ${app.cave.def.name}`, [
      { label: 'Jatka', primary: true, onClick: resumeGame },
      { label: 'Aloita luola alusta', onClick: () => startLevel(app.level) },
      { label: 'Valikko', onClick: toMenu },
    ]);
  }
  function resumeGame() { hideOverlay(); app.mode = 'play'; app.last = performance.now(); }

  function toMenu() {
    hideOverlay();
    app.mode = 'menu';
    app.cave = null;
    buildMenu();
    showScreen('menu');
  }

  function onDead() {
    app.mode = 'dead';
    app.save.deaths++;
    saveNow();
    app.input.clearTouch();
    const reason = app.cave.timeLeft <= 0 ? 'Aika loppui!' : 'Rockford tuhoutui!';
    showOverlay(reason, `Timantteja ${app.cave.collected}/${app.cave.needed}. Elämiä on rajattomasti – yritä uudelleen.`, [
      { label: 'Yritä uudelleen', primary: true, onClick: () => startLevel(app.level) },
      { label: 'Valikko', onClick: toMenu },
    ], 'dead');
  }

  function onWon() {
    app.mode = 'won';
    app.input.clearTouch();
    const c = app.cave;
    const n = app.level;
    const prevBest = app.save.best[n] || 0;
    if (c.score > prevBest) app.save.best[n] = c.score;
    app.save.completed[n] = (app.save.completed[n] || 0) + 1;
    const hasNext = n < BD.CAVES.length;
    if (hasNext) {
      app.save.unlocked = Math.max(app.save.unlocked, n + 1);
      app.save.selected = n + 1;
    }
    saveNow();
    const buttons = [];
    if (hasNext) buttons.push({ label: 'Seuraava luola', primary: true, onClick: () => startLevel(n + 1) });
    buttons.push({ label: 'Pelaa uudelleen', onClick: () => startLevel(n) });
    buttons.push({ label: 'Valikko', onClick: toMenu });
    showOverlay(hasNext ? 'Luola läpäisty!' : 'Kaikki luolat läpäisty!',
      `Timantit: <b>${c.collected}</b> &nbsp; Aikabonus: <b>${c.timeBonus}</b><br>Pisteet: <b>${c.score}</b>` +
      (c.score > prevBest && prevBest ? ' (uusi ennätys!)' : '') +
      (!hasNext ? '<br><br>Onneksi olkoon – olet Boulder Dash -mestari!' : ''),
      buttons, 'won');
  }

  // ---------- Pelisilmukka ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, now - app.last);
    app.last = now;
    if (app.mode === 'play' && app.cave) {
      app.acc += dt;
      const speed = app.cave.def.speed;
      let n = 0;
      while (app.acc >= speed && n++ < 4) {
        app.acc -= speed;
        app.cave.tick(app.input.getDir());
        if (app.cave.state === 'dead') { onDead(); break; }
        if (app.cave.state === 'won') { onWon(); break; }
      }
    }
    if (app.cave && !$('#gameScreen').hidden) render(dt);
  }

  // ---------- Piirto ----------
  function resize() {
    const c = app.canvas;
    const cssW = c.clientWidth || 1, cssH = c.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    app.dpr = dpr;
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const cssTile = Math.min(cssW / 12, cssH / 11);
    let tile = Math.floor(cssTile * dpr / 8) * 8;
    tile = Math.max(16, tile);
    if (tile !== app.tile || !app.sprites) {
      app.tile = tile;
      app.sprites = BD.buildSprites(tile);
    }
    app.ctx.imageSmoothingEnabled = false;
    app.cam.init = false;
  }

  function spriteFor(t, i, x, y, cave, tick) {
    const S = app.sprites;
    switch (t) {
      case T.DIRT: return S.dirt[0];
      case T.WALL: return S.wall[0];
      case T.STEEL: return S.steel[0];
      case T.BOULDER: case T.BOULDER_F: return S.boulder[0];
      case T.DIAMOND: case T.DIAMOND_F: return S.diamond[((tick >> 1) + x + y) & 1];
      case T.ROCKFORD: {
        const rf = cave.rf;
        const left = rf.facing < 0;
        if (rf.moved) return (left ? S.rockfordLeft : S.rockford)[1 + rf.anim];
        if (tick % 24 < 2) return (left ? S.rockfordBlinkLeft : S.rockfordBlink)[0];
        return (left ? S.rockfordLeft : S.rockford)[0];
      }
      case T.INBOX: return S.inbox[tick & 1];
      case T.EXIT_CLOSED: return S.exitClosed[0];
      case T.EXIT_OPEN: return S.exitOpen[tick & 1];
      case T.FIREFLY: return S.firefly[tick & 1];
      case T.BUTTERFLY: return S.butterfly[tick & 1];
      case T.AMOEBA: return S.amoeba[((tick >> 1) + x) & 1];
      case T.MAGIC:
        if (cave.magic.state === 'on') return S.magic[tick % 3];
        if (cave.magic.state === 'expired') return S.wall[0];
        return S.magic[0];
      case T.EXPL: return S.explosion[cave.aux[i] & 3];
      default: return null;
    }
  }

  function render(dt) {
    const cave = app.cave, ctx = app.ctx, tile = app.tile;
    const W = app.canvas.width, H = app.canvas.height;
    const cw = cave.w * tile, ch = cave.h * tile;

    let tx = (cave.rf.x + 0.5) * tile - W / 2;
    let ty = (cave.rf.y + 0.5) * tile - H / 2;
    tx = cw <= W ? (cw - W) / 2 : BD.clamp(tx, 0, cw - W);
    ty = ch <= H ? (ch - H) / 2 : BD.clamp(ty, 0, ch - H);
    if (!app.cam.init) { app.cam.x = tx; app.cam.y = ty; app.cam.init = true; }
    else {
      const k = 1 - Math.pow(0.002, dt / 1000);
      app.cam.x += (tx - app.cam.x) * k;
      app.cam.y += (ty - app.cam.y) * k;
    }
    const camX = Math.round(app.cam.x), camY = Math.round(app.cam.y);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const x0 = Math.max(0, Math.floor(camX / tile)), y0 = Math.max(0, Math.floor(camY / tile));
    const x1 = Math.min(cave.w - 1, Math.ceil((camX + W) / tile)), y1 = Math.min(cave.h - 1, Math.ceil((camY + H) / tile));
    const tick = cave.tickCount;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * cave.w + x;
        const t = cave.cells[i];
        if (t === T.EMPTY) continue;
        const spr = spriteFor(t, i, x, y, cave, tick);
        if (spr) ctx.drawImage(spr, x * tile - camX, y * tile - camY);
      }
    }
    updateHud();
  }

  function updateHud() {
    const c = app.cave, h = app.hud;
    const d = c.exitOpen ? `💎 ${c.collected} ✓` : `💎 ${c.collected}/${c.needed}`;
    const t = `⏱ ${c.timeLeft}`;
    const s = `★ ${c.score}`;
    const cv = `${app.level}. ${c.def.name}`;
    if (d !== h.d) { $('#hudDiamonds').textContent = d; h.d = d; }
    if (t !== h.t) { $('#hudTime').textContent = t; h.t = t; $('#hudTime').classList.toggle('warn', c.timeLeft <= 10); }
    if (s !== h.s) { $('#hudScore').textContent = s; h.s = s; }
    if (cv !== h.c) { $('#hudCave').textContent = cv; h.c = cv; }
  }

  /** Androidin takaisin-painike. Palauttaa true, jos painallus käsiteltiin pelissä. */
  function onBack() {
    switch (app.mode) {
      case 'play': pauseGame(); return true;
      case 'pause': resumeGame(); return true;
      case 'intro': case 'dead': case 'won': toMenu(); return true;
      default: return false;
    }
  }
  function onAppPause() { if (app.mode === 'play') pauseGame(); }

  window.BD.app = app;
  window.BD.startLevel = startLevel;
  window.BD.onBack = onBack;
  window.BD.onAppPause = onAppPause;
  document.addEventListener('DOMContentLoaded', init);
})();
