"""Timed practice drills for the Irish civil service (PAS) aptitude tests.

Replicates the two Clerical Officer tests that commercial banks do not cover
properly. Both are pace-and-accuracy skills: marks are lost to time pressure
and to breaking a fixed scan order, not to difficulty.

    python aptitude_drills.py checking
    python aptitude_drills.py checking --peek --questions 5
    python aptitude_drills.py categorising --feedback
    python aptitude_drills.py scoreboard

Real timings, from the publicjobs self-assessment system:
    Checking       46 questions /  8 minutes
    Categorising   40 questions / 10 minutes, two answers each

Stdlib only, terminal only, ASCII only. No state beyond the scoreboard CSV.
"""

from __future__ import annotations

import argparse
import csv
import queue
import random
import re
import sys
import threading
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

SCOREBOARD = Path(__file__).with_name("drill_scoreboard.csv")

# --------------------------------------------------------------------------
# Checking test
# --------------------------------------------------------------------------

# From the real battery: left panel shows the measurement, right panel shows
# the description. The description column is the one that needs decoding.
PLOT_SIZES = ((60, "Half"), (100, "Full"), (150, "Large"), (180, "Double"))
PLOT_DESC = dict(PLOT_SIZES)

FIRST_NAMES = (
    "Sue", "Mary", "John", "Priya", "Tomasz", "Aisling", "Declan", "Niamh",
    "Kwame", "Elena", "Cormac", "Fiona", "Rahul", "Bridget", "Sean", "Marta",
)
LAST_NAMES = (
    "Ripley", "Gill", "Shindi", "O'Brien", "Nowak", "Kelly", "Doyle", "Byrne",
    "Walsh", "Ryan", "Murphy", "Khan", "Novak", "Fitzgerald",
)
STREETS = (
    "Mill St", "Till Rd", "Head Fen Rd", "Station Rd", "Church St",
    "Abbey Lane", "Green Park", "Harbour Rd", "Hill View", "Chapel St",
)
TOWNS = (
    "Dublin 2", "Dublin 3", "Bray", "Athlone", "Mullingar", "Longford",
    "Tullamore", "Navan", "Drogheda", "Naas",
)


@dataclass
class CheckItem:
    left: dict
    right: dict
    errors: frozenset

    def left_cell(self, column):
        value = self.left[column]
        return f"{value} sq. ms." if column == "D" else value

    def right_cell(self, column):
        return str(self.right[column])


def _random_record(rng):
    house = rng.randint(1, 240)
    contact = (
        f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}, "
        f"{house} {rng.choice(STREETS)}, {rng.choice(TOWNS)}"
    )
    start = date(1995, 1, 1) + timedelta(days=rng.randrange(365 * 21))
    return {
        "A": f"{rng.randint(1000, 9999)} {rng.choice('ABC')}{rng.randint(1, 9)}",
        "B": start.strftime("%d/%m/%Y"),
        "C": contact,
        "D": rng.choice(PLOT_SIZES)[0],
    }


def _swap_adjacent(text, rng):
    spots = [i for i in range(len(text) - 1) if text[i] != text[i + 1]]
    if not spots:
        return None
    i = rng.choice(spots)
    return text[:i] + text[i + 1] + text[i] + text[i + 2:]


def _change_digit(text, rng):
    spots = [i for i, ch in enumerate(text) if ch.isdigit()]
    if not spots:
        return None
    i = rng.choice(spots)
    replacement = rng.choice([d for d in "0123456789" if d != text[i]])
    return text[:i] + replacement + text[i + 1:]


def _drop_char(text, rng):
    if len(text) < 4:
        return None
    i = rng.randrange(len(text))
    return text[:i] + text[i + 1:]


def _swap_day_month(text, rng):
    try:
        day, month, year = text.split("/")
        swapped = date(int(year), int(day), int(month)).strftime("%d/%m/%Y")
    except ValueError:
        return None
    return swapped if swapped != text else None


def _mutate(column, value, rng):
    """Return a different string for the right-hand panel."""
    if column == "B":
        swapped = _swap_day_month(value, rng)
        if swapped:
            return swapped
    candidates = [fn(value, rng) for fn in (_change_digit, _swap_adjacent, _drop_char)]
    candidates = [c for c in candidates if c and c != value]
    if not candidates:
        raise RuntimeError(f"could not mutate {column} value {value!r}")
    return rng.choice(candidates)


