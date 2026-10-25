/* Generator and data invariants. Run: node test/invariants.test.js
 *
 * Loads passages.js and app.js into a vm with a stubbed DOM, then drives the
 * ?debug test seam (window.PAAT) over many seeds. No dependencies. */
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
for (const file of ['passages.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}

const PAAT = window.PAAT;
assert(PAAT, 'window.PAAT test seam missing (needs ?debug)');

let checks = 0;
function check(condition, message) {
  checks += 1;
  assert(condition, message);
}

/* ---- numerical ---------------------------------------------------------- */

const positions = [0, 0, 0, 0, 0];
const prompts = {};
for (let seed = 1; seed <= SEEDS; seed += 1) {
  const paper = PAAT.makeNumericalPaper(new PAAT.Rng(seed), 21);
  check(paper.length === 21, `seed ${seed}: numerical paper has ${paper.length} questions`);
  paper.forEach(function (item, number) {
    const where = `seed ${seed} q${number + 1} "${item.prompt}"`;
    check(item.options.length === 5, `${where}: ${item.options.length} options`);
    check(new Set(item.options).size === 5, `${where}: duplicate options ${item.options}`);
    check(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 5, `${where}: answer index`);
    item.options.forEach(function (option) {
      check(!/NaN|undefined|Infinity/.test(option), `${where}: bad option "${option}"`);
      check(!/€-/.test(option), `${where}: malformed negative euro "${option}"`);
    });
    if (/exceed/.test(item.prompt)) {
      check(!item.options[item.answer].startsWith('-'), `${where}: "exceed" answer is negative`);
    }
    positions[item.answer] += 1;
    prompts[item.prompt.replace(/\d[\d,.]*/g, '#')] = true;
  });
}
const total = positions.reduce((a, b) => a + b, 0);
positions.forEach(function (count, index) {
  const share = count / total;
  check(share > 0.17 && share < 0.23, `answer position ${'ABCDE'[index]} is ${(share * 100).toFixed(1)}%`);
});

/* The Tickets block must actually turn up (it was once filtered out entirely). */
check(Object.keys(prompts).some((p) => /ticket sales/.test(p)), 'Tickets block never served');

/* ---- verbal ------------------------------------------------------------- */

const passages = window.PASSAGES;
check(passages.length > 0, 'no passages');
const ids = new Set();
const statements = new Set();
passages.forEach(function (passage) {
  check(!ids.has(passage.id), `duplicate passage id ${passage.id}`);
  ids.add(passage.id);
  check(passage.title && passage.text && passage.items.length > 0, `passage ${passage.id} incomplete`);
  passage.items.forEach(function (item) {
    check(['T', 'F', 'C'].includes(item.key), `${passage.id}: bad key ${item.key}`);
    check(item.statement && item.why, `${passage.id}: statement or why missing`);
    check(!statements.has(item.statement), `duplicate statement: ${item.statement}`);
    statements.add(item.statement);
  });
});
for (let seed = 1; seed <= SEEDS; seed += 1) {
  const paper = PAAT.makeVerbalPaper(new PAAT.Rng(seed), 26);
  check(paper.length === 26, `seed ${seed}: verbal paper has ${paper.length} questions`);
}

/* ---- checking / categorising ------------------------------------------- */

for (let seed = 1; seed <= 200; seed += 1) {
  const rng = new PAAT.Rng(seed);
  check(PAAT.makeCheckItem(rng, 0.65, 3), `seed ${seed}: check item`);
  check(PAAT.makeCatItem(rng), `seed ${seed}: categorising item`);
}

console.log(`ok: ${checks} checks, ${SEEDS} seeds`);
