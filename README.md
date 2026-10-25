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

### Executive / Administrative

| Drill | Questions | Time | What it is |
|---|---|---|---|
| **Numerical** | 36 | 30:00 | The same shape as the clerical paper, but every item needs at least two operations: uplift then spend, salary then on-costs, capacity then backlog. |
| **Verbal** | 59 | 30:00 | Same format, tighter pace: 30 seconds a statement instead of 42. |

The self-assessment system gives Executive and Administrative **identical**
numerical and verbal papers — same counts, same timings — so they are one tier
here rather than two. The only thing that differs between the grades is the job
simulation, which is not built (see below).

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

## Scoring

**Checking** is scored per column, four points a question:

- Column marked when it is wrong, or left alone when it is right: one point.
- Partial detection scores. Finding two errors out of three is worth something.
- Claiming "no error" is an *assertion*, not an absence of one. Claim it on a
  dirty record and the question scores zero rather than collecting points for
  the columns you happened to leave alone.

**Categorising** is two points a question, one for the area and one for the
reference category. **Numerical and verbal** are one point a question.

## The verbal bank

`passages.js` holds sixteen passages with sixty-four statements. Each statement
carries its key (`T`/`F`/`C`) and a one-line rationale, which is what feedback
mode shows you. The file is plain data: read it, argue with it, add to it.

This is the one part written rather than generated, and the key is editorial
judgement rather than an official answer sheet. A 59-item Executive paper uses
almost the whole bank, so that tier will feel repetitive before the clerical
one does.

## What is not built

The **job simulation**, which is the third test at Executive and Administrative
level (25 questions / 35 minutes, and 18 / 30, respectively). It is not here
because the mark scheme would be invented: each scenario offers five actions and
the real test scores them by appropriateness, and there is no published key to
work from. Training against a made-up key is worse than not training.

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
