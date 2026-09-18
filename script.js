/* ============================================================
   Jade Pairs — mahjong-style pair-matching solitaire
   Pure vanilla JS. No build step, no network calls, no images —
   tiles are drawn with the Unicode Mahjong Tile block.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. TILE FACES
     34 unique faces (Winds, Dragons, Characters, Bamboos, Circles),
     each used up to 4 times (2 pairs) per board, classic style.
  --------------------------------------------------------- */
  const TILE_TYPES = [
    { g: "\u{1F000}", suit: "black" }, { g: "\u{1F001}", suit: "black" },
    { g: "\u{1F002}", suit: "black" }, { g: "\u{1F003}", suit: "black" },
    { g: "\u{1F004}", suit: "red" }, { g: "\u{1F005}", suit: "green" }, { g: "\u{1F006}", suit: "black" },
    { g: "\u{1F007}", suit: "black" }, { g: "\u{1F008}", suit: "black" }, { g: "\u{1F009}", suit: "black" },
    { g: "\u{1F00A}", suit: "black" }, { g: "\u{1F00B}", suit: "black" }, { g: "\u{1F00C}", suit: "black" },
    { g: "\u{1F00D}", suit: "black" }, { g: "\u{1F00E}", suit: "black" }, { g: "\u{1F00F}", suit: "black" },
    { g: "\u{1F010}", suit: "green" }, { g: "\u{1F011}", suit: "green" }, { g: "\u{1F012}", suit: "green" },
    { g: "\u{1F013}", suit: "green" }, { g: "\u{1F014}", suit: "green" }, { g: "\u{1F015}", suit: "green" },
    { g: "\u{1F016}", suit: "green" }, { g: "\u{1F017}", suit: "green" }, { g: "\u{1F018}", suit: "green" },
    { g: "\u{1F019}", suit: "red" }, { g: "\u{1F01A}", suit: "red" }, { g: "\u{1F01B}", suit: "red" },
    { g: "\u{1F01C}", suit: "red" }, { g: "\u{1F01D}", suit: "red" }, { g: "\u{1F01E}", suit: "red" },
    { g: "\u{1F01F}", suit: "red" }, { g: "\u{1F020}", suit: "red" }, { g: "\u{1F021}", suit: "red" }
  ];

  /* ---------------------------------------------------------
     2. BOARD GRID + LAYOUT TEMPLATES
     Positions are logical (layer, row, col) cells on a fixed
     16 x 8 grid. Templates cycle by level for variety.
  --------------------------------------------------------- */
  const BOARD_COLS = 16;
  const BOARD_ROWS = 8;

  function addRect(list, layer, rowStart, rowCount, colStart, colCount) {
    for (let r = rowStart; r < rowStart + rowCount; r++) {
      for (let c = colStart; c < colStart + colCount; c++) {
        list.push({ layer, row: r, col: c });
      }
    }
  }

  function tmplPyramidBlocks() {
    const p = [];
    addRect(p, 0, 1, 6, 2, 12);
    addRect(p, 1, 2, 4, 4, 8);
    addRect(p, 2, 3, 2, 6, 4);
    return p; // 112
  }

  function tmplFortressWings() {
    const p = [];
    addRect(p, 0, 1, 6, 2, 12);
    addRect(p, 0, 3, 2, 0, 2);
    addRect(p, 0, 3, 2, 14, 2);
    addRect(p, 1, 2, 4, 5, 6);
    addRect(p, 2, 3, 2, 7, 2);
    return p; // 108
  }

  function tmplTwinTowers() {
    const p = [];
    addRect(p, 0, 1, 6, 1, 5);
    addRect(p, 0, 1, 6, 10, 5);
    addRect(p, 0, 3, 2, 6, 4);
    addRect(p, 1, 2, 4, 2, 3);
    addRect(p, 1, 2, 4, 11, 3);
    addRect(p, 2, 3, 2, 2, 2);
    addRect(p, 2, 3, 2, 11, 2);
    return p; // 100
  }

  function tmplDiamond() {
    const p = [];
    const layers = [
      [2, 4, 6, 8, 8, 6, 4, 2],
      [0, 2, 4, 6, 6, 4, 2, 0],
      [0, 0, 2, 4, 4, 2, 0, 0],
      [0, 0, 0, 2, 2, 0, 0, 0]
    ];
    layers.forEach((rows, layer) => {
      rows.forEach((len, r) => {
        if (len <= 0) return;
        const colStart = 8 - Math.floor(len / 2);
        addRect(p, layer, r, 1, colStart, len);
      });
    });
    return p; // 80
  }

  const TEMPLATES = [tmplPyramidBlocks, tmplFortressWings, tmplTwinTowers, tmplDiamond];

  function normalizeEven(positions) {
    if (positions.length % 2 !== 0) positions.pop();
    return positions;
  }

  function buildLayoutForLevel(level) {
    const tmpl = TEMPLATES[(level - 1) % TEMPLATES.length];
    return normalizeEven(tmpl());
  }

  /* ---------------------------------------------------------
     3. SOLVABLE ASSIGNMENT
     We compute a structural removal order first (ignoring tile
     faces), then assign matching faces to each removed pair.
     That order is, by construction, a valid solve path.
  --------------------------------------------------------- */
  function keyOf(p) { return p.layer + "_" + p.row + "_" + p.col; }

  function computeFreeKeys(remainingSet, byKey) {
    const free = [];
    remainingSet.forEach((k) => {
      const p = byKey.get(k);
      const above = byKey.get((p.layer + 1) + "_" + p.row + "_" + p.col);
      const covered = above && remainingSet.has(keyOf(above));
      if (covered) return;
      const leftKey = p.layer + "_" + p.row + "_" + (p.col - 1);
      const rightKey = p.layer + "_" + p.row + "_" + (p.col + 1);
      const leftOpen = !remainingSet.has(leftKey);
      const rightOpen = !remainingSet.has(rightKey);
      if (leftOpen || rightOpen) free.push(k);
    });
    return free;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Returns an array of [keyA, keyB] pairs representing a guaranteed
  // valid clearing order for the given set of position keys.
  function computeStructuralOrder(positionKeys, byKey) {
    const remaining = new Set(positionKeys);
    const order = [];
    let carry = null;
    let guard = 0;
    while (remaining.size > 0 && guard++ < 5000) {
      let free = computeFreeKeys(remaining, byKey);
      free = shuffleArray(free);
      if (carry && remaining.has(carry)) {
        const idx = free.indexOf(carry);
        if (idx === -1) free.unshift(carry);
      }
      let i = 0;
      const batch = free.slice();
      carry = null;
      while (i + 1 < batch.length) {
        const a = batch[i], b = batch[i + 1];
        order.push([a, b]);
        remaining.delete(a);
        remaining.delete(b);
        i += 2;
      }
      if (i < batch.length) carry = batch[i];
    }
    return order;
  }

  function assignFaces(positions) {
    const byKey = new Map(positions.map((p) => [keyOf(p), p]));
    const keys = positions.map(keyOf);
    const order = computeStructuralOrder(keys, byKey);

    // Pool: each of the 34 faces contributes up to 2 pairs (4 tiles).
    let pool = [];
    TILE_TYPES.forEach((_, idx) => { pool.push(idx, idx); });
    pool = shuffleArray(pool).slice(0, order.length);

    order.forEach(([ka, kb], i) => {
      const typeIdx = pool[i % pool.length];
      byKey.get(ka).type = typeIdx;
      byKey.get(kb).type = typeIdx;
    });

    return Array.from(byKey.values());
  }

  /* ---------------------------------------------------------
     3b. SOUND — synthesized "wooden tile" clacks (no audio files,
     works fully offline). All sounds are short noise/tone bursts
     shaped with filters + envelopes to sound like knocking wood.
  --------------------------------------------------------- */
  const SOUND_KEY = "jade_pairs_sound_v1";
  let audioCtx = null;
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) { /* ignore */ }

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  // A short burst of filtered noise = a "knock". freq/q shape the wood
  // resonance, decay controls how quickly it dies away.
  function woodKnock(freq, q, decay, gain, delay) {
    const ctx = ensureAudio();
    if (!ctx || !soundOn) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.max(0.03, decay);
    const bufferSize = Math.floor(ctx.sampleRate * len);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq;
    band.Q.value = q;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + len);

    noise.connect(band).connect(g).connect(ctx.destination);
    noise.start(t0);
    noise.stop(t0 + len + 0.02);

    // a touch of low tone underneath gives the "thock" body of wood
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 0.35, t0);
    const og = ctx.createGain();
    og.gain.setValueAtTime(gain * 0.5, t0);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + len * 0.7);
    osc.connect(og).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + len * 0.7 + 0.02);
  }

  function sfxSelect() { woodKnock(1900, 1.4, 0.07, 0.5); }
  function sfxMismatch() { woodKnock(900, 1.1, 0.09, 0.4); woodKnock(900, 1.1, 0.09, 0.35, 0.09); }
  function sfxLocked() { woodKnock(400, 0.9, 0.08, 0.35); }
  function sfxMatch() { woodKnock(2200, 1.6, 0.09, 0.55); woodKnock(2600, 1.6, 0.12, 0.4, 0.05); }
  function sfxShuffle() {
    for (let i = 0; i < 6; i++) woodKnock(1500 + Math.random() * 800, 1.2, 0.05, 0.3, i * 0.035);
  }
  function sfxClear() {
    [0, 0.12, 0.24].forEach((d, i) => woodKnock(1600 + i * 500, 2, 0.18, 0.5, d));
  }
  function sfxGameOver() {
    woodKnock(700, 1.2, 0.18, 0.5);
    woodKnock(480, 1.2, 0.24, 0.45, 0.16);
  }

  function setSoundOn(on) {
    soundOn = on;
    try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch (e) { /* ignore */ }
    const btn = document.getElementById("btn-sound");
    if (btn) btn.textContent = on ? "\u{1F50A}" : "\u{1F507}";
  }

  /* ---------------------------------------------------------
     4. GAME STATE
  --------------------------------------------------------- */
  const boardEl = document.getElementById("board");
  const bannerEl = document.getElementById("banner");
  const trayInnerEl = document.getElementById("tray-inner");

  const statLevel = document.getElementById("stat-level");
  const statRemaining = document.getElementById("stat-remaining");
  const statTime = document.getElementById("stat-time");

  const badgeShuffle = document.getElementById("badge-shuffle");
  const badgeHint = document.getElementById("badge-hint");
  const badgeUndo = document.getElementById("badge-undo");
  const btnShuffle = document.getElementById("btn-shuffle");
  const btnHint = document.getElementById("btn-hint");
  const btnUndo = document.getElementById("btn-undo");

  const overlayMenu = document.getElementById("overlay-menu");
  const overlayClear = document.getElementById("overlay-clear");
  const overlayGameover = document.getElementById("overlay-gameover");

  const TRAY_CAPACITY = 4;
  const LIMITS = { shuffle: 3, hint: 3, undo: 3 };
  const SAVE_KEY = "jade_pairs_level_v1";

  let state = null; // set by startLevel()

  function loadStartLevel() {
    let raw = "1";
    try { raw = localStorage.getItem(SAVE_KEY) || "1"; } catch (e) { /* ignore */ }
    const saved = parseInt(raw, 10);
    return Number.isFinite(saved) && saved > 0 ? saved : 1;
  }
  function saveLevel(level) {
    try { localStorage.setItem(SAVE_KEY, String(level)); } catch (e) { /* ignore */ }
  }

  function newBoardData(level) {
    const positions = buildLayoutForLevel(level);
    return assignFaces(positions);
  }

  function startLevel(level, opts) {
    opts = opts || {};
    if (state && state.timerId) clearInterval(state.timerId);
    [overlayMenu, overlayClear, overlayGameover].forEach((o) => o.classList.add("hidden"));

    const tiles = newBoardData(level);
    const byKey = new Map();
    tiles.forEach((t) => { t.matched = false; byKey.set(keyOf(t), t); });

    state = {
      level,
      tiles,
      byKey,
      remaining: new Set(tiles.map(keyOf)),
      tray: [],
      cursorKey: null,
      counters: { shuffle: LIMITS.shuffle, hint: LIMITS.hint, undo: LIMITS.undo },
      seconds: 0,
      timerId: null,
      moves: 0,
      paused: false
    };

    saveLevel(level);
    ensureTraySlots();
    renderTraySlots();
    renderAll();
    updateHud();
    startTimer();
    if (!opts.silent) showBanner("ด่าน " + level);
  }

  /* ---------------------------------------------------------
     5. RENDERING
  --------------------------------------------------------- */
  let cellSize = 40;
  const LAYER_PX = 7;
  const MAX_LAYER_RESERVE = 4;

  function computeCellSize() {
    const wrap = document.querySelector(".board-wrap");
    const pad = LAYER_PX * MAX_LAYER_RESERVE * 2 + 12;
    const availW = wrap.clientWidth - pad;
    const availH = wrap.clientHeight - pad;
    const cw = availW / BOARD_COLS;
    const ch = availH / BOARD_ROWS;
    let cell = Math.min(cw, ch);
    cell = Math.max(18, Math.min(cell, 58));
    return Math.floor(cell);
  }

  function layoutTile(t) {
    const pad = LAYER_PX * MAX_LAYER_RESERVE;
    const x = pad + t.col * cellSize - t.layer * LAYER_PX;
    const y = pad + t.row * cellSize - t.layer * LAYER_PX;
    return { x, y };
  }

  function renderAll() {
    cellSize = computeCellSize();
    const pad = LAYER_PX * MAX_LAYER_RESERVE;
    boardEl.style.width = (BOARD_COLS * cellSize + pad * 2) + "px";
    boardEl.style.height = (BOARD_ROWS * cellSize + pad * 2) + "px";
    boardEl.style.setProperty("--glyph-size", Math.round(cellSize * 0.62) + "px");
    boardEl.innerHTML = "";

    const tileW = Math.round(cellSize - 4);
    const tileH = Math.round(cellSize * 1.2);

    state.tiles.forEach((t) => {
      if (!state.remaining.has(keyOf(t))) return;
      const el = document.createElement("div");
      el.className = "tile";
      el.dataset.key = keyOf(t);
      const { x, y } = layoutTile(t);
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = tileW + "px";
      el.style.height = tileH + "px";
      el.style.zIndex = String(t.layer * 1000 + t.row * BOARD_COLS + t.col);

      const face = document.createElement("div");
      face.className = "face";
      face.textContent = TILE_TYPES[t.type].g;
      el.appendChild(face);
      el.classList.add("suit-" + TILE_TYPES[t.type].suit);

      el.addEventListener("click", () => handleActivate(keyOf(t)));
      boardEl.appendChild(el);
      t.el = el;
    });

    refreshFreedom();
  }

  function refreshFreedom() {
    const freeKeys = new Set(computeFreeKeys(state.remaining, state.byKey));
    state.remaining.forEach((k) => {
      const t = state.byKey.get(k);
      if (!t.el) return;
      const isFree = freeKeys.has(k);
      t.el.classList.toggle("free", isFree);
      t.el.classList.toggle("locked", !isFree);
      t.el.classList.toggle("cursor", k === state.cursorKey);
    });
    if (!state.cursorKey || !freeKeys.has(state.cursorKey)) {
      state.cursorKey = freeKeys.values().next().value || null;
      state.remaining.forEach((k) => {
        const t = state.byKey.get(k);
        if (t.el) t.el.classList.toggle("cursor", k === state.cursorKey);
      });
    }
  }

  function updateHud() {
    statLevel.textContent = String(state.level);
    statRemaining.textContent = String(state.remaining.size);
    const m = Math.floor(state.seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(state.seconds % 60).toString().padStart(2, "0");
    statTime.textContent = m + ":" + s;

    setBadge(badgeShuffle, state.counters.shuffle);
    setBadge(badgeHint, state.counters.hint);
    setBadge(badgeUndo, state.counters.undo);
    btnHint.disabled = state.counters.hint <= 0;
    btnUndo.disabled = state.counters.undo <= 0 || state.tray.length === 0;
  }
  function setBadge(el, n) {
    el.textContent = String(n);
    el.classList.toggle("zero", n <= 0);
  }

  function ensureTraySlots() {
    if (trayInnerEl.children.length === TRAY_CAPACITY) return;
    trayInnerEl.innerHTML = "";
    for (let i = 0; i < TRAY_CAPACITY; i++) {
      const slot = document.createElement("div");
      slot.className = "tray-slot";
      trayInnerEl.appendChild(slot);
    }
  }

  function renderTraySlots() {
    for (let i = 0; i < TRAY_CAPACITY; i++) {
      const slot = trayInnerEl.children[i];
      const key = state.tray[i];
      slot.className = "tray-slot";
      slot.style.visibility = "";
      slot.textContent = "";
      if (key) {
        const t = state.byKey.get(key);
        slot.classList.add("filled", "suit-" + TILE_TYPES[t.type].suit);
        slot.textContent = TILE_TYPES[t.type].g;
      }
    }
  }

  function traySlotRect(index) {
    return trayInnerEl.children[index].getBoundingClientRect();
  }

  function flyToTraySlot(tileEl, type, slotIndex) {
    if (!tileEl) return;
    const tileRect = tileEl.getBoundingClientRect();
    const slotRect = traySlotRect(slotIndex);
    const ghost = document.createElement("div");
    ghost.className = "fly-ghost suit-" + TILE_TYPES[type].suit;
    ghost.textContent = TILE_TYPES[type].g;
    ghost.style.left = tileRect.left + "px";
    ghost.style.top = tileRect.top + "px";
    ghost.style.width = tileRect.width + "px";
    ghost.style.height = tileRect.height + "px";
    ghost.style.fontSize = Math.round(tileRect.width * 0.5) + "px";
    document.body.appendChild(ghost);

    const dx = (slotRect.left + slotRect.width / 2) - (tileRect.left + tileRect.width / 2);
    const dy = (slotRect.top + slotRect.height / 2) - (tileRect.top + tileRect.height / 2);
    requestAnimationFrame(() => {
      ghost.style.transform = "translate(" + dx + "px," + dy + "px) scale(.62)";
      ghost.style.opacity = "0.85";
    });
    setTimeout(() => ghost.remove(), 340);
  }

  let bannerTimer = null;
  function showBanner(msg) {
    bannerEl.textContent = msg;
    bannerEl.classList.add("show");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => bannerEl.classList.remove("show"), 1400);
  }

  /* ---------------------------------------------------------
     6. TIMER
  --------------------------------------------------------- */
  function startTimer() {
    state.timerId = setInterval(() => {
      if (state.paused) return;
      state.seconds++;
      updateHud();
    }, 1000);
  }
  document.addEventListener("visibilitychange", () => {
    if (state) state.paused = document.hidden;
  });

  /* ---------------------------------------------------------
     7. INTERACTION
  --------------------------------------------------------- */
  function handleActivate(key) {
    if (isOverlayOpen()) return;
    const t = state.byKey.get(key);
    if (!t || !state.remaining.has(key)) return;

    const freeKeys = new Set(computeFreeKeys(state.remaining, state.byKey));
    if (!freeKeys.has(key)) {
      sfxLocked();
      t.el.classList.add("shake");
      setTimeout(() => t.el && t.el.classList.remove("shake"), 320);
      showBanner("กระเบื้องนี้ถูกบัง");
      return;
    }
    if (state.tray.length >= TRAY_CAPACITY) return;

    sfxSelect();
    state.cursorKey = key;
    const slotIndex = state.tray.length;

    // Leave the board immediately; the tile visually flies into its slot.
    state.remaining.delete(key);
    flyToTraySlot(t.el, t.type, slotIndex);
    if (t.el) { t.el.remove(); t.el = null; }
    refreshFreedom();
    updateHud();

    state.tray.push(key);

    const mySession = state;
    setTimeout(() => {
      if (state !== mySession) return; // level was restarted while the tile was flying
      renderTraySlots();
      resolveTray();
    }, 340);
  }

  function resolveTray() {
    const mySession = state;
    // Look for any two tray entries sharing a type.
    const seen = new Map();
    let matchIdx = null;
    for (let i = 0; i < state.tray.length; i++) {
      const k = state.tray[i];
      const type = state.byKey.get(k).type;
      if (seen.has(type)) { matchIdx = [seen.get(type), i]; break; }
      seen.set(type, i);
    }

    if (matchIdx) {
      const [i1, i2] = matchIdx;
      sfxMatch();
      const rect1 = traySlotRect(i1), rect2 = traySlotRect(i2);
      shatterAtRect(rect1);
      shatterAtRect(rect2);
      state.moves++;
      // Remove the two matched entries (higher index first to keep indices valid).
      state.tray.splice(i2, 1);
      state.tray.splice(i1, 1);
      setTimeout(() => { if (state === mySession) renderTraySlots(); }, 20);
      updateHud();

      if (state.remaining.size === 0) {
        setTimeout(() => { if (state === mySession) showLevelClear(); }, 300);
      }
      return;
    }

    if (state.tray.length >= TRAY_CAPACITY) {
      setTimeout(() => { if (state === mySession) showGameOver(); }, 200);
    }
  }

  function shatterAtRect(rect) {
    const halfW = rect.width / 2, halfH = rect.height / 2;
    const dirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    dirs.forEach(([dx, dy]) => {
      const shard = document.createElement("div");
      shard.className = "shard";
      shard.style.left = (rect.left + (dx < 0 ? 0 : halfW)) + "px";
      shard.style.top = (rect.top + (dy < 0 ? 0 : halfH)) + "px";
      shard.style.width = halfW + "px";
      shard.style.height = halfH + "px";
      document.body.appendChild(shard);
      requestAnimationFrame(() => {
        shard.style.transform =
          "translate(" + (dx * 20) + "px," + (dy * 20 - 8) + "deg) rotate(" + (dx * dy * 40) + "deg) scale(.5)";
        shard.style.opacity = "0";
      });
      setTimeout(() => shard.remove(), 460);
    });
  }

  /* ---------------------------------------------------------
     8. TOOLS: shuffle / hint / undo
  --------------------------------------------------------- */
  function reshuffleRemaining() {
    const remainingPositions = Array.from(state.remaining).map((k) => {
      const t = state.byKey.get(k);
      return { layer: t.layer, row: t.row, col: t.col };
    });
    if (remainingPositions.length === 0) return;
    const reassigned = assignFaces(remainingPositions);
    reassigned.forEach((p) => {
      const t = state.byKey.get(keyOf(p));
      t.type = p.type;
      if (t.el) {
        const face = t.el.querySelector(".face");
        face.textContent = TILE_TYPES[t.type].g;
        t.el.className = "tile suit-" + TILE_TYPES[t.type].suit;
      }
    });
    refreshFreedom();
  }

  function doShuffle(force) {
    if (!force) {
      if (state.counters.shuffle <= 0) return;
      state.counters.shuffle--;
    }
    sfxShuffle();
    reshuffleRemaining();
    updateHud();
    showBanner("สลับกระเบื้องแล้ว");
  }

  function doHint() {
    if (state.counters.hint <= 0) return;
    const freeKeys = computeFreeKeys(state.remaining, state.byKey);

    // Prefer a free board tile that already matches something sitting in the tray.
    const trayTypes = new Set(state.tray.map((k) => state.byKey.get(k).type));
    let hintKeys = null;
    for (const k of freeKeys) {
      if (trayTypes.has(state.byKey.get(k).type)) { hintKeys = [k]; break; }
    }

    // Otherwise, point out two free board tiles that share a type.
    if (!hintKeys) {
      const byType = new Map();
      for (const k of freeKeys) {
        const type = state.byKey.get(k).type;
        if (!byType.has(type)) byType.set(type, []);
        byType.get(type).push(k);
      }
      for (const arr of byType.values()) {
        if (arr.length >= 2) { hintKeys = [arr[0], arr[1]]; break; }
      }
    }

    if (!hintKeys) {
      showBanner("ยังไม่เห็นคู่ที่ชัดเจน ลองสลับดู");
      return;
    }
    state.counters.hint--;
    updateHud();
    hintKeys.forEach((k) => {
      const t = state.byKey.get(k);
      if (t.el) {
        t.el.classList.add("hint");
        setTimeout(() => t.el && t.el.classList.remove("hint"), 2000);
      }
    });
  }

  function doUndo() {
    if (state.counters.undo <= 0 || state.tray.length === 0) return;
    const key = state.tray.pop();
    state.remaining.add(key);
    state.counters.undo--;
    renderTraySlots();
    renderAll();
    updateHud();
    showBanner("ย้อนกระเบื้องกลับขึ้นกระดาน");
  }

  /* ---------------------------------------------------------
     9. OVERLAYS
  --------------------------------------------------------- */
  function isOverlayOpen() {
    return ![overlayMenu, overlayClear, overlayGameover].every((o) => o.classList.contains("hidden"));
  }
  function openOverlay(o) { o.classList.remove("hidden"); state.paused = true; }
  function closeOverlay(o) { o.classList.add("hidden"); if (state) state.paused = false; }

  function showLevelClear() {
    sfxClear();
    const m = Math.floor(state.seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(state.seconds % 60).toString().padStart(2, "0");
    document.getElementById("clear-stats").textContent =
      "เวลา " + m + ":" + s + " · " + state.moves + " คู่";
    if (state.timerId) clearInterval(state.timerId);
    openOverlay(overlayClear);
  }

  function showGameOver() {
    if (state.remaining.size === 0) return; // already won in the meantime
    sfxGameOver();
    const m = Math.floor(state.seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(state.seconds % 60).toString().padStart(2, "0");
    document.getElementById("gameover-stats").textContent =
      "ที่เก็บเต็ม 4 ช่องโดยไม่มีคู่ · เวลา " + m + ":" + s;
    if (state.timerId) clearInterval(state.timerId);
    openOverlay(overlayGameover);
  }

  /* ---------------------------------------------------------
     10. KEYBOARD NAVIGATION
  --------------------------------------------------------- */
  function moveCursor(dx, dy) {
    const freeKeys = computeFreeKeys(state.remaining, state.byKey);
    if (freeKeys.length === 0) return;
    const cur = state.cursorKey ? state.byKey.get(state.cursorKey) : null;
    if (!cur) { state.cursorKey = freeKeys[0]; refreshFreedom(); return; }

    let best = null, bestScore = Infinity;
    freeKeys.forEach((k) => {
      if (k === state.cursorKey) return;
      const t = state.byKey.get(k);
      const ddx = t.col - cur.col, ddy = t.row - cur.row;
      const dot = ddx * dx + ddy * dy;
      if (dot <= 0) return;
      const dist = Math.hypot(ddx, ddy);
      const mag = Math.hypot(dx, dy) || 1;
      const perp = Math.abs(ddx * dy - ddy * dx) / mag;
      const score = dist + perp * 3;
      if (score < bestScore) { bestScore = score; best = k; }
    });
    if (best) {
      state.cursorKey = best;
      refreshFreedom();
      const t = state.byKey.get(best);
      if (t.el) t.el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  document.addEventListener("keydown", (e) => {
    if (!state) return;
    if (isOverlayOpen()) {
      if (e.key === "Escape") {
        if (!overlayMenu.classList.contains("hidden")) closeOverlay(overlayMenu);
      }
      return;
    }
    switch (e.key) {
      case "ArrowLeft": e.preventDefault(); moveCursor(-1, 0); break;
      case "ArrowRight": e.preventDefault(); moveCursor(1, 0); break;
      case "ArrowUp": e.preventDefault(); moveCursor(0, -1); break;
      case "ArrowDown": e.preventDefault(); moveCursor(0, 1); break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (state.cursorKey) handleActivate(state.cursorKey);
        break;
      case "u": case "U": doUndo(); break;
      case "s": case "S": doShuffle(false); break;
      case "h": case "H": doHint(); break;
      case "Escape": openOverlay(overlayMenu); break;
      default: break;
    }
  });

  /* ---------------------------------------------------------
     11. UI WIRING
  --------------------------------------------------------- */
  document.getElementById("btn-sound").addEventListener("click", () => {
    setSoundOn(!soundOn);
    if (soundOn) { ensureAudio(); sfxSelect(); }
  });
  setSoundOn(soundOn);

  document.getElementById("btn-menu").addEventListener("click", () => openOverlay(overlayMenu));
  document.getElementById("btn-restart").addEventListener("click", () => startLevel(state.level));
  document.getElementById("btn-shuffle").addEventListener("click", () => doShuffle(false));
  document.getElementById("btn-hint").addEventListener("click", doHint);
  document.getElementById("btn-undo").addEventListener("click", doUndo);

  document.getElementById("menu-resume").addEventListener("click", () => closeOverlay(overlayMenu));
  document.getElementById("menu-restart").addEventListener("click", () => {
    closeOverlay(overlayMenu);
    startLevel(state.level);
  });
  document.getElementById("menu-newgame").addEventListener("click", () => {
    closeOverlay(overlayMenu);
    startLevel(1);
  });

  document.getElementById("clear-next").addEventListener("click", () => {
    closeOverlay(overlayClear);
    startLevel(state.level + 1);
  });

  document.getElementById("gameover-restart").addEventListener("click", () => {
    closeOverlay(overlayGameover);
    startLevel(state.level);
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state) renderAll(); }, 120);
  });

  /* ---------------------------------------------------------
     12. BOOT — show a start screen before the first level
  --------------------------------------------------------- */
  const screenStart = document.getElementById("screen-start");
  const startContinueBtn = document.getElementById("start-continue");
  const startContinueLevel = document.getElementById("start-continue-level");

  function beginGame(level) {
    ensureAudio();
    screenStart.classList.add("hidden");
    boardEl.focus();
    startLevel(level);
  }

  const savedLevel = loadStartLevel();
  if (savedLevel > 1) {
    startContinueBtn.style.display = "block";
    startContinueLevel.textContent = String(savedLevel);
  }
  document.getElementById("start-new").addEventListener("click", () => beginGame(1));
  startContinueBtn.addEventListener("click", () => beginGame(savedLevel));

  /* ---------------------------------------------------------
     13. PWA — offline caching + "install app" prompt
  --------------------------------------------------------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => { /* offline-caching is a bonus, not required */ });
    });
  }

  let deferredInstallPrompt = null;
  const menuInstallBtn = document.getElementById("menu-install");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    menuInstallBtn.style.display = "block";
  });

  menuInstallBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    menuInstallBtn.style.display = "none";
  });

  window.addEventListener("appinstalled", () => {
    menuInstallBtn.style.display = "none";
    deferredInstallPrompt = null;
  });
})();
