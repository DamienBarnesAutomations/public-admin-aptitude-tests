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

/* ---- readiness ---------------------------------------------------------- */

const GOAL = { tier: 'clerical', target: 80, examDate: '2026-11-10', today: '2026-10-26' };

function makeRun(overrides) {
  return Object.assign({
    when: '2026-10-26T10:00:00',
    drill: 'numerical',
    tier: 'clerical',
    offered: 21,
    attempted: 21,
    points: 21,
    max: 21,
    perfect: 21,
    seconds: 900,
    seed: 1,
    length: 'full',
    outcome: 'done',
  }, overrides);
}

function drillOf(report, name) {
  return report.drills.find((entry) => entry.drill === name);
}

const empty = PAAT.computeReadiness([], GOAL);
check(empty.drills.length === 4, 'clerical readiness covers four drills');
check(empty.total === 12, `clerical readiness has ${empty.total} checks`);
check(empty.metCount === 0 && empty.pct === 0 && !empty.ready, 'empty history is not ready');
check(empty.neededPapers === 8, `empty history needs 8 full papers, not ${empty.neededPapers}`);
check(empty.daysLeft === 15, `countdown is ${empty.daysLeft} days, expected 15`);

/* Two clean full papers at target make one drill ready, and nothing else. */
const oneDrill = PAAT.computeReadiness([
  makeRun({ when: '2026-10-25T10:00:00', points: 18 }),
  makeRun({ when: '2026-10-24T10:00:00', points: 17 }),
], GOAL);
check(drillOf(oneDrill, 'numerical').benchmarkMet, 'a paper at target meets the benchmark');
check(drillOf(oneDrill, 'numerical').consistencyMet, 'two recent papers at target are consistent');
check(drillOf(oneDrill, 'numerical').recentMet, 'a run yesterday is recent');
check(drillOf(oneDrill, 'numerical').checksMet === 3, 'a fully met drill has 3 of 3 checks');
check(drillOf(oneDrill, 'verbal').checksMet === 0, 'an untouched drill has 0 of 3 checks');
check(!oneDrill.ready, 'one drill ready does not make the whole grade ready');
check(oneDrill.metCount === 3, `one drill met ${oneDrill.metCount} checks, expected 3`);

/* A timed-out paper counts as practice but never as a benchmark. */
const timedOut = PAAT.computeReadiness([
  makeRun({ when: '2026-10-25T10:00:00', points: 21, max: 21, outcome: 'time', attempted: 12 }),
], GOAL);
check(drillOf(timedOut, 'numerical').fullRuns === 1, 'a timed-out full paper is recorded');
check(drillOf(timedOut, 'numerical').completed === 0, 'a timed-out full paper is not completed');
check(drillOf(timedOut, 'numerical').bestPct === null, 'a timed-out paper cannot set a best score');
check(!drillOf(timedOut, 'numerical').benchmarkMet, 'a timed-out paper cannot meet the benchmark');
check(drillOf(timedOut, 'numerical').recentMet, 'a timed-out paper still counts as recent practice');

/* Short and half papers are practice, not benchmarks. */
const shortRuns = PAAT.computeReadiness([
  makeRun({ length: 'short', offered: 6 }),
  makeRun({ length: 'half', offered: 11 }),
], GOAL);
check(drillOf(shortRuns, 'numerical').fullRuns === 0, 'short and half papers are not full papers');
check(drillOf(shortRuns, 'numerical').recentMet, 'a short paper still counts as practice');

/* Old runs without a length field are matched by question count. */
const legacyFull = makeRun({ offered: 21 });
delete legacyFull.length;
const legacyHalf = makeRun({ offered: 11 });
delete legacyHalf.length;
check(PAAT.isFullRun(legacyFull), 'legacy run with the full question count counts as full');
check(!PAAT.isFullRun(legacyHalf), 'legacy run with the half question count does not');
check(PAAT.isFullRun(makeRun({ length: 'full' })), 'explicit full length counts as full');

/* Consistency is judged on the two most recent completed papers, not array order. */
const dipped = PAAT.computeReadiness([
  makeRun({ when: '2026-10-24T10:00:00', points: 21 }),
  makeRun({ when: '2026-10-26T10:00:00', points: 17 }),
  makeRun({ when: '2026-10-25T10:00:00', points: 15 }),
], GOAL);
check(drillOf(dipped, 'numerical').benchmarkMet, 'best paper still meets the benchmark');
check(!drillOf(dipped, 'numerical').consistencyMet, 'a dip below the floor breaks consistency');
check(drillOf(dipped, 'numerical').completed === 3, 'every completed paper counts');

