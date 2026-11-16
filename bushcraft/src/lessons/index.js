import fire from './fire.js';

// Lessons in course order. `soon` lessons are listed in the picker but not built yet.
export const lessons = [
  fire,
  {
    id: 'shelter',
    title: 'Building a shelter',
    short: 'Shelter',
    ref: '475 322',
    place: 'Camp 2, Beech Hanger',
    summary: 'Pick a safe site, rig a tarp shelter and build a debris shelter.',
    soon: true,
  },
  {
    id: 'navigation',
    title: 'Navigation and finding help',
    short: 'Navigation',
    ref: '491 309',
    place: 'Camp 3, Mill Pond',
    summary: 'Grid references, using a compass, what to do if you’re lost and how to call for help.',
    soon: true,
  },
];

export const byId = (id) => lessons.find((l) => l.id === id && !l.soon);
