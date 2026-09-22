/* Boulder Dash - sovelluksen päälogiikka: ruudut, pelisilmukka ja piirto. */
(function () {
  'use strict';
  const T = BD.T;
  const $ = (s) => document.querySelector(s);
  const VERSION = '1.5.1';
  const PLAYER_SPEED = { slow: 1.4, normal: 1.0, fast: 0.7 }; // kerroin luolan tahtiin nähden

  const app = {
    save: null, sprites: null, spriteKey: '', tile: 32, dpr: 1,
    cave: null, level: 1, mode: 'menu', // menu | intro | play | pause | dead | won
    cam: { x: 0, y: 0, init: false }, acc: 0, pacc: 0, last: 0,
    hud: { d: '', t: '', s: '', c: '' },
    particles: [], shake: 0, bgPattern: null,
    installPrompt: null, updateReady: false,
  };

  const MOVERS = new Set([T.BOULDER, T.BOULDER_F, T.DIAMOND, T.DIAMOND_F, T.FIREFLY, T.BUTTERFLY, T.ROCKFORD]);

  // ---------- Alustus ----------
  function init() {
    app.save = BD.Storage.load();
    app.canvas = $('#game');
    app.ctx = app.canvas.getContext('2d');
    app.audio = new BD.Audio(() => app.save.settings.sound);
    app.input = new BD.Input({
      dpad: $('#dpad'), joystick: $('#joystick'), joyBase: $('#joyBase'), joyKnob: $('#joyKnob'), snap: $('#btnSnap'),
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
    $('#optDpad').addEventListener('click', () => setSetting('controls', 'dpad'));
    $('#optJoy').addEventListener('click', () => setSetting('controls', 'joystick'));
    $('#optModern').addEventListener('click', () => setSetting('gfx', 'modern'));
    $('#optRetro').addEventListener('click', () => setSetting('gfx', 'retro'));
    $('#optSound').addEventListener('click', () => setSetting('sound', !app.save.settings.sound));
    $('#optSensLow').addEventListener('click', () => setSetting('sensitivity', 'low'));
    $('#optSensMed').addEventListener('click', () => setSetting('sensitivity', 'medium'));
    $('#optSensHigh').addEventListener('click', () => setSetting('sensitivity', 'high'));
    $('#optSpeedSlow').addEventListener('click', () => setSetting('speed', 'slow'));
    $('#optSpeedNormal').addEventListener('click', () => setSetting('speed', 'normal'));
    $('#optSpeedFast').addEventListener('click', () => setSetting('speed', 'fast'));
    $('#optSnapLeft').addEventListener('click', () => setSetting('snapSide', 'left'));
    $('#optSnapRight').addEventListener('click', () => setSetting('snapSide', 'right'));
    $('#btnContinue').addEventListener('click', () => startLevel(app.save.selected));
    $('#version').textContent = 'v' + VERSION;

    setupInstall();
    setupServiceWorker();
    applySettings();
    buildMenu();
    resize();
    showScreen('menu');
    requestAnimationFrame(frame);
  }

  function saveNow() { BD.Storage.save(app.save); }

  function applySettings() {
    const s = app.save.settings;
    app.input.setMode(s.controls);
    app.input.setSensitivity(s.sensitivity);
    $('#optSensLow').classList.toggle('sel', s.sensitivity === 'low');
    $('#optSensMed').classList.toggle('sel', !s.sensitivity || s.sensitivity === 'medium');
    $('#optSensHigh').classList.toggle('sel', s.sensitivity === 'high');
    $('#optSpeedSlow').classList.toggle('sel', s.speed === 'slow');
    $('#optSpeedNormal').classList.toggle('sel', !s.speed || s.speed === 'normal');
    $('#optSpeedFast').classList.toggle('sel', s.speed === 'fast');
    $('#optSnapLeft').classList.toggle('sel', s.snapSide === 'left');
    $('#optSnapRight').classList.toggle('sel', s.snapSide !== 'left');
    document.body.classList.toggle('snapLeft', s.snapSide === 'left');
    $('#optDpad').classList.toggle('sel', s.controls === 'dpad');
    $('#optJoy').classList.toggle('sel', s.controls === 'joystick');
    $('#optModern').classList.toggle('sel', s.gfx !== 'retro');
    $('#optRetro').classList.toggle('sel', s.gfx === 'retro');
    $('#optSound').textContent = s.sound ? '🔊 Ääni päällä' : '🔇 Ääni pois';
    $('#optSound').classList.toggle('sel', s.sound);
    document.body.classList.toggle('retro', s.gfx === 'retro');
    resize();
  }
  function setSetting(key, value) { app.save.settings[key] = value; saveNow(); applySettings(); }

  function resetProgress() {
    if (!window.confirm('Nollataanko kaikki edistyminen ja pisteet?')) return;
    const settings = app.save.settings;
    app.save = BD.Storage.reset();
    app.save.settings = settings;
    saveNow();
    buildMenu();
  }

  // ---------- PWA: asennus ja päivitykset ----------
  function setupInstall() {
    const btn = $('#btnInstall');
    if (isInstalledApp()) return;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      app.installPrompt = e;
      btn.hidden = false;
    });
    btn.addEventListener('click', async () => {
      if (!app.installPrompt) return;
      app.installPrompt.prompt();
      try { await app.installPrompt.userChoice; } catch (err) { /* ignore */ }
      app.installPrompt = null;
      btn.hidden = true;
    });
    window.addEventListener('appinstalled', () => { btn.hidden = true; });
  }

  function setupServiceWorker() {
    // Service worker vain selaimessa (ei Android-WebView'ssä, jossa tiedostot tulevat asseteista).
    const isWebView = /\bwv\b/.test(navigator.userAgent);
    if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http') || isWebView) return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => {});
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }
      // Uusi versio on ladattu: päivitä heti valikossa, muuten pelin jälkeen.
      if (app.mode === 'menu') location.reload(); else app.updateReady = true;
    });
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
      btn.innerHTML = `<span class="num">${n}</span><span class="name">${locked ? '🔒 Lukittu' : cave.name}</span>` +
        `<span class="best">${best ? '★ ' + best : (locked ? '' : '💎 ' + cave.needed)}</span>`;
      btn.disabled = locked;
      btn.addEventListener('click', () => startLevel(n));
      grid.appendChild(btn);
    });
    $('#totalScore').textContent = total;
    $('#deaths').textContent = app.save.deaths;
    const sel = Math.min(app.save.selected, BD.CAVES.length);
    $('#btnContinue').textContent = `▶ Pelaa: ${sel}. ${BD.CAVES[sel - 1].name}`;
  }

  // ---------- Pelin kulku ----------
  function startLevel(n) {
    app.level = n;
    app.save.selected = n;
    saveNow();
    const def = BD.CAVES[n - 1];
    const cells = BD.generateCave(def);
    app.cave = new BD.Cave(def, cells, {
      onSound: (s) => app.audio.play(s),
      onEffect: spawnEffect,
    });
    app.cam.init = false;
    app.acc = 0;
    app.pacc = 0;
    app.particles.length = 0;
    app.shake = 0;
    $('#toast').hidden = true;
    app.input.clearTouch();
    app.input.setSnapHeld(false);
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

  function isInstalledApp() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  }

  function requestFullscreenIfPossible() {
    // Asennetussa sovelluksessa koko näyttö on jo käytössä; Fullscreen API:n pyyntö
    // näyttäisi vain turhan "poistu koko näytön tilasta" -ilmoituksen.
    if (!document.body.classList.contains('touch') || isInstalledApp()) return;
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
    if (app.updateReady) { location.reload(); return; }
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

  // ---------- Efektit ----------
  function spawnEffect(name, x, y) {
    const P = app.particles;
    const add = (n, colors, speed, life, size, gravity, spread) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.8);
        P.push({
          x: x + 0.5 + (Math.random() - 0.5) * (spread || 0.4), y: y + 0.5 + (Math.random() - 0.5) * (spread || 0.4),
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.2,
          life: life * (0.6 + Math.random() * 0.6), max: life,
          color: colors[(Math.random() * colors.length) | 0], size: size * (0.5 + Math.random()), g: gravity,
        });
      }
    };
    switch (name) {
      case 'diamond': add(12, ['#bff9ff', '#4ef0ff', '#ffffff'], 4, 0.5, 0.12, 4); break;
      case 'explosion': add(28, ['#ffe28a', '#ff9a2e', '#ff4d1a', '#ffffff'], 6, 0.8, 0.18, 6, 1.2); app.shake = 10; break;
      case 'land': add(6, ['#8a8f96', '#b0b5bc'], 1.6, 0.35, 0.1, 3, 0.8); break;
      case 'exitOpen': add(20, ['#bff9ff', '#4ef0ff'], 3, 0.9, 0.14, 0.5); showToast('Uloskäynti aukesi! Seuraa nuolta.'); break;
      default: break;
    }
    if (P.length > 400) P.splice(0, P.length - 400);
  }

  function showToast(text, ms) {
    const el = $('#toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(app.toastTimer);
    app.toastTimer = setTimeout(() => { el.hidden = true; }, ms || 2500);
  }

  function updateParticles(dt) {
    const s = dt / 1000;
    const P = app.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= s;
      if (p.life <= 0) { P.splice(i, 1); continue; }
      p.vy += p.g * s;
      p.x += p.vx * s; p.y += p.vy * s;
    }
  }

  // ---------- Pelisilmukka ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, now - app.last);
    app.last = now;
    if (app.mode === 'play' && app.cave) {
      const dir = app.input.getDir();
      const speed = app.cave.def.speed;
      const pInterval = playerInterval();
      app.acc += dt;
      app.pacc += dt;
      let n = 0;
      while (app.acc >= speed && n++ < 4) {
        app.acc -= speed;
        app.cave.tick(dir, false);
      }
      n = 0;
      while (app.pacc >= pInterval && n++ < 4) {
        app.pacc -= pInterval;
        const snap = app.input.takeSnap();
        app.cave.tickPlayer(snap ? { dx: snap.dx, dy: snap.dy, snap: true } : dir);
      }
      if (app.cave.state === 'dead') onDead();
      else if (app.cave.state === 'won') onWon();
      updateParticles(dt);
    }
    if (app.cave && !$('#gameScreen').hidden) render(dt);
  }

  function playerInterval() {
    return app.cave.def.speed * (PLAYER_SPEED[app.save.settings.speed] || 1);
  }

  // ---------- Piirto ----------
  function resize() {
    const c = app.canvas;
    if (!c) return;
    const cssW = c.clientWidth || 1, cssH = c.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    app.dpr = dpr;
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const landscape = cssW > cssH;
    const cssTile = landscape ? Math.min(cssW / 20, cssH / 12) : Math.min(cssW / 12, cssH / 11);
    const retro = app.save.settings.gfx === 'retro';
    let tile = retro ? Math.floor(cssTile * dpr / 8) * 8 : Math.floor(cssTile * dpr);
    tile = Math.max(16, tile);
    const key = (retro ? 'retro' : 'modern') + ':' + tile;
    if (key !== app.spriteKey) {
      app.spriteKey = key;
      app.tile = tile;
      app.sprites = retro ? BD.buildSprites(tile) : BD.buildModernSprites(tile);
      app.bgPattern = app.sprites.bg ? app.ctx.createPattern(app.sprites.bg[0], 'repeat') : null;
    }
    app.ctx.imageSmoothingEnabled = !retro;
    app.cam.init = false;
  }

  function spriteFor(t, i, x, y, cave, tick) {
    const S = app.sprites;
    switch (t) {
      case T.DIRT: return S.dirt[((x * 1103515245 + y * 12345 + (x ^ y) * 2654435761) >>> 0) % S.dirt.length];
      case T.WALL: return S.wall[0];
      case T.STEEL: return S.steel[0];
      case T.BOULDER: case T.BOULDER_F: return S.boulder[0];
      case T.DIAMOND: case T.DIAMOND_F: return S.diamond[((tick >> 1) + x + y) % S.diamond.length];
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
        return (S.magicIdle || S.magic)[0];
      case T.EXPL: return S.explosion[cave.aux[i] & 3];
      default: return null;
    }
  }

  // Liikkeen lähtösuunta koodista: dx, dy
  function fromDelta(code) {
    const k = code - 1;
    return [(k % 3) - 1, Math.floor(k / 3) - 1];
  }

  function render(dt) {
    const cave = app.cave, ctx = app.ctx, tile = app.tile;
    const W = app.canvas.width, H = app.canvas.height;
    const cw = cave.w * tile, ch = cave.h * tile;
    const frac = app.mode === 'play' ? Math.min(1, app.acc / cave.def.speed) : 1;
    const pfrac = app.mode === 'play' ? Math.min(1, app.pacc / playerInterval()) : 1;
    const tick = cave.tickCount;

    // Rockfordin animoitu sijainti (oma tahti)
    let rx = cave.rf.x, ry = cave.rf.y;
    const rfi = cave.rf.y * cave.w + cave.rf.x;
    if (cave.cells[rfi] === T.ROCKFORD && cave.rf.from) {
      const [dx, dy] = fromDelta(cave.rf.from);
      rx -= dx * (1 - pfrac); ry -= dy * (1 - pfrac);
    }

    let tx = (rx + 0.5) * tile - W / 2;
    let ty = (ry + 0.5) * tile - H / 2;
    tx = cw <= W ? (cw - W) / 2 : BD.clamp(tx, 0, cw - W);
    ty = ch <= H ? (ch - H) / 2 : BD.clamp(ty, 0, ch - H);
    if (!app.cam.init) { app.cam.x = tx; app.cam.y = ty; app.cam.init = true; }
    else {
      const k = 1 - Math.pow(0.002, dt / 1000);
      app.cam.x += (tx - app.cam.x) * k;
      app.cam.y += (ty - app.cam.y) * k;
    }
    let camX = Math.round(app.cam.x), camY = Math.round(app.cam.y);
    if (app.shake > 0) {
      camX += Math.round((Math.random() - 0.5) * app.shake * app.dpr);
      camY += Math.round((Math.random() - 0.5) * app.shake * app.dpr);
      app.shake *= Math.pow(0.02, dt / 1000);
      if (app.shake < 0.3) app.shake = 0;
    }

    // Tausta
    if (app.bgPattern) {
      ctx.fillStyle = '#0c0d14';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(-camX, -camY);
      ctx.fillStyle = app.bgPattern;
      ctx.fillRect(Math.max(0, camX), Math.max(0, camY), Math.min(W, cw), Math.min(H, ch));
      ctx.restore();
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }

    const x0 = Math.max(0, Math.floor(camX / tile) - 1), y0 = Math.max(0, Math.floor(camY / tile) - 1);
    const x1 = Math.min(cave.w - 1, Math.ceil((camX + W) / tile) + 1), y1 = Math.min(cave.h - 1, Math.ceil((camY + H) / tile) + 1);

    // 1. vaihe: paikallaan olevat ruudut
    const movers = [];
    let rockford = -1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * cave.w + x;
        const t = cave.cells[i];
        if (t === T.EMPTY) continue;
        if (t === T.ROCKFORD) { rockford = i; continue; }
        if (cave.from[i] && MOVERS.has(t)) { movers.push(i); continue; }
        const spr = spriteFor(t, i, x, y, cave, tick);
        if (spr) ctx.drawImage(spr, x * tile - camX, y * tile - camY);
      }
    }
    // 2. vaihe: liikkuvat esineet animoituina
    const drawMoving = (i) => {
      const x = i % cave.w, y = (i / cave.w) | 0;
      const t = cave.cells[i];
      let px = x, py = y;
      if (t === T.ROCKFORD) { px = rx; py = ry; }
      else if (cave.from[i]) {
        const [dx, dy] = fromDelta(cave.from[i]);
        px -= dx * (1 - frac); py -= dy * (1 - frac);
      }
      const spr = spriteFor(t, i, x, y, cave, tick);
      if (spr) ctx.drawImage(spr, Math.round(px * tile - camX), Math.round(py * tile - camY));
    };
    for (const i of movers) drawMoving(i);
    if (rockford >= 0) drawMoving(rockford);

    // Uloskäynnin suuntanuoli, kun ovi on auki mutta ruudun ulkopuolella
    if (cave.exitOpen && cave.exit && app.mode === 'play') drawExitArrow(ctx, cave, tile, camX, camY, W, H, tick);

    // Partikkelit
    for (const p of app.particles) {
      const a = Math.max(0, Math.min(1, p.life / p.max));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = Math.max(1, p.size * tile * a);
      ctx.fillRect(p.x * tile - camX - s / 2, p.y * tile - camY - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    updateHud();
  }

  function drawExitArrow(ctx, cave, tile, camX, camY, W, H, tick) {
    const ex = (cave.exit.x + 0.5) * tile - camX, ey = (cave.exit.y + 0.5) * tile - camY;
    if (ex >= 0 && ex <= W && ey >= 0 && ey <= H) return;
    const cx = W / 2, cy = H / 2;
    const dx = ex - cx, dy = ey - cy;
    const m = tile * 0.55;
    const t = Math.min((cx - m) / Math.abs(dx || 1e-6), (cy - m) / Math.abs(dy || 1e-6));
    const px = cx + dx * t, py = cy + dy * t;
    const ang = Math.atan2(dy, dx);
    const r = tile * (0.3 + 0.04 * Math.sin(tick * 0.9));
    ctx.save();
    ctx.translate(px, py);
    ctx.shadowColor = 'rgba(80,235,255,0.95)'; ctx.shadowBlur = tile * 0.4;
    ctx.fillStyle = 'rgba(10,20,30,0.75)';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(ang);
    ctx.fillStyle = '#5fe3ff';
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.6, -r * 0.7); ctx.lineTo(-r * 0.25, 0); ctx.lineTo(-r * 0.6, r * 0.7); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function updateHud() {
    const c = app.cave, h = app.hud;
    const d = c.exitOpen ? `💎 ${c.collected} ✓` : `💎 ${c.collected}/${c.needed}`;
    const t = `⏱ ${c.timeLeft}`;
    const s = `★ ${c.score}`;
    const cv = `${app.level}. ${c.def.name}`;
    if (d !== h.d) { $('#hudDiamonds').textContent = d; h.d = d; $('#hudDiamonds').classList.toggle('ok', c.exitOpen); }
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
