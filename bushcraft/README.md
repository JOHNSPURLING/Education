# Field Kit: bushcraft lessons

Interactive 3D bushcraft lessons for UK secondary schools (KS3 to sixth form). Each
lesson plays as a short 3D demonstration on a practice map, broken into stages and
steps, with the reasons, the safety points and a quick check for each stage.

**Lessons:** Lighting a fire (built). Shelter, and Navigation & finding help (planned).

## Two modes

| | Student | Teacher |
|---|---|---|
| Playback | Runs through each stage on its own | Pauses after every step, so you can talk |
| Panel tabs | Steps, Why, Safety, Quick check | Steps, Why, Safety, Teaching notes |
| Text size | Normal | Larger, for a projector |

Switch with the toggle in the top right or press **T**. Other keys: **space** to play
or pause, **← →** to step, **R** to reset the view, **L** for the lesson list.

Links can point straight at a step, e.g. `?lesson=fire&stage=4&step=2&mode=teacher`.
**Print lesson card** prints a plain one-page summary of the whole lesson.

## The practice map

The background is a made-up stretch of countryside drawn like a walker's map: a
numbered grid, contours, woodland, a stream and footpaths. Every lesson has a grid
reference on it (fire is at 482 317), so moving between lessons is grid-reference practice.

## Running it

```bash
cd bushcraft
npm install
npm run dev       # local preview at http://localhost:5173
npm run build     # static site in bushcraft/dist
```

To host it on Vercel, import the repository and set the project's **Root Directory** to
`bushcraft`. Vercel detects Vite and builds it. Any static host works, because the
build uses relative paths.

## How it is built

| Path | What it is |
|---|---|
| `src/lessons/*.js` | One lesson per file: content (stages, steps, why, safety, teacher notes, checks) and the animation script for each step |
| `src/models/` | All 3D kit, built from code (no model files): fire bowl, logs, bucket, ferro rod… |
| `src/fx/fire.js` | Flames, embers, smoke, steam and sparks as GPU shaders |
| `src/engine/` | The timeline, the 3D world, the camera and the labels pinned to objects |
| `src/map.js` | The practice map |
| `CLAUDE.md` | The art style and content rules for anyone adding a lesson |

Three.js and Vite, no UI framework.

## Before using it with students

The content is a draft written for this first version. Check it against your school's
risk assessment, your outdoor learning and Educational Visits guidance, and your own
qualifications and practice. The adult in charge always has the final say.
