/* Verbal Interpretation passages.
 *
 * Hand-written, not generated. Every statement is answerable from its passage
 * alone and carries a one-line rationale so the key can be audited rather than
 * trusted. Keys: T = true, F = false, C = cannot say.
 *
 * These are original practice items in the style of the publicjobs battery.
 * They are not real exam material.
 */
window.PASSAGES = [
  {
    id: 'expenses',
    title: 'Expense claims',
    text: `Staff may claim travel expenses for journeys undertaken on official business. Claims must be submitted within eight weeks of the journey; claims received after that period will not be paid unless the head of division approves a late submission in writing. Receipts are required for all claims above €20. Mileage is reimbursed at the rate published by the department each January, and that rate applies to the full distance of the journey rather than to any qualifying portion. Where two or more staff travel together in one vehicle, only the driver may claim mileage.`,
    items: [
      {
        statement: 'A claim submitted nine weeks after a journey will be paid only if a late submission is approved in writing.',
        key: 'T',
        why: 'The passage says claims after eight weeks are not paid unless the head of division approves a late submission in writing.',
      },
      {
        statement: 'Receipts are required for every claim.',
        key: 'F',
        why: 'Receipts are required only for claims above €20.',
      },
      {
        statement: 'The mileage rate is published each January.',
        key: 'T',
        why: 'Stated directly: "the rate published by the department each January".',
      },
      {
        statement: 'The published mileage rate has risen every year for the past five years.',
        key: 'C',
        why: 'Nothing is said about how the rate has changed over time.',
      },
    ],
  },
  {
    id: 'foi',
    title: 'Freedom of Information requests',
    text: `Requests under the Freedom of Information Act must be made in writing and must include sufficient particulars to allow the record sought to be identified. A request may be made by post or by email. Where a request is unclear, the body may seek clarification from the requester, and the statutory period for responding does not begin until that clarification is received. Requests concerning records that contain personal information about the requester are dealt with under a separate provision and are not charged a search fee.`,
    items: [
      {
        statement: 'A request sent by email is valid.',
        key: 'T',
        why: '"A request may be made by post or by email."',
      },
      {
        statement: 'The response period begins when the request is first received, even if clarification is later sought.',
        key: 'F',
        why: 'The period does not begin until the clarification is received.',
      },
      {
        statement: 'The body is obliged to seek clarification where a request is unclear.',
        key: 'F',
        why: 'The passage says the body "may" seek clarification, not that it must.',
      },
      {
        statement: 'No search fee is charged for a request for the requester\u2019s own personal information.',
        key: 'T',
        why: 'Such requests "are not charged a search fee".',
      },
    ],
  },
  {
    id: 'retention',
    title: 'Retention of case files',
    text: `Case files must be retained for seven years after the case is closed, after which they are transferred to the archive for a further three years before destruction. Files relating to minors are retained until the subject\u2019s twenty-fifth birthday, regardless of when the case closed. Retention periods are suspended for any file that is the subject of legal proceedings or an active investigation. Staff must not destroy any file that is under review, even where the standard retention period has expired.`,
    items: [
      {
        statement: 'A case closed in 2020 will ordinarily be transferred to the archive in 2027.',
        key: 'T',
        why: 'Seven years after closure is 2027, and files are transferred to the archive at that point.',
      },
      {
        statement: 'A file concerning a person who is now 30 will be destroyed under the standard seven-year rule.',
        key: 'C',
        why: 'The passage does not say when that case closed, so the seven years cannot be worked out.',
      },
      {
        statement: 'A retention period stops running while a file is the subject of legal proceedings.',
        key: 'T',
        why: 'Retention periods are "suspended" in those circumstances.',
      },
      {
        statement: 'Staff may destroy a file that is under review once the standard period has expired.',
        key: 'F',
        why: 'Staff "must not" destroy a file under review, even after the standard period.',
      },
    ],
  },
  {
    id: 'grant',
    title: 'Community Facilities Grant',
    text: `The Community Facilities Grant covers up to 60% of the cost of eligible works, to a maximum grant of €25,000. Works must be completed within twelve months of the date of the award letter. Applicants must own the property or hold a lease with at least five years remaining. Applications from groups that received a grant in the previous two years are not accepted. The scheme does not fund routine maintenance or the purchase of vehicles.`,
    items: [
      {
        statement: 'A project with eligible costs of €50,000 may receive a grant of €25,000.',
        key: 'T',
        why: '60% of €50,000 is €30,000, which is capped at the €25,000 maximum.',
      },
      {
        statement: 'A group that only leases its property, with four years remaining on the lease, may apply.',
        key: 'F',
        why: 'A group that does not own the property needs a lease with at least five years remaining.',
      },
      {
        statement: 'The grant may be used to replace a broken-down van.',
        key: 'F',
        why: 'The scheme does not fund the purchase of vehicles.',
      },
      {
        statement: 'A group is not excluded from applying merely because it received a grant three years ago.',
        key: 'T',
        why: 'The exclusion applies only to groups funded in the previous two years.',
      },
    ],
  },
  {
    id: 'training',
    title: 'Probationary training programme',
    text: `All new staff complete a probationary training programme within their first six months. The programme consists of four modules, of which two are mandatory for all grades and two depend on the role. Staff who have previously completed equivalent training with another public body may apply for an exemption from the mandatory modules, but not from the role-specific modules. Completion is recorded on the personnel file and is reviewed at the annual appraisal.`,
    items: [
      {
        statement: 'The programme must be completed within six months of starting.',
        key: 'T',
        why: '"within their first six months".',
      },
      {
        statement: 'An exemption may be granted from the role-specific modules.',
        key: 'F',
        why: 'Exemption is available for the mandatory modules "but not from the role-specific modules".',
      },
      {
        statement: 'A person who completed equivalent training elsewhere may be exempted from all four modules.',
        key: 'F',
        why: 'Exemption cannot cover the role-specific modules, so never all four.',
      },
      {
        statement: 'Staff who joined before the programme was introduced are exempt from it.',
        key: 'C',
        why: 'The passage says nothing about staff who joined earlier.',
      },
    ],
  },
  {
    id: 'bins',
    title: 'Household waste collection',
    text: `Households receive a green bin for recyclable material and a grey bin for general waste. Green bins are collected fortnightly and grey bins weekly. Bins must be presented at the kerbside by 7am on the collection day. A bin that contains material intended for the other bin will not be emptied, and a tag will be placed on it explaining why. Households may request a second green bin free of charge, but a second grey bin attracts an annual charge.`,
    items: [
      {
        statement: 'A household may have two green bins at no additional cost.',
        key: 'T',
        why: 'A second green bin is free of charge.',
      },
      {
        statement: 'Grey bins are collected twice as often as green bins.',
        key: 'T',
        why: 'Weekly against fortnightly is twice as often.',
      },
      {
        statement: 'A bin containing the wrong material is emptied and a warning tag attached.',
        key: 'F',
        why: 'Such a bin "will not be emptied"; the tag explains why.',
      },
      {
        statement: 'Bins presented after 7am will be collected the following week.',
        key: 'C',
        why: 'The passage gives the deadline but not the consequence of missing it.',
      },
    ],
  },
  {
    id: 'library',
    title: 'Library membership',
    text: `Membership is free for residents and for anyone working or studying in the county. Members may borrow up to twelve items at a time, of which no more than four may be DVDs. The standard loan period is three weeks, renewable twice unless the item has been reserved by another member. Items returned late incur a charge per item per week, capped at the replacement cost of the item.`,
    items: [
      {
        statement: 'A person who works in the county but lives elsewhere may join.',
        key: 'T',
        why: 'Membership is free for anyone working in the county.',
      },
      {
        statement: 'A member may borrow eight books and five DVDs at the same time.',
        key: 'F',
        why: 'No more than four items may be DVDs.',
      },
      {
        statement: 'An item that has been reserved by another member may still be renewed.',
        key: 'F',
        why: 'Renewal is allowed "unless the item has been reserved by another member".',
      },
      {
        statement: 'The late charge cannot exceed the cost of replacing the item.',
        key: 'T',
        why: 'The charge is "capped at the replacement cost of the item".',
      },
    ],
  },
  {
    id: 'tender',
    title: 'Procurement thresholds',
    text: `Contracts above €50,000 must be advertised on the national procurement website for a minimum of twenty-one days. Below that threshold, the body must seek at least three written quotations. A contract may not be split into smaller contracts in order to avoid the advertising requirement. Where only one quotation is received, the process may proceed if the officer records the reason in writing.`,
    items: [
      {
        statement: 'A contract worth €48,000 must be advertised on the national website.',
        key: 'F',
        why: 'The advertising requirement applies only above €50,000.',
      },
      {
        statement: 'A contract worth €120,000 must be advertised for at least three weeks.',
        key: 'T',
        why: 'Twenty-one days is three weeks.',
      },
      {
        statement: 'Splitting a contract to stay under the threshold is permitted with approval.',
        key: 'F',
        why: 'A contract "may not be split" for that purpose; no approval is provided for.',
      },
      {
        statement: 'Receiving a single quotation means the process must be restarted.',
        key: 'F',
        why: 'The process may proceed if the reason is recorded in writing.',
      },
    ],
  },
  {
    id: 'sickleave',
    title: 'Notification of sick leave',
    text: `Staff must notify their manager on the first day of absence, by telephone or in person, before 10am. A medical certificate is required for any absence longer than three days. Absences of three days or less may be self-certified. Where an absence exceeds four weeks, a return-to-work meeting must be held before the staff member resumes duty. Certificates must be submitted to HR within seven days of the absence ending.`,
    items: [
      {
        statement: 'Notification by email on the first day is sufficient.',
        key: 'F',
        why: 'Notification must be by telephone or in person.',
      },
      {
        statement: 'A four-day absence requires a medical certificate.',
        key: 'T',
        why: 'A certificate is required for any absence longer than three days.',
      },
      {
        statement: 'A return-to-work meeting is required after an absence of five weeks.',
        key: 'T',
        why: 'Five weeks exceeds four weeks, so the meeting is required before resuming duty.',
      },
      {
        statement: 'Self-certification is available for a five-day absence.',
        key: 'F',
        why: 'Self-certification covers three days or less; five days needs a certificate.',
      },
    ],
  },
  {
    id: 'dataprotection',
    title: 'Handling personal data',
    text: `Personal data must be collected only for specified and lawful purposes and must not be used for any other purpose without the consent of the individual. Data must be kept no longer than necessary. Individuals may request a copy of their data, and the body must respond within one month. A fee may not be charged for this unless the request is manifestly unfounded or excessive. Where a request is refused, the individual must be told the reason within the same period.`,
    items: [
      {
        statement: 'Data collected for one purpose may be used for another if the individual agrees.',
        key: 'T',
        why: 'Use for another purpose is permitted with the individual\u2019s consent.',
      },
      {
        statement: 'A fee is always charged when an individual requests a copy of their data.',
        key: 'F',
        why: 'A fee may not be charged unless the request is manifestly unfounded or excessive.',
      },
      {
        statement: 'A body may refuse a request without giving a reason.',
        key: 'F',
        why: 'The individual "must be told the reason" where a request is refused.',
      },
      {
        statement: 'A request made by a former employee falls outside the one-month response period.',
        key: 'F',
        why: 'The one-month period applies to requests from any individual, and the passage makes no exception for former employees.',
      },
    ],
  },
];
