/* ============================================================
   Justurbanities — Demo Web · game.js (engine)
   Vanilla JS, no dependencies. Loads data/*.json via fetch;
   falls back to data-embed.js (window.JU_DATA) when fetch is
   blocked (e.g. opening index.html from file:// in Chrome).
   ============================================================ */
(function () {
  'use strict';

  var LS_STATE = 'ju-demo-state';
  var LS_LANG = 'ju-demo-lang';
  var LANGS = ['it', 'en', 'de', 'hu', 'pl', 'sv', 'ro'];
  var RES_KEYS = ['trust', 'care', 'commons', 'voice', 'resilience', 'fragmentationGlobal'];
  var RES_ICON = {
    trust: '\u{1F91D}',
    care: '\u{1FAF6}',
    commons: '\u{1F511}',
    voice: '\u{1F4E3}',
    resilience: '\u{1FAA2}',
    fragmentationGlobal: '⚡'
  };
  var RES_LABEL_KEY = {
    trust: 'ui.trust',
    care: 'ui.care',
    commons: 'ui.commons',
    voice: 'ui.voice',
    resilience: 'ui.resilience',
    fragmentationGlobal: 'ui.fragmentation'
  };
  var TYPE_BADGE = { system: 'ℹ️', message: '✉️' };
  var TYPING_MS = 18;

  var scenes = null;
  var initialState = null;
  var locales = {};
  var lang = 'en';
  var state = null;
  var nodesById = {};
  var current = null;
  var bgCache = {}; // bg id -> 'img' | 'placeholder'
  var typingTimer = null;
  var typingFull = '';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function $(id) { return document.getElementById(id); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clampRes(v) { return Math.max(0, Math.min(100, v)); }

  /* ---------- Data loading ---------- */

  function fetchJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + path);
      return r.json();
    });
  }

  function loadData() {
    return Promise.resolve()
      .then(function () { return fetchJSON('data/scenes.json'); })
      .then(function (s) {
        scenes = s;
        return fetchJSON('data/state.json');
      })
      .then(function (st) {
        initialState = st;
        return Promise.all(LANGS.map(function (l) {
          return fetchJSON('data/locales/' + l + '.json')
            .then(function (loc) { locales[l] = loc; })
            .catch(function () { /* locale not present yet: skip */ });
        }));
      })
      .then(function () {
        if (!locales.en) throw new Error('en locale missing');
      })
      .catch(function (err) {
        var d = window.JU_DATA;
        if (!d) throw err;
        scenes = d.scenes;
        initialState = d.state;
        locales = d.locales;
      });
  }

  /* ---------- i18n ---------- */

  function t(key) {
    var L = locales[lang] || {};
    if (Object.prototype.hasOwnProperty.call(L, key)) return L[key];
    var E = locales.en || {};
    if (Object.prototype.hasOwnProperty.call(E, key)) return E[key];
    return key;
  }

  function applyStaticLabels() {
    document.documentElement.lang = lang;
    document.title = t('ui.title');
    $('app-title').textContent = t('ui.title');
    $('lang-label').textContent = t('ui.language');
    $('restart-btn').textContent = t('ui.restart');
    $('continue-btn').textContent = t('ui.continue');
    $('end-restart-btn').textContent = t('ui.restart');
    $('hud').setAttribute('aria-label', t('ui.resources'));
    RES_KEYS.forEach(function (k) {
      var meter = $('meter-' + k);
      if (!meter) return;
      var label = t(RES_LABEL_KEY[k]);
      meter.querySelector('.ju-meter__label').textContent = label;
      meter.setAttribute('aria-label', label);
    });
  }

  /* ---------- State / conditions / effects ---------- */

  function varValue(name) {
    if (name in state.flags) return state.flags[name];
    if (name in state.counters) return state.counters[name];
    if (name in state.resources) return state.resources[name];
    return undefined;
  }

  function condOk(c) {
    var v = varValue(c['var']);
    if ('eq' in c) return v === c.eq;
    if ('gte' in c) return typeof v === 'number' && v >= c.gte;
    return false;
  }

  function visibleChoices(node) {
    return (node.choices || []).filter(function (ch) {
      return (ch.requires || []).every(condOk);
    });
  }

  // Returns { resourceKey: delta } for HUD +/- badges.
  function applyEffects(eff) {
    var deltas = {};
    if (!eff) return deltas;
    if (eff.set) {
      Object.keys(eff.set).forEach(function (k) {
        var v = eff.set[k];
        if (k in state.resources) {
          var nv = clampRes(v);
          if (nv !== state.resources[k]) deltas[k] = nv - state.resources[k];
          state.resources[k] = nv;
        } else if (k in state.counters) {
          state.counters[k] = v;
        } else {
          state.flags[k] = v;
        }
      });
    }
    if (eff.inc) {
      Object.keys(eff.inc).forEach(function (k) {
        var n = eff.inc[k];
        if (k in state.resources) {
          var nv = clampRes(state.resources[k] + n);
          if (nv !== state.resources[k]) deltas[k] = (deltas[k] || 0) + (nv - state.resources[k]);
          state.resources[k] = nv;
        } else {
          state.counters[k] = (state.counters[k] || 0) + n;
        }
      });
    }
    return deltas;
  }

  function save() {
    try {
      localStorage.setItem(LS_STATE, JSON.stringify({ node: current.id, state: state }));
    } catch (e) { /* storage unavailable: play without persistence */ }
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(LS_STATE);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || !saved.node || !nodesById[saved.node] || !saved.state) return null;
      return saved;
    } catch (e) { return null; }
  }

  /* ---------- Navigation ---------- */

  // Enter a node: apply its on-entry effects, persist, render.
  function enter(id, extraDeltas) {
    var node = nodesById[id];
    if (!node) { console.error('Unknown node: ' + id); return; }
    current = node;
    var deltas = applyEffects(node.effects);
    if (extraDeltas) {
      Object.keys(extraDeltas).forEach(function (k) {
        deltas[k] = (deltas[k] || 0) + extraDeltas[k];
      });
    }
    save();
    render(node, deltas);
  }

  // Re-render current node without reapplying effects (reload / language switch).
  function renderCurrent() { render(current, {}); }

  function advance() {
    if (typingTimer) { finishTyping(); return; }
    if (current && current.next) enter(current.next);
  }

  function restart() {
    try { localStorage.removeItem(LS_STATE); } catch (e) { /* ignore */ }
    state = clone({
      resources: initialState.resources,
      flags: initialState.flags,
      counters: initialState.counters
    });
    $('end-screen').hidden = true;
    enter(scenes.start);
  }

  /* ---------- Rendering ---------- */

  function setBg(bgId, glitch) {
    var bg = $('bg');
    bg.dataset.bg = bgId || '';
    bg.classList.toggle('is-glitch', !!glitch);
    $('bg-label').textContent = bgId || '';

    function usePlaceholder() {
      bg.classList.add('is-placeholder');
      bg.style.backgroundImage = '';
    }
    function useImage() {
      bg.classList.remove('is-placeholder');
      bg.style.backgroundImage = 'url("assets/bg/' + bgId + '.png")';
    }

    if (!bgId) { usePlaceholder(); return; }
    if (bgCache[bgId] === 'img') { useImage(); return; }
    if (bgCache[bgId] === 'placeholder') { usePlaceholder(); return; }
    // Probe once: real backgrounds drop into assets/bg/ later with no code change.
    var probe = new Image();
    probe.onload = function () { bgCache[bgId] = 'img'; if ($('bg').dataset.bg === bgId) useImage(); };
    probe.onerror = function () { bgCache[bgId] = 'placeholder'; };
    usePlaceholder();
    probe.src = 'assets/bg/' + bgId + '.png';
  }

  function buildHUD() {
    var hud = $('hud');
    hud.innerHTML = '';
    RES_KEYS.forEach(function (k) {
      var meter = document.createElement('div');
      meter.className = 'ju-meter';
      meter.id = 'meter-' + k;
      meter.dataset.res = k;
      meter.setAttribute('role', 'meter');
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '100');
      meter.innerHTML =
        '<span class="ju-meter__icon" aria-hidden="true">' + RES_ICON[k] + '</span>' +
        '<span class="ju-meter__label"></span>' +
        '<span><span class="ju-meter__value"></span>' +
        '<span class="ju-meter__delta" aria-live="polite"></span></span>' +
        '<span class="ju-meter__track" aria-hidden="true"><span class="ju-meter__fill"></span></span>';
      hud.appendChild(meter);
    });
  }

  function updateHUD(deltas) {
    RES_KEYS.forEach(function (k) {
      var meter = $('meter-' + k);
      if (!meter) return;
      var v = state.resources[k];
      meter.setAttribute('aria-valuenow', String(v));
      meter.querySelector('.ju-meter__value').textContent = v;
      meter.querySelector('.ju-meter__fill').style.width = v + '%';
      var deltaEl = meter.querySelector('.ju-meter__delta');
      var d = deltas && deltas[k];
      if (d) {
        deltaEl.textContent = (d > 0 ? '+' : '−') + Math.abs(d);
        deltaEl.classList.toggle('is-up', d > 0);
        deltaEl.classList.toggle('is-down', d < 0);
      } else {
        deltaEl.textContent = '';
        deltaEl.classList.remove('is-up', 'is-down');
      }
    });
  }

  function startTyping(fullText) {
    stopTyping();
    var textEl = $('text');
    $('text-live').textContent = fullText; // announced in full by screen readers
    if (reduceMotion.matches) { textEl.textContent = fullText; return; }
    typingFull = fullText;
    textEl.textContent = '';
    var pos = 0;
    typingTimer = setInterval(function () {
      pos += 1;
      textEl.textContent = typingFull.slice(0, pos);
      if (pos >= typingFull.length) stopTyping();
    }, TYPING_MS);
  }

  function stopTyping() {
    if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
  }

  function finishTyping() {
    stopTyping();
    $('text').textContent = typingFull;
  }

  function render(node, deltas) {
    setBg(node.bg, node.id === 'map_8');
    updateHUD(deltas);

    var endScreen = $('end-screen');
    var dialogue = $('dialogue');

    if (node.type === 'end') {
      stopTyping();
      dialogue.hidden = true;
      $('portrait-frame').hidden = true;
      $('end-title').textContent = t('ui.title');
      $('end-text').textContent = t(node.id + '.text');
      endScreen.hidden = false;
      $('end-restart-btn').focus();
      return;
    }
    endScreen.hidden = true;
    dialogue.hidden = false;
    dialogue.dataset.type = node.type;
    dialogue.dataset.node = node.id;

    // Portrait
    var frame = $('portrait-frame');
    if (node.portrait) {
      var img = $('portrait');
      img.onerror = function () { frame.hidden = true; };
      img.alt = t('speaker.' + node.speaker);
      img.src = node.portrait;
      frame.hidden = false;
    } else {
      frame.hidden = true;
    }

    // Speaker
    var header = $('dialogue-header');
    var speakerName = node.speaker ? t('speaker.' + node.speaker) : '';
    if (node.type === 'narration' || !speakerName) {
      header.hidden = true;
    } else {
      header.hidden = false;
      $('speaker').textContent = speakerName;
      $('dialogue-badge').textContent = TYPE_BADGE[node.type] || '';
    }

    // Text
    startTyping(t(node.id + '.text'));

    // Choices
    var choicesEl = $('choices');
    choicesEl.innerHTML = '';
    var list = visibleChoices(node);
    if (list.length) {
      list.forEach(function (ch) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ju-choice';
        btn.textContent = t(ch.id);
        btn.addEventListener('click', function () {
          var extra = applyEffects(ch.effects);
          enter(ch.next, extra);
        });
        choicesEl.appendChild(btn);
      });
      choicesEl.hidden = false;
    } else {
      choicesEl.hidden = true;
    }

    // Continue (linear nodes)
    var footer = $('dialogue-footer');
    footer.hidden = !node.next;

    // Keyboard flow: focus the primary control
    var focusTarget = list.length ? choicesEl.querySelector('.ju-choice') :
      (node.next ? $('continue-btn') : null);
    if (focusTarget) focusTarget.focus();
  }

  /* ---------- Language ---------- */

  function buildLangSwitcher() {
    var sel = $('lang-select');
    sel.innerHTML = '';
    LANGS.forEach(function (l) {
      if (!locales[l]) return; // only languages actually shipped
      var opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l.toUpperCase();
      sel.appendChild(opt);
    });
    sel.value = lang;
    sel.addEventListener('change', function () {
      lang = sel.value;
      try { localStorage.setItem(LS_LANG, lang); } catch (e) { /* ignore */ }
      applyStaticLabels();
      if (current) renderCurrent(); // same node, no effects reapplied
    });
  }

  /* ---------- Input ---------- */

  function bindInput() {
    $('continue-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      advance();
    });
    $('restart-btn').addEventListener('click', restart);
    $('end-restart-btn').addEventListener('click', restart);

    $('stage').addEventListener('click', function (e) {
      if (e.target.closest('button, select, a, input')) return;
      if (typingTimer || (current && current.next)) advance();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.target.closest('button, select, a, input')) return; // native activation
      if (typingTimer || (current && current.next)) {
        e.preventDefault();
        advance();
      }
    });
  }

  /* ---------- Boot ---------- */

  function boot() {
    loadData().then(function () {
      scenes.nodes.forEach(function (n) { nodesById[n.id] = n; });

      try {
        var savedLang = localStorage.getItem(LS_LANG);
        if (savedLang && locales[savedLang]) lang = savedLang;
      } catch (e) { /* ignore */ }

      buildHUD();
      buildLangSwitcher();
      applyStaticLabels();
      bindInput();

      var saved = loadSaved();
      if (saved) {
        state = saved.state;
        current = nodesById[saved.node];
        renderCurrent();
      } else {
        state = clone({
          resources: initialState.resources,
          flags: initialState.flags,
          counters: initialState.counters
        });
        enter(scenes.start);
      }
    }).catch(function (err) {
      console.error(err);
      document.body.textContent = 'Failed to load game data: ' + err.message;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
