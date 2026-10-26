/* Answer-correctness oracle. Run: node test/answers.test.js
 *
 * invariants.test.js checks that papers are well formed. This one checks that
 * the marked answer is actually right: every figure is re-derived from what the
 * candidate sees on screen (the context table and the prompt), by code that
 * does not share the generator's variables. No dependencies. */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const SEEDS = 1500;

function stubElement() {
  const element = new Proxy(function () {}, {
    get(target, prop) {
      if (prop === 'dataset' || prop === 'classList' || prop === 'style') return stubElement();
      if (prop === 'checked') return false;
      if (prop === 'value') return 'full';
      if (prop === Symbol.toPrimitive) return () => '';
      return stubElement();
    },
    set() { return true; },
    apply() { return stubElement(); },
  });
  return element;
}

const window = {
  location: { search: '?debug' },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  setTimeout, clearTimeout, setInterval, clearInterval,
  alert(message) { throw new Error('alert: ' + message); },
  confirm() { return false; },
};
const sandbox = {
  window,
  document: {
    querySelector: stubElement,
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement: stubElement,
    body: stubElement(),
  },
  performance: { now: () => 0 },
  console, Math, Number, String, Array, Object, Set, Map, JSON, Error, Date,
  Blob: function () {}, URL: { createObjectURL() {}, revokeObjectURL() {} },
};
sandbox.window.window = window;
vm.createContext(sandbox);
for (const file of ['passages.js', 'scenarios.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}
const PAAT = window.PAAT;

let checks = 0;
function check(condition, message) {
  checks += 1;
  assert(condition, message);
}

/* ---------------------------------------------------------------- parsing */

function cellsOf(html) {
  return [...html.matchAll(/<(?:td|th)[^>]*>([^<]*)<\/(?:td|th)>/g)].map((m) => m[1]);
}

function rowsOf(html) {
  const body = html.split('<tbody>')[1] || '';
  return [...body.matchAll(/<tr>(.*?)<\/tr>/g)].map((row) => cellsOf(row[1]));
}

function cents(text) {
  const m = /^(-?)€([\d,]+)\.(\d\d)$/.exec(text);
  assert(m, `not a euro amount: "${text}"`);
  return (m[1] ? -1 : 1) * (Number(m[2].replace(/,/g, '')) * 100 + Number(m[3]));
}

function count(text) {
  assert(/^[\d,]+$/.test(text), `not a count: "${text}"`);
  return Number(text.replace(/,/g, ''));
}

function euroText(c) {
  return (c < 0 ? '-' : '') + '€' + (Math.abs(c) / 100).toLocaleString('en-IE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function dlValues(html) {
  const out = {};
  for (const m of html.matchAll(/<dt>([^<]*)<\/dt><dd[^>]*>([^<]*)<\/dd>/g)) out[m[1]] = m[2];
  return out;
}

/* Money must come out as a whole number of cents, so "to the nearest cent"
 * never needs saying and no answer depends on a rounding convention. */
function exact(numerator, denominator, what) {
  assert(numerator % denominator === 0, `${what}: ${numerator}/${denominator} is not a whole number of cents`);
  return numerator / denominator;
}

/* Percentage to one place from an exact ratio of integers, half away from
 * zero. A ratio sitting exactly on x.x5 is rejected: the answer would depend
 * on the rounding convention. */
function pct1(numerator, denominator) {
  const scaled = Math.abs(numerator) * 1000;
  const q = Math.floor(scaled / denominator);
  const twice = 2 * (scaled - q * denominator);
  assert(twice !== denominator, `${numerator}/${denominator} is exactly on a rounding tie`);
  const tenths = q + (twice > denominator ? 1 : 0);
  return (numerator < 0 && tenths ? '-' : '') + (tenths / 10).toFixed(1) + '%';
}

/* ------------------------------------------------------------- numerical */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June'];

function expectedNumerical(item) {
  const html = item.contextHtml;
  const p = item.prompt;

  if (/Applications processed/.test(html)) {
    const v = rowsOf(html)[0].map(count);
    const total = v.reduce((a, b) => a + b, 0);
    if (/total number of applications/.test(p)) return String(total).replace(/\B(?=(\d{3})+$)/g, ',');
    if (/average number/.test(p)) {
      assert(total % 6 !== 3, `average ${total}/6 is exactly on .5`);
      return String(Math.round(total / 6)).replace(/\B(?=(\d{3})+$)/g, ',');
    }
    const m = /change in applications from (\w+) to (\w+)/.exec(p);
    assert(m, `unrecognised volumes prompt: ${p}`);
    const a = v[MONTHS.indexOf(m[1])];
    const b = v[MONTHS.indexOf(m[2])];
    return pct1(b - a, a);
  }

  if (/Procurement list/.test(html)) {
    const rows = rowsOf(html).map((r) => ({ name: r[0], unit: cents(r[1]), qty: count(r[2]) }));
    const line = (r) => r.unit * r.qty;
    if (/total spend on all three/.test(p)) return euroText(rows.reduce((s, r) => s + line(r), 0));
    let m = /total cost of the (.+)\?/.exec(p);
    if (m) {
      const r = rows.find((x) => x.name.toLowerCase() === m[1]);
      assert(r, `unknown item in: ${p}`);
      return euroText(line(r));
    }
    m = /10% discount applies to the (.+)\. How much is saved/.exec(p);
    assert(m, `unrecognised procurement prompt: ${p}`);
    const r = rows.find((x) => x.name.toLowerCase() === m[1]);
    return euroText(exact(line(r), 10, 'procurement saving'));
  }

  if (/Ticket sales/.test(html)) {
    const rows = rowsOf(html);
    const std = cents(rows[0][1]) * count(rows[0][2]);
    const con = cents(rows[1][1]) * count(rows[1][2]);
    if (/total revenue from ticket sales/.test(p)) return euroText(std + con);
    if (/exceed/.test(p)) return euroText(std - con);
    assert(/percentage of total revenue came from concessions/.test(p), `unrecognised ticket prompt: ${p}`);
    return pct1(con, std + con);
  }

  if (/Hourly rate/.test(html)) {
    const d = dlValues(html);
    const rate = cents(d['Hourly rate']);
    const hours = count(d['Contracted hours per week']);
    const weeks = count(d['Weeks in period']);
    assert(d['Overtime rate'] === 'time and a half', 'overtime rate changed');
    if (/weekly pay before overtime/.test(p)) return euroText(rate * hours);
    if (/full period/.test(p)) return euroText(rate * hours * weeks);
    const m = /total pay for (\d+) hours of overtime/.exec(p);
    assert(m, `unrecognised pay prompt: ${p}`);
    return euroText(exact(rate * 3, 2, 'overtime rate') * Number(m[1]));
  }

  if (/Budget line/.test(html)) {
    const rows = rowsOf(html);
    const base = cents(rows[0][1]);
    const uplift = Number(/^(\d+)%$/.exec(rows[1][1])[1]);
    const spent = cents(rows[2][1]);
    const revised = base + exact(base * uplift, 100, 'uplift');
    if (/revised allocation after the uplift/.test(p)) return euroText(revised);
    if (/remains unspent/.test(p)) return euroText(revised - spent);
    assert(/percentage of the revised allocation was spent/.test(p), `unrecognised budget prompt: ${p}`);
    return pct1(spent, revised);
  }

  if (/Staffing/.test(html)) {
    const rows = rowsOf(html);
    const staffA = count(rows[0][1]);
    const salA = cents(rows[0][2]);
    const staffB = count(rows[1][1]);
    const salB = cents(rows[1][2]);
    const onCost = Number(/on-costs of (\d+)%/.exec(html)[1]);
    if (/Grade A, before on-costs/.test(p)) return euroText(staffA * salA);
    const payroll = staffA * salA + staffB * salB;
    if (/both grades, including on-costs/.test(p)) return euroText(payroll + exact(payroll * onCost, 100, 'payroll on-costs'));
    assert(/difference in cost per head/.test(p), `unrecognised staffing prompt: ${p}`);
    return euroText(exact((salB - salA) * (100 + onCost), 100, 'per-head gap'));
  }

  if (/Case processing/.test(html)) {
    const rows = rowsOf(html).map((r) => count(r[1]));
    const [perDay, days, backlog, intake] = rows;
    const capacity = perDay * days;
    const outstanding = backlog + intake - capacity;
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+$)/g, ',');
    if (/could be handled during the period/.test(p)) return fmt(capacity);
    if (/remain outstanding/.test(p)) return fmt(outstanding);
    assert(/working days would it take to clear/.test(p), `unrecognised processing prompt: ${p}`);
    return fmt(Math.ceil(outstanding / perDay));
  }

  if (/<caption>Order/.test(html)) {
    const rows = rowsOf(html);
    const unit = cents(rows[0][1]);
    const qty = count(rows[1][1]);
    const bands = /60.119 units (\d+)% .+120.249 units (\d+)% .+250 units or more (\d+)%/.exec(html);
    assert(bands, 'discount bands not shown');
    const tier = qty >= 250 ? Number(bands[3]) : qty >= 120 ? Number(bands[2]) : Number(bands[1]);
    const gross = unit * qty;
    const discount = exact(gross * tier, 100, 'quantity discount');
    if (/gross cost/.test(p)) return euroText(gross);
    if (/value of the quantity discount/.test(p)) return euroText(discount);
    assert(/effective cost per unit/.test(p), `unrecognised discount prompt: ${p}`);
    return euroText(exact(gross - discount, qty, 'cost per unit'));
  }

  throw new Error('unrecognised numerical block: ' + html.slice(0, 80));
}

function numberOf(option) {
  return Number(option.replace(/[€,%]/g, ''));
}

for (const hard of [false, true]) {
  const seen = new Set();
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const paper = PAAT.makeNumericalPaper(new PAAT.Rng(seed), hard ? 36 : 21, hard);
    paper.forEach(function (item, n) {
      const where = `${hard ? 'exec' : 'clerical'} seed ${seed} q${n + 1} "${item.prompt}"`;
      const want = expectedNumerical(item);
      const got = item.options[item.answer];
      check(got === want, `${where}: marked "${got}", independent answer "${want}"`);
      const same = item.options.filter((o) => o === want).length;
      check(same === 1, `${where}: correct answer appears ${same} times`);
      const values = item.options.map(numberOf);
      check(new Set(values).size === 5, `${where}: options equal in value: ${item.options}`);
      seen.add(item.prompt.replace(/\d[\d,.]*/g, '#').replace(/(from|to) \w+ (to|\?)/, '$1 M $2'));
    });
  }
}

