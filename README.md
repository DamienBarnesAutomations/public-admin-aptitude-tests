# Public Admin Aptitude Tests

Timed practice drills for the Irish civil service aptitude tests, at the timings
published in the `publicjobs.ie` self-assessment system.

Static site. No build step, no dependencies, no network calls, no tracking.
Open `index.html` and it works.

---

## What it drills

Two grades. The grade selector on the menu switches both the papers and the
timings.

### Clerical Officer

| Drill | Questions | Time | What it is |
|---|---|---|---|
| **Checking** | 46 | 8:00 | Two panels of the same register. Mark every column containing a transcription error, or claim the record is clean. |
| **Categorising** | 40 | 10:00 | Two lookups per question: invoice area, then purchase reference category. |
| **Numerical** | 21 | 20:00 | A block of figures, then questions derived from it. Five options, calculator allowed. |
| **Verbal** | 26 | 18:00 | A short passage, then statements to judge True, False or Cannot say. |
| **Job simulation** | 25 | 35:00 | Not part of the Clerical battery; offered here for extra practice. See the Executive table below. |

### Executive / Administrative

| Drill | Questions | Time | What it is |
|---|---|---|---|
| **Numerical** | 36 | 30:00 | The same shape as the clerical paper, but every item needs at least two operations: uplift then spend, salary then on-costs, capacity then backlog. |
| **Verbal** | 59 | 30:00 | Same format, tighter pace: 30 seconds a statement instead of 42. |
| **Job simulation** | 25 | 35:00 | A workplace scenario and five possible actions. You pick the one you would most likely take; the mark depends on how appropriate it is. |

The self-assessment system gives Executive and Administrative **identical**
numerical and verbal papers — same counts, same timings — so they are one tier
here rather than two. The job simulation is the one place the grades differ:
25 questions in 35 minutes at Executive level, 18 in 30 at Administrative. The
Executive paper is the one built here; use Half or Short for something closer to
the Administrative length.

## Install on a phone

Open the site in Chrome (Android) or Safari (iOS) and use *Add to Home screen* /
*Install app*. It runs full screen and works offline after the first visit. If
you change a cached file, bump `CACHE` in `sw.js`.

## How to use it

Keyboard only. No mouse needed.

- **Checking** — `A`–`D` toggle a column, `N` claims the record is clean, `Enter`
  submits, `Backspace` clears. Marking a column cancels the clean claim, and
  claiming clean clears any marked columns.
- **Categorising** — type the invoice area (`A`–`F`), then the reference category
  (`A`–`C`), then `Enter`.
- **Numerical** — `A`–`E` answers and submits.
- **Verbal** — `T`, `F` or `C` answers and submits.

The clock is absolute, not a tick counter, so a background tab cannot buy you
time. If the deadline passes before you submit, the run ends.

### Options

- **Grade** — Clerical Officer, or Executive / Administrative.
- **Length** — full (real timings), half, or a short set.
- **Seed** — leave blank for a fresh paper, or enter a number to reproduce one.
- **Show the answer after each question** — feedback mode. For verbal items it
  also shows the rationale, so you can check the key rather than trust it.

### Scoreboard

Every completed run is stored in `localStorage` in your browser. Nothing is
uploaded. Export gives you a CSV. Clearing is permanent.

### Readiness

The strip on the menu shows how close you are to the standard you set. The exam
date (default 10 November) and target score (default 80%) are editable on the
Readiness screen and stored in this browser.

A drill counts as ready when all three checks pass:

- **Hit the target** — a completed full paper at or above the target.
- **Repeat it** — the last two completed full papers at or above target − 5.
- **Recently practised** — any run in the last seven days.

"Completed" means you answered every question inside the clock. A timed-out
full paper still counts as practice but cannot set the benchmark, because
points divided by questions attempted flatters a paper you did not finish. Half
and short papers count as practice, never as benchmarks.

The percentage is checks met, not a score: twelve checks for Clerical (four
drills) and nine for Executive (three). The screen also shows the gap in
correct answers, how many full papers are still outstanding, and a pace to the
exam date. Job simulation is not required for Clerical.

The target is a training standard, not a PAS pass mark — PAS does not publish
one. Runs recorded before the Readiness screen existed still count: their length
is inferred from the question count.

## Scoring

**Checking** is scored per column, four points a question:

