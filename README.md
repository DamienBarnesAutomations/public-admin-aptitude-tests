# Public Admin Aptitude Tests

Timed practice drills for the Irish civil service **Clerical Officer** aptitude
tests. All four components, at the timings published in the `publicjobs.ie`
self-assessment system.

Static site. No build step, no dependencies, no network calls, no tracking.
Open `index.html` and it works.

---

## What it drills

| Drill | Questions | Time | What it is |
|---|---|---|---|
| **Checking** | 46 | 8:00 | Two panels of the same register. Mark every column containing a transcription error, or claim the record is clean. ~10 seconds a question. |
| **Categorising** | 40 | 10:00 | Two lookups per question: invoice area, then purchase reference category. ~7.5 seconds per answer. |
| **Numerical** | 21 | 20:00 | A block of figures at the top of the page, then questions derived from it. Five options, calculator allowed. |
| **Verbal** | 26 | 18:00 | A short passage, then statements to judge True, False or Cannot say. Answer only from the passage. |

## How to use it

Keyboard only. No mouse needed.

- **Checking** — `A`–`D` toggle a column, `N` claims the record is clean, `Enter`
  submits, `Backspace` clears. Marking a column cancels the clean claim, and
  claiming clean clears any marked columns.
- **Categorising** — type the invoice area (`A`–`F`), then the reference category
  (`A`–`C`), then `Enter`. `Backspace` undoes the last letter.
- **Numerical** — `A`–`E` answers and submits.
- **Verbal** — `T`, `F` or `C` answers and submits.

The clock is absolute, not a tick counter, so a background tab cannot buy you
time. If the deadline passes before you submit, the run ends.

### Options

- **Length** — full (real timings), half, or a short 10-question set.
- **Seed** — leave blank for a fresh paper, or enter a number to reproduce one.
  The seed is shown on the results screen and saved with every run.
- **Show the answer after each question** — feedback mode. For verbal items it
  also shows the rationale, so you can check the key rather than trust it.

### Scoreboard

Every completed run is stored in `localStorage` in your browser. Nothing is
uploaded. Export gives you a CSV. Clearing is permanent.

Seeds are reproducible **within this app**. The terminal version generates a
different paper from the same seed — the two use different generators.

## Scoring

**Checking** is scored per column, four points a question:

- Column marked when it is wrong, or left alone when it is right: one point.
- Partial detection scores. Finding two errors out of three is worth something.
- Claiming "no error" is an *assertion*, not an absence of one. Claim it on a
  dirty record and the question scores zero rather than collecting points for
  the columns you happened to leave alone.

**Categorising** is two points a question, one for the area and one for the
reference category.

**Numerical and verbal** are one point a question.

## The verbal bank

`passages.js` holds ten passages with forty statements. Each statement carries
the key (`T`/`F`/`C`) and a one-line rationale, which is what feedback mode
shows you. The file is plain data: read it, argue with it, add to it. Every
statement is answerable from its own passage alone.

This is the one part of the tool that is written rather than generated, and the
key is editorial judgement rather than an official answer sheet. Treat it as
practice material, not as a source of truth about PAS marking.

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

`cli/aptitude_drills.py` covers the **checking and categorising** drills for a
terminal. Python 3 stdlib only.

```bash
python cli/aptitude_drills.py checking
python cli/aptitude_drills.py categorising --feedback
python cli/aptitude_drills.py checking --peek --questions 5
python cli/aptitude_drills.py scoreboard
```

It writes `cli/drill_scoreboard.csv` (gitignored).

Verbal and numerical are **web-only, deliberately**. The verbal bank is
editorial content and duplicating it into Python would mean maintaining forty
statements in two places, which is how keys drift apart. Numerical would mean a
second implementation of the same arithmetic. The browser version is the
canonical one.

## Limits, honestly

- **The question mix is an approximation.** The real distribution of clean versus
  dirty checking records is not published. This uses 65% dirty with up to three
  errors, inferred from the four worked examples in the official system.
- **The scoring models are training designs.** PAS does not publish how the
  checking test is marked. Per-column scoring with the clean-claim rule is my
  reconstruction.
- **Verbal keys are mine.** See above.
- **Numerical difficulty is narrower than the real test.** Four block types —
  monthly volumes, unit costs, ticket revenue, hours and pay — covering the
  operations that recur: percentage change, totals, averages, unit cost,
  discounts, revenue splits, overtime. Real papers range wider.
- **Item content is synthetic.** The constructs match; the specific wording is a
  reconstruction.
- The competition booklet governs the real test. Question counts and time limits
  are set per campaign and can differ from the self-assessment versions.

---

Independent practice tool. Not affiliated with the Public Appointments Service
or `publicjobs.ie`.