/* --------------------------------------------------------------- checking */

const SIZE_NAMES = { 60: 'Half', 100: 'Full', 150: 'Large', 180: 'Double' };

function validDate(text) {
  const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(text);
  if (!m) return false;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return mo >= 1 && mo <= 12 && d >= 1 && d <= dim;
}

let cleanRecords = 0;
let dirtyRecords = 0;
for (let seed = 1; seed <= SEEDS * 4; seed += 1) {
  const rng = new PAAT.Rng(seed);
  const item = PAAT.makeCheckItem(rng, 0.65, 3);
  const where = `checking seed ${seed}`;
  const differs = new Set();
  ['A', 'B', 'C'].forEach((c) => { if (item.left[c] !== item.right[c]) differs.add(c); });
  check(SIZE_NAMES[item.left.D] !== undefined, `${where}: left D ${item.left.D} not in key`);
  if (SIZE_NAMES[item.left.D] !== item.right.D) differs.add('D');
  check(Object.values(SIZE_NAMES).includes(item.right.D), `${where}: right D "${item.right.D}" not in key`);
  check([...differs].sort().join('') === [...item.errors].sort().join(''),
    `${where}: errors ${[...item.errors]} but panels differ in ${[...differs]}`);
  check(validDate(item.left.B), `${where}: left date ${item.left.B} is not a real date`);
  check(/^\d{4} [ABC]\d$/.test(item.left.A), `${where}: odd plot code ${item.left.A}`);
  if (item.errors.size) dirtyRecords += 1; else cleanRecords += 1;
}
check(cleanRecords > 0 && dirtyRecords > 0, 'checking produced only one kind of record');

