/* Boulder Dash - pikselispritet (8x8) ja niiden rakentaminen halutun kokoisiksi. */
(function () {
  'use strict';

  const PAL = {
    '.': null,
    // maa
    a: '#6b4a2a', b: '#8a5f36', c: '#4e3620',
    // kivi
    g: '#9a9a9a', h: '#d6d6d6', s: '#4f4f4f',
    // timantti
    w: '#ffffff', t: '#7ff7ff', d: '#12a8b8', v: '#0b6f7a',
    // tiili
    r: '#b5452a', m: '#e6c39f',
    // teräs
    T: '#ececec', S: '#b4b4b4', U: '#6f6f6f',
    // rockford
    k: '#ffd9a8', e: '#101010', B: '#3c8dff', p: '#2a3fbf', H: '#e0552b',
    // tulikärpänen
    o: '#ff8c1a', y: '#ffe83a',
    // perhonen
    M: '#e33ee3', W: '#ffffff', P: '#8a1f8a',
    // ameeba
    G: '#39c23a', L: '#a4f39a', D: '#1d7a1e',
    // räjähdys
    Y: '#fff2a8', O: '#ff9a2e', R: '#e0341a',
    // uloskäynti
    F: '#7ff7ff',
  };

  const px = (rows) => rows;

  const SPR = {
    empty: [px([
      '........', '........', '........', '........',
      '........', '........', '........', '........'])],
    dirt: [px([
      'abaaacaa', 'aaabaaab', 'caaaabaa', 'aabaaaac',
      'aaaacaba', 'baaaaaaa', 'aacabaab', 'aaaaaaca'])],
    wall: [px([
      'rrrmrrrr', 'rrrmrrrr', 'mmmmmmmm', 'rrrrrmrr',
      'rrrrrmrr', 'mmmmmmmm', 'rrrmrrrr', 'rrrmrrrr'])],
    steel: [px([
      'TTTTTTTU', 'TSSSSSSU', 'TSSSSSSU', 'TSSSSSSU',
      'TSSSSSSU', 'TSSSSSSU', 'TSSSSSSU', 'UUUUUUUU'])],
    boulder: [px([
      '..hhgg..', '.hhgggg.', 'hhggggss', 'hgggggss',
      'hgggggss', 'ggggssss', '.gsssss.', '..ssss..'])],
    diamond: [px([
      '...ww...', '..wttw..', '.wttttd.', 'wttttttd',
      '.dttttv.', '..dttv..', '...dv...', '........']),
    px([
      '...tt...', '..twtt..', '.tttwtd.', 'ttttttwd',
      '.dtttdv.', '..dtdv..', '...dv...', '........'])],
    rockford: [ // 0 seisoo, 1-2 kävelee (oikealle; vasemmalle peilataan)
      px([
        '..HHHH..', '..kkkk..', '..kekk..', '...kk...',
        '.BBBBBB.', 'B.BBBB.B', '..pppp..', '..p..p..']),
      px([
        '..HHHH..', '..kkkk..', '..kkek..', '...kk...',
        '.BBBBBB.', '..BBBB.B', '..pppp..', '.p....p.']),
      px([
        '..HHHH..', '..kkkk..', '..kkek..', '...kk...',
        '.BBBBBB.', 'B.BBBB..', '..pppp..', '...pp...'])],
    rockfordBlink: [px([
      '..HHHH..', '..kkkk..', '..keke..', '...kk...',
      '.BBBBBB.', 'B.BBBB.B', '..pppp..', '..p..p..'])],
    inbox: [px([
      'TTTTTTTU', 'TSSSSSSU', 'TSSSSSSU', 'TSSSSSSU',
      'TSSSSSSU', 'TSSSSSSU', 'TSSSSSSU', 'UUUUUUUU']),
    px([
      'TTTTTTTU', 'TSSSSSSU', 'TSFFFFSU', 'TSFFFFSU',
      'TSFFFFSU', 'TSFFFFSU', 'TSSSSSSU', 'UUUUUUUU'])],
    exitClosed: [px([
      'TTTTTTTU', 'TSSSSSSU', 'TSSSSSSU', 'TSSSSSSU',
      'TSSSSSSU', 'TSSSSSSU', 'TSSSSSSU', 'UUUUUUUU'])],
    exitOpen: [px([
      'TTTTTTTU', 'TFFFFFFU', 'TFSSSSFU', 'TFSFFSFU',
      'TFSFFSFU', 'TFSSSSFU', 'TFFFFFFU', 'UUUUUUUU']),
    px([
      'FFFFFFFF', 'FWWWWWWF', 'FWFFFFWF', 'FWFWWFWF',
      'FWFWWFWF', 'FWFFFFWF', 'FWWWWWWF', 'FFFFFFFF'])],
    firefly: [px([
      'o......o', '.o....o.', '..oyyo..', '.oyooyo.',
      '.oyooyo.', '..oyyo..', '.o....o.', 'o......o']),
    px([
      '...oo...', 'o.oyyo.o', '.ooyyoo.', '..yooy..',
      '..yooy..', '.ooyyoo.', 'o.oyyo.o', '...oo...'])],
    butterfly: [px([
      'M..PP..M', 'MM.PP.MM', '.MMWWMM.', '..MWWM..',
      '..MWWM..', '.MMWWMM.', 'MM.PP.MM', 'M..PP..M']),
    px([
      '.M.PP.M.', '.M.PP.M.', '.MMWWMM.', '..MWWM..',
      '..MWWM..', '.MMWWMM.', '.M.PP.M.', '.M.PP.M.'])],
    amoeba: [px([
      '.GGG.G..', 'GLLGGGG.', 'GLGGGDGG', '.GGGGGG.',
      'GGDGGLGG', 'GGGGGLG.', '.GDGGGGG', '..GG.GG.']),
    px([
      '..GG.GG.', '.GGGGGGG', 'GGLGGDG.', 'GLGGGGGG',
      '.GGGGGLG', 'GGDGGGGG', 'GGGGGGG.', '.GG.GGG.'])],
    magic: [px([
      'rrrmrrrr', 'rrrmrFrr', 'mmmmmmmm', 'rFrrrmrr',
      'rrrrrmrr', 'mmmmmmmm', 'rrrmrrFr', 'rrrmrrrr']),
    px([
      'rrrmrrrr', 'rFrmrrrr', 'mmmmmmmm', 'rrrrrmFr',
      'rrrrrmrr', 'mmmmmmmm', 'rrFmrrrr', 'rrrmrrrr']),
    px([
      'rrrmrrFr', 'rrrmrrrr', 'mmmmmmmm', 'rrrrrmrr',
      'rrFrrmrr', 'mmmmmmmm', 'rrrmrrrr', 'rFrmrrrr'])],
    explosion: [px([
      '........', '........', '...YY...', '..YOOY..',
      '..YOOY..', '...YY...', '........', '........']),
    px([
      '........', '..YOOY..', '.YOOOOY.', 'YORRRROY',
      'YORRRROY', '.YOOOOY.', '..YOOY..', '........']),
    px([
      'R.YOOY.R', '.YOOOOY.', 'YOORROOY', 'OORRRROO',
      'OORRRROO', 'YOORROOY', '.YOOOOY.', 'R.YOOY.R'])],
  };

  /**
   * Rakentaa spritet offscreen-canvaseiksi annetulla ruudun koolla (pikseleinä).
   * Palauttaa { name: [canvas, ...] }.
   */
  function buildSprites(tile) {
    const out = {};
    const s = tile / 8;
    const make = (rows, mirror) => {
      const c = document.createElement('canvas');
      c.width = tile; c.height = tile;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, tile, tile);
      for (let y = 0; y < 8; y++) {
        const row = rows[y];
        for (let x = 0; x < 8; x++) {
          const col = PAL[row[x]];
          if (!col) continue;
          const dx = mirror ? (7 - x) : x;
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(dx * s), Math.round(y * s),
            Math.round((dx + 1) * s) - Math.round(dx * s),
            Math.round((y + 1) * s) - Math.round(y * s));
        }
      }
      return c;
    };
    for (const name of Object.keys(SPR)) {
      out[name] = SPR[name].map((rows) => make(rows, false));
    }
    out.rockfordLeft = SPR.rockford.map((rows) => make(rows, true));
    out.rockfordBlinkLeft = SPR.rockfordBlink.map((rows) => make(rows, true));
    return out;
  }

  window.BD = window.BD || {};
  window.BD.buildSprites = buildSprites;
  window.BD.SPRITE_DEFS = SPR;
})();