def make_check_item(rng, error_rate, max_errors):
    left = _random_record(rng)
    right = {"A": left["A"], "B": left["B"], "C": left["C"]}
    right["D"] = PLOT_DESC[left["D"]]

    count = 0 if rng.random() >= error_rate else rng.randint(1, max_errors)
    errors = set(rng.sample(["A", "B", "C", "D"], count))

    for column in ("A", "B", "C"):
        if column in errors:
            right[column] = _mutate(column, left[column], rng)

    if "D" in errors:
        correct_desc = PLOT_DESC[left["D"]]
        right["D"] = rng.choice([d for n, d in PLOT_SIZES if d != correct_desc])

    return CheckItem(left=left, right=right, errors=frozenset(errors))


def render_check(item, index, total, remaining):
    stamp = "" if remaining is None else f"    time left {fmt_clock(remaining)}"
    lines = [
        "",
        f"Q {index}/{total}{stamp}",
        "",
        f"   {'':13}{'LEFT':<48}RIGHT",
    ]
    labels = (("A", "Plot code"), ("B", "Start date"), ("C", "Contact"), ("D", "Plot size"))
    for column, label in labels:
        left = item.left_cell(column)[:46]
        right = item.right_cell(column)[:46]
        lines.append(f" {column} {label:<13}{left:<48}{right}")
    lines.append("")
    lines.append("   Plot size key: " + "  ".join(f"{n}= {d}" for n, d in PLOT_SIZES))
    lines.append("")
    lines.append("   Columns with an error (e.g. 'B C'), or 'N' for no error:")
    return "\n".join(lines)


def parse_check(raw):
    tokens = re.findall(r"[A-DN]", raw.upper())
    if not tokens:
        return None
    if "N" in tokens:
        return (frozenset(), True) if len(tokens) == 1 else None
    return frozenset(tokens), False


# --------------------------------------------------------------------------
# Categorising test
# --------------------------------------------------------------------------

AREAS = {
    "A": ("Travel & Subsistence", ("Taxi fares", "Hotel accommodation", "Flight booking", "Mileage claim")),
    "B": ("Stationery & Office", ("Printer toner", "A4 paper", "Envelopes", "Filing folders")),
    "C": ("Utilities", ("Electricity supply", "Water charges", "Gas supply", "Waste collection")),
    "D": ("Food & Drink", ("Refreshments", "Canteen supplies", "Tea and coffee", "Catering")),
    "E": ("IT & Equipment", ("Laptop", "Monitor", "Software licence", "Network switch")),
    "F": ("Maintenance & Repairs", ("Boiler repair", "Window replacement", "Flooring", "Alarm servicing")),
}

SUPPLIERS = {"Internal": "X", "External": "Y", "Grant-funded": "Z"}

# Deliberately overlapping boundaries: using the wrong prefix flips the answer.
RANGES = {
    "X": ((1, 145401, "A"), (145402, 229667, "B"), (229668, 999999, "C")),
    "Y": ((1, 99999, "B"), (100000, 189999, "C"), (190000, 999999, "A")),
    "Z": ((1, 120000, "C"), (120001, 210000, "A"), (210001, 999999, "B")),
}


@dataclass
class CatItem:
    invoice_for: str
    supplier: str
    number: int
    amount: str
    when: str
    area: str
    ref: str


def ref_category(prefix, number):
    for low, high, category in RANGES[prefix]:
        if low <= number <= high:
            return category
    raise ValueError(f"{number} outside every range for prefix {prefix}")


def make_cat_item(rng):
    area = rng.choice(sorted(AREAS))
    supplier = rng.choice(sorted(SUPPLIERS))
    prefix = SUPPLIERS[supplier]

    low, high, _ = rng.choice(RANGES[prefix])
    if high - low > 4000 and rng.random() < 0.35:
        edge = rng.choice((low, high))
        number = min(999999, max(1, edge + rng.randint(-1500, 1500)))
    else:
        number = rng.randint(low, high)

    when = date(2025, 1, 1) + timedelta(days=rng.randrange(640))
    return CatItem(
        invoice_for=rng.choice(AREAS[area][1]),
        supplier=supplier,
        number=number,
        amount=f"EUR {rng.uniform(40, 4800):,.2f}",
        when=when.strftime("%d/%m/%Y"),
        area=area,
        ref=ref_category(prefix, number),
    )