/* ------------------------------------------------------------ categorising */

const lookup = (() => {
  const html = PAAT.tablesMarkup();
  const tables = html.split('<table').slice(1);
  const areas = {};
  rowsOf(tables[0]).forEach((r) => { areas[r[0]] = r[1]; });
  const prefixes = {};
  rowsOf(tables[1]).forEach((r) => { prefixes[r[1]] = r[0]; });
  const bands = [];
  rowsOf(tables[2]).forEach((r) => {
    const m = /^(\d{6})–(\d{6})$/.exec(r[1].replace('&ndash;', '–'));
    assert(m, `bad band "${r[1]}"`);
    bands.push({ prefix: r[0], lo: Number(m[1]), hi: Number(m[2]), cat: r[2] });
  });
  return { areas, prefixes, bands };
})();

/* Each prefix's bands must tile 1..999999 exactly, with no gap or overlap. */
['X', 'Y', 'Z'].forEach((prefix) => {
  const own = lookup.bands.filter((b) => b.prefix === prefix).sort((a, b) => a.lo - b.lo);
  check(own.length > 0, `no bands for ${prefix}`);
  check(own[0].lo === 1, `${prefix}: first band starts at ${own[0].lo}`);
  check(own[own.length - 1].hi === 999999, `${prefix}: last band ends at ${own[own.length - 1].hi}`);
  for (let i = 1; i < own.length; i += 1) {
    check(own[i].lo === own[i - 1].hi + 1, `${prefix}: gap or overlap between bands ${i - 1} and ${i}`);
  }
});

