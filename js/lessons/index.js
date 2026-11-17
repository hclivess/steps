// Every course on the site. To add a subject: write js/lessons/<subject>.js and list it here.
import { FOUNDATIONS } from './foundations.js';
import { MATH } from './math.js';
import { PHYSICS } from './physics.js';
import { AI } from './ai.js';

export const COURSES = [...FOUNDATIONS, ...MATH, ...PHYSICS, ...AI];