- Column marked when it is wrong, or left alone when it is right: one point.
- Partial detection scores. Finding two errors out of three is worth something.
- Claiming "no error" is an *assertion*, not an absence of one. Claim it on a
  dirty record and the question scores zero rather than collecting points for
  the columns you happened to leave alone.

**Categorising** is two points a question, one for the area and one for the
reference category. **Numerical and verbal** are one point a question. **Job
simulation** is four points a question, awarded by how appropriate your chosen
action is.

## The verbal bank

`passages.js` holds sixteen passages with sixty-four statements. Each statement
carries its key (`T`/`F`/`C`) and a one-line rationale, which is what feedback
mode shows you. The file is plain data: read it, argue with it, add to it.

This is the one part written rather than generated, and the key is editorial
judgement rather than an official answer sheet. A 59-item Executive paper uses
almost the whole bank, so that tier will feel repetitive before the clerical
one does.

## The job simulation key

`scenarios.js` holds twenty-eight scenarios, each with five ranked actions. The
marking is my judgement, not a published key — PAS scores the real items by
appropriateness and does not release the marks, and there is no official answer
sheet to work from.

To make the ranking defensible rather than arbitrary, every scenario uses the
same rubric:

| Mark | What it represents |
|---|---|
| 4 | Does the right thing, within your authority, and tells the right person. |
| 3 | Procedurally sound, but defers to someone else or stops short of fixing it. |
| 2 | Well intentioned, incomplete: treats the symptom, or acts without informing. |
| 1 | Avoids the issue, or applies a rule without addressing the situation. |
| 0 | Hides the problem, acts outside authority, or shifts blame. |

Every scenario has exactly one action at each mark, and the actions are shuffled
per paper. You score whatever the chosen action is worth, so picking the
second-best is worth 3 of 4 rather than nothing. Feedback mode shows the best
action and the reasoning.

If you disagree with a ranking, edit the file. It is plain data, and your
judgement of a workplace scenario is not obviously worse than mine.

## Deploying to GitHub Pages

This folder is self-contained, so it can be published as its own repository.
Do not point Pages at a repository that contains anything else of yours.

```bash
cd public-admin-aptitude-tests
git init && git add . && git commit -m "Add public admin aptitude drills"
git branch -M main
git remote add origin git@github.com:<you>/public-admin-aptitude-tests.git
git push -u origin main
```

Then **Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`**.
`.nojekyll` is already present so the folder is served as-is.

To use it locally, open `index.html`. `file://` works — there are no modules and
no fetch calls.

## The terminal version

`cli/aptitude_drills.py` covers the **clerical checking and categorising** drills
for a terminal. Python 3 stdlib only.

```bash
python cli/aptitude_drills.py checking
python cli/aptitude_drills.py categorising --feedback
python cli/aptitude_drills.py checking --peek --questions 5
python cli/aptitude_drills.py scoreboard
```

It writes `cli/drill_scoreboard.csv` (gitignored).

Everything else is **web-only, deliberately**. The verbal bank is editorial
content, and duplicating sixty-four statements into Python would mean maintaining
the keys in two places, which is how keys drift apart. Numerical would mean a
second implementation of the same arithmetic. The browser version is canonical.

## Limits, honestly

- **The question mix is an approximation.** The real distribution of clean versus
  dirty checking records is not published. This uses 65% dirty with up to three
  errors, inferred from the four worked examples in the official system.
- **The scoring models are training designs.** PAS does not publish how the
  checking test is marked.
- **Verbal keys are mine.** See above.
- **The job simulation marks are mine.** The rubric is stated and applied
  consistently, but it is a reconstruction, not PAS's scoring. Treat the
  rankings as a reasonable colleague's opinion, not as an answer key.
- **Numerical range is narrower than the real papers.** Eight block types —
  monthly volumes, unit costs, ticket revenue, hours and pay for the clerical
  tier; budget uplift, staffing with on-costs, case-processing capacity and
  quantity discounts for the executive tier. The operations repeat; a real paper
  ranges wider.
- **"Executive" numerical difficulty is my reconstruction.** The real paper is
  harder than the clerical one; multi-step items are a reasonable proxy, not a
  measurement.
- The competition booklet governs the real test. Counts and time limits are set
  per campaign and can differ from the self-assessment versions.

---

Independent practice tool. Not affiliated with the Public Appointments Service
or `publicjobs.ie`.
