/* Boulder Dash - moderni, resoluutiosta riippumaton grafiikka.
   Jokainen tile piirretään Canvas 2D:llä 16x16-yksikköiseen koordinaatistoon,
   joka skaalataan haluttuun ruutukokoon. Rajapinta on sama kuin sprites.js:ssä. */
(function () {
  'use strict';

  function buildModernSprites(tile) {
    const S = tile;
    const U = S / 16;
    const rng = BD.mulberry32(4242);

    const mk = (draw, mirror) => {
      const c = document.createElement('canvas');
      c.width = S; c.height = S;
      const ctx = c.getContext('2d');
      if (mirror) { ctx.translate(S, 0); ctx.scale(-1, 1); }
      ctx.scale(U, U);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      draw(ctx);
      return c;
    };
    const rr = (ctx, x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); };
    const glow = (ctx, color, blur) => { ctx.shadowColor = color; ctx.shadowBlur = blur * U; };
    const noGlow = (ctx) => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; };

    // ---------- Tausta (tyhjä ruutu) ----------
    const drawBg = (ctx) => {
      ctx.fillStyle = '#0c0d14';
      ctx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.25)';
        const x = rng() * 16, y = rng() * 16, s = 0.6 + rng() * 1.6;
        rr(ctx, x, y, s, s, 0.3); ctx.fill();
      }
    };

    // ---------- Maa ----------
    const drawDirt = (ctx) => {
      ctx.fillStyle = '#5f3f24'; ctx.fillRect(0, 0, 16, 16);
      // pehmeä, satunnaisesti sijoitettu sävyvaihtelu (ei suuntaavaa liukuväriä, jotta ruudukko ei erotu)
      const gx = 3 + rng() * 10, gy = 3 + rng() * 10;
      const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, 14);
      g.addColorStop(0, 'rgba(120,80,45,0.35)'); g.addColorStop(1, 'rgba(60,38,20,0.25)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 22; i++) {
        const x = rng() * 16, y = rng() * 16, s = 0.7 + rng() * 1.6;
        ctx.fillStyle = rng() < 0.5 ? 'rgba(140,95,50,0.55)' : 'rgba(40,24,12,0.5)';
        rr(ctx, x - s / 2, y - s / 2, s, s * (0.6 + rng() * 0.6), 0.4); ctx.fill();
      }
      for (let i = 0; i < 4; i++) {
        const x = 1 + rng() * 14, y = 1 + rng() * 14, r = 0.5 + rng() * 0.6;
        ctx.fillStyle = '#8f7a63'; circle(ctx, x, y, r); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.4); ctx.fill();
      }
    };

    // ---------- Tiiliseinä ----------
    const drawBrick = (ctx) => {
      ctx.fillStyle = '#7d6a5c'; ctx.fillRect(0, 0, 16, 16);
      for (let row = 0; row < 4; row++) {
        const off = (row % 2) ? -4 : 0;
        for (let col = -1; col < 3; col++) {
          const x = col * 8 + off + 0.35, y = row * 4 + 0.35, w = 7.3, h = 3.3;
          const g = ctx.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, '#c8634c'); g.addColorStop(1, '#93392b');
          ctx.fillStyle = g; rr(ctx, x, y, w, h, 0.6); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.35;
          ctx.beginPath(); ctx.moveTo(x + 0.5, y + h - 0.4); ctx.lineTo(x + 0.5, y + 0.5); ctx.lineTo(x + w - 0.5, y + 0.5); ctx.stroke();
        }
      }
    };

    // ---------- Teräs ----------
    const drawSteel = (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 16, 16);
      g.addColorStop(0, '#8d949e'); g.addColorStop(1, '#4b515a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
      const g2 = ctx.createLinearGradient(0, 1.5, 0, 14.5);
      g2.addColorStop(0, '#6f767f'); g2.addColorStop(1, '#565c65');
      ctx.fillStyle = g2; rr(ctx, 1.5, 1.5, 13, 13, 1.2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(1.8, 14.2); ctx.lineTo(1.8, 1.8); ctx.lineTo(14.2, 1.8); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.moveTo(14.2, 1.8); ctx.lineTo(14.2, 14.2); ctx.lineTo(1.8, 14.2); ctx.stroke();
      for (const [x, y] of [[3.2, 3.2], [12.8, 3.2], [3.2, 12.8], [12.8, 12.8]]) {
        ctx.fillStyle = '#3a3f47'; circle(ctx, x, y, 0.8); ctx.fill();
        ctx.fillStyle = '#b9c0c9'; circle(ctx, x - 0.2, y - 0.2, 0.4); ctx.fill();
      }
    };

    // ---------- Kivi ----------
    const drawBoulder = (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(8.3, 14.2, 6.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(5.6, 5.4, 0.8, 8, 8.2, 7.2);
      g.addColorStop(0, '#d4d8de'); g.addColorStop(0.45, '#8e939b'); g.addColorStop(1, '#3f434a');
      ctx.fillStyle = g; circle(ctx, 8, 8.2, 6.7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (const [x, y, r] of [[10.5, 9.5, 1.3], [6.2, 10.8, 0.9], [9.8, 5.2, 0.7]]) {
        circle(ctx, x, y, r); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.ellipse(5.6, 5.0, 1.6, 1.0, -0.7, 0, Math.PI * 2); ctx.fill();
    };

    // ---------- Timantti ----------
    const drawDiamond = (frame) => (ctx) => {
      glow(ctx, 'rgba(80,235,255,0.9)', 1.6);
      const g = ctx.createLinearGradient(2, 3, 12, 14);
      g.addColorStop(0, '#c9fbff'); g.addColorStop(0.45, '#2fd3f2'); g.addColorStop(1, '#0a6f8c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(5, 2.8); ctx.lineTo(11, 2.8); ctx.lineTo(14.2, 6.8); ctx.lineTo(8, 14.2); ctx.lineTo(1.8, 6.8); ctx.closePath(); ctx.fill();
      noGlow(ctx);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.moveTo(5, 2.8); ctx.lineTo(11, 2.8); ctx.lineTo(9.6, 6.8); ctx.lineTo(6.4, 6.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.moveTo(1.8, 6.8); ctx.lineTo(6.4, 6.8); ctx.lineTo(8, 14.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,40,60,0.25)';
      ctx.beginPath(); ctx.moveTo(9.6, 6.8); ctx.lineTo(14.2, 6.8); ctx.lineTo(8, 14.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(1.8, 6.8); ctx.lineTo(14.2, 6.8); ctx.moveTo(6.4, 6.8); ctx.lineTo(8, 14.2); ctx.lineTo(9.6, 6.8); ctx.stroke();
      // kimallus
      const sp = [[4.2, 4.6], [11.6, 5.4], [7.2, 10.6]][frame];
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(sp[0], sp[1] - 1.4); ctx.lineTo(sp[0] + 0.4, sp[1] - 0.4); ctx.lineTo(sp[0] + 1.4, sp[1]);
      ctx.lineTo(sp[0] + 0.4, sp[1] + 0.4); ctx.lineTo(sp[0], sp[1] + 1.4); ctx.lineTo(sp[0] - 0.4, sp[1] + 0.4);
      ctx.lineTo(sp[0] - 1.4, sp[1]); ctx.lineTo(sp[0] - 0.4, sp[1] - 0.4); ctx.closePath(); ctx.fill();
    };

    // ---------- Rockford (kaivosmies) ----------
    // frame: 0 seisoo, 1-2 kävelee; blink: silmät kiinni
    const drawRockford = (frame, blink) => (ctx) => {
      const legA = frame === 1 ? -0.8 : frame === 2 ? 0.8 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(8, 15.2, 4.2, 0.9, 0, 0, Math.PI * 2); ctx.fill();
      // jalat
      ctx.fillStyle = '#233a6b';
      rr(ctx, 5.6 + legA, 12.2, 2.1, 2.9, 0.6); ctx.fill();
      rr(ctx, 8.3 - legA, 12.2, 2.1, 2.9, 0.6); ctx.fill();
      ctx.fillStyle = '#151d33';
      rr(ctx, 5.3 + legA, 14.1, 2.6, 1.3, 0.5); ctx.fill();
      rr(ctx, 8.1 - legA, 14.1, 2.6, 1.3, 0.5); ctx.fill();
      // vartalo
      const g = ctx.createLinearGradient(5, 8, 11, 13);
      g.addColorStop(0, '#4f93ff'); g.addColorStop(1, '#1f55c2');
      ctx.fillStyle = g; rr(ctx, 4.8, 8.2, 6.4, 4.8, 1.6); ctx.fill();
      ctx.fillStyle = '#12306f'; ctx.fillRect(4.8, 11.5, 6.4, 0.9);
      ctx.fillStyle = '#f2c230'; rr(ctx, 7.3, 11.3, 1.4, 1.3, 0.3); ctx.fill();
      // kädet
      ctx.fillStyle = '#2f6fdb';
      rr(ctx, 3.4, 8.6 + legA * 0.5, 1.7, 3.4, 0.8); ctx.fill();
      rr(ctx, 10.9, 8.6 - legA * 0.5, 1.7, 3.4, 0.8); ctx.fill();
      ctx.fillStyle = '#f4c99b';
      circle(ctx, 4.25, 12.1 + legA * 0.5, 0.75); ctx.fill();
      circle(ctx, 11.75, 12.1 - legA * 0.5, 0.75); ctx.fill();
      // pää
      ctx.fillStyle = '#f4c99b'; circle(ctx, 8, 6.2, 2.9); ctx.fill();
      // kypärä
      const hg = ctx.createLinearGradient(5, 2, 11, 6);
      hg.addColorStop(0, '#ffd85a'); hg.addColorStop(1, '#d99a12');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(8, 5.6, 3.3, Math.PI, 0); ctx.lineTo(11.6, 5.6); ctx.lineTo(4.4, 5.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c98a0e'; rr(ctx, 4.1, 5.2, 7.8, 0.9, 0.4); ctx.fill();
      // otsalamppu
      glow(ctx, 'rgba(255,245,180,0.9)', 1.2);
      ctx.fillStyle = '#fff6c2'; circle(ctx, 9.4, 3.9, 0.75); ctx.fill();
      noGlow(ctx);
      // silmät (katse oikealle)
      ctx.fillStyle = '#1b1b24';
      if (blink) {
        ctx.fillRect(7.2, 6.5, 1.1, 0.35); ctx.fillRect(9.1, 6.5, 1.1, 0.35);
      } else {
        circle(ctx, 7.8, 6.5, 0.5); ctx.fill(); circle(ctx, 9.7, 6.5, 0.5); ctx.fill();
      }
      // hymy
      ctx.strokeStyle = '#a5643a'; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.arc(8.9, 7.4, 0.9, 0.15, Math.PI - 0.4); ctx.stroke();
    };

    // ---------- Sisäänkäynti ja uloskäynti ----------
    const drawDoorFrame = (ctx) => {
      drawSteel(ctx);
      ctx.fillStyle = '#20242b';
      rr(ctx, 3.2, 2.6, 9.6, 11.2, 1.4); ctx.fill();
    };
    const drawInbox = (frame) => (ctx) => {
      drawDoorFrame(ctx);
      const a = frame ? 0.95 : 0.35;
      glow(ctx, `rgba(80,235,255,${a})`, frame ? 2.2 : 0.8);
      ctx.fillStyle = `rgba(120,240,255,${a})`;
      circle(ctx, 8, 8.2, frame ? 2.4 : 1.6); ctx.fill();
      noGlow(ctx);
    };
    const drawExitClosed = (ctx) => {
      drawDoorFrame(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 0.5;
      rr(ctx, 4.4, 3.8, 7.2, 8.8, 1); ctx.stroke();
      ctx.fillStyle = 'rgba(120,240,255,0.35)';
      circle(ctx, 9.6, 8.4, 0.7); ctx.fill();
      ctx.fillRect(9.25, 8.6, 0.7, 1.8);
    };
    const drawExitOpen = (frame) => (ctx) => {
      drawSteel(ctx);
      const g = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
      g.addColorStop(0, frame ? '#ffffff' : '#bff8ff');
      g.addColorStop(0.5, '#33d9f5'); g.addColorStop(1, '#0a6f8c');
      glow(ctx, 'rgba(80,235,255,0.95)', frame ? 3 : 1.8);
      ctx.fillStyle = g; rr(ctx, 3.2, 2.6, 9.6, 11.2, 1.4); ctx.fill();
      noGlow(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.5;
      rr(ctx, 3.2, 2.6, 9.6, 11.2, 1.4); ctx.stroke();
    };

    // ---------- Tulikärpänen ----------
    const drawFirefly = (frame) => (ctx) => {
      const wa = frame ? 0.55 : 0.15; // siipien kulma
      ctx.fillStyle = 'rgba(255,230,150,0.5)';
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(8 + s * 1.2, 7.6); ctx.rotate(s * wa);
        ctx.beginPath(); ctx.ellipse(s * 3.2, -1.2, 3.6, 1.7, s * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      glow(ctx, 'rgba(255,150,40,0.95)', 2.2);
      const g = ctx.createRadialGradient(7.4, 7.6, 0.4, 8, 8.6, 3.2);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffb43a'); g.addColorStop(1, '#e35d0c');
      ctx.fillStyle = g; circle(ctx, 8, 8.6, 3.1); ctx.fill();
      noGlow(ctx);
      ctx.fillStyle = '#3a1c08'; circle(ctx, 8, 5.4, 1.3); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, 7.5, 5.2, 0.35); ctx.fill(); circle(ctx, 8.5, 5.2, 0.35); ctx.fill();
      ctx.strokeStyle = '#3a1c08'; ctx.lineWidth = 0.4;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(8 + s * 2.4, 9); ctx.lineTo(8 + s * 4.2, 10.4 + (frame ? 0.6 : 0)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8 + s * 2.2, 10.6); ctx.lineTo(8 + s * 3.6, 12.6 - (frame ? 0.6 : 0)); ctx.stroke();
      }
    };

    // ---------- Perhonen ----------
    const drawButterfly = (frame) => (ctx) => {
      const sx = frame ? 0.62 : 1;
      glow(ctx, 'rgba(240,80,240,0.7)', 1.4);
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(8, 8); ctx.scale(sx, 1);
        const g = ctx.createRadialGradient(s * 3, -2, 0.5, s * 3.5, 0, 6);
        g.addColorStop(0, '#ff9bf5'); g.addColorStop(0.6, '#d63ad6'); g.addColorStop(1, '#6d1a8c');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(s * 3.6, -2.4, 3.4, 3.0, s * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s * 3.0, 2.6, 2.6, 2.4, -s * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        circle(ctx, s * 4.2, -2.8, 0.8); ctx.fill();
        circle(ctx, s * 3.4, 2.8, 0.5); ctx.fill();
        ctx.restore();
      }
      noGlow(ctx);
      ctx.fillStyle = '#2a1230';
      ctx.beginPath(); ctx.ellipse(8, 8.2, 0.9, 4.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a1230'; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(8, 4.2); ctx.quadraticCurveTo(6.5, 2.5, 5.8, 2.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 4.2); ctx.quadraticCurveTo(9.5, 2.5, 10.2, 2.2); ctx.stroke();
    };

    // ---------- Ameeba ----------
    const drawAmoeba = (frame) => (ctx) => {
      const g = ctx.createRadialGradient(6, 6, 1, 8, 8, 10);
      g.addColorStop(0, '#7bf06f'); g.addColorStop(0.6, '#3cbf3c'); g.addColorStop(1, '#1d7d22');
      ctx.fillStyle = g;
      rr(ctx, -0.5, -0.5, 17, 17, 3.5); ctx.fill();
      ctx.fillStyle = 'rgba(0,60,0,0.25)';
      const dots = frame ? [[4, 5, 1.2], [11, 9, 1.6], [6, 12, 0.9]] : [[5, 4, 1.4], [12, 6, 1.0], [8, 11.5, 1.5]];
      for (const [x, y, r] of dots) { circle(ctx, x, y, r); ctx.fill(); }
      ctx.fillStyle = 'rgba(200,255,190,0.55)';
      for (const [x, y, r] of dots) { circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.4); ctx.fill(); }
    };

    // ---------- Taikaseinä ----------
    const drawMagic = (frame) => (ctx) => {
      drawBrick(ctx);
      glow(ctx, 'rgba(80,235,255,0.9)', 1.6);
      ctx.strokeStyle = 'rgba(140,245,255,0.9)'; ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) {
        const y = ((i * 5.3 + frame * 1.8) % 16);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(16, y + 0.6); ctx.stroke();
      }
      noGlow(ctx);
    };
    const drawMagicIdle = (ctx) => {
      drawBrick(ctx);
      ctx.fillStyle = 'rgba(140,245,255,0.75)';
      for (const [x, y] of [[3, 2], [12, 6], [6, 10], [13, 13]]) { circle(ctx, x, y, 0.45); ctx.fill(); }
    };

    // ---------- Räjähdys ----------
    const drawExplosion = (frame) => (ctx) => {
      const r = [3.2, 6.4, 8.6][frame];
      glow(ctx, 'rgba(255,170,60,0.9)', 2.5);
      const g = ctx.createRadialGradient(8, 8, 0.3, 8, 8, r);
      if (frame === 0) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#fff0a0'); g.addColorStop(1, 'rgba(255,170,60,0)'); }
      else if (frame === 1) { g.addColorStop(0, '#fffbe0'); g.addColorStop(0.4, '#ffb340'); g.addColorStop(1, 'rgba(230,60,20,0)'); }
      else { g.addColorStop(0, 'rgba(120,20,10,0.6)'); g.addColorStop(0.45, '#ff7a2a'); g.addColorStop(0.75, '#ff3d1a'); g.addColorStop(1, 'rgba(180,30,10,0)'); }
      ctx.fillStyle = g; circle(ctx, 8, 8, r); ctx.fill();
      noGlow(ctx);
      if (frame === 2) {
        ctx.fillStyle = '#ffe28a';
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3 + 0.4;
          circle(ctx, 8 + Math.cos(a) * 6.6, 8 + Math.sin(a) * 6.6, 0.7); ctx.fill();
        }
      }
    };

    const out = {
      bg: [mk(drawBg)],
      empty: [mk(() => {})],
      dirt: [mk(drawDirt), mk(drawDirt), mk(drawDirt), mk(drawDirt), mk(drawDirt), mk(drawDirt), mk(drawDirt)],
      wall: [mk(drawBrick)],
      steel: [mk(drawSteel)],
      boulder: [mk(drawBoulder)],
      diamond: [mk(drawDiamond(0)), mk(drawDiamond(1)), mk(drawDiamond(2))],
      rockford: [mk(drawRockford(0)), mk(drawRockford(1)), mk(drawRockford(2))],
      rockfordLeft: [mk(drawRockford(0), true), mk(drawRockford(1), true), mk(drawRockford(2), true)],
      rockfordBlink: [mk(drawRockford(0, true))],
      rockfordBlinkLeft: [mk(drawRockford(0, true), true)],
      inbox: [mk(drawInbox(0)), mk(drawInbox(1))],
      exitClosed: [mk(drawExitClosed)],
      exitOpen: [mk(drawExitOpen(0)), mk(drawExitOpen(1))],
      firefly: [mk(drawFirefly(0)), mk(drawFirefly(1))],
      butterfly: [mk(drawButterfly(0)), mk(drawButterfly(1))],
      amoeba: [mk(drawAmoeba(0)), mk(drawAmoeba(1))],
      magic: [mk(drawMagic(0)), mk(drawMagic(1)), mk(drawMagic(2))],
      magicIdle: [mk(drawMagicIdle)],
      explosion: [mk(drawExplosion(0)), mk(drawExplosion(1)), mk(drawExplosion(2))],
    };
    return out;
  }

  window.BD = window.BD || {};
  window.BD.buildModernSprites = buildModernSprites;
})();