/* A gap is reported as the number of right answers still needed. */
const gap = PAAT.computeReadiness([makeRun({ points: 15 })], GOAL);
check(Math.round(drillOf(gap, 'numerical').bestPct) === 71, 'best score is 71%');
check(drillOf(gap, 'numerical').gapQuestions === 2,
  `gap is ${drillOf(gap, 'numerical').gapQuestions} answers, expected 2`);

/* Recency: a run eight days old is stale. */
const stale = PAAT.computeReadiness([
  makeRun({ when: '2026-10-18T10:00:00' }),
], GOAL);
check(!drillOf(stale, 'numerical').recentMet, 'a run eight days ago is not recent');
check(drillOf(stale, 'numerical').daysSince === 8,
  `daysSince is ${drillOf(stale, 'numerical').daysSince}, expected 8`);

/* Grade is part of the match. */
const executiveRuns = PAAT.computeReadiness([
  makeRun({ tier: 'executive', drill: 'numerical', offered: 36 }),
], GOAL);
check(drillOf(executiveRuns, 'numerical').fullRuns === 0, 'executive runs do not count for clerical');
const exec = PAAT.computeReadiness([], Object.assign({}, GOAL, { tier: 'executive' }));
check(exec.drills.length === 3 && exec.total === 9, 'executive readiness covers three drills');
check(exec.drills.some((entry) => entry.drill === 'jobsim'), 'job sim is required at executive level');
check(!empty.drills.some((entry) => entry.drill === 'jobsim'), 'job sim is not required at clerical level');

/* Every check met means ready, but not once the exam date has passed. */
function readyRuns(tier) {
  const drills = ['checking', 'categorising', 'numerical', 'verbal'];
  return drills.map((drill) => makeRun({
    when: '2026-10-25T10:00:00', drill, tier, points: 90, max: 100, length: 'full', offered: 999,
  })).concat(drills.map((drill) => makeRun({
    when: '2026-10-24T10:00:00', drill, tier, points: 85, max: 100, length: 'full', offered: 999,
  })));
}
const ready = PAAT.computeReadiness(readyRuns('clerical'), GOAL);
check(ready.ready, 'all checks met means ready');
check(ready.pct === 100 && ready.metCount === 12, `ready is ${ready.metCount}/${ready.total} checks`);
check(ready.neededPapers === 0, 'ready needs no more papers');
check(!PAAT.computeReadiness(readyRuns('clerical'), Object.assign({}, GOAL, { today: '2026-11-11' })).ready,
  'a passed exam date cannot be ready');
check(!PAAT.computeReadiness(readyRuns('clerical'), Object.assign({}, GOAL, { target: 95 })).ready,
  'a higher target is not met by a 90% best');

/* Targets clamp to a sane range, and impossible dates are rejected. */
check(PAAT.computeReadiness([], Object.assign({}, GOAL, { target: 200 })).target === 100,
  'target clamps at 100');
check(PAAT.computeReadiness([], Object.assign({}, GOAL, { target: 10 })).target === 50,
  'target clamps at 50');
check(PAAT.computeReadiness([], {
  tier: 'clerical', examDate: '2026-11-10', today: '2026-10-26',
}).target === 80, 'a missing target falls back to 80');
check(PAAT.parseDay('2026-02-30') === null, 'impossible dates are rejected');
check(PAAT.parseDay('2026-11-10') instanceof Date, 'valid dates parse');

/* Runs are stamped in UTC: "last practised" must follow the viewer's local day. */
const previousTz = process.env.TZ;
process.env.TZ = 'Pacific/Auckland'; /* UTC+13 in October */
const lateRun = PAAT.computeReadiness([
  makeRun({ when: '2026-10-24T22:30:00' }),
], { tier: 'clerical', target: 80, examDate: '2026-11-10', today: '2026-10-25' });
check(drillOf(lateRun, 'numerical').lastPractised === '2026-10-25',
  `UTC 22:30 on the 24th is the 25th in Auckland, got ${drillOf(lateRun, 'numerical').lastPractised}`);
check(drillOf(lateRun, 'numerical').daysSince === 0, 'a run today (local) is zero days ago');
if (previousTz === undefined) delete process.env.TZ; else process.env.TZ = previousTz;

console.log(`ok:${checks} checks, ${SEEDS} seeds`);