def tables_text():
    lines = ["", "   INVOICE AREAS", "   " + "-" * 62]
    for key in sorted(AREAS):
        lines.append(f"   {key}  {AREAS[key][0]}")
    lines.append("")
    lines.append("   SUPPLIER TYPE -> REFERENCE PREFIX")
    lines.append("   " + "-" * 62)
    for supplier in sorted(SUPPLIERS):
        lines.append(f"   {supplier:<16}{SUPPLIERS[supplier]}")
    lines.append("")
    lines.append("   PURCHASE REFERENCE CATEGORIES")
    lines.append("   " + "-" * 62)
    for prefix in ("X", "Y", "Z"):
        for low, high, category in RANGES[prefix]:
            lines.append(f"   {prefix} {low:06d}-{high:06d}  ->  {category}")
    lines.append("")
    lines.append("   Answer with two letters: invoice area (A-F) then reference category (A-C).")
    return "\n".join(lines)


def render_cat(item, index, total, remaining):
    stamp = "" if remaining is None else f"    time left {fmt_clock(remaining)}"
    return "\n".join([
        "",
        f"Q {index}/{total}{stamp}",
        "",
        f"   Invoice for     : {item.invoice_for}",
        f"   Supplier type   : {item.supplier}",
        f"   Purchase number : {item.number:06d}",
        f"   Amount          : {item.amount}",
        f"   Date            : {item.when}",
        "",
        "   Area + reference category (e.g. 'D C'):",
    ])


def parse_cat(raw):
    letters = re.findall(r"[A-Z]", raw.upper())
    if len(letters) != 2:
        return None
    area, ref = letters
    if area not in AREAS or ref not in "ABC":
        return None
    return area, ref


# --------------------------------------------------------------------------
# Shared plumbing
# --------------------------------------------------------------------------

def fmt_clock(seconds):
    seconds = max(0, int(seconds))
    return f"{seconds // 60}:{seconds % 60:02d}"


def timed_input(prompt, deadline):
    """Read a line, or None if the deadline passes first.

    The read happens on a daemon thread so the clock can actually cut a
    candidate off mid-typing, which is what the real test does.
    """
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return None
    box = queue.Queue(maxsize=1)

    def _read():
        try:
            box.put(input(prompt))
        except EOFError:
            box.put(None)

    threading.Thread(target=_read, daemon=True).start()
    try:
        return box.get(timeout=remaining)
    except queue.Empty:
        sys.stdout.write("\n")
        return None


def acquire(prompt, deadline, parser, args, generate, hint):
    """Get a parseable answer, or None when the clock runs out."""
    if args.auto:
        if args.auto_delay:
            time.sleep(min(args.auto_delay, max(0.0, deadline - time.monotonic())))
        return parser(generate())
    while True:
        raw = timed_input(prompt, deadline)
        if raw is None:
            return None
        parsed = parser(raw)
        if parsed is not None:
            return parsed
        print(hint)


def auto_answer(command, item, mode, rng):
    if command == "checking":
        if mode == "correct":
            return " ".join(sorted(item.errors)) if item.errors else "N"
        if mode == "wrong":
            return "N" if item.errors else "A B C D"
        chosen = rng.sample(["A", "B", "C", "D"], rng.randint(0, 4))
        return " ".join(sorted(chosen)) if chosen else "N"
    if mode == "correct":
        return f"{item.area} {item.ref}"
    if mode == "wrong":
        area = rng.choice([k for k in AREAS if k != item.area])
        ref = rng.choice([c for c in "ABC" if c != item.ref])
        return f"{area} {ref}"
    return f"{rng.choice(sorted(AREAS))} {rng.choice('ABC')}"


def show_peek(items, command):
    for index, item in enumerate(items, 1):
        if command == "checking":
            print(render_check(item, index, len(items), None))
            print(f"   >>> answer: {' '.join(sorted(item.errors)) or 'N'}")
        else:
            print(render_cat(item, index, len(items), None))
            print(f"   >>> answer: {item.area} {item.ref}")


