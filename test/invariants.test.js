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
for (const file of ['passages.js', 'scenarios.js', 'app.js']) {
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

/* ---- executive tier ----------------------------------------------------- */

const execPrompts = {};
for (let seed = 1; seed <= SEEDS; seed += 1) {
  const paper = PAAT.makeNumericalPaper(new PAAT.Rng(seed), 36, true);
  check(paper.length === 36, `seed ${seed}: executive paper has ${paper.length} questions`);
  paper.forEach(function (item, number) {
    const where = `exec seed ${seed} q${number + 1} "${item.prompt}"`;
    check(item.options.length === 5 && new Set(item.options).size === 5, `${where}: options ${item.options}`);
    check(item.answer >= 0 && item.answer < 5, `${where}: answer index`);
    item.options.forEach(function (option) {
      check(!/NaN|undefined|Infinity|-/.test(option), `${where}: bad option "${option}"`);
    });
    execPrompts[item.prompt] = (execPrompts[item.prompt] || 0) + 1;
  });
}
check(Object.keys(execPrompts).length === 12, `expected 12 executive question types, saw ${Object.keys(execPrompts).length}`);
for (let seed = 1; seed <= SEEDS; seed += 1) {
  check(PAAT.makeVerbalPaper(new PAAT.Rng(seed), 59).length === 59, `seed ${seed}: executive verbal paper`);
}

/* ---- job simulation ----------------------------------------------------- */

const scenarios = window.SCENARIOS;
check(scenarios && scenarios.length > 0, 'no scenarios');
const scenarioIds = new Set();
scenarios.forEach(function (scenario) {
  check(!scenarioIds.has(scenario.id), `duplicate scenario id ${scenario.id}`);
  scenarioIds.add(scenario.id);
  check(scenario.title && scenario.text && scenario.why, `${scenario.id}: field missing`);
  check(scenario.actions.length === 5, `${scenario.id}: ${scenario.actions.length} actions`);
  const marks = scenario.actions.map((action) => action.mark).sort().join('');
  check(marks === '01234', `${scenario.id}: marks ${marks} are not 0-4 once each`);
});
/* The best action must not be identifiable by length alone. */
const bestIsLongest = scenarios.filter(function (scenario) {
  const lengths = scenario.actions.map((action) => action.text.length);
  const best = scenario.actions.find((action) => action.mark === 4);
  return best.text.length === Math.max.apply(null, lengths);
}).length;
check(bestIsLongest / scenarios.length <= 0.4,
  `best action is the longest in ${bestIsLongest}/${scenarios.length} scenarios`);
for (let seed = 1; seed <= SEEDS; seed += 1) {
  const paper = PAAT.makeJobSimPaper(new PAAT.Rng(seed), 25);
  check(paper.length === 25, `seed ${seed}: job sim paper has ${paper.length} questions`);
  paper.forEach(function (item) {
    check(item.actions[item.bestIndex].mark === 4, `seed ${seed}: bestIndex is not the 4-mark action`);
  });
}

/* ---- checking / categorising ------------------------------------------- */

for (let seed = 1; seed <= 200; seed += 1) {
  const rng = new PAAT.Rng(seed);
  check(PAAT.makeCheckItem(rng, 0.65, 3), `seed ${seed}: check item`);
  check(PAAT.makeCatItem(rng), `seed ${seed}: categorising item`);
}

console.log(`ok: ${checks} checks, ${SEEDS} seeds`);
