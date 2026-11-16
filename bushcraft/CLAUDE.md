# Field Kit: rules for adding and changing lessons

Read this before adding a lesson, a model or an effect, so everything stays consistent.

## Audience and tone

- UK secondary students (11 to 18) and their teachers, on a school bushcraft course.
- UK English. Short, plain sentences a Year 7 can follow, without talking down to sixth formers.
- Safety comes first and is written as instructions, not warnings in passing.
- Separate law ("must") from good practice ("should"). Say who decides: usually "the adult in charge".
- UK specifics where they matter: landowner permission, the Countryside Code (and the
  Scottish Outdoor Access Code where different), UK knife law, UK plants and hazards,
  999 and 112, and registering for emergency SMS.

## Accuracy

- Check facts against primary sources (GOV.UK, NHS, the Forest School Association,
  Mountain Rescue England and Wales, the Countryside Code) before writing them. Add the
  source to the lesson's `sources` list. Never invent a URL.
- If something can't be verified, leave it out rather than guess.

## Lesson structure (`src/lessons/<id>.js`)

- 4 to 6 stages. Each stage has 3 to 5 steps.
- Stage fields: `title`, `card` (one or two words for the route), `lede` (one sentence),
  `steps`, `why` (2 to 5 short paragraphs), `safety` (3 to 5 bullets),
  `teacher: { say, ask }` and `check: { q, options, answer, why }` (three options, one answer).
- Step fields: `label` (imperative, at most 6 words), `callouts` (at most 4, at most 4 words each),
  and `run(d, k)`, which scripts the step with the Director (`show`, `hide`, `drop`, `move`,
  `arrive`, `to`, `camera`, `call`, `hold`) and returns the step's length in seconds.
- A step must work from a fresh build plus fast-forwarding all earlier steps, because
  that's how jumping around works. Never rely on state left by a later step.
- Each lesson has a grid reference on the practice map (`ref`) and a fictional place name.

## Art style

- Paper map underneath, a round clearing cut out of it, and kit built from code
  (`src/models/`). No downloaded model files.
- Soft daylight with real shadows. Materials matte (roughness 0.8 to 1), with gentle
  colour variation via `speckle`. Metal only for tools and the bowl.
- Natural colours for kit. The only loud colours are safety colours: fire-blanket red,
  first-aid green, hi-vis yellow (UI only) and the blue wind arrow.
- Scale: 1 unit is about 1 m. Small tools may be drawn up to 1.5× life size so they read on screen.
- UI tokens are in `src/styles.css` (`--ink`, `--paper`, `--hivis`, `--red`). Fonts:
  Archivo Narrow for labels and headings, Archivo for body text.

## Checking your work

Run `npm run build`, then look at every step you changed in a browser at desktop and
phone widths (390 × 844), in both student and teacher modes. Labels must not cover the
thing they point at, and nothing may block the camera.
