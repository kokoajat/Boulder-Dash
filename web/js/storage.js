/* Boulder Dash - edistymisen tallennus (localStorage). */
(function () {
  'use strict';
  const KEY = 'boulderdash.save.v1';

  const DEFAULTS = () => ({
    v: 1,
    unlocked: 1,          // montako luolaa on avattu (1 = ensimmäinen)
    selected: 1,          // viimeksi pelattu luola
    best: {},             // paras pistemäärä luolittain { "1": 250 }
    completed: {},        // läpäisyjen määrä luolittain
    deaths: 0,
    settings: { controls: 'dpad', sound: true, gfx: 'modern', sensitivity: 'medium', speed: 'normal' },
  });

  function load() {
    const d = DEFAULTS();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && typeof s === 'object') {
          Object.assign(d, s);
          d.settings = Object.assign(DEFAULTS().settings, s.settings || {});
          d.best = s.best || {};
          d.completed = s.completed || {};
        }
      }
    } catch (e) { /* tallennus ei käytettävissä */ }
    return d;
  }

  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) { return false; }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return DEFAULTS();
  }

  window.BD = window.BD || {};
  window.BD.Storage = { load, save, reset, KEY };
})();
