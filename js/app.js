// The shell: a home page listing the courses and a runner that shows one screen of a lesson at a time.
// Addresses: #/  ·  #/<course>/<lesson>  ·  #/<course>/<lesson>/<screen number>
import { COURSES } from './lessons/index.js';
import { h } from './ui.js';

const app = document.getElementById('app');
const KEY = 'steps.done';
const ALL = COURSES.flatMap((c) => c.lessons.map((l) => ({ course: c, lesson: l, key: `${c.id}/${l.id}` })));

function done() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}
function markDone(key) {
  try { localStorage.setItem(KEY, JSON.stringify([...done().add(key)])); } catch { /* private window: progress is just not kept */ }
}

function home() {
  const finished = done();
  const subjects = [...new Set(COURSES.map((c) => c.subject))];
  document.title = 'Steps: learn by doing';
  app.replaceChildren(
    h('header', { class: 'hero' },
      h('h1', {}, 'Steps'),
      h('p', { class: 'tagline' }, 'Learn by doing. One idea per screen, and something to try on every one.'),
      h('p', { class: 'free' }, 'Free. No account, no ads, nothing to install.'),
      h('p', { class: 'count' }, `${finished.size} of ${ALL.length} lessons done`)),
    ...subjects.map((subject) => h('section', { class: 'subject' }, h('h2', {}, subject),
      COURSES.filter((c) => c.subject === subject).map((c) => h('div', { class: 'course' },
        h('h3', {}, c.title), h('p', { class: 'blurb' }, c.blurb),
        h('div', { class: 'tiles' }, c.lessons.map((l, i) => h('a', { class: 'tile' + (finished.has(`${c.id}/${l.id}`) ? ' done' : ''), href: `#/${c.id}/${l.id}` },
          h('span', { class: 'num' }, finished.has(`${c.id}/${l.id}`) ? '✓' : i + 1), h('span', {}, l.title)))))))),
    h('footer', {}, 'Made in plain JavaScript. ', h('a', { href: 'https://github.com/hclivess/steps' }, 'Source, and how to add a lesson')));
}

function lessonPage(entry, index) {
  const { course, lesson, key } = entry;
  const total = lesson.screens.length;
  const bar = h('div', { class: 'topbar' }, h('a', { href: '#/', class: 'back' }, '← All lessons'),
    h('span', { class: 'where' }, `${course.subject} · ${lesson.title}`),
    h('span', { class: 'dots' }, lesson.screens.map((_, i) => h('i', { class: i < index ? 'past' : i === index ? 'now' : '' }))));
  document.title = `${lesson.title} · Steps`;

  if (index >= total) {
    markDone(key);
    const next = ALL[ALL.indexOf(entry) + 1];
    app.replaceChildren(bar, h('article', { class: 'card finish' }, h('div', { class: 'tick' }, '✓'), h('h2', {}, 'Lesson done'),
      h('p', { class: 'lead' }, lesson.title),
      h('div', { class: 'foot' }, h('a', { class: 'button', href: '#/' }, 'All lessons'),
        next ? h('a', { class: 'button primary', href: `#/${next.key}` }, `Next: ${next.lesson.title}`) : '')));
    return;
  }

  const screen = lesson.screens[index];
  const feedback = h('p', { class: 'feedback', hidden: true });
  const next = h('a', { class: 'button primary next off', href: `#/${key}/${index + 2}` }, index + 1 < total ? 'Continue' : 'Finish');
  next.addEventListener('click', (ev) => { if (next.classList.contains('off')) ev.preventDefault(); });
  let solved = false;
  const say = (kind, message) => { feedback.hidden = !message; feedback.className = 'feedback ' + kind; feedback.textContent = message || ''; };
  const api = {
    solve(message) { solved = true; say('good', message); next.classList.remove('off'); },
    miss(message) { if (!solved) say('bad', message); },
    note(message) { if (!solved) say('', message); },
  };
  const stage = h('div', { class: 'stage' });
  app.replaceChildren(bar, h('article', { class: 'card' }, h('h2', {}, screen.title), h('p', { class: 'lead', html: screen.text }), stage, feedback, h('div', { class: 'foot' }, next)));
  screen.mount(stage, api);
}

function route() {
  const [courseId, lessonId, n] = location.hash.replace(/^#\/?/, '').split('/');
  const entry = ALL.find((e) => e.key === `${courseId}/${lessonId}`);
  if (!entry) home(); else lessonPage(entry, Math.max(0, (parseInt(n, 10) || 1) - 1));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
