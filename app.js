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

  /* ------------------------------------------------------ numerical drill */

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June'];

  function euro(cents) {
    return (cents < 0 ? '-' : '') + '\u20ac' + (Math.abs(cents) / 100).toLocaleString('en-IE', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }

  function whole(value) {
    return Math.round(value).toLocaleString('en-IE');
  }

  function onePlace(value) {
    return Math.abs(value).toFixed(1) + '%';
  }

  /* Build five distinct options from a correct answer plus a decoy generator,
   * so a block can always be completed even when a decoy collides. */
  function finalise(rng, question) {
    const options = [question.correct];
    for (let k = 0; options.length < 5 && k < 32; k += 1) {
      const text = question.decoy(k);
      if (text && text !== question.correct && options.indexOf(text) === -1) options.push(text);
    }
    if (options.length < 5) return null;
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = rng.int(0, i);
      const held = options[i];
      options[i] = options[j];
      options[j] = held;
    }
    return { prompt: question.prompt, options: options, answer: options.indexOf(question.correct) };
  }

  function dataTable(caption, headers, rows, mono) {
    return '<table class="figures"><caption>' + caption + '</caption><thead><tr>' +
      headers.map(function (head) { return '<th scope="col">' + head + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr>' + row.map(function (cell, index) {
          return '<td' + (mono[index] ? ' class="mono"' : '') + '>' + cell + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  function blockVolumes(rng) {
    const values = MONTHS.map(function () { return rng.int(900, 4200); });
    const total = values.reduce(function (sum, value) { return sum + value; }, 0);
    const average = Math.round(total / 6);
    const from = rng.int(1, 3);
    const to = from + rng.int(1, 5 - from);
    const change = ((values[to] - values[from]) / values[from]) * 100;
    const otherBase = ((values[to] - values[from]) / values[to]) * 100;

    const html = dataTable(
      'Applications processed, January to June',
      MONTHS.map(function (month) { return month.slice(0, 3); }),
      [values.map(function (value) { return whole(value); })],
      MONTHS.map(function () { return true; })
    );

    return {
      html: html,
      questions: [
        {
          prompt: 'What was the total number of applications processed over the six months?',
          correct: whole(total),
          decoy: function (k) {
            const variants = [total - values[0], total + values[5], total * 0.9, total * 1.1];
            return whole(variants[k % variants.length] + (k >= variants.length ? k : 0));
          },
        },
        {
          prompt: 'What was the average number of applications per month, to the nearest whole number?',
          correct: whole(average),
          decoy: function (k) {
            const variants = [total / 5, total / 7, average * 0.9, average + 120];
            return whole(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What was the percentage change in applications from ' + MONTHS[from] +
            ' to ' + MONTHS[to] + ', to one decimal place?',
          correct: change.toFixed(1) + '%',
          decoy: function (k) {
            const variants = [
              (-change).toFixed(1) + '%',
              (change * 1.5).toFixed(1) + '%',
              otherBase.toFixed(1) + '%',
              (change + 2.4).toFixed(1) + '%',
            ];
            return variants[k % variants.length];
          },
        },
      ],
    };
  }

  function blockUnitCosts(rng) {
    const items = [
      { name: 'Box files', unit: rng.int(8, 40) * 25, qty: rng.int(3, 24) },
      { name: 'Printer paper', unit: rng.int(12, 60) * 25, qty: rng.int(4, 30) },
      { name: 'Toner cartridges', unit: rng.int(60, 200) * 25, qty: rng.int(2, 9) },
    ];
    const lines = items.map(function (item) { return item.unit * item.qty; });
    const spend = lines.reduce(function (sum, line) { return sum + line; }, 0);

    const html = dataTable(
      'Procurement list',
      ['Item', 'Unit price', 'Quantity'],
      items.map(function (item) { return [item.name, euro(item.unit), String(item.qty)]; }),
      [false, true, true]
    );

    return {
      html: html,
      questions: [
        {
          prompt: 'What is the total cost of the ' + items[0].name.toLowerCase() + '?',
          correct: euro(lines[0]),
          decoy: function (k) {
            const variants = [
              items[0].unit * (items[0].qty - 1),
              items[0].unit * (items[0].qty + 1),
              Math.round(lines[0] * 0.9),
              Math.round(lines[0] * 1.1),
            ];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What is the total spend on all three items?',
          correct: euro(spend),
          decoy: function (k) {
            const variants = [spend - lines[0], spend + lines[1], Math.round(spend * 0.9), Math.round(spend * 1.05)];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'A 10% discount applies to the ' + items[1].name.toLowerCase() +
            '. How much is saved on that line?',
          correct: euro(Math.round(lines[1] * 0.1)),
          decoy: function (k) {
            const variants = [
              Math.round(lines[1] * 0.2),
              Math.round(lines[1] * 0.05),
              lines[1] - Math.round(lines[1] * 0.1),
              items[1].unit,
            ];
            return euro(variants[k % variants.length]);
          },
        },
      ],
    };
  }

  function blockTickets(rng) {
    const standard = rng.int(25, 70) * 50;
    const concession = Math.round(standard * 0.55 / 50) * 50;
    /* Concession revenue is at most 0.55 x 300 / 200 = 82.5% of standard, so
     * "standard exceeds concession" always holds. */
    const standardSold = rng.int(200, 640);
    const concessionSold = rng.int(40, 300);
    const standardRevenue = standard * standardSold;
    const concessionRevenue = concession * concessionSold;
    const totalRevenue = standardRevenue + concessionRevenue;

    const html = dataTable(
      'Ticket sales',
      ['Type', 'Price', 'Sold'],
      [
        ['Standard', euro(standard), String(standardSold)],
        ['Concession', euro(concession), String(concessionSold)],
      ],
      [false, true, true]
    );

    return {
      html: html,
      questions: [
        {
          prompt: 'What was the total revenue from ticket sales?',
          correct: euro(totalRevenue),
          decoy: function (k) {
            const variants = [
              standard * (standardSold + concessionSold),
              concession * (standardSold + concessionSold),
              Math.round(totalRevenue * 0.9),
              totalRevenue - standardRevenue,
            ];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'By how much did standard revenue exceed concession revenue?',
          correct: euro(standardRevenue - concessionRevenue),
          decoy: function (k) {
            const variants = [
              concessionRevenue,
              totalRevenue,
              standardRevenue,
              Math.round((standardRevenue - concessionRevenue) * 1.2),
            ];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What percentage of total revenue came from concessions, to one decimal place?',
          correct: ((concessionRevenue / totalRevenue) * 100).toFixed(1) + '%',
          decoy: function (k) {
            const byCount = (concessionSold / (standardSold + concessionSold)) * 100;
            const actual = (concessionRevenue / totalRevenue) * 100;
            const variants = [
              byCount.toFixed(1) + '%',
              (actual * 2).toFixed(1) + '%',
              (actual + 7.5).toFixed(1) + '%',
              (100 - actual).toFixed(1) + '%',
            ];
            return variants[k % variants.length];
          },
        },
      ],
    };
  }

  function blockPay(rng) {
    const rate = rng.int(30, 64) * 50;
    const hours = rng.int(30, 39);
    const weeks = rng.int(4, 12);
    const overtimeHours = rng.int(2, 10);
    const weekly = rate * hours;
    const overtime = Math.round(rate * 1.5) * overtimeHours;

    const html = '<dl class="figures-list">' +
      '<div><dt>Hourly rate</dt><dd class="mono">' + euro(rate) + '</dd></div>' +
      '<div><dt>Contracted hours per week</dt><dd class="mono">' + hours + '</dd></div>' +
      '<div><dt>Weeks in period</dt><dd class="mono">' + weeks + '</dd></div>' +
      '<div><dt>Overtime rate</dt><dd>time and a half</dd></div>' +
      '</dl>';

    return {
      html: html,
      questions: [
        {
          prompt: 'What is the weekly pay before overtime?',
          correct: euro(weekly),
          decoy: function (k) {
            const variants = [rate * (hours - 1), rate * (hours + 1), Math.round(weekly * 0.9), rate * 40];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What is the pay for the full period, before overtime?',
          correct: euro(weekly * weeks),
          decoy: function (k) {
            const variants = [weekly * (weeks - 1), weekly * (weeks + 1), weekly, Math.round(weekly * weeks * 0.9)];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What is the total pay for ' + overtimeHours + ' hours of overtime?',
          correct: euro(overtime),
          decoy: function (k) {
            const variants = [rate * overtimeHours, rate * 2 * overtimeHours, overtime - rate, Math.round(overtime * 0.9)];
            return euro(variants[k % variants.length]);
          },
        },
      ],
    };
  }

  /* Executive tier: multi-step items. Each question needs at least two
   * operations, which is the real difference from the clerical paper. */

  function blockBudget(rng) {
    const base = rng.int(120, 900) * 100000;
    const uplift = rng.int(3, 14);
    const revised = base + Math.round((base * uplift) / 100);
    const share = rng.int(70, 97);
    const spent = Math.round((revised * share) / 100);
    const unspent = revised - spent;
    const shareOfBase = (spent / base) * 100;
    const actualShare = (spent / revised) * 100;

    const html = dataTable('Budget line', ['Item', 'Amount'], [
      ['Original allocation', euro(base)],
      ['Uplift', uplift + '%'],
      ['Amount spent', euro(spent)],
    ], [false, true]);

    return {
      html: html,
      questions: [
        {
          prompt: 'What is the revised allocation after the uplift?',
          correct: euro(revised),
          decoy: function (k) {
            const variants = [
              base + Math.round((base * uplift) / 50),
              Math.round(base * (1 + uplift / 10)),
              Math.round(revised * 0.9),
              Math.round(revised * 1.05),
            ];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'How much of the revised allocation remains unspent?',
          correct: euro(unspent),
          decoy: function (k) {
            const variants = [revised, spent, revised - base, Math.round(unspent * 0.9)];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What percentage of the revised allocation was spent, to one decimal place?',
          correct: actualShare.toFixed(1) + '%',
          decoy: function (k) {
            const variants = [
              shareOfBase.toFixed(1) + '%',
              (100 - actualShare).toFixed(1) + '%',
              (actualShare * 0.9).toFixed(1) + '%',
              (actualShare + 6).toFixed(1) + '%',
            ];
            return variants[k % variants.length];
          },
        },
      ],
    };
  }

  function blockStaffing(rng) {
    const staffA = rng.int(8, 40);
    const salaryA = rng.int(28, 42) * 100000;
    const staffB = rng.int(3, 15);
    const salaryB = rng.int(44, 68) * 100000;
    const onCost = rng.int(12, 22);
    const totalA = staffA * salaryA;
    const payroll = totalA + staffB * salaryB;
    const loaded = payroll + Math.round((payroll * onCost) / 100);
    const gap = Math.round(((salaryB - salaryA) * (100 + onCost)) / 100);

    const html = dataTable('Staffing', ['Grade', 'Staff', 'Salary per head'], [
      ['Grade A', String(staffA), euro(salaryA)],
      ['Grade B', String(staffB), euro(salaryB)],
    ], [false, true, true]) +
      '<p class="key-note">Employer on-costs of ' + onCost + '% apply on top of salary.</p>';

    return {
      html: html,
      questions: [
        {
          prompt: 'What is the total salary cost for Grade A, before on-costs?',
          correct: euro(totalA),
          decoy: function (k) {
            const variants = [(staffA - 1) * salaryA, (staffA + 1) * salaryA,
              Math.round(totalA * 0.9), Math.round(totalA * 1.1)];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What is the total payroll cost for both grades, including on-costs?',
          correct: euro(loaded),
          decoy: function (k) {
            const variants = [payroll, Math.round(loaded * 0.9), Math.round(loaded * 1.1),
              totalA + Math.round((totalA * onCost) / 100)];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What is the difference in cost per head between the two grades, ' +
            'including on-costs?',
          correct: euro(gap),
          decoy: function (k) {
            const variants = [salaryB - salaryA, Math.round(gap * 0.9),
              Math.round(gap * 1.2), Math.round((salaryB - salaryA) * (onCost / 100))];
            return euro(variants[k % variants.length]);
          },
        },
      ],
    };
  }

  function blockProcessing(rng) {
    const perDay = rng.int(40, 160);
    const days = rng.int(10, 22);
    let intake = rng.int(300, 1200);
    const backlog = rng.int(200, 900);
    const capacity = perDay * days;

    while (backlog + intake <= capacity) intake += 150;
    const outstanding = backlog + intake - capacity;
    const clearDays = Math.ceil(outstanding / perDay);

    const html = dataTable('Case processing', ['Item', 'Value'], [
      ['Cases handled per working day', String(perDay)],
      ['Working days in the period', String(days)],
      ['Opening backlog', String(backlog)],
      ['New cases received', String(intake)],
    ], [false, true]);

    return {
      html: html,
      questions: [
        {
          prompt: 'How many cases could be handled during the period?',
          correct: whole(capacity),
          decoy: function (k) {
            const variants = [perDay * (days - 1), perDay * (days + 1),
              Math.round(capacity * 0.9), backlog + intake];
            return whole(variants[k % variants.length]);
          },
        },
        {
          prompt: 'How many cases remain outstanding at the end of the period?',
          correct: whole(outstanding),
          decoy: function (k) {
            const variants = [capacity, backlog, intake, outstanding + perDay];
            return whole(variants[k % variants.length]);
          },
        },
        {
          prompt: 'At the same rate, how many working days would it take to clear the ' +
            'outstanding cases? Give a whole number of days.',
          correct: whole(clearDays),
          decoy: function (k) {
            const variants = [clearDays - 1, clearDays + 1, Math.round(outstanding / (perDay * 2)),
              Math.round(days / 2)];
            return whole(Math.max(0, variants[k % variants.length]));
          },
        },
      ],
    };
  }

  function blockDiscount(rng) {
    const unit = rng.int(4, 40) * 25;
    const qty = rng.int(60, 400);
    const tier = qty >= 250 ? 15 : qty >= 120 ? 10 : 5;
    const gross = unit * qty;
    const discount = Math.round((gross * tier) / 100);
    const net = gross - discount;
    const perUnit = Math.round(net / qty);

    const html = dataTable('Order', ['Item', 'Value'], [
      ['Unit price', euro(unit)],
      ['Quantity ordered', String(qty)],
    ], [false, true]) +
      '<p class="key-note">Quantity bands: 60\u2013119 units 5% &middot; ' +
      '120\u2013249 units 10% &middot; 250 units or more 15%.</p>';

    return {
      html: html,
      questions: [
        {
          prompt: 'What is the gross cost of the order, before any discount?',
          correct: euro(gross),
          decoy: function (k) {
            const variants = [unit * (qty - 10), unit * (qty + 10),
              Math.round(gross * 0.9), Math.round(gross * 1.1)];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What is the value of the quantity discount?',
          correct: euro(discount),
          decoy: function (k) {
            const variants = [net, Math.round((gross * 0.2)), Math.round(gross * 0.05),
              Math.round(discount * 2)];
            return euro(variants[k % variants.length]);
          },
        },
        {
          prompt: 'What is the effective cost per unit after the discount?',
          correct: euro(perUnit),
          decoy: function (k) {
            const variants = [unit, perUnit + 25, Math.round(perUnit * 0.9),
              Math.round(perUnit * 1.1)];
            return euro(variants[k % variants.length]);
          },
        },
      ],
    };
  }

  const NUMERICAL_BLOCKS = [blockVolumes, blockUnitCosts, blockTickets, blockPay];
  const EXECUTIVE_BLOCKS = [blockBudget, blockStaffing, blockProcessing, blockDiscount];

  function makeNumericalPaper(rng, total, hard) {
    const pool = hard ? EXECUTIVE_BLOCKS : NUMERICAL_BLOCKS;
    const items = [];
    let guard = 0;

    while (items.length < total && guard < 80) {
      guard += 1;
      const block = rng.pick(pool)(rng);
      const built = [];
      let failed = false;

      block.questions.forEach(function (question) {
        const complete = finalise(rng, question);
        if (!complete) failed = true;
        else built.push(complete);
      });
      if (failed) continue;

      built.forEach(function (complete) {
        if (items.length >= total) return;
        items.push({
          contextId: 'num' + guard,
          contextHtml: block.html,
          prompt: complete.prompt,
          options: complete.options,
          answer: complete.answer,
        });
      });
    }

    if (items.length < total) throw new Error('could not build a full numerical paper');
    return items;
  }

  /* --------------------------------------------------------- verbal drill */

  const VERBAL_LABELS = { T: 'True', F: 'False', C: 'Cannot say' };

  function passageHtml(passage) {
    return '<blockquote class="passage"><h3>' + escapeHtml(passage.title) + '</h3><p>' +
      escapeHtml(passage.text) + '</p></blockquote>';
  }

  function makeVerbalPaper(rng, total) {
    const passages = window.PASSAGES || [];
    if (!passages.length) throw new Error('passage file missing');
    const items = [];

    rng.sample(passages, passages.length).forEach(function (passage) {
      if (items.length >= total) return;
      passage.items.forEach(function (entry) {
        if (items.length >= total) return;
        items.push({
          contextId: passage.id,
          contextHtml: passageHtml(passage),
          statement: entry.statement,
          key: entry.key,
          why: entry.why,
        });
      });
    });

    if (items.length < total) throw new Error('not enough verbal items');
    return items;
  }

  /* ---------------------------------------------------------------- state */

  const TIERS = {
    clerical: {
      label: 'Clerical Officer',
      note: 'Four tests: checking, categorising, numerical and verbal.',
      drills: ['checking', 'categorising', 'numerical', 'verbal'],
    },
    executive: {
      label: 'Executive / Administrative',
      note: 'Three tests: numerical, verbal and a job simulation. The first two are here; ' +
        'the simulation is not built.',
      drills: ['numerical', 'verbal'],
    },
  };

  const PLANS = {
    clerical: {
      checking: { full: { n: 46, s: 480 }, half: { n: 23, s: 240 }, short: { n: 10, s: 120 } },
      categorising: { full: { n: 40, s: 600 }, half: { n: 20, s: 300 }, short: { n: 10, s: 150 } },
      numerical: { full: { n: 21, s: 1200 }, half: { n: 11, s: 600 }, short: { n: 6, s: 300 } },
      verbal: { full: { n: 26, s: 1080 }, half: { n: 13, s: 540 }, short: { n: 6, s: 240 } },
    },
    executive: {
      numerical: { full: { n: 36, s: 1800 }, half: { n: 18, s: 900 }, short: { n: 8, s: 400 } },
      verbal: { full: { n: 59, s: 1800 }, half: { n: 30, s: 900 }, short: { n: 12, s: 360 } },
    },
  };

  const LABELS = {
    checking: 'Checking',
    categorising: 'Categorising',
    numerical: 'Numerical',
    verbal: 'Verbal',
  };
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
    tier: 'clerical',
    startedAt: 0,
    deadline: 0,
    allowed: 0,
    ticker: null,
    finished: false,
    locked: false,
    feedbackTimer: null,
    selected: new Set(),
    clean: false,
    entry: [],
    lastContextId: null,
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

  function renderContext(item) {
    const host = $('#context');
    if (!item.contextId) {
      host.innerHTML = '';
      host.hidden = true;
      state.lastContextId = null;
      return;
    }
    if (state.lastContextId !== item.contextId) {
      host.innerHTML = item.contextHtml;
      host.hidden = false;
      state.lastContextId = item.contextId;
    }
  }

  function renderNumerical(item) {
    let html = '<p class="prompt">' + escapeHtml(item.prompt) + '</p>' +
      '<div class="choices" id="choices">';
    item.options.forEach(function (text, index) {
      html += '<button type="button" class="option" data-index="' + index + '">' +
        '<b>' + 'ABCDE'[index] + '</b><span>' + escapeHtml(text) + '</span></button>';
    });
    html += '</div>';
    $('#question').innerHTML = html;
    $('#choices').addEventListener('click', function (event) {
      const button = event.target.closest('.option');
      if (!button) return;
      button.blur();
      submitNumerical(Number(button.dataset.index));
    });
    $('#hint').textContent = 'Press A\u2013E to answer.';
  }

  function renderVerbal(item) {
    let html = '<p class="statement">&ldquo;' + escapeHtml(item.statement) + '&rdquo;</p>' +
      '<div class="choices three" id="choices">';
    ['T', 'F', 'C'].forEach(function (key) {
      html += '<button type="button" class="option" data-key="' + key + '">' +
        '<b>' + key + '</b><span>' + VERBAL_LABELS[key] + '</span></button>';
    });
    html += '</div>';
    $('#question').innerHTML = html;
    $('#choices').addEventListener('click', function (event) {
      const button = event.target.closest('.option');
      if (!button) return;
      button.blur();
      submitVerbal(button.dataset.key);
    });
    $('#hint').textContent = 'Press T, F or C.';
  }

  function renderQuestion() {
    const item = state.items[state.index];
    $('#run-count').textContent = `Question ${state.index + 1} of ${state.items.length}`;
    if (state.drill === 'numerical' || state.drill === 'verbal') renderContext(item);
    if (state.drill === 'checking') renderChecking(item);
    else if (state.drill === 'numerical') renderNumerical(item);
    else if (state.drill === 'verbal') renderVerbal(item);
    else renderCategorising(item);
  }

  /* -------------------------------------------------------------- answers */

  function applyColumn(key) {
    if (state.finished || state.locked) return;
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

    recordRow(row);
  }

  function recordRow(row) {
    if (state.finished || state.locked) return;
    state.rows.push(row);
    if (state.feedback) {
      state.locked = true;
      markFeedback(row);
      state.feedbackTimer = window.setTimeout(function () {
        state.feedbackTimer = null;
        state.locked = false;
        advance();
      }, row.why ? 1600 : 900);
    } else {
      advance();
    }
  }

  function submitNumerical(index) {
    if (state.finished || state.locked) return;
    if (performance.now() > state.deadline) { finish('time'); return; }
    const item = state.items[state.index];
    const ok = index === item.answer;
    recordRow({
      points: ok ? 1 : 0,
      max: 1,
      perfect: ok,
      columns: {},
      answer: 'ABCDE'[index],
      expected: 'ABCDE'[item.answer] + ' \u2014 ' + item.options[item.answer],
    });
  }

  function submitVerbal(key) {
    if (state.finished || state.locked) return;
    if (performance.now() > state.deadline) { finish('time'); return; }
    const item = state.items[state.index];
    const ok = key === item.key;
    recordRow({
      points: ok ? 1 : 0,
      max: 1,
      perfect: ok,
      columns: {},
      answer: VERBAL_LABELS[key],
      expected: VERBAL_LABELS[item.key],
      why: item.why,
    });
  }

  function markFeedback(row) {
    const hint = $('#hint');
    hint.classList.add(row.perfect ? 'ok' : 'bad');
    hint.textContent = row.perfect
      ? 'Correct.'
      : `Answer: ${row.expected} \u2014 you said ${row.answer || 'nothing'}.`;
    if (row.why) hint.textContent += ' ' + row.why;
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
    clearFeedbackTimer();
    const settings = PLANS[state.tier][drill][state.length];
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

    try {
      if (drill === 'checking') {
        for (let i = 0; i < settings.n; i += 1) {
          state.items.push(makeCheckItem(rng, 0.65, 3));
        }
      } else if (drill === 'categorising') {
        for (let i = 0; i < settings.n; i += 1) {
          state.items.push(makeCatItem(rng));
        }
      } else if (drill === 'numerical') {
        state.items = makeNumericalPaper(rng, settings.n, state.tier === 'executive');
      } else {
        state.items = makeVerbalPaper(rng, settings.n);
      }
    } catch (error) {
      window.alert('Could not build that paper: ' + error.message);
      showView('menu');
      return;
    }

    showView('run');
    $('#run-title').textContent = LABELS[drill];
    $('#run-count').textContent = `Question 1 of ${settings.n}`;
    $('#run-clock').classList.remove('urgent');

    const contextHost = $('#context');
    state.lastContextId = null;
    if (drill === 'categorising') {
      contextHost.innerHTML = tablesMarkup();
      contextHost.hidden = false;
    } else {
      contextHost.innerHTML = '';
      contextHost.hidden = true;
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

  function clearFeedbackTimer() {
    if (state.feedbackTimer) {
      window.clearTimeout(state.feedbackTimer);
      state.feedbackTimer = null;
    }
  }

  function finish(reason) {
    if (state.finished) return;
    state.finished = true;
    clearFeedbackTimer();
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
    } else if (state.drill === 'categorising') {
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

    if (summary.attempted && Object.keys(summary.columns).length) {
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

  const RUN_NUMBERS = ['offered', 'attempted', 'points', 'max', 'seconds', 'seed'];

  function isWellFormedRun(run) {
    return !!run && typeof run === 'object' &&
      typeof run.when === 'string' &&
      typeof run.drill === 'string' &&
      typeof run.outcome === 'string' &&
      typeof run.perfect === 'number' &&
      RUN_NUMBERS.every(function (field) { return Number.isFinite(run[field]); });
  }

  /* Stored text is rendered into innerHTML and a CSV, so only known-safe
   * shapes get through: escaped strings, finite numbers. */
  function cleanRun(run) {
    const clean = {
      when: escapeHtml(run.when.slice(0, 19)),
      drill: escapeHtml(run.drill),
      tier: run.tier === 'executive' ? 'executive' : 'clerical',
      outcome: escapeHtml(run.outcome),
      perfect: run.perfect,
    };
    RUN_NUMBERS.forEach(function (field) { clean[field] = run[field]; });
    return clean;
  }

  function loadRuns() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isWellFormedRun).map(cleanRun) : [];
    } catch (error) {
      return [];
    }
  }

  function saveRun(reason, elapsed, summary) {
    const runs = loadRuns();
    runs.unshift({
      when: new Date().toISOString().slice(0, 19),
      drill: state.drill,
      tier: state.tier,
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
      '<th scope="col">When</th><th scope="col">Grade</th><th scope="col">Drill</th><th scope="col">Attempted</th>' +
      '<th scope="col">Points</th><th scope="col">Perfect</th><th scope="col">Time</th>' +
      '<th scope="col">Seed</th></tr></thead><tbody>';
    runs.forEach(function (run) {
      html += `<tr><td class="mono">${run.when.replace('T', ' ')}</td>` +
        `<td>${run.tier === 'executive' ? 'Executive' : 'Clerical'}</td>` +
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
    const header = ['timestamp', 'grade', 'drill', 'offered', 'attempted', 'points', 'max_points',
      'perfect', 'seconds_used', 'seed', 'outcome'];
    const lines = [header.join(',')];
    runs.forEach(function (run) {
      lines.push([run.when, run.tier, run.drill, run.offered, run.attempted, run.points, run.max,
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
    const length = $('#opt-length').value;
    const plan = PLANS[state.tier];
    const allowed = TIERS[state.tier].drills;

    Object.keys(LABELS).forEach(function (drill) {
      const card = document.querySelector('[data-card="' + drill + '"]');
      if (card) card.classList.toggle('hidden', allowed.indexOf(drill) === -1);

      const target = document.querySelector('#meta-' + drill);
      if (target && plan[drill]) {
        const chosen = plan[drill][length];
        target.textContent = `${chosen.n} questions \u00b7 ${clockText(chosen.s)}`;
      }
    });

    const verbalButton = document.querySelector('[data-start="verbal"]');
    if (verbalButton) {
      const missing = !(window.PASSAGES && window.PASSAGES.length);
      verbalButton.disabled = missing;
      verbalButton.textContent = missing ? 'Passage file missing' : 'Start verbal';
    }

    const note = $('#tier-note');
    if (note) note.textContent = TIERS[state.tier].note;
  }

  /* -------------------------------------------------------------- wiring */

  document.addEventListener('keydown', function (event) {
    if (state.view !== 'run' || state.finished || state.locked) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.repeat) return;

    const key = event.key.toLowerCase();

    if (key === 'enter') { event.preventDefault(); submitAnswer(); return; }
    if (key === 'backspace' || key === 'escape') { event.preventDefault(); clearAnswer(); return; }

    if (state.drill === 'checking') {
      if (key.length === 1 && 'abcd'.includes(key)) {
        event.preventDefault();
        applyColumn(key.toUpperCase());
      } else if (key === 'n') {
        event.preventDefault();
        applyColumn('N');
      }
    } else if (state.drill === 'categorising') {
      if (key.length === 1 && key >= 'a' && key <= 'f') {
        event.preventDefault();
        pushEntry(key.toUpperCase());
      }
    } else if (state.drill === 'numerical') {
      const index = 'abcde'.indexOf(key);
      if (key.length === 1 && index >= 0) {
        event.preventDefault();
        submitNumerical(index);
      }
    } else if (state.drill === 'verbal') {
      if (key === 't') { event.preventDefault(); submitVerbal('T'); }
      else if (key === 'f') { event.preventDefault(); submitVerbal('F'); }
      else if (key === 'c') { event.preventDefault(); submitVerbal('C'); }
    }
  });

  document.querySelectorAll('[data-start]').forEach(function (button) {
    button.addEventListener('click', function () {
      state.length = $('#opt-length').value;
      startRun(button.dataset.start);
    });
  });

  $('#opt-length').addEventListener('change', updateMeta);
  $('#opt-tier').addEventListener('change', function () {
    state.tier = $('#opt-tier').value;
    updateMeta();
  });

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

  /* Test seam: lets the generators be exercised directly with ?debug, without
   * driving the UI. Nothing is exported in normal use. */
  if (window.location.search.indexOf('debug') !== -1) {
    window.PAAT = {
      Rng: Rng,
      makeCheckItem: makeCheckItem,
      makeCatItem: makeCatItem,
      makeNumericalPaper: makeNumericalPaper,
      makeVerbalPaper: makeVerbalPaper,
    };
  }
})();