for (let seed = 1; seed <= SEEDS * 4; seed += 1) {
  const item = PAAT.makeCatItem(new PAAT.Rng(seed));
  const where = `categorising seed ${seed}`;
  const prefix = lookup.prefixes[item.supplier];
  check(prefix, `${where}: supplier "${item.supplier}" has no prefix`);
  const hits = lookup.bands.filter((b) => b.prefix === prefix && item.number >= b.lo && item.number <= b.hi);
  check(hits.length === 1, `${where}: ${hits.length} bands match ${prefix}${item.number}`);
  check(hits[0].cat === item.ref, `${where}: ref ${item.ref}, table says ${hits[0].cat}`);

  /* The invoice description must belong to the area marked correct, and to no other. */
  const owners = Object.keys(lookup.areas).filter((a) => PAAT.areaItems[a].includes(item.invoiceFor));
  check(owners.length === 1 && owners[0] === item.area,
    `${where}: "${item.invoiceFor}" belongs to ${owners}, marked ${item.area}`);
  check(validDate(item.when), `${where}: bad date ${item.when}`);
  check(/^€[\d,]+\.\d\d$/.test(item.amount), `${where}: bad amount ${item.amount}`);
}

/* -------------------------------------------------------------- job sim */

const scenarios = window.SCENARIOS;
check(scenarios.length > 0, 'no scenarios');
const scenarioIds = new Set();
scenarios.forEach((s) => {
  check(!scenarioIds.has(s.id), `duplicate scenario id ${s.id}`);
  scenarioIds.add(s.id);
  check(s.actions.length === 5, `${s.id}: ${s.actions.length} actions`);
  const marks = s.actions.map((a) => a.mark).sort();
  check(marks.join('') === '01234', `${s.id}: marks are ${marks}, expected one each of 0-4`);
  check(new Set(s.actions.map((a) => a.text)).size === 5, `${s.id}: duplicate action text`);
  check(s.title && s.text && s.why, `${s.id}: missing title, text or why`);
});
for (let seed = 1; seed <= 300; seed += 1) {
  PAAT.makeJobSimPaper(new PAAT.Rng(seed), 25).forEach((item) => {
    check(item.actions[item.bestIndex].mark === 4, `seed ${seed}: bestIndex not the 4-mark action`);
  });
}

console.log(`ok: ${checks} answer checks, ${SEEDS} seeds`);