def append_scoreboard(row):
    new = not SCOREBOARD.exists()
    with SCOREBOARD.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        if new:
            writer.writerow([
                "timestamp", "drill", "offered", "attempted", "points",
                "max_points", "perfect", "seconds_used", "parameters",
            ])
        writer.writerow(row)


def report(command, rows, offered, allowed, elapsed, args):
    attempted = len(rows)
    points = sum(row["points"] for row in rows)
    max_points = sum(row["max_points"] for row in rows)
    perfect = sum(1 for row in rows if row["perfect"])

    print("")
    print("   " + "-" * 52)
    print(f"   Offered          {offered}")
    print(f"   Attempted        {attempted}")
    if max_points:
        print(f"   Points           {points} / {max_points}   ({points / max_points:.1%})")
    print(f"   Fully correct    {perfect} / {attempted}")
    if command == "checking":
        for column in "ABCD":
            hits = sum(1 for row in rows if row["columns"][column])
            print(f"     column {column}        {hits} / {attempted}")
    else:
        area_hits = sum(1 for row in rows if row["columns"]["area"])
        ref_hits = sum(1 for row in rows if row["columns"]["ref"])
        print(f"     area            {area_hits} / {attempted}")
        print(f"     reference       {ref_hits} / {attempted}")
    print(f"   Time used        {fmt_clock(elapsed)} of {fmt_clock(allowed)}")
    print("   " + "-" * 52)

    if not args.no_scoreboard:
        parameters = (
            f"seed={args.seed};error_rate={args.error_rate};max_errors={args.max_errors}"
            if command == "checking"
            else f"seed={args.seed};tables_each={args.tables_each}"
        )
        append_scoreboard([
            datetime.now().isoformat(timespec="seconds"),
            command, offered, attempted, points, max_points, perfect,
            round(elapsed, 1), parameters,
        ])
        print(f"   Logged to {SCOREBOARD.name}")


def run_checking(args):
    if args.seed is None:
        args.seed = int(time.time())
    rng = random.Random(args.seed)
    items = [make_check_item(rng, args.error_rate, args.max_errors) for _ in range(args.questions)]

    if args.peek:
        show_peek(items, "checking")
        return

    print("")
    print("   CHECKING TEST - find every column that contains a transcription error.")
    print(f"   {args.questions} questions, {fmt_clock(args.seconds)}. One question at a time.")
    print("   Sweep the columns in a fixed order. 'N' means the record is clean.")

    started = time.monotonic()
    deadline = started + args.seconds
    rows = []

    for index, item in enumerate(items, 1):
        if time.monotonic() >= deadline:
            break
        print(render_check(item, index, len(items), deadline - time.monotonic()))

        parsed = acquire(
            "   > ", deadline, parse_check, args,
            lambda: auto_answer("checking", item, args.auto, rng),
            "   Enter column letters (e.g. 'B C'), or 'N' for no error.",
        )
        if parsed is None:
            print("   TIME UP")
            break

        selected, claimed_clean = parsed
        if claimed_clean:
            # "No error" is an assertion, not an absence of one: claiming a
            # clean record when it is dirty scores nothing, rather than
            # collecting points for the columns you happened to leave alone.
            points = 0 if item.errors else 4
            columns = {column: points == 4 for column in "ABCD"}
        else:
            columns = {
                column: (column in selected) == (column in item.errors)
                for column in "ABCD"
            }
            points = sum(1 for ok in columns.values() if ok)
        perfect = points == 4

        if args.feedback:
            answer = " ".join(sorted(item.errors)) or "N"
            mark = "OK" if perfect else f"answer {answer}"
            print(f"   [{mark}]")

        rows.append({"columns": columns, "points": points, "max_points": 4, "perfect": perfect})

    elapsed = min(time.monotonic() - started, args.seconds)
    report("checking", rows, len(items), args.seconds, elapsed, args)


