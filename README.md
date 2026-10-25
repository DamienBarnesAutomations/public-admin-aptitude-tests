# Public Admin Aptitude Tests

Timed practice drills for the Irish civil service **Clerical Officer** aptitude
tests. Two tests, reconstructed from the formats published in the
`publicjobs.ie` self-assessment system.

Static site. No build step, no dependencies, no network calls, no tracking.
Open `index.html` and it works.

---

## What it drills

| Drill | Questions | Time | What it is |
|---|---|---|---|
| **Checking** | 46 | 8:00 | Two panels of the same register. Mark every column containing a transcription error, or claim the record is clean. ~10 seconds a question. |
| **Categorising** | 40 | 10:00 | Two lookups per question: invoice area, then purchase reference category. ~7.5 seconds per answer. |

These are the two components of the real battery that commercial practice banks
handle badly or not at all — the reasoning sections are well served elsewhere.

## How to use it

Keyboard only, no mouse needed.

**Checking** — `A` `B` `C` `D` toggle a column, `N` claims the record is clean,
`Enter` submits, `Backspace` clears. Selected columns and "no error" are mutually
exclusive: marking a column cancels the clean claim, and vice versa.

**Categorising** — type the invoice area letter (`A`–`F`), then the reference
category letter (`A`–`C`), then `Enter`. `Backspace` undoes the last letter.

The clock is absolute, not a tick counter, so a background tab cannot buy you
time. If the deadline passes before you submit, the run ends.

### Options

- **Length** — full (real timings), half, or a 10-question short set.
- **Seed** — leave blank for a fresh paper, or enter a number to reproduce one.
  The seed is shown on the results screen and saved with every run.
- **Show the answer after each question** — feedback mode. Slower, and useful
  when you are learning the format rather than training pace.

### Scoreboard

Every completed run is stored in `localStorage` in your browser. Nothing is
uploaded. Export gives you a CSV. Clearing is permanent.

Seeds are reproducible **within this app**. The terminal version generates a
different paper from the same seed — the two use different PRNGs.

## Scoring

**Checking** is scored per column, four points a question:

- Column marked when it is wrong, or left alone when it is right: one point.
- Partial detection scores. Finding two errors out of three is worth something.
- Claiming "no error" is an *assertion*, not an absence of one. Claim it on a
  dirty record and the question scores zero rather than collecting points for
  the columns you happened to leave alone.

**Categorising** is two points a question, one for the area and one for the
reference category.

## Deploying to GitHub Pages

This folder is self-contained. Publish it as its own repository — do not point
Pages at a repository that contains anything else of yours.

```bash
cd public-admin-aptitude-tests
git init
git add .
git commit -m "Add public admin aptitude drills"
git branch -M main
git remote add origin git@github.com:<you>/public-admin-aptitude-tests.git
git push -u origin main
```

Then in the repository: **Settings → Pages → Build and deployment → Source:
Deploy from a branch → Branch: `main`, folder: `/ (root)`**. Save.

The site appears at `https://<you>.github.io/public-admin-aptitude-tests/`
within a minute or two. `.nojekyll` is already present so the folder is served
as-is.

To use it locally, just open `index.html` in a browser. `file://` works — there
are no modules and no fetch calls.

## The terminal version

`cli/aptitude_drills.py` is the same two drills for a terminal, Python 3 stdlib
only.

```bash
python cli/aptitude_drills.py checking
python cli/aptitude_drills.py categorising --feedback
python cli/aptitude_drills.py checking --peek --questions 5
python cli/aptitude_drills.py scoreboard
```

It writes `cli/drill_scoreboard.csv` (gitignored). Useful when you want a
distraction-free full-screen run; otherwise the browser version is the primary.

## Limits, honestly

- **The question mix is an approximation.** The real distribution of clean
  versus dirty records is not published. This uses 65% dirty with up to three
  errors, inferred from the four worked examples in the official system.
- **The scoring model is a training design, not PAS's marking scheme.** PAS does
  not publish how the checking test is scored.
- **Item content is synthetic.** The constructs match; the specific wording and
  difficulty are reconstructions.
- The competition booklet governs the real test. Question counts and time limits
  are set per campaign and can differ from the self-assessment versions.

---

Independent practice tool. Not affiliated with the Public Appointments Service
or `publicjobs.ie`.
