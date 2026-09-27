/* Angels and Anagrams v2.2 - game engine (base crossword-tile rules + add-on). No DOM. */
(function (G) {
  'use strict';
  const VALUES = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,'?':0 };
  const DIST = { A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,N:6,O:8,P:2,Q:1,R:6,S:4,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1,'?':2 };
  const N = 15, CENTER = 7;

  // ---------- premiums ----------
  const PREM = Array.from({ length: N }, () => Array(N).fill(''));
  const setP = (t, list) => list.forEach(([r, c]) => { PREM[r][c] = t; });
  setP('TW', [[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]]);
  setP('DW', [[1,1],[2,2],[3,3],[4,4],[1,13],[2,12],[3,11],[4,10],[13,1],[12,2],[11,3],[10,4],[13,13],[12,12],[11,11],[10,10],[7,7]]);
  setP('TL', [[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]]);
  setP('DL', [[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],[7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]]);

  // ---------- cards & goals ----------
  const CARDS = [
    { id:'blessed', name:'Blessed Bonus', side:'N', qty:2, bonus:true, text:'After you score this turn, add +8. Your one scoring bonus.' },
    { id:'facesum', name:'Face Sum', side:'N', qty:2, bonus:true, text:'After scoring, gain the face-value sum of your main word (ignore premiums and crosswords). Minimum +5.' },
    { id:'rainbow', name:'Rainbow Seal', side:'N', qty:2, bonus:true, text:'If you place 2+ of your colored tiles this turn, add +15 after scoring.' },
    { id:'sacred', name:'Sacred Pattern', side:'N', qty:0, bonus:true, text:'CUT (v2.3, iteration 2): 0% fizzle in 82 plays, a flat +8 disguised as a condition.' },
    { id:'haloblank', name:'Halo Blank', side:'N', qty:2, text:'One tile you play this turn counts as any letter. Its face value is 0.' },
    { id:'manna', name:'Fresh Manna', side:'N', qty:2, text:'Return 2 rack tiles to the bag (not colored tiles), then draw 2.' },
    { id:'jubilee', name:'Jubilee', side:'N', qty:1, text:'Each other player may return up to 2 rack tiles and redraw. You may return up to 3.' },
    { id:'covenant', name:'New Covenant', side:'N', qty:2, text:'Bury one of your secret goals under the goal deck and draw a new one blind.' },
    { id:'secondsight', name:'Second Sight', side:'N', qty:2, text:'Bury one of your secret goals. Draw the top 2 goals, keep one, bury the other under the goal deck.' },
    { id:'passhalo', name:'Pass the Halo', side:'N', qty:1, text:'2 players: swap one hand card with your opponent, if you both have one.' },
    { id:'anoint', name:'Anoint', side:'N', qty:1, text:'One tile you play this turn scores face +2 before premiums (a blank stays 0). Total gain from Anoint is capped at +9. Not a scoring bonus.' },
    { id:'lead', name:'Lead Weight', side:'E', qty:2, target:true, text:'Choose a player. On their next turn they cannot play a scoring bonus.' },
    { id:'temptation', name:'Tiny Temptation', side:'E', qty:1, target:true, text:'Choose a player. They lose 10 (not below 0) and you gain 10.' },
    { id:'fog', name:'Fog the Path', side:'E', qty:1, target:true, text:'Choose a player. On their next turn, premium squares count as plain.' },
    { id:'ironrod', name:'Iron Rod', side:'E', qty:1, target:true, text:'Choose a player. On their next turn they cannot place colored tiles.' },
    { id:'shortrope', name:'Short Rope', side:'E', qty:1, target:true, text:'Choose a player. On their next turn they may place at most 4 tiles.' },
    { id:'scapegoat', name:'Scapegoat', side:'E', qty:0, text:'CUT (per designer direction): removed from the deck entirely.' },
    { id:'mirror', name:'Mirror', side:'E', qty:1, text:'Copy the most recent non-Mirror Evil played this game. If none, it fizzles.' },
    { id:'taxcollector', name:'Tax Collector', side:'E', qty:1, target:true, text:'Choose a player. If they score 30+ on their next turn, you gain 10.' },
  ];
  const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));
  const GOALS = [
    { id:'firstink', name:'First Ink', qty:0, text:'CUT (v2.3, iteration 2): always hit 100% of the time, no real decision. +10 if you placed at least one colored tile on your first scoring turn.' },
    { id:'five', name:'Five-Letter Harvest', qty:1, text:'+12 for each 5-letter main word you scored.' },
    { id:'six', name:'Six Pack', qty:3, text:'+15 for each 6-letter main word you scored.' },
    { id:'chain', name:'Color Chain', qty:2, text:'+15 per adjacent pair of your colored tiles in the same word (final board).' },
    { id:'scatter', name:'Scatter', qty:2, text:'+12 per distinct board word containing 1+ of your colored tiles. Cap +45.' },
    { id:'miracle', name:'Miracle Blank', qty:1, text:'+25 if your colored blank completed a word of 7+ letters.' },
    { id:'corner', name:'Cornerstone', qty:2, text:'+25 if your colored blank ends the game on a premium square.' },
    { id:'creature', name:'Creature Comforts', qty:2, text:'+20 per animal/bird/fish/insect main word from the list. Cap +40.' },
    { id:'counting', name:'Counting Sheep', qty:2, text:'+20 per number-word main word from the list (includes ordinals).' },
    { id:'sameends', name:'Same Ends', qty:2, text:'+25 if you scored 2+ main words that start and end with the same letter.' },
    { id:'open', name:'Open Word', qty:2, text:'+15 per main word of 6+ letters. Cap +40.' },
  ];
  const GOAL = Object.fromEntries(GOALS.map(g => [g.id, g]));
  const CREATURES = new Set('ANT APE BAT BEAR BOAR BULL CAT COW CUB DEER DOG ELK FOX GOAT HARE HORSE LAMB LION MICE MOLE MOOSE MOUSE MULE OX PIG RAT SEAL SHEEP SOW STAG TIGER WOLF YAK ZEBRA CROW DOVE DUCK EAGLE FINCH GOOSE GULL HAWK HEN LARK OWL RAVEN ROBIN SWAN WREN CARP COD CRAB EEL FISH PERCH PIKE RAY SHARK SOLE TROUT TUNA BEE BUG FLEA FLY GNAT MOTH WASP'.split(' '));
  const NUMBERS = new Set('ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN ELEVEN TWELVE THIRTEEN FOURTEEN FIFTEEN SIXTEEN SEVENTEEN EIGHTEEN NINETEEN TWENTY THIRTY FORTY FIFTY SIXTY SEVENTY EIGHTY NINETY HUNDRED THOUSAND ZERO DOZEN SCORE FIRST SECOND THIRD FOURTH FIFTH SIXTH SEVENTH EIGHTH NINTH TENTH ELEVENTH TWELFTH'.split(' '));
  const isCreature = w => CREATURES.has(w) || (w.endsWith('S') && CREATURES.has(w.slice(0, -1))) || (w.endsWith('ES') && CREATURES.has(w.slice(0, -2))) || w === 'GEESE' || w === 'OXEN' || w === 'WOLVES';
  const isNumber = w => NUMBERS.has(w);
  const VOW = new Set(['A','E','I','O','U']);
  const COLORED_LETTERS = ['E','A','R','S','T','N','?'];

  // ---------- dictionary (compact trie) ----------
  const D = { L:null, FC:null, NS:null, T:null, n:0, ready:false };
  function loadDict(text) {
    let cap = 1 << 18;
    let L = new Uint8Array(cap), FC = new Int32Array(cap), NS = new Int32Array(cap), LC = new Int32Array(cap), T = new Uint8Array(cap);
    let n = 1;
    const words = text.split(/\r?\n/);
    const good = [];
    for (let w of words) { w = w.trim().toUpperCase(); if (w.length >= 2 && w.length <= 15 && /^[A-Z]+$/.test(w)) good.push(w); }
    good.sort();
    for (const w of good) {
      let node = 0;
      for (let i = 0; i < w.length; i++) {
        const c = w.charCodeAt(i) - 65;
        const lc = LC[node];
        if (lc && L[lc] === c) { node = lc; continue; }
        if (n >= cap) {
          cap *= 2;
          const g8 = a => { const b = new Uint8Array(cap); b.set(a); return b; };
          const g32 = a => { const b = new Int32Array(cap); b.set(a); return b; };
          L = g8(L); T = g8(T); FC = g32(FC); NS = g32(NS); LC = g32(LC);
        }
        const k = n++;
        L[k] = c;
        if (lc) NS[lc] = k; else FC[node] = k;
        LC[node] = k;
        node = k;
      }
      T[node] = 1;
    }
    Object.assign(D, { L, FC, NS, T, n, ready: true, count: good.length });
    return good.length;
  }
  const COMMON = new Set();
  function loadCommon(text) { for (const w of text.split(/\r?\n/)) if (w) COMMON.add(w.trim().toUpperCase()); return COMMON.size; }
  function child(node, c) {
    for (let k = D.FC[node]; k; k = D.NS[k]) { const l = D.L[k]; if (l === c) return k; if (l > c) return 0; }
    return 0;
  }
  function isWord(w) {
    let node = 0;
    for (let i = 0; i < w.length; i++) { node = child(node, w.charCodeAt(i) - 65); if (!node) return false; }
    return D.T[node] === 1;
  }

  // ---------- rng ----------
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  // ---------- setup ----------
  let TID = 1;
  const mkTile = (L, color) => ({ id: TID++, L, color: color || null });

  function newGame(opts) {
    const rng = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
    const addon = opts.addon !== false;
    const bag = [];
    for (const [L, q] of Object.entries(DIST)) for (let i = 0; i < q; i++) bag.push(mkTile(L));
    shuffle(bag, rng);
    const players = opts.players.map((p, i) => ({
      idx: i, name: p.name, color: p.color, human: !!p.human, level: p.level || 'expert',
      rack: [], supply: [], colorReserve: [],
      score: 0, extras: 0, cards: [], plays: 0, goals: [], burden: null, scapegoat: false,
      firstScored: false, firstInk: false, miracle: false, mains: [], lastTurnEvil: false, taxWatcher: null,
      known: {}, stats: { cardGains: [], evilHits: 0 },
    }));
    const st = {
      rng, addon, board: Array.from({ length: N }, () => Array(N).fill(null)), bag, out: [], players,
      deck: [], discard: [], goalDeck: [], turn: 0, turnNo: 0, scoreless: 0, lastEvil: null,
      log: [], over: false, cur: null, np: players.length,
      handMax: players.length === 2 ? 3 : 2, cap: 5,
    };
    if (addon) {
      for (const p of players) {
        const kit = shuffle(COLORED_LETTERS.map(L => mkTile(L, p.color)), rng);
        p.supply = kit.slice(0, SUPPLY_CAP);
        p.colorReserve = kit.slice(SUPPLY_CAP);
      }
      for (const c of CARDS) for (let i = 0; i < c.qty; i++) st.deck.push(c.id);
      shuffle(st.deck, rng);
      for (const g of GOALS) for (let i = 0; i < g.qty; i++) st.goalDeck.push(g.id);
      shuffle(st.goalDeck, rng);
      const deal = st.np === 2 ? 3 : 2;
      for (const p of players) for (let i = 0; i < deal; i++) p.cards.push(st.deck.pop());
      for (const p of players) {
        p.goals.push(st.goalDeck.shift());
        let g = st.goalDeck.shift(), guard = 0;
        while (g === p.goals[0] && guard++ < 40) { st.goalDeck.push(g); g = st.goalDeck.shift(); }
        p.goals.push(g);
      }
    }
    return st;
  }
  const burnB = np => ({ 2: 7, 3: 6, 4: 5 })[np];
  // step 2 of setup: opening racks. keepFn(player, tiles14, keepN) -> array of tiles to keep (may be async)
  async function dealRacks(st, keepFn) {
    if (!st.addon) { for (const p of st.players) p.rack = st.bag.splice(0, 7); return; }
    const B = burnB(st.np);
    for (const p of st.players) {
      const drawn = st.bag.splice(0, 14);
      const keep = await keepFn(p, drawn, 14 - B);
      const ids = new Set(keep.map(t => t.id));
      p.rack = drawn.filter(t => ids.has(t.id));
      st.out.push(...drawn.filter(t => !ids.has(t.id)));
    }
  }

  // ---------- helpers ----------
  const total = p => p.score + p.extras;
  function log(st, msg, who) { st.log.push({ t: st.turnNo, who: who ?? null, msg }); }
  function drawCard(st) {
    if (!st.deck.length) { if (!st.discard.length) return null; st.deck = shuffle(st.discard.splice(0), st.rng); }
    return st.deck.pop();
  }
  function refillRack(st, p) { while (p.rack.length < 7 && st.bag.length) p.rack.push(st.bag.pop()); }
  const SUPPLY_CAP = 3;
  function refillSupply(st, p) { while (p.supply.length < SUPPLY_CAP && p.colorReserve && p.colorReserve.length) { const t = p.colorReserve.pop(); p.supply.push(t); log(st, `drew a colored ${t.L === '?' ? 'blank' : t.L} from reserve.`, p.idx); } }

  // ---------- scoring ----------
  // placements: [{r,c,letter,val}] ; opt: {plain, anointIdx}
  function scoreMove(board, placements, opt = {}) {
    const tmp = new Map(placements.map((p, i) => [p.r * N + p.c, { ...p, i }]));
    const at = (r, c) => { if (r < 0 || c < 0 || r >= N || c >= N) return null; const t = tmp.get(r * N + c); if (t) return { letter: t.letter, val: t.val, fresh: t }; const b = board[r][c]; return b ? { letter: b.letter, val: b.value, fresh: null } : null; };
    function word(r, c, dr, dc) {
      while (at(r - dr, c - dc)) { r -= dr; c -= dc; }
      const cells = [];
      while (at(r, c)) { cells.push({ r, c, ...at(r, c) }); r += dr; c += dc; }
      return cells;
    }
    function scoreCells(cells) {
      let s = 0, wm = 1;
      for (const x of cells) {
        let v = x.val;
        if (x.fresh) {
          if (opt.anointIdx === x.fresh.i && v > 0) v += 2;
          const pm = opt.plain ? '' : PREM[x.r][x.c];
          if (pm === 'DL') v *= 2; else if (pm === 'TL') v *= 3; else if (pm === 'DW') wm *= 2; else if (pm === 'TW') wm *= 3;
        }
        s += v;
      }
      return s * wm;
    }
    const words = [];
    let main;
    if (placements.length === 1) {
      const p = placements[0];
      const h = word(p.r, p.c, 0, 1), v = word(p.r, p.c, 1, 0);
      if (h.length >= 2) words.push(h);
      if (v.length >= 2) words.push(v);
      main = h.length >= v.length ? h : v;
    } else {
      const horiz = placements.every(p => p.r === placements[0].r);
      const [dr, dc] = horiz ? [0, 1] : [1, 0];
      main = word(placements[0].r, placements[0].c, dr, dc);
      words.push(main);
      for (const p of placements) { const x = word(p.r, p.c, dc, dr); if (x.length >= 2) words.push(x); }
    }
    const out = words.map(cells => ({ w: cells.map(x => x.letter).join(''), s: scoreCells(cells), cells }));
    let sum = out.reduce((a, b) => a + b.s, 0);
    const bingo = placements.length === 7;
    if (bingo) sum += 50;
    return { score: sum, words: out, main: { w: main.map(x => x.letter).join(''), cells: main }, bingo };
  }

  const COLOR_CAP = 3;
  function validate(st, placements) {
    const b = st.board;
    if (!placements.length) return 'Place at least one tile.';
    if (placements.length > 7) return 'At most 7 tiles per turn.';
    if (placements.filter(x => x.tile && x.tile.color).length > COLOR_CAP) return `At most ${COLOR_CAP} colored tiles per turn.`;
    for (const p of placements) if (b[p.r][p.c]) return 'That square is taken.';
    const rows = new Set(placements.map(p => p.r)), cols = new Set(placements.map(p => p.c));
    if (rows.size > 1 && cols.size > 1) return 'Tiles must be in one row or one column.';
    const empty = b.every(row => row.every(x => !x));
    const set = new Set(placements.map(p => p.r * N + p.c));
    const filled = (r, c) => r >= 0 && c >= 0 && r < N && c < N && (b[r][c] || set.has(r * N + c));
    if (placements.length > 1) {
      const horiz = rows.size === 1;
      const vals = placements.map(p => horiz ? p.c : p.r);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      for (let k = lo; k <= hi; k++) if (!(horiz ? filled(placements[0].r, k) : filled(k, placements[0].c))) return 'Tiles must connect with no gaps.';
    }
    if (empty) {
      if (!set.has(CENTER * N + CENTER)) return 'The first word must cover the center star.';
      if (placements.length < 2) return 'The first word needs at least 2 letters.';
    } else {
      const touches = placements.some(p => [[1,0],[-1,0],[0,1],[0,-1]].some(([dr, dc]) => { const r = p.r + dr, c = p.c + dc; return r >= 0 && c >= 0 && r < N && c < N && b[r][c]; }));
      if (!touches) return 'Your word must connect to tiles already on the board.';
    }
    const res = scoreMove(b, placements.map(p => ({ ...p, val: 0 })));
    if (!res.words.length) return 'That does not make a word.';
    const bad = res.words.filter(w => !isWord(w.w)).map(w => w.w);
    if (bad.length) return 'Not in the word list: ' + bad.join(', ');
    return null;
  }

  // ---------- move generation ----------
  const ALL = (1 << 26) - 1;
  function genMoves(board, cnt, blanks, maxPlace) {
    const g = board.map(row => row.map(x => x ? x.letter.charCodeAt(0) - 65 : -1));
    const empty = g.every(row => row.every(x => x < 0));
    const out = new Map();
    const run = (grid, transpose) => genDir(grid, cnt.slice(), blanks, maxPlace, empty, out, transpose);
    run(g, false);
    if (!empty) run(g[0].map((_, c) => g.map(row => row[c])), true);
    return [...out.values()];
  }
  function genDir(g, cnt, blanks0, maxPlace, empty, out, transpose) {
    let blanks = blanks0;
    const cross = Array.from({ length: N }, () => new Int32Array(N));
    const anchor = Array.from({ length: N }, () => new Uint8Array(N));
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (g[r][c] >= 0) continue;
      const up = r > 0 && g[r - 1][c] >= 0, dn = r < N - 1 && g[r + 1][c] >= 0;
      const lf = c > 0 && g[r][c - 1] >= 0, rt = c < N - 1 && g[r][c + 1] >= 0;
      if (up || dn || lf || rt) anchor[r][c] = 1;
      if (!up && !dn) { cross[r][c] = ALL; continue; }
      let a = '', k = r - 1; while (k >= 0 && g[k][c] >= 0) { a = String.fromCharCode(65 + g[k][c]) + a; k--; }
      let z = ''; k = r + 1; while (k < N && g[k][c] >= 0) { z += String.fromCharCode(65 + g[k][c]); k++; }
      let m = 0;
      for (let l = 0; l < 26; l++) if (isWord(a + String.fromCharCode(65 + l) + z)) m |= 1 << l;
      cross[r][c] = m;
    }
    if (empty) anchor[CENTER][CENTER] = 1;
    const left = []; const right = [];
    let R = 0, A = 0;
    function record() {
      const pl = [];
      for (let i = 0; i < left.length; i++) pl.push({ r: R, c: A - left.length + i, l: left[i].l, b: left[i].b });
      for (const x of right) pl.push({ r: R, c: x.c, l: x.l, b: x.b });
      const fin = pl.map(p => transpose ? { r: p.c, c: p.r, letter: String.fromCharCode(65 + p.l), blank: p.b } : { r: p.r, c: p.c, letter: String.fromCharCode(65 + p.l), blank: p.b });
      const key = fin.map(p => p.r * N + p.c + (p.blank ? 'b' : '') + p.letter).sort().join(',');
      if (!out.has(key)) out.set(key, fin);
    }
    function extend(node, c) {
      if (c < N && g[R][c] < 0) {
        if (D.T[node] && c > A && left.length + right.length > 0) record();
        if (left.length + right.length >= maxPlace) return;
        const m = cross[R][c];
        for (let k = D.FC[node]; k; k = D.NS[k]) {
          const l = D.L[k];
          if (!(m >> l & 1)) continue;
          if (cnt[l] > 0) { cnt[l]--; right.push({ c, l, b: false }); extend(k, c + 1); right.pop(); cnt[l]++; }
          if (blanks > 0) { blanks--; right.push({ c, l, b: true }); extend(k, c + 1); right.pop(); blanks++; }
        }
      } else if (c < N) {
        const k = child(node, g[R][c]);
        if (k) extend(k, c + 1);
      } else if (D.T[node] && c > A && left.length + right.length > 0) record();
    }
    function leftPart(node, limit) {
      extend(node, A);
      if (limit <= 0 || left.length >= maxPlace) return;
      for (let k = D.FC[node]; k; k = D.NS[k]) {
        const l = D.L[k];
        if (cnt[l] > 0) { cnt[l]--; left.push({ l, b: false }); leftPart(k, limit - 1); left.pop(); cnt[l]++; }
        if (blanks > 0) { blanks--; left.push({ l, b: true }); leftPart(k, limit - 1); left.pop(); blanks++; }
      }
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!anchor[r][c]) continue;
      R = r; A = c;
      if (c > 0 && g[r][c - 1] >= 0) {
        let s = c - 1; while (s > 0 && g[r][s - 1] >= 0) s--;
        let node = 0;
        for (let k = s; k < c && (k === s || node); k++) node = child(node, g[r][k]);
        if (node) extend(node, c);
      } else {
        let limit = 0, k = c - 1;
        while (k >= 0 && g[r][k] < 0 && !anchor[r][k]) { limit++; k--; }
        leftPart(0, limit);
      }
    }
  }

  // ---------- tile assignment ----------
  // Turn generated placements (letter + blank flag) into concrete tiles from rack/supply.
  function assignTiles(p, gen, o) {
    const rack = p.rack.slice(), sup = o.noColors ? [] : p.supply.slice();
    const take = (arr, L) => { const i = arr.findIndex(t => t.L === L); return i < 0 ? null : arr.splice(i, 1)[0]; };
    let colorUsed = 0;
    const takeSup = L => { if (colorUsed >= COLOR_CAP) return null; const t = take(sup, L); if (t) colorUsed++; return t; };
    const res = [];
    const blanksNeeded = [];
    for (const g of gen) {
      if (g.blank) { blanksNeeded.push(g); continue; }
      let t = null;
      if (o.prefColor) t = takeSup(g.letter) || take(rack, g.letter);
      else t = take(rack, g.letter) || takeSup(g.letter);
      if (!t) return null;
      res.push({ r: g.r, c: g.c, letter: g.letter, tile: t, halo: false });
    }
    for (const g of blanksNeeded) {
      let t = o.prefColor || o.wantColorBlank ? (takeSup('?') || take(rack, '?')) : (take(rack, '?') || takeSup('?'));
      let halo = false;
      if (!t && o.halo && !res.some(x => x.halo)) {
        // sacrifice the clunkiest remaining physical tile
        const useSup = !rack.length && colorUsed < COLOR_CAP;
        const pool = rack.length ? rack : (useSup ? sup : []);
        if (!pool.length) return null;
        pool.sort((a, b) => VALUES[b.L] - VALUES[a.L]);
        t = pool.shift(); halo = true;
        if (useSup) colorUsed++;
      }
      if (!t) return null;
      res.push({ r: g.r, c: g.c, letter: g.letter, tile: t, halo });
    }
    return res;
  }
  const COLOR_VALUE = 4;
  const tileVal = pl => (pl.tile.L === '?' || pl.halo) ? 0 : (pl.tile.color ? COLOR_VALUE : VALUES[pl.tile.L]);

  // ---------- leave heuristic ----------
  const LEAVEV = { '?': 9, S: 4, E: 1.5, X: 2, Z: 2, R: 1, A: 0.5, N: 0.5, T: 0.5, L: 0.2, H: 0.5, D: 0.3, C: 0.3, M: 0.3, J: -1, P: -0.3, I: -0.5, O: -1, U: -3, V: -4, W: -2, Q: -7, B: -1.5, F: -1.5, G: -1.5, K: -1, Y: -0.5 };
  function leaveScore(tiles) {
    let s = 0; const seen = {}; let v = 0, c = 0;
    for (const t of tiles) {
      s += LEAVEV[t.L] ?? 0;
      seen[t.L] = (seen[t.L] || 0) + 1;
      if (seen[t.L] > 1 && t.L !== '?') s -= 2.5;
      if (VOW.has(t.L)) v++; else if (t.L !== '?') c++;
    }
    if (seen.Q && !seen.U) s -= 3;
    s -= Math.max(0, Math.abs(v - c) - 1) * 1.5;
    return s;
  }

  // ---------- turn machinery ----------
  function beginTurn(st) {
    const p = st.players[st.turn];
    const burden = p.burden; p.burden = null;
    st.cur = { p: p.idx, burden, card: null, halo: false, anoint: false, bonus: null, rackChanged: false, evilThisTurn: false };
    st.turnNo++;
    return st.cur;
  }
  function cardBlockedReason(st, p, id) {
    const c = CARD[id];
    if (!st.addon) return 'No cards in the base game.';
    if (st.cur.card) return 'Only one card per turn.';
    if (p.plays >= st.cap) return 'All 5 Halos are used.';
    if (c.bonus && st.cur.burden === 'norider') return 'Lead Weight: no scoring bonus this turn.';
    if (c.side === 'E' && st.np === 2 && p.lastTurnEvil) return 'You played an Evil last turn.';
    if (id === 'passhalo' && st.np === 2 && p.cards.length < 2) return 'You need another card to swap.';
    if (id === 'manna' && p.rack.length < 2) return 'Need 2 rack tiles.';
    if (id === 'covenant' && !st.goalDeck.length) return 'Goal deck is empty.';
    if (id === 'secondsight' && !st.goalDeck.length) return 'Goal deck is empty.';
    return null;
  }

  // agents: array of {decide(kind, ctx) -> value | Promise}
  async function playCard(st, agents, pi, cardId) {
    const p = st.players[pi];
    const why = cardBlockedReason(st, p, cardId);
    if (why) throw new Error(why);
    p.cards.splice(p.cards.indexOf(cardId), 1);
    p.plays++;
    st.discard.push(cardId);
    st.cur.card = cardId;
    const c = CARD[cardId];
    log(st, `played ${c.name}.`, pi);
    const info = { card: cardId, fizzle: false };
    if (c.side === 'E') st.cur.evilThisTurn = true;
    await resolveEffect(st, agents, pi, cardId, info, false);
    if (c.side === 'E' && cardId !== 'mirror') st.lastEvil = cardId;
    p.stats.cardGains.push(info);
    return info;
  }

  async function resolveEffect(st, agents, pi, id, info, viaMirror) {
    const p = st.players[pi];
    const c = CARD[id];
    const others = st.players.filter(x => x.idx !== pi);
    switch (id) {
      case 'blessed': case 'facesum': case 'rainbow': case 'sacred':
        st.cur.bonus = id; break;
      case 'haloblank': st.cur.halo = true; break;
      case 'anoint': st.cur.anoint = true; break;
      case 'manna': {
        const pick = await agents[pi].decide('manna', { st, p, n: 2 });
        returnTiles(st, p, pick); log(st, `returned 2 rack tiles and drew 2.`, pi); st.cur.rackChanged = true; break;
      }
      case 'jubilee': {
        for (const o of others) {
          const pick = await agents[o.idx].decide('jubilee', { st, p: o, n: 2 });
          if (pick.length) { returnTiles(st, o, pick); log(st, `swapped ${pick.length} rack tile(s) (Jubilee).`, o.idx); }
        }
        const mine = await agents[pi].decide('jubilee', { st, p, n: 3 });
        if (mine.length) { returnTiles(st, p, mine); log(st, `swapped ${mine.length} rack tile(s).`, pi); st.cur.rackChanged = true; }
        break;
      }
      case 'covenant': {
        const gi = await agents[pi].decide('covenant', { st, p });
        const buried = p.goals[gi];
        const kept = p.goals[1 - gi];
        st.goalDeck.push(buried);
        let g = st.goalDeck.shift(), guard = 0;
        while (g === kept && guard++ < 40) { st.goalDeck.push(g); g = st.goalDeck.shift(); }
        p.goals[gi] = g;
        log(st, `buried a secret goal and drew a new one.`, pi);
        break;
      }
      case 'secondsight': {
        const gi = await agents[pi].decide('covenant', { st, p });
        const buried = p.goals[gi];
        const kept = p.goals[1 - gi];
        st.goalDeck.push(buried);
        const drawOne = () => {
          if (!st.goalDeck.length) return null;
          let g = st.goalDeck.shift(), guard = 0;
          while (g === kept && guard++ < 40) { st.goalDeck.push(g); g = st.goalDeck.shift(); }
          return g;
        };
        const opt1 = drawOne(), opt2 = drawOne();
        let choice;
        if (opt1 == null && opt2 == null) { info.fizzle = true; p.goals[gi] = buried; log(st, 'Second Sight: goal deck was empty, nothing changed.', pi); break; }
        choice = (opt1 != null && opt2 != null) ? await agents[pi].decide('secondSightKeep', { st, p, options: [opt1, opt2] }) : (opt1 ?? opt2);
        const other = (choice === opt1) ? opt2 : opt1;
        if (other != null) st.goalDeck.push(other);
        p.goals[gi] = choice;
        log(st, `Second Sight: buried a secret goal, drew 2, kept ${GOAL[choice].name}.`, pi);
        break;
      }
      case 'passhalo': {
        if (st.np === 2) {
          const o = others[0];
          if (!p.cards.length || !o.cards.length) { info.fizzle = true; log(st, 'Pass the Halo: nothing to swap.', pi); break; }
          const give = await agents[pi].decide('passGive', { st, p });
          const get = await agents[o.idx].decide('passGive', { st, p: o });
          p.cards.splice(p.cards.indexOf(give), 1); o.cards.splice(o.cards.indexOf(get), 1);
          p.cards.push(get); o.cards.push(give);
          log(st, `swapped a card with ${o.name}.`, pi);
        } else {
          const gives = [];
          for (const x of st.players) gives.push(x.cards.length ? await agents[x.idx].decide('passGive', { st, p: x }) : null);
          st.players.forEach((x, i) => { if (gives[i] != null) x.cards.splice(x.cards.indexOf(gives[i]), 1); });
          st.players.forEach((x, i) => { if (gives[i] != null) st.players[(i + 1) % st.np].cards.push(gives[i]); });
        }
        break;
      }
      case 'scapegoat': p.scapegoat = true; log(st, `is shielded against the next Evil.`, pi); break;
      case 'mirror': {
        if (!st.lastEvil) { info.fizzle = true; log(st, 'Mirror fizzled: no Evil to copy yet.', pi); break; }
        info.copied = st.lastEvil;
        log(st, `Mirror copies ${CARD[st.lastEvil].name}.`, pi);
        await resolveEffect(st, agents, pi, st.lastEvil, info, true);
        break;
      }
      default: {
        if (!c.target) break;
        let tgt = await agents[pi].decide('target', { st, p, card: id });
        let t = st.players[tgt];
        if (t.scapegoat) {
          t.scapegoat = false;
          info.fizzle = true;
          log(st, `Shielded! ${t.name} cancels ${c.name}.`, t.idx);
          break;
        }
        info.target = t.idx;
        t.stats.evilHits++;
        applyEvil(st, agents, pi, t, id, info);
      }
    }
  }
  function applyEvil(st, agents, pi, t, id, info) {
    const p = st.players[pi];
    if (id === 'lead') { t.burden = 'norider'; log(st, `Lead Weight: ${t.name} can't use a scoring bonus next turn.`); }
    if (id === 'fog') { t.burden = 'plain'; log(st, `Fog the Path: premiums go plain for ${t.name} next turn.`); }
    if (id === 'ironrod') { t.burden = 'nocolors'; log(st, `Iron Rod: ${t.name} can't place colored tiles next turn.`); }
    if (id === 'temptation') {
      const loss = Math.min(10, Math.max(0, total(t)));
      t.extras -= loss; p.extras += 10; info.gain = 10; info.swing = 10 + loss;
      log(st, `Tiny Temptation: ${t.name} lose${t.name === 'You' ? '' : 's'} ${loss}, ${p.name} gain${p.name === 'You' ? '' : 's'} 10.`);
    }
    if (id === 'shortrope') { t.burden = 'maxfour'; log(st, `Short Rope: ${t.name} can place at most 4 tiles next turn.`); }
    if (id === 'taxcollector') { t.taxWatcher = pi; log(st, `Tax Collector is watching ${t.name}'s next turn.`); }
  }
  function returnTiles(st, p, tiles) {
    const ids = new Set(tiles.map(t => t.id));
    const back = p.rack.filter(t => ids.has(t.id));
    p.rack = p.rack.filter(t => !ids.has(t.id));
    const n = back.length;
    for (let i = 0; i < n && st.bag.length; i++) p.rack.push(st.bag.pop());
    st.bag.push(...back); shuffle(st.bag, st.rng);
  }

  // placements: [{r,c,letter,tile,halo}] ; anointIdx optional
  function commitMove(st, pi, placements, anointIdx) {
    const p = st.players[pi];
    const cur = st.cur;
    const err = validate(st, placements);
    if (err) throw new Error(err);
    if (cur.burden === 'nocolors' && placements.some(x => x.tile.color)) throw new Error('Iron Rod: no colored tiles this turn.');
    if (placements.filter(x => x.halo).length > (cur.halo ? 1 : 0)) throw new Error('Only a Halo Blank lets a tile change letters.');
    for (const x of placements) {
      if (x.tile.L !== '?' && !x.halo && x.tile.L !== x.letter) throw new Error('Tile letter mismatch.');
    }
    const plain = cur.burden === 'plain';
    const withVals = placements.map(x => ({ r: x.r, c: x.c, letter: x.letter, val: tileVal(x) }));
    const res = scoreMove(st.board, withVals, { plain, anointIdx: cur.anoint ? anointIdx : undefined });
    let anointGain = 0;
    if (cur.anoint && anointIdx != null) {
      const noAnointScore = scoreMove(st.board, withVals, { plain }).score;
      const rawGain = res.score - noAnointScore;
      anointGain = Math.min(9, rawGain);
      if (rawGain > anointGain) res.score -= (rawGain - anointGain);
    }
    // place
    for (const x of placements) {
      st.board[x.r][x.c] = { letter: x.letter, value: tileVal(x), color: x.tile.color, owner: x.tile.color ? pi : null, blank: x.tile.L === '?', halo: x.halo, turn: st.turnNo };
      const ri = p.rack.findIndex(t => t.id === x.tile.id);
      if (ri >= 0) p.rack.splice(ri, 1); else p.supply.splice(p.supply.findIndex(t => t.id === x.tile.id), 1);
    }
    p.score += res.score;
    const ownColored = placements.filter(x => x.tile.color === p.color).length;
    // bonus
    let bonus = 0;
    if (cur.bonus && cur.burden !== 'norider') {
      const mw = res.main.w;
      if (cur.bonus === 'blessed') bonus = 8;
      if (cur.bonus === 'facesum') bonus = Math.max(5, res.main.cells.reduce((a, x) => a + x.val, 0));
      if (cur.bonus === 'rainbow') bonus = ownColored >= 2 ? 15 : 0;
      if (cur.bonus === 'sacred') {
        const v = [...mw].filter(ch => VOW.has(ch)).length, cn = mw.length - v;
        bonus = (v >= 3 || cn >= 3 || /[JQXZK]/.test(mw)) ? 8 : 0;
      }
      p.extras += bonus;
      const info = p.stats.cardGains[p.stats.cardGains.length - 1];
      if (info) { info.gain = bonus; info.fizzle = bonus === 0; }
    }
    if (cur.anoint) {
      const info = p.stats.cardGains[p.stats.cardGains.length - 1];
      if (info) info.gain = anointIdx != null ? anointGain : 0;
    }
    // bookkeeping for goals
    if (!p.firstScored && res.score > 0) { p.firstScored = true; p.firstInk = ownColored > 0; }
    const cblank = placements.find(x => x.tile.color === p.color && x.tile.L === '?');
    if (cblank && res.words.some(w => w.w.length >= 7 && w.cells.some(c => c.r === cblank.r && c.c === cblank.c))) p.miracle = true;
    p.mains.push({ w: res.main.w, turn: st.turnNo });
    if (p.taxWatcher != null) { if (res.score >= 30) { st.players[p.taxWatcher].extras += 10; log(st, `Tax Collector paid off: +10.`); } p.taxWatcher = null; }
    st.scoreless = res.score > 0 ? 0 : st.scoreless + 1;
    const words = res.words.map(w => `${w.w} ${w.s}`).join(', ');
    log(st, `played ${res.main.w} for ${res.score}${res.bingo ? ' (bingo +50)' : ''}${bonus ? ` +${bonus} bonus` : ''}. [${words}]`, pi);
    cur.result = { ...res, bonus, ownColored };
    return cur.result;
  }
  function exchange(st, pi, tiles) {
    const p = st.players[pi];
    if (st.bag.length < 7) throw new Error('The bag needs at least 7 tiles to exchange.');
    returnTiles(st, p, tiles);
    st.scoreless++;
    log(st, `exchanged ${tiles.length} tile(s).`, pi);
  }
  function passTurn(st, pi) { st.scoreless++; log(st, 'passed.', pi); }

  function endTurn(st) {
    const p = st.players[st.cur.p];
    if (st.cur.card) { while (p.cards.length < st.handMax) { const c = drawCard(st); if (!c) break; p.cards.push(c); } }
    p.lastTurnEvil = !!st.cur.evilThisTurn;
    refillRack(st, p);
    refillSupply(st, p);
    if (!st.bag.length && !p.rack.length) return finish(st, p.idx);
    if (st.scoreless >= 6) return finish(st, null);
    st.turn = (st.turn + 1) % st.np;
    return null;
  }

  // ---------- end of game ----------
  function boardWords(board) {
    const ws = [];
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!board[r][c]) continue;
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pc >= 0 && board[pr][pc]) continue;
        const cells = []; let rr = r, cc = c;
        while (rr < N && cc < N && board[rr][cc]) { cells.push(board[rr][cc]); rr += dr; cc += dc; }
        if (cells.length >= 2) ws.push({ w: cells.map(x => x.letter).join(''), cells });
      }
    }
    return ws;
  }
  function goalScore(st, p, gid) {
    const mains = p.mains.map(m => m.w);
    const col = p.color;
    switch (gid) {
      case 'firstink': return { pts: p.firstInk ? 10 : 0, note: p.firstInk ? 'colored tile on first scoring turn' : 'no colored tile on first scoring turn' };
      case 'five': { const n = mains.filter(w => w.length === 5).length; return { pts: Math.min(45, 12 * n), note: `${n} five-letter main word(s)` }; }
      case 'six': { const n = mains.filter(w => w.length === 6).length; return { pts: Math.min(45, 15 * n), note: `${n} six-letter main word(s)` }; }
      case 'open': { const n = mains.filter(w => w.length >= 6).length; return { pts: Math.min(40, 15 * n), note: `${n} main word(s) of 6+ letters` }; }
      case 'creature': { const l = mains.filter(isCreature); return { pts: Math.min(40, 20 * l.length), note: l.length ? l.join(', ') : 'no creature words' }; }
      case 'counting': { const l = mains.filter(isNumber); return { pts: 20 * l.length, note: l.length ? l.join(', ') : 'no number words' }; }
      case 'sameends': { const l = mains.filter(w => w[0] === w[w.length - 1]); return { pts: l.length >= 2 ? 25 : 0, note: l.length ? l.join(', ') : 'none' }; }
      case 'miracle': return { pts: p.miracle ? 25 : 0, note: p.miracle ? 'done' : 'not done' };
      case 'corner': {
        let ok = false;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = st.board[r][c]; if (x && x.blank && x.color === col && PREM[r][c]) ok = true; }
        return { pts: ok ? 25 : 0, note: ok ? 'colored blank on a premium' : 'not on a premium' };
      }
      case 'chain': {
        let pairs = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const x = st.board[r][c]; if (!x || x.color !== col) continue;
          if (c + 1 < N && st.board[r][c + 1] && st.board[r][c + 1].color === col) pairs++;
          if (r + 1 < N && st.board[r + 1][c] && st.board[r + 1][c].color === col) pairs++;
        }
        return { pts: Math.min(40, 15 * pairs), note: `${pairs} adjacent pair(s)` };
      }
      case 'scatter': {
        const set = new Set(boardWords(st.board).filter(w => w.cells.some(x => x.color === col)).map(w => w.w));
        return { pts: Math.min(45, 12 * set.size), note: `${set.size} word(s) with your color` };
      }
    }
    return { pts: 0, note: '' };
  }
  function goalProgress(st, p, gid) { return goalScore(st, p, gid); }

  function finish(st, outIdx) {
    st.over = true;
    const res = st.players.map(p => {
      const rackPen = p.rack.reduce((a, t) => a + VALUES[t.L], 0);
      const supPen = p.supply.filter(t => t.L !== '?').length;
      return { rackPen, supPen };
    });
    st.players.forEach((p, i) => {
      p.final = { board: p.score, rackPen: -res[i].rackPen, supPen: -res[i].supPen, outBonus: 0, extras: p.extras, goals: [] };
    });
    if (outIdx != null) {
      const bonus = res.reduce((a, r, i) => i === outIdx ? a : a + r.rackPen + r.supPen, 0);
      st.players[outIdx].final.outBonus = bonus;
    }
    for (const p of st.players) {
      if (st.addon) p.final.goals = p.goals.map(g => ({ id: g, ...goalScore(st, p, g) }));
      const f = p.final;
      f.boardAfter = f.board + f.rackPen + f.supPen + f.outBonus;
      f.goalPts = f.goals.reduce((a, g) => a + g.pts, 0);
      f.total = f.boardAfter + f.extras + f.goalPts;
    }
    log(st, outIdx != null ? `${st.players[outIdx].name} went out. Game over.` : 'Six scoreless turns in a row. Game over.');
    return true;
  }

  // ---------- AI ----------
  function rackCounts(p, noColors) {
    const cnt = new Array(26).fill(0); let blanks = 0;
    const pool = noColors ? p.rack : p.rack.concat(p.supply);
    for (const t of pool) { if (t.L === '?') blanks++; else cnt[t.L.charCodeAt(0) - 65]++; }
    return { cnt, blanks, physical: pool.length };
  }
  function goalHeuristic(st, p, res, pls) {
    let h = 0;
    const w = res.main.w, len = w.length;
    const mains = p.mains.map(m => m.w);
    for (const g of p.goals) {
      if (g === 'five' && len === 5) h += 12;
      if (g === 'six' && len === 6) h += 15;
      if (g === 'open' && len >= 4 && mains.filter(x => x.length >= 4).length * 15 < 40) h += 15;
      if (g === 'creature' && isCreature(w) && mains.filter(isCreature).length < 2) h += 20;
      if (g === 'counting' && isNumber(w)) h += 15;
      if (g === 'sameends' && w[0] === w[len - 1] && mains.filter(x => x[0] === x[x.length - 1]).length < 2) h += 13;
      if (g === 'firstink' && !p.firstScored && pls.some(x => x.tile.color === p.color)) h += 10;
      const cb = pls.find(x => x.tile.color === p.color && x.tile.L === '?');
      if (g === 'corner' && cb && PREM[cb.r][cb.c]) h += 25;
      if (g === 'corner' && pls.some(x => x.tile.L === '?' && x.tile.color === p.color) && !(cb && PREM[cb.r][cb.c])) h -= 15;
      if (g === 'miracle' && cb && res.words.some(x => x.w.length >= 7 && x.cells.some(c => c.r === cb.r && c.c === cb.c))) h += 25;
      if (g === 'miracle' && cb && !p.miracle && !res.words.some(x => x.w.length >= 7 && x.cells.some(c => c.r === cb.r && c.c === cb.c))) h -= 15;
      if (g === 'chain') {
        const colSet = new Set(pls.filter(x => x.tile.color === p.color).map(x => x.r * N + x.c));
        const own = (r, c) => colSet.has(r * N + c) || (r >= 0 && c >= 0 && r < N && c < N && st.board[r][c] && st.board[r][c].color === p.color);
        let pairs = 0;
        for (const k of colSet) { const r = Math.floor(k / N), c = k % N; for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) if (own(r + dr, c + dc)) pairs += colSet.has((r + dr) * N + c + dc) ? 0.5 : 1; }
        h += pairs * 12;
      }
      if (g === 'scatter') {
        const colSet = new Set(pls.filter(x => x.tile.color === p.color).map(x => x.r * N + x.c));
        const n = res.words.filter(x => x.cells.some(c => colSet.has(c.r * N + c.c))).length;
        h += Math.min(n, 2) * 8;
      }
    }
    return h;
  }
  const colorWanted = (st, p, flags) => flags.rainbow || p.goals.some(g => ['chain', 'scatter'].includes(g)) || (p.goals.includes('firstink') && !p.firstScored);

  // Returns best {pls, score, eval, res} or null. flags: {halo, noColors, plain, anoint, bonus}
  function bestMove(st, pi, flags = {}) {
    const p = st.players[pi];
    const { cnt, blanks, physical } = rackCounts(p, flags.noColors);
    const maxPlace = Math.min(7, physical, flags.maxPlace || 7);
    const key = [st.turnNo, !!flags.noColors, !!flags.halo, !!flags.plain, p.rack.map(t => t.id).join('.'), p.supply.length].join('|');
    st._gc = st._gc || {};
    const family = (p.level === 'family' || p.level === 'casual') && COMMON.size;
    let quick = st._gc[key];
    if (!quick) {
      const gens = genMoves(st.board, cnt, Math.min(blanks + (flags.halo ? 1 : 0), p.level === 'expert' ? 2 : 1), maxPlace);
      quick = gens.map(g => { const r = scoreMove(st.board, g.map(x => ({ ...x, val: x.blank ? 0 : VALUES[x.letter] })), { plain: flags.plain }); return { g, s: r.score, ws: r.words }; });
      if (family) quick = quick.filter(q => q.ws.every(w => COMMON.has(w.w)));
      if (Object.keys(st._gc).length > 6) st._gc = {};
      st._gc[key] = quick;
    }
    quick = quick.slice();
    if (!quick.length) return null;
    quick.sort((a, b) => b.s - a.s);
    const top = quick.slice(0, 60);
    const endgame = st.bag.length === 0;
    let best = null;
    const prefs = colorWanted(st, p, flags) ? [true, false] : [false, true];
    for (const q of top) {
      for (const pref of prefs) {
        const pls = assignTiles(p, q.g, { prefColor: pref, noColors: flags.noColors, halo: flags.halo });
        if (!pls) continue;
        const vals = pls.map(x => ({ r: x.r, c: x.c, letter: x.letter, val: tileVal(x) }));
        let anointIdx;
        if (flags.anoint) {
          let bs = -1;
          vals.forEach((v, i) => { if (v.val > 0) { const s = scoreMove(st.board, vals, { plain: flags.plain, anointIdx: i }).score; if (s > bs) { bs = s; anointIdx = i; } } });
        }
        const res = scoreMove(st.board, vals, { plain: flags.plain, anointIdx });
        const used = new Set(pls.map(x => x.tile.id));
        const leftRack = p.rack.filter(t => !used.has(t.id));
        let bonus = 0;
        if (flags.bonus === 'blessed') bonus = 8;
        if (flags.bonus === 'facesum') bonus = Math.max(5, res.main.cells.reduce((a, x) => a + x.val, 0));
        if (flags.bonus === 'rainbow') bonus = pls.filter(x => x.tile.color === p.color).length >= 2 ? 15 : 0;
        if (flags.bonus === 'sacred') { const mw = res.main.w; const v = [...mw].filter(ch => VOW.has(ch)).length; bonus = (v >= 3 || mw.length - v >= 3 || /[JQXZK]/.test(mw)) ? 8 : 0; }
        const leftCol = p.supply.filter(t => !used.has(t.id));
        const ev = res.score + bonus + (endgame ? -leftRack.reduce((a, t) => a + VALUES[t.L], 0) * 2 : leaveScore(leftRack) * (family ? 0.4 : 0.9)) + (family ? (st.rng() - 0.5) * (p.level === 'casual' ? 44 : 10) : 0)
          + goalHeuristic(st, p, res, pls) + (leftCol.length < p.supply.length ? -0.3 * (p.supply.length - leftCol.length) : 0);
        if (!best || ev > best.eval) best = { pls, score: res.score, eval: ev, res, anointIdx, bonus };
      }
    }
    return best;
  }

  const STATIC_VALUE = { manna: 2, jubilee: 1.5, covenant: 2, secondsight: 2.5, passhalo: 0.5, lead: 4, temptation: 0, fog: 5, ironrod: 3, shortrope: 4, scapegoat: 3, mirror: 0, taxcollector: 2 };

  // AI turn: decides card, resolves, moves. agents used for other players' decisions.
  async function aiTurn(st, agents, pi) {
    const p = st.players[pi];
    const cur = st.cur;
    const flags0 = { noColors: cur.burden === 'nocolors', plain: cur.burden === 'plain', maxPlace: cur.burden === 'maxfour' ? 4 : undefined };
    let base = bestMove(st, pi, flags0);
    const baseEval = base ? base.eval : -20;
    // card choice
    let choice = null;
    if (st.addon && p.plays < st.cap) {
      const oppTurnsLeft = Math.max(1, Math.round(st.bag.length / (st.np * 4.2)) + 1);
      const playsLeft = st.cap - p.plays;
      const threshold = playsLeft >= oppTurnsLeft ? 0.5 : (playsLeft * 2 >= oppTurnsLeft ? 4 : 7);
      let bestVal = -1;
      for (const id of new Set(p.cards)) {
        if (cardBlockedReason(st, p, id)) continue;
        let v;
        if (CARD[id].bonus) { const b = bestMove(st, pi, { ...flags0, bonus: id }); v = b ? b.eval - baseEval : 0; }
        else if (id === 'haloblank') { const rc = rackCounts(p, flags0.noColors); if (rc.blanks >= (p.level === 'expert' ? 2 : 1)) { v = 0; continue; } const b = bestMove(st, pi, { ...flags0, halo: true }); v = b ? b.eval - baseEval : 0; }
        else if (id === 'anoint') { const b = bestMove(st, pi, { ...flags0, anoint: true }); v = b ? b.eval - baseEval : 0; }
        else if (id === 'temptation') v = 10 + Math.min(10, total(st.players[(pi + 1) % st.np]));
        else if (id === 'mirror') v = st.lastEvil ? (st.lastEvil === 'temptation' ? 10 + Math.min(10, total(st.players[(pi + 1) % st.np])) : STATIC_VALUE[st.lastEvil] ?? 1) : -1;
        else if (id === 'manna' || id === 'jubilee') v = base && leaveScore(p.rack) < -4 ? 5 : STATIC_VALUE[id];
        else if (id === 'covenant') v = p.goals.some(g => goalDead(st, p, g)) ? 8 : STATIC_VALUE[id];
        else if (id === 'secondsight') v = p.goals.some(g => goalDead(st, p, g)) ? 9 : STATIC_VALUE[id];
        else v = STATIC_VALUE[id] ?? 1;
        if (v > bestVal) { bestVal = v; choice = id; }
      }
      if (bestVal < threshold) choice = null;
    }
    if (choice) {
      await playCard(st, agents, pi, choice);
      if (st.cur.rackChanged || ['haloblank', 'anoint'].includes(choice) || CARD[choice].bonus) {
        base = bestMove(st, pi, { ...flags0, halo: cur.halo, anoint: cur.anoint, bonus: cur.bonus });
      }
    }
    if (base && (base.score >= 6 || st.bag.length < 7 || leaveScore(p.rack) > -6)) {
      commitMove(st, pi, base.pls, base.anointIdx);
    } else if (st.bag.length >= 7) {
      const sorted = p.rack.slice().sort((a, b) => (LEAVEV[a.L] ?? 0) - (LEAVEV[b.L] ?? 0));
      const n = Math.min(sorted.length, 4 + (sorted.filter(t => (LEAVEV[t.L] ?? 0) < 0).length > 4 ? 2 : 0));
      exchange(st, pi, sorted.slice(0, n));
    } else if (base) {
      commitMove(st, pi, base.pls, base.anointIdx);
    } else passTurn(st, pi);
    return endTurn(st);
  }
  function goalDead(st, p, g) {
    if (g === 'corner' || g === 'miracle') return !p.supply.some(t => t.L === '?') && goalScore(st, p, g).pts === 0;
    if (g === 'counting') return true;
    if (g === 'creature') return p.mains.map(m => m.w).filter(isCreature).length === 0;
    if (g === 'firstink') return p.firstScored && !p.firstInk;
    return false;
  }

  // default AI decisions
  function aiAgent() {
    return {
      decide(kind, ctx) {
        const { st, p } = ctx;
        switch (kind) {
          case 'keep': {
            // choose keepN of tiles maximizing leave
            const tiles = ctx.tiles, k = ctx.n; let best = null, bs = -1e9;
            const idx = [...tiles.keys()];
            const comb = (start, chosen) => {
              if (chosen.length === k) { const t = chosen.map(i => tiles[i]); const s = leaveScore(t) + t.reduce((a, x) => a + (VALUES[x.L] >= 8 ? 2 : 0), 0); if (s > bs) { bs = s; best = t; } return; }
              for (let i = start; i <= idx.length - (k - chosen.length); i++) { chosen.push(i); comb(i + 1, chosen); chosen.pop(); }
            };
            comb(0, []);
            return best;
          }
          case 'target': return st.players.filter(x => x.idx !== p.idx).sort((a, b) => total(b) - total(a))[0].idx;
          case 'passGive': return p.cards.slice().sort((a, b) => cardWorth(a) - cardWorth(b))[0];
          case 'manna': return p.rack.slice().sort((a, b) => (LEAVEV[a.L] ?? 0) - (LEAVEV[b.L] ?? 0)).slice(0, ctx.n);
          case 'jubilee': return p.rack.filter(t => (LEAVEV[t.L] ?? 0) <= -1.5).slice(0, ctx.n);
          case 'covenant': { const d = p.goals.findIndex(g => goalDead(st, p, g)); return d >= 0 ? d : (goalScore(st, p, p.goals[0]).pts <= goalScore(st, p, p.goals[1]).pts ? 0 : 1); }
          case 'secondSightKeep': { const worth = id => ({ chain: 3, five: 3, six: 3, scatter: 2.5, creature: 2.5, open: 2, corner: 1.8, sameends: 1.5, counting: 1.5, miracle: 1.5 }[id] ?? 1); return worth(ctx.options[0]) >= worth(ctx.options[1]) ? ctx.options[0] : ctx.options[1]; }
        }
      },
    };
  }
  const cardWorth = id => ({ temptation: 10, blessed: 9, facesum: 9, rainbow: 8, fog: 6, sacred: 6, lead: 5, haloblank: 5, mirror: 5, anoint: 4, scapegoat: 3, ironrod: 3, manna: 3, covenant: 3, secondsight: 3, jubilee: 2, shortrope: 4, taxcollector: 2, passhalo: 1 })[id] ?? 1;

  G.AA = {
    VALUES, DIST, N, CENTER, PREM, CARDS, CARD, GOALS, GOAL, CREATURES, NUMBERS, COLORED_LETTERS,
    loadDict, loadCommon, isWord, COMMON, newGame, dealRacks, beginTurn, playCard, commitMove, exchange, passTurn, endTurn,
    validate, scoreMove, cardBlockedReason, goalScore, goalProgress, bestMove, aiTurn, aiAgent, total, tileVal,
    leaveScore, boardWords, burnB, dict: D,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
