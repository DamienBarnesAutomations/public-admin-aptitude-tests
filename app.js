/* Public Admin Aptitude Tests
 *
 * Two drills for the Irish civil service Clerical Officer self-assessment:
 * transcription checking, and the two-stage categorising lookup.
 *
 * Classic script, no modules, no build step, no network. Works from file://
 * as well as from GitHub Pages.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ rng */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function Rng(seed) {
    this.next = mulberry32(seed);
  }
  Rng.prototype.float = function () { return this.next(); };
  Rng.prototype.int = function (min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  };
  Rng.prototype.pick = function (list) {
    return list[this.int(0, list.length - 1)];
  };
  Rng.prototype.sample = function (list, count) {
    const copy = list.slice();
    for (let i = 0; i < count; i += 1) {
      const j = this.int(i, copy.length - 1);
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy.slice(0, count);
  };

  /* ------------------------------------------------------- checking drill */

  const PLOT_SIZES = [[60, 'Half'], [100, 'Full'], [150, 'Large'], [180, 'Double']];
  const PLOT_DESC = new Map(PLOT_SIZES);

  const FIRST_NAMES = ['Sue', 'Mary', 'John', 'Priya', 'Tomasz', 'Aisling', 'Declan',
    'Niamh', 'Kwame', 'Elena', 'Cormac', 'Fiona', 'Rahul', 'Bridget', 'Sean', 'Marta'];
  const LAST_NAMES = ['Ripley', 'Gill', 'Shindi', "O'Brien", 'Nowak', 'Kelly', 'Doyle',
    'Byrne', 'Walsh', 'Ryan', 'Murphy', 'Khan', 'Novak', 'Fitzgerald'];
  const STREETS = ['Mill St', 'Till Rd', 'Head Fen Rd', 'Station Rd', 'Church St',
    'Abbey Lane', 'Green Park', 'Harbour Rd', 'Hill View', 'Chapel St'];
  const TOWNS = ['Dublin 2', 'Dublin 3', 'Bray', 'Athlone', 'Mullingar', 'Longford',
    'Tullamore', 'Navan', 'Drogheda', 'Naas'];

  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function daysInMonth(year, month) {
    if (month === 2) {
      const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      return leap ? 29 : 28;
    }
    return MONTH_DAYS[month - 1];
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatDate(year, month, day) {
    return `${pad2(day)}/${pad2(month)}/${year}`;
  }

  function randomRecord(rng) {
    const year = rng.int(1995, 2015);
    const month = rng.int(1, 12);
    const day = rng.int(1, daysInMonth(year, month));
    const contact = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}, ` +
      `${rng.int(1, 240)} ${rng.pick(STREETS)}, ${rng.pick(TOWNS)}`;
    return {
      A: `${rng.int(1000, 9999)} ${rng.pick(['A', 'B', 'C'])}${rng.int(1, 9)}`,
      B: formatDate(year, month, day),
      C: contact,
      D: rng.pick(PLOT_SIZES)[0],
    };
  }

  function changeDigit(rng, text) {
    const spots = [];
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] >= '0' && text[i] <= '9') spots.push(i);
    }
    if (!spots.length) return null;
    const at = spots[rng.int(0, spots.length - 1)];
    let replacement = String(rng.int(0, 9));
    if (replacement === text[at]) replacement = String((Number(text[at]) + 1) % 10);
    return text.slice(0, at) + replacement + text.slice(at + 1);
  }

  function swapAdjacent(rng, text) {
    const spots = [];
    for (let i = 0; i < text.length - 1; i += 1) {
      if (text[i] !== text[i + 1]) spots.push(i);
    }
    if (!spots.length) return null;
    const at = spots[rng.int(0, spots.length - 1)];
    return text.slice(0, at) + text[at + 1] + text[at] + text.slice(at + 2);
  }

  function dropChar(rng, text) {
    if (text.length < 4) return null;
    const at = rng.int(0, text.length - 1);
    return text.slice(0, at) + text.slice(at + 1);
  }

  /* The archetypal date error: 05/04 becomes 04/05. Only offered when the
   * swapped date is a real date, so the right panel never shows 31/31. */
  function swapDayMonth(rng, text) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if (!match) return null;
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    if (first < 1 || first > 12) return null;
    if (second < 1 || second > daysInMonth(year, first)) return null;
    const swapped = formatDate(year, first, second);
    return swapped === text ? null : swapped;
  }

  function mutate(column, value, rng) {
    if (column === 'B') {
      const swapped = swapDayMonth(rng, value);
      if (swapped) return swapped;
    }
    const candidates = [
      changeDigit(rng, value),
      swapAdjacent(rng, value),
      dropChar(rng, value),
    ].filter(function (candidate) { return candidate && candidate !== value; });
    if (!candidates.length) throw new Error('could not mutate ' + column + ' value');
    return rng.pick(candidates);
  }

  function makeCheckItem(rng, errorRate, maxErrors) {
    const left = randomRecord(rng);
    const right = { A: left.A, B: left.B, C: left.C, D: PLOT_DESC.get(left.D) };

    const count = rng.float() >= errorRate ? 0 : rng.int(1, maxErrors);
    const errors = new Set(rng.sample(['A', 'B', 'C', 'D'], count));

    ['A', 'B', 'C'].forEach(function (column) {
      if (errors.has(column)) right[column] = mutate(column, left[column], rng);
    });

    if (errors.has('D')) {
      const correct = PLOT_DESC.get(left.D);
      const wrong = PLOT_SIZES.map(function (pair) { return pair[1]; })
        .filter(function (desc) { return desc !== correct; });
      right.D = rng.pick(wrong);
    }

    return { left: left, right: right, errors: errors };
  }

  /* --------------------------------------------------- categorising drill */

  const AREAS = {
    A: ['Travel & Subsistence', ['Taxi fares', 'Hotel accommodation', 'Flight booking', 'Mileage claim']],
    B: ['Stationery & Office', ['Printer toner', 'A4 paper', 'Envelopes', 'Filing folders']],
    C: ['Utilities', ['Electricity supply', 'Water charges', 'Gas supply', 'Waste collection']],
    D: ['Food & Drink', ['Refreshments', 'Canteen supplies', 'Tea and coffee', 'Catering']],
    E: ['IT & Equipment', ['Laptop', 'Monitor', 'Software licence', 'Network switch']],
    F: ['Maintenance & Repairs', ['Boiler repair', 'Window replacement', 'Flooring', 'Alarm servicing']],
  };
  const AREA_KEYS = Object.keys(AREAS);

  const SUPPLIERS = { Internal: 'X', External: 'Y', 'Grant-funded': 'Z' };
  const SUPPLIER_KEYS = Object.keys(SUPPLIERS);

  /* Boundaries deliberately overlap across prefixes: use the wrong prefix and
   * the answer flips, which is the trap the real test sets. */
  const RANGES = {
    X: [[1, 145401, 'A'], [145402, 229667, 'B'], [229668, 999999, 'C']],
    Y: [[1, 99999, 'B'], [100000, 189999, 'C'], [190000, 999999, 'A']],
    Z: [[1, 120000, 'C'], [120001, 210000, 'A'], [210001, 999999, 'B']],
  };

  function referenceCategory(prefix, number) {
    const rows = RANGES[prefix];
    for (let i = 0; i < rows.length; i += 1) {
      if (number >= rows[i][0] && number <= rows[i][1]) return rows[i][2];
    }
    throw new Error('number outside every range for prefix ' + prefix);
  }

  function makeCatItem(rng) {
    const area = rng.pick(AREA_KEYS);
    const supplier = rng.pick(SUPPLIER_KEYS);
    const prefix = SUPPLIERS[supplier];

    const band = rng.pick(RANGES[prefix]);
    let number;
    if (band[1] - band[0] > 4000 && rng.float() < 0.35) {
      const edge = rng.pick([band[0], band[1]]);
      number = Math.min(999999, Math.max(1, edge + rng.int(-1500, 1500)));
    } else {
      number = rng.int(band[0], band[1]);
    }

    const year = rng.int(2025, 2026);
    const month = rng.int(1, 12);
    const day = rng.int(1, daysInMonth(year, month));

    return {
      invoiceFor: rng.pick(AREAS[area][1]),
      supplier: supplier,
      number: number,
      amount: '€' + (40 + rng.float() * 4760).toLocaleString('en-IE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }),
      when: formatDate(year, month, day),
      area: area,
      ref: referenceCategory(prefix, number),
    };
  }

  function tablesMarkup() {
    let html = '<div class="tables-grid">';
    html += '<table class="lookup"><caption>Invoice areas</caption><tbody>';
    AREA_KEYS.forEach(function (key) {
      html += `<tr><th scope="row">${key}</th><td>${AREAS[key][0]}</td></tr>`;
    });
    html += '</tbody></table>';

    html += '<table class="lookup"><caption>Supplier type &rarr; prefix</caption><tbody>';
    SUPPLIER_KEYS.forEach(function (key) {
      html += `<tr><th scope="row">${SUPPLIERS[key]}</th><td>${key}</td></tr>`;
    });
    html += '</tbody></table>';

    html += '<table class="lookup wide"><caption>Purchase reference categories</caption><tbody>';
    ['X', 'Y', 'Z'].forEach(function (prefix) {
      RANGES[prefix].forEach(function (band) {
        html += `<tr><th scope="row">${prefix}</th><td class="mono">${String(band[0]).padStart(6, '0')}&ndash;${String(band[1]).padStart(6, '0')}</td><td>${band[2]}</td></tr>`;
      });
    });
    html += '</tbody></table></div>';
    return html;
  }

  /* ---------------------------------------------------------------- state */

  const LENGTHS = {
    full: { checking: { n: 46, s: 480 }, categorising: { n: 40, s: 600 } },
    half: { checking: { n: 23, s: 240 }, categorising: { n: 20, s: 300 } },
    short: { checking: { n: 10, s: 120 }, categorising: { n: 10, s: 150 } },
  };

  const LABELS = { checking: 'Checking', categorising: 'Categorising' };
  const STORE_KEY = 'paat.runs.v1';

  const state = {
    view: 'menu',
    drill: null,
    items: [],
    index: 0,
    rows: [],
    seed: 0,
    feedback: false,
    length: 'full',
    startedAt: 0,
    deadline: 0,
    allowed: 0,
    ticker: null,
    finished: false,
    locked: false,
    selected: new Set(),
    clean: false,
    entry: [],
  };

  /* ------------------------------------------------------------------ dom */

  const $ = function (selector) { return document.querySelector(selector); };

  const views = {
    menu: $('#view-menu'),
    run: $('#view-run'),
    results: $('#view-results'),
    board: $('#view-board'),
  };

  function showView(name, focusSelector) {
    Object.keys(views).forEach(function (key) {
      views[key].classList.toggle('hidden', key !== name);
    });
    state.view = name;
    if (focusSelector) {
      const target = $(focusSelector);
      if (target) target.focus();
    }
  }

  function clockText(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${pad2(whole % 60)}`;
  }

  /* --------------------------------------------------------------- render */

  function renderChecking(item) {
    const rows = [
      ['A', 'Plot code', item.left.A, item.right.A],
      ['B', 'Start date', item.left.B, item.right.B],
      ['C', 'Contact', item.left.C, item.right.C],
      ['D', 'Plot size', `${item.left.D} sq. ms.`, item.right.D],
    ];

    let html = '<table class="record"><colgroup><col class="c-key"><col class="c-label">' +
      '<col><col></colgroup><thead><tr><th scope="col"></th><th scope="col"></th>' +
      '<th scope="col">Left</th><th scope="col">Right</th></tr></thead><tbody>';

    rows.forEach(function (row) {
      html += `<tr><th scope="row" class="c-key">${row[0]}</th>` +
        `<td class="c-label">${row[1]}</td>` +
        `<td class="mono">${escapeHtml(row[2])}</td>` +
        `<td class="mono">${escapeHtml(row[3])}</td></tr>`;
    });
    html += '</tbody></table>';

    html += '<p class="key-note">Plot size key: ' + PLOT_SIZES.map(function (pair) {
      return `${pair[0]} = ${pair[1]}`;
    }).join(' &middot; ') + '</p>';

    html += '<div class="chips" id="chips">';
    [['A', 'Plot code'], ['B', 'Start date'], ['C', 'Contact'], ['D', 'Plot size']]
      .forEach(function (pair) {
        html += `<button type="button" class="chip" data-column="${pair[0]}">` +
          `<b>${pair[0]}</b><span>${pair[1]}</span></button>`;
      });
    html += '<button type="button" class="chip chip-clean" data-column="N">' +
      '<b>N</b><span>No error</span></button></div>';

    $('#question').innerHTML = html;
    $('#chips').addEventListener('click', function (event) {
      const button = event.target.closest('.chip');
      if (!button) return;
      button.blur();
      applyColumn(button.dataset.column);
    });
    paintChips();
  }

  function renderCategorising(item) {
    $('#question').innerHTML = `
      <dl class="log">
        <div><dt>Invoice for</dt><dd>${escapeHtml(item.invoiceFor)}</dd></div>
        <div><dt>Supplier type</dt><dd>${escapeHtml(item.supplier)}</dd></div>
        <div><dt>Purchase number</dt><dd class="mono">${String(item.number).padStart(6, '0')}</dd></div>
        <div><dt>Amount</dt><dd class="mono">${escapeHtml(item.amount)}</dd></div>
        <div><dt>Date</dt><dd class="mono">${item.when}</dd></div>
      </dl>
      <div class="entry" id="entry"></div>`;
    paintEntry();
  }

  function paintChips() {
    const chips = document.querySelectorAll('#chips .chip');
    if (!chips.length) return;
    chips.forEach(function (chip) {
      const column = chip.dataset.column;
      const on = column === 'N' ? state.clean : state.selected.has(column);
      chip.classList.toggle('on', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    const hint = $('#hint');
    if (state.clean) {
      hint.textContent = 'Claimed clean. Enter to submit, Backspace to clear.';
    } else if (state.selected.size) {
      hint.textContent = `Marked ${[...state.selected].sort().join(', ')}. Enter to submit.`;
    } else {
      hint.textContent = 'Type A\u2013D to mark a column, N for a clean record, Enter to submit.';
    }
  }

  function paintEntry() {
    const entry = $('#entry');
    if (!entry) return;
    const area = state.entry[0] || '\u2014';
    const ref = state.entry[1] || '\u2014';
    entry.innerHTML = `Area <b>${area}</b> &nbsp; Reference <b>${ref}</b>`;
    $('#hint').textContent = state.entry.length < 2
      ? 'Type the invoice area (A\u2013F), then the reference category (A\u2013C).'
      : 'Enter to submit, Backspace to undo.';
  }

  function renderQuestion() {
    const item = state.items[state.index];
    $('#run-count').textContent = `Question ${state.index + 1} of ${state.items.length}`;
    if (state.drill === 'checking') renderChecking(item);
    else renderCategorising(item);
  }

  /* -------------------------------------------------------------- answers */

  function applyColumn(key) {
    if (key === 'N') {
      state.clean = true;
      state.selected.clear();
    } else {
      state.clean = false;
      if (state.selected.has(key)) state.selected.delete(key);
      else state.selected.add(key);
    }
    paintChips();
  }

  function pushEntry(letter) {
    if (state.entry.length >= 2) return;
    if (state.entry.length === 0 && !AREAS[letter]) return;
    if (state.entry.length === 1 && !'ABC'.includes(letter)) return;
    state.entry.push(letter);
    paintEntry();
  }

  function clearAnswer() {
    if (state.drill === 'checking') {
      state.selected.clear();
      state.clean = false;
      paintChips();
    } else {
      state.entry.pop();
      paintEntry();
    }
  }

  /* -------------------------------------------------------------- scoring */

  function scoreChecking(item, selected, clean) {
    if (clean) {
      /* "No error" is an assertion, not an absence of one: claiming a clean
       * record when it is dirty scores nothing. */
      const perfect = item.errors.size === 0;
      const columns = {};
      ['A', 'B', 'C', 'D'].forEach(function (column) { columns[column] = perfect; });
      return { points: perfect ? 4 : 0, max: 4, perfect: perfect, columns: columns };
    }
    const columns = {};
    let points = 0;
    ['A', 'B', 'C', 'D'].forEach(function (column) {
      const ok = selected.has(column) === item.errors.has(column);
      columns[column] = ok;
      if (ok) points += 1;
    });
    return { points: points, max: 4, perfect: points === 4, columns: columns };
  }

  function scoreCategorising(item, entry) {
    const areaOk = entry[0] === item.area;
    const refOk = entry[1] === item.ref;
    return {
      points: (areaOk ? 1 : 0) + (refOk ? 1 : 0),
      max: 2,
      perfect: areaOk && refOk,
      columns: { area: areaOk, ref: refOk },
    };
  }

  /* ----------------------------------------------------------------- loop */

  function submitAnswer() {
    if (state.finished || state.locked) return;
    if (performance.now() > state.deadline) { finish('time'); return; }

    const item = state.items[state.index];
    let row;

    if (state.drill === 'checking') {
      if (!state.clean && state.selected.size === 0) return;
      row = scoreChecking(item, state.selected, state.clean);
      row.answer = state.clean ? 'N' : [...state.selected].sort().join(' ');
      row.expected = [...item.errors].sort().join(' ') || 'N';
    } else {
      if (state.entry.length < 2) return;
      row = scoreCategorising(item, state.entry);
      row.answer = state.entry.join(' ');
      row.expected = `${item.area} ${item.ref}`;
    }

    state.rows.push(row);

    if (state.feedback) {
      state.locked = true;
      markFeedback(row);
      window.setTimeout(function () {
        state.locked = false;
        advance();
      }, 900);
    } else {
      advance();
    }
  }

  function markFeedback(row) {
    const hint = $('#hint');
    hint.classList.add(row.perfect ? 'ok' : 'bad');
    hint.textContent = row.perfect
      ? 'Correct.'
      : `Answer: ${row.expected} \u2014 you said ${row.answer || 'nothing'}.`;
  }

  function advance() {
    if (state.finished) return;
    state.index += 1;
    if (state.index >= state.items.length) { finish('done'); return; }
    state.selected.clear();
    state.clean = false;
    state.entry = [];
    $('#hint').classList.remove('ok', 'bad');
    renderQuestion();
  }

  function tick() {
    const left = (state.deadline - performance.now()) / 1000;
    $('#run-clock').textContent = clockText(left);
    $('#run-clock').classList.toggle('urgent', left <= 30);
    if (left <= 0) finish('time');
  }

  function startRun(drill, options) {
    if (state.ticker) {
      window.clearInterval(state.ticker);
      state.ticker = null;
    }
    const settings = LENGTHS[state.length][drill];
    const seed = options && options.seed != null ? options.seed : pickSeed();
    const rng = new Rng(seed);

    state.drill = drill;
    state.seed = seed;
    state.feedback = $('#opt-feedback').checked;
    state.items = [];
    state.index = 0;
    state.rows = [];
    state.finished = false;
    state.locked = false;
    state.selected.clear();
    state.clean = false;
    state.entry = [];
    state.allowed = settings.s;

    for (let i = 0; i < settings.n; i += 1) {
      state.items.push(drill === 'checking'
        ? makeCheckItem(rng, 0.65, 3)
        : makeCatItem(rng));
    }

    showView('run');
    $('#run-title').textContent = LABELS[drill];
    $('#run-count').textContent = `Question 1 of ${settings.n}`;
    $('#run-clock').classList.remove('urgent');

    if (drill === 'categorising') {
      $('#tables').innerHTML = tablesMarkup();
      $('#tables').hidden = false;
    } else {
      $('#tables').innerHTML = '';
      $('#tables').hidden = true;
    }

    $('#hint').classList.remove('ok', 'bad');
    renderQuestion();

    state.startedAt = performance.now();
    state.deadline = state.startedAt + settings.s * 1000;
    tick();
    if (state.ticker) window.clearInterval(state.ticker);
    state.ticker = window.setInterval(tick, 200);

    $('#run-title').focus();
  }

  function finish(reason) {
    if (state.finished) return;
    state.finished = true;
    if (state.ticker) {
      window.clearInterval(state.ticker);
      state.ticker = null;
    }
    const elapsed = Math.min((performance.now() - state.startedAt) / 1000, state.allowed);
    renderResults(reason, elapsed);
    showView('results', '#results-title');
  }

  /* -------------------------------------------------------------- results */

  function summarise() {
    const rows = state.rows;
    const points = rows.reduce(function (sum, row) { return sum + row.points; }, 0);
    const max = rows.reduce(function (sum, row) { return sum + row.max; }, 0);
    const perfect = rows.filter(function (row) { return row.perfect; }).length;
    const columns = {};
    if (state.drill === 'checking') {
      ['A', 'B', 'C', 'D'].forEach(function (key) {
        columns[key] = rows.filter(function (row) { return row.columns[key]; }).length;
      });
    } else {
      columns.area = rows.filter(function (row) { return row.columns.area; }).length;
      columns.ref = rows.filter(function (row) { return row.columns.ref; }).length;
    }
    return { attempted: rows.length, points: points, max: max, perfect: perfect, columns: columns };
  }

  function renderResults(reason, elapsed) {
    const summary = summarise();
    const pct = summary.max ? Math.round((summary.points / summary.max) * 100) : 0;

    let html = '<table class="summary"><tbody>';
    html += `<tr><th scope="row">Drill</th><td>${LABELS[state.drill]}</td></tr>`;
    html += `<tr><th scope="row">Outcome</th><td>${reason === 'done' ? 'Completed' : 'Time expired'}</td></tr>`;
    html += `<tr><th scope="row">Offered</th><td>${state.items.length}</td></tr>`;
    html += `<tr><th scope="row">Attempted</th><td>${summary.attempted}</td></tr>`;
    html += `<tr><th scope="row">Points</th><td><b>${summary.points} / ${summary.max}</b> (${pct}%)</td></tr>`;
    html += `<tr><th scope="row">Fully correct</th><td>${summary.perfect} / ${summary.attempted}</td></tr>`;
    html += `<tr><th scope="row">Time used</th><td>${clockText(elapsed)} of ${clockText(state.allowed)}</td></tr>`;
    html += `<tr><th scope="row">Seed</th><td class="mono">${state.seed}</td></tr>`;
    html += '</tbody></table>';

    if (summary.attempted) {
      html += '<h3>By column</h3><ul class="bars">';
      Object.keys(summary.columns).forEach(function (key) {
        const hits = summary.columns[key];
        const width = Math.round((hits / summary.attempted) * 100);
        html += `<li><span class="bar-label">${key}</span>` +
          `<span class="bar"><i style="width:${width}%"></i></span>` +
          `<span class="bar-value">${hits}/${summary.attempted}</span></li>`;
      });
      html += '</ul>';
    }

    $('#results-body').innerHTML = html;
    if (summary.attempted) saveRun(reason, elapsed, summary);
  }

  /* ----------------------------------------------------------- scoreboard */

  function loadRuns() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveRun(reason, elapsed, summary) {
    const runs = loadRuns();
    runs.unshift({
      when: new Date().toISOString().slice(0, 19),
      drill: state.drill,
      offered: state.items.length,
      attempted: summary.attempted,
      points: summary.points,
      max: summary.max,
      perfect: summary.perfect,
      seconds: Math.round(elapsed),
      seed: state.seed,
      outcome: reason,
    });
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(runs.slice(0, 200)));
    } catch (error) {
      /* Storage full or blocked: the drill still works, it just forgets. */
    }
  }

  function renderBoard() {
    const runs = loadRuns();
    if (!runs.length) {
      $('#board-body').innerHTML = '<p class="fine">Nothing recorded yet. Do a drill first.</p>';
      return;
    }
    let html = '<table class="board"><thead><tr>' +
      '<th scope="col">When</th><th scope="col">Drill</th><th scope="col">Attempted</th>' +
      '<th scope="col">Points</th><th scope="col">Perfect</th><th scope="col">Time</th>' +
      '<th scope="col">Seed</th></tr></thead><tbody>';
    runs.forEach(function (run) {
      html += `<tr><td class="mono">${run.when.replace('T', ' ')}</td>` +
        `<td>${LABELS[run.drill] || run.drill}</td>` +
        `<td class="num">${run.attempted}/${run.offered}</td>` +
        `<td class="num">${run.points}/${run.max}</td>` +
        `<td class="num">${run.perfect}</td>` +
        `<td class="num mono">${clockText(run.seconds)}</td>` +
        `<td class="num mono">${run.seed}</td></tr>`;
    });
    html += '</tbody></table>';
    $('#board-body').innerHTML = html;
  }

  function exportCsv() {
    const runs = loadRuns();
    if (!runs.length) return;
    const header = ['timestamp', 'drill', 'offered', 'attempted', 'points', 'max_points',
      'perfect', 'seconds_used', 'seed', 'outcome'];
    const lines = [header.join(',')];
    runs.forEach(function (run) {
      lines.push([run.when, run.drill, run.offered, run.attempted, run.points, run.max,
        run.perfect, run.seconds, run.seed, run.outcome].join(','));
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aptitude-drills.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* ---------------------------------------------------------------- utils */

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function pickSeed() {
    const typed = $('#opt-seed').value.trim();
    if (typed) {
      const parsed = Number.parseInt(typed, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed >>> 0;
    }
    return 1 + Math.floor(Math.random() * 4294967295);
  }

  function updateMeta() {
    const chosen = LENGTHS[$('#opt-length').value];
    $('#meta-checking').textContent =
      `${chosen.checking.n} questions \u00b7 ${clockText(chosen.checking.s)}`;
    $('#meta-categorising').textContent =
      `${chosen.categorising.n} questions \u00b7 ${clockText(chosen.categorising.s)}`;
  }

  /* -------------------------------------------------------------- wiring */

  document.addEventListener('keydown', function (event) {
    if (state.view !== 'run' || state.finished || state.locked) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();

    if (key === 'enter') { event.preventDefault(); submitAnswer(); return; }
    if (key === 'backspace' || key === 'escape') { event.preventDefault(); clearAnswer(); return; }

    if (state.drill === 'checking') {
      if ('abcd'.includes(key) && key.length === 1) {
        event.preventDefault();
        applyColumn(key.toUpperCase());
      } else if (key === 'n') {
        event.preventDefault();
        applyColumn('N');
      }
    } else if (key.length === 1 && key >= 'a' && key <= 'f') {
      event.preventDefault();
      pushEntry(key.toUpperCase());
    }
  });

  document.querySelectorAll('[data-start]').forEach(function (button) {
    button.addEventListener('click', function () {
      state.length = $('#opt-length').value;
      startRun(button.dataset.start);
    });
  });

  $('#opt-length').addEventListener('change', updateMeta);

  $('#again-same').addEventListener('click', function () {
    startRun(state.drill, { seed: state.seed });
  });
  $('#again-new').addEventListener('click', function () {
    startRun(state.drill);
  });
  $('#to-menu').addEventListener('click', function () {
    showView('menu', '#view-menu h1');
    updateMeta();
  });

  $('#open-board').addEventListener('click', function () {
    renderBoard();
    showView('board', '#board-title');
  });
  $('#board-to-menu').addEventListener('click', function () {
    showView('menu', '#view-menu h1');
  });
  $('#export-csv').addEventListener('click', exportCsv);
  $('#clear-board').addEventListener('click', function () {
    if (!window.confirm('Delete every recorded run? This cannot be undone.')) return;
    try { window.localStorage.removeItem(STORE_KEY); } catch (error) { /* ignore */ }
    renderBoard();
  });

  updateMeta();
})();
