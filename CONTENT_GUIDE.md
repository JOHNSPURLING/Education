# Content guide

This repository is a knowledge base on secondary education in England, for school
leaders and teachers. Every entry is one Markdown file in `content/<category>/<slug>.md`.
`npm run build` turns the entries into the searchable site in `docs/index.html`.

This file is the contract for anyone (human or AI) writing entries.

## Scope and audience

- **England, secondary phase (11–18)**. Mention primary only where needed for context.
- Readers are **senior leaders, middle leaders and classroom teachers**. Every entry
  should be usable: what it says, what to do about it, what to be careful of.
- UK English. Plain, direct prose. No padding, no marketing tone.

## Accuracy rules (non-negotiable)

1. **Verify before you write.** Check each entry against the primary source on the
   web (GOV.UK, EEF, Ofsted, the author's own book/site). Do not rely on memory for
   dates, version numbers, effect sizes, months-of-progress figures, legal duties or
   thresholds. Policy changes often: confirm the *current* version as of the date you
   are writing, and say which version/date you are describing.
2. **Only cite URLs you actually opened or that appeared in search results.** Never
   invent a URL. Prefer the canonical landing page (e.g. the GOV.UK publication page)
   over a deep PDF link.
3. **Separate what is statutory from what is advice from what is opinion.** Use
   "must" only for legal/statutory duties; "should" for guidance; attribute opinions.
4. **Be honest about evidence strength and disagreement.** Include the main
   critiques. If you could not verify something, say so in the entry
   (e.g. "Not verified: …") rather than guessing.
5. **Summarise in your own words.** No long quotations; at most one short quoted
   phrase (under 15 words) per source, and only when the exact wording matters.
6. For people: describe their published professional work and ideas only. Be fair;
   present critiques as critiques of ideas, attributed to who makes them.

## File format

File path: `content/<category>/<slug>.md`. The slug is the filename, lower-case,
hyphenated, and must match the master index below.

The file starts with YAML front matter. **Quote every string value with double
quotes** (titles and summaries often contain colons). Inside quoted strings use
single quotes rather than escaped double quotes.

```markdown
---
title: "Retrieval practice"
category: "teaching"
type: "topic"            # topic | guidance | person | source
summary: "One or two sentences that say what this is and why it matters. Max 240 characters."
status: "Evidence summary"   # see list below
evidence: "EEF Toolkit: +X months, low cost, moderate evidence"   # optional, one line, only if verified
tags: ["memory", "cognitive science", "quizzing"]     # 3-7 lower-case tags
last_checked: "2026-11-12"
sources:
  - title: "Exact title of the source"
    publisher: "Education Endowment Foundation"
    year: "2021"
    url: "https://..."
related: ["spaced-and-interleaved-practice", "barak-rosenshine"]   # slugs from the master index
---

## At a glance

- 4–6 bullets a busy reader can act on.

## What the evidence says

...
```

`status` must be one of:
`Statutory guidance` · `Non-statutory guidance` · `Legislation` · `Inspection framework` ·
`Evidence summary` · `Research and theory` · `Professional practice` · `Thinker profile` ·
`Organisation or publication`

### Body sections by type

Use `##` headings exactly as below (omit a section only if truly not applicable).
Aim for **450–900 words** of body per entry (sources: 250–500). Use bullets and
short paragraphs; tables only where they genuinely help. No `#` (h1) headings.

**topic**
`## At a glance` · `## What the evidence says` · `## In the classroom` ·
`## For leaders` · `## Cautions and critiques` · `## Go deeper`

**guidance** (statutory / non-statutory documents, frameworks, legislation)
`## At a glance` · `## Status and current version` (who it applies to, version, date,
what changed recently) · `## What schools must do` · `## In practice` ·
`## Common pitfalls` · `## Go deeper`

**person**
`## At a glance` · `## Who they are` · `## Core ideas` · `## Key works` (with years) ·
`## Putting it into practice` · `## Critiques and debate`

**source** (organisations, publications, websites)
`## At a glance` · `## What it is` · `## What it is useful for` · `## Key resources`
(with links in the sources list) · `## Using it critically`

"In the classroom" / "Putting it into practice" should be concrete: routines, steps,
example wording, what it looks like in a secondary lesson or a secondary school.
"For leaders" covers policy, implementation, monitoring, workload and cost.

## Categories

| slug | name |
|---|---|
| `teaching` | Teaching and instruction |
| `assessment` | Assessment, marking and feedback |
| `behaviour` | Behaviour and culture |
| `attendance` | Attendance and wellbeing |
| `safeguarding` | Safeguarding |
| `curriculum` | Curriculum |
| `literacy` | Literacy, oracy and numeracy |
| `send-inclusion` | SEND, inclusion and disadvantage |
| `ofsted-accountability` | Ofsted, accountability and compliance |
| `leadership` | Leadership and professional development |
| `thinkers` | Key thinkers |
| `sources` | Sources and organisations |

## Master index

Slugs are globally unique. Use these slugs in `related`. Adding an entry? Add its
slug here too.

**teaching** — rosenshine-principles-of-instruction, explicit-instruction, cognitive-load-theory,
retrieval-practice, spaced-and-interleaved-practice, questioning-and-cold-calling,
checking-for-understanding, modelling-and-worked-examples, scaffolding, adaptive-teaching,
metacognition-and-self-regulation, dual-coding, homework, collaborative-learning,
mastery-learning, great-teaching-toolkit, direct-instruction-engelmann, desirable-difficulties,
motivation-and-engagement, setting-streaming-and-grouping, learning-styles-and-neuromyths,
teach-like-a-champion-techniques, lesson-structure-and-planning, deliberate-practice-and-independent-practice,
eef-teaching-and-learning-toolkit, edtech-and-ai-in-teaching

**assessment** — eef-teacher-feedback-guidance, marking-policy-and-workload, whole-class-feedback,
formative-assessment-five-strategies, hinge-and-diagnostic-questions, live-marking-and-verbal-feedback,
self-and-peer-assessment, summative-assessment-and-data-collection, assessment-validity-and-reliability,
comparative-judgement, low-stakes-quizzing, ks3-assessment-after-levels, target-setting-and-flight-paths,
gcse-and-a-level-qualifications-system, exam-access-arrangements, nea-and-exam-malpractice,
revision-and-exam-preparation, reporting-to-parents, standardised-tests-and-baselines,
mock-exams-and-question-level-analysis

**behaviour** — behaviour-in-schools-guidance, suspension-and-permanent-exclusion, searching-screening-and-confiscation,
use-of-reasonable-force, mobile-phones-in-schools, eef-improving-behaviour-in-schools,
creating-a-culture-bennett-review, routines-and-norms, rewards-and-sanctions, de-escalation-and-scripts,
restorative-practice, low-level-disruption, removal-rooms-and-internal-suspension, preventing-bullying,
writing-a-behaviour-policy, behaviour-curriculum, warm-strict-and-high-expectations,
trauma-informed-and-attachment-aware-practice, managed-moves-and-off-site-direction, alternative-provision,
national-behaviour-survey, tutor-and-pastoral-systems, corridors-social-times-and-transitions,
behaviour-for-new-teachers

**attendance** — working-together-to-improve-attendance, persistent-and-severe-absence, attendance-registers-and-codes,
penalty-notices-and-legal-intervention, emotionally-based-school-avoidance, eef-attendance-interventions-review,
parental-engagement, attendance-data-and-monitoring, children-missing-education, part-time-timetables,
whole-school-attendance-strategy, mental-health-and-attendance, term-time-absence-and-punctuality,
elective-home-education, mental-health-and-wellbeing-in-schools, senior-mental-health-lead-and-mhsts,
transition-primary-to-secondary

**safeguarding** — keeping-children-safe-in-education, working-together-to-safeguard-children,
designated-safeguarding-lead, safer-recruitment-and-single-central-record, child-on-child-abuse-and-sexual-harassment,
online-safety-filtering-and-monitoring, prevent-duty, allegations-and-low-level-concerns,
child-protection-policy-and-procedures, safeguarding-records-and-information-sharing, early-help-and-thresholds,
child-exploitation-and-county-lines, fgm-forced-marriage-and-honour-based-abuse, looked-after-children-and-designated-teacher,
safeguarding-training-for-staff, sharing-nudes-and-youth-produced-imagery, ai-and-safeguarding,
site-security-visitors-and-trips, childrens-wellbeing-and-schools-act, gender-questioning-children-guidance,
serious-violence-and-knife-crime

**curriculum** — national-curriculum-secondary, curriculum-and-assessment-review, intent-implementation-impact,
knowledge-rich-curriculum, powerful-knowledge, substantive-and-disciplinary-knowledge,
curriculum-sequencing-and-coherence, ofsted-subject-research-reviews, key-stage-4-curriculum-and-ebacc,
key-stage-3-curriculum, rshe-statutory-guidance, careers-guidance-and-gatsby-benchmarks,
personal-development-and-enrichment, british-values-and-smsc, religious-education-and-collective-worship,
cultural-capital, subject-leadership-and-curriculum-quality-assurance, sixteen-to-nineteen-study-programmes,
generative-ai-in-education-guidance, curriculum-time-and-timetabling, citizenship-and-pshe

**literacy** — eef-improving-literacy-in-secondary-schools, disciplinary-literacy, struggling-readers-at-secondary,
reading-framework, vocabulary-instruction, reading-for-pleasure-and-tutor-time-reading,
reading-assessment-and-intervention, writing-instruction, oracy, eef-improving-mathematics-ks2-ks3,
numeracy-across-the-curriculum, eef-improving-secondary-science, whole-school-literacy-strategy,
national-year-of-reading-and-reading-policy

**send-inclusion** — send-code-of-practice, eef-send-in-mainstream-schools, graduated-approach,
education-health-and-care-plans, teaching-assistants, equality-act-and-reasonable-adjustments,
senco-role, autism, adhd, dyslexia-and-literacy-difficulties, speech-language-and-communication-needs,
social-emotional-and-mental-health-needs, send-reform, inclusion-in-ofsted-framework, pupil-premium-strategy,
tutoring-and-targeted-academic-support, english-as-an-additional-language, disadvantage-gap,
young-carers-and-vulnerable-groups, public-sector-equality-duty, high-attaining-pupils

**ofsted-accountability** — ofsted-education-inspection-framework, ofsted-report-cards-and-grading-scale,
ofsted-inspection-toolkit-and-evaluation-areas, ofsted-inspection-process, ofsted-safeguarding-in-inspection,
school-intervention-and-rise-teams, self-evaluation-and-inspection-readiness, previous-eif-2019-and-deep-dives,
progress-8-and-performance-measures, school-performance-data-tools, statutory-policies-for-schools,
school-website-requirements, ofsted-big-listen-and-reform, multi-academy-trust-accountability,
schools-white-paper, ofsted-annual-report, school-complaints-procedure, data-protection-in-schools,
health-and-safety-and-educational-visits

**leadership** — eef-implementation-guidance, school-improvement-planning, eef-effective-professional-development,
instructional-coaching, early-career-teacher-entitlement, teachers-standards, appraisal-and-capability,
national-professional-qualifications, headteachers-standards, school-governance, academy-trust-handbook,
staff-wellbeing-and-workload, flexible-working, teacher-recruitment-and-retention, student-centred-leadership,
leading-change-and-school-culture, middle-leadership, lesson-observation-and-quality-assurance,
teacher-pay-and-conditions, research-informed-practice, school-finance-and-icfp, line-management-and-meetings,
itt-and-mentoring

**thinkers** — paul-dix, bill-rogers, tom-bennett, doug-lemov, sam-strickland, katharine-birbalsingh,
mary-myatt, christine-counsell, michael-young, alex-quigley, daisy-christodoulou, viviane-robinson,
mark-finnis, e-d-hirsch, tom-sherrington, dylan-wiliam, barak-rosenshine, john-sweller, daniel-willingham,
robert-and-elizabeth-bjork, paul-kirschner, john-hattie, carol-dweck, peps-mccrea, kate-jones, adam-boxer,
david-didau, rob-coe, carl-hendrick, craig-barton, harry-fletcher-wood, siegfried-engelmann, lee-canter,
michael-fullan, andy-buck, becky-allen

**sources** — education-endowment-foundation, ofsted, department-for-education-and-gov-uk, schools-week, tes,
chartered-college-of-teaching, researched, teacher-tapp, fft-education-datalab, nfer, education-policy-institute,
evidence-based-education, oak-national-academy, ambition-institute, confederation-of-school-trusts,
ascl-naht-and-teaching-unions, national-governance-association, ofqual-and-jcq, nspcc-learning,
anna-freud-and-mental-health-sources, childrens-commissioner, sutton-trust, the-learning-scientists-and-deans-for-impact,
research-schools-network, the-key-and-policy-services, education-blogs-and-podcasts, national-institute-of-teaching,
institute-for-fiscal-studies-and-education-finance

## Adding or updating an entry

1. Create or edit the file under `content/<category>/`.
2. Update `last_checked` and the sources.
3. Run `npm run build` (it validates front matter and `related` slugs) and commit
   both the content and the rebuilt `docs/index.html`.
