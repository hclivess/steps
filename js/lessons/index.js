// Every course on the site. To add a subject: write js/lessons/<subject>.js and list it here.
import { MATH } from './math.js';
import { PHYSICS } from './physics.js';
import { AI } from './ai.js';

export const COURSES = [...MATH, ...PHYSICS, ...AI];
