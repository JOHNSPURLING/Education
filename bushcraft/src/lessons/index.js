import fire from './fire.js';
import shelter from './shelter.js';
import navigation from './navigation.js';

// Lessons in course order. `soon` lessons are listed in the picker but not built yet.
export const lessons = [
  fire,
  shelter,
  navigation,
];

export const byId = (id) => lessons.find((l) => l.id === id && !l.soon);