def run_categorising(args):
    if args.seed is None:
        args.seed = int(time.time())
    rng = random.Random(args.seed)
    items = [make_cat_item(rng) for _ in range(args.questions)]

    if args.peek:
        print(tables_text())
        show_peek(items, "categorising")
        return

    print("")
    print("   CATEGORISING TEST - two lookups per question.")
    print(f"   {args.questions} questions, {fmt_clock(args.seconds)}, two answers each.")
    print("   The tables do not change during the test. Learn them, then stop re-reading them.")
    if not args.tables_each:
        print(tables_text())
        print("   (tables shown once only, as above)")

    started = time.monotonic()
    deadline = started + args.seconds
    rows = []

    for index, item in enumerate(items, 1):
        if time.monotonic() >= deadline:
            break
        if args.tables_each:
            print(tables_text())
        print(render_cat(item, index, len(items), deadline - time.monotonic()))

        parsed = acquire(
            "   > ", deadline, parse_cat, args,
            lambda: auto_answer("categorising", item, args.auto, rng),
            "   Enter two letters: invoice area (A-F) then reference category (A-C).",
        )
        if parsed is None:
            print("   TIME UP")
            break

        area_ok = parsed[0] == item.area
        ref_ok = parsed[1] == item.ref
        columns = {"area": area_ok, "ref": ref_ok}
        points = int(area_ok) + int(ref_ok)

        if args.feedback:
            mark = "OK" if points == 2 else f"answer {item.area} {item.ref}"
            print(f"   [{mark}]")

        rows.append({"columns": columns, "points": points, "max_points": 2, "perfect": points == 2})

    elapsed = min(time.monotonic() - started, args.seconds)
    report("categorising", rows, len(items), args.seconds, elapsed, args)


def run_scoreboard(args):
    if not SCOREBOARD.exists():
        print(f"No scoreboard yet at {SCOREBOARD}.")
        return
    with SCOREBOARD.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.reader(handle))
    if len(rows) < 2:
        print("Scoreboard is empty.")
        return
    header, body = rows[0], rows[1:]
    widths = [max(len(str(cell)) for cell in column) for column in zip(header, *body)]
    for row in [header] + body:
        print("  ".join(str(cell).ljust(width) for cell, width in zip(row, widths)))
    print("")
    print(f"{len(body)} runs recorded.")


def build_parser():
    parser = argparse.ArgumentParser(
        description="Timed practice drills for the Irish civil service aptitude tests.",
        epilog="Timings match the publicjobs self-assessment: checking 46/8min, categorising 40/10min.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    checking = sub.add_parser("checking", help="transcription-error checking drill")
    checking.add_argument("--questions", type=int, default=46)
    checking.add_argument("--seconds", type=int, default=480)
    checking.add_argument("--seed", type=int, help="reproduce a specific paper")
    checking.add_argument("--error-rate", type=float, default=0.65,
                          help="share of questions that contain at least one error (default 0.65)")
    checking.add_argument("--max-errors", type=int, default=3)
    checking.add_argument("--feedback", action="store_true", help="show the answer after each question")
    checking.add_argument("--peek", action="store_true", help="print the paper with answers and exit")
    checking.add_argument("--auto", choices=("correct", "wrong", "random"), help=argparse.SUPPRESS)
    checking.add_argument("--auto-delay", type=float, default=0.0, help=argparse.SUPPRESS)
    checking.add_argument("--no-scoreboard", action="store_true")
    checking.set_defaults(func=run_checking)

    categorising = sub.add_parser("categorising", help="two-stage lookup drill")
    categorising.add_argument("--questions", type=int, default=40)
    categorising.add_argument("--seconds", type=int, default=600)
    categorising.add_argument("--seed", type=int)
    categorising.add_argument("--tables-each", action="store_true",
                              help="reprint the lookup tables before every question")
    categorising.add_argument("--feedback", action="store_true")
    categorising.add_argument("--peek", action="store_true")
    categorising.add_argument("--auto", choices=("correct", "wrong", "random"), help=argparse.SUPPRESS)
    categorising.add_argument("--auto-delay", type=float, default=0.0, help=argparse.SUPPRESS)
    categorising.add_argument("--no-scoreboard", action="store_true")
    categorising.set_defaults(func=run_categorising)

    board = sub.add_parser("scoreboard", help="show every recorded run")
    board.set_defaults(func=run_scoreboard)

    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        args.func(args)
    except KeyboardInterrupt:
        print("\nStopped.")
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
