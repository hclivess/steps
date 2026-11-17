// Math foundations: equations, negative numbers, the coordinate plane, percents, proportion.
import { h, svg, choice, slider, drag, bars, grid } from '../ui.js';
import { solveLinear, percentOf, changeBy, scaleTo, mirror } from '../science.js';
import { plane } from './math.js';

const neg = (v) => (v < 0 ? '−' + -v : '' + v);            // a number with a real minus sign
const inBrackets = (v) => (v < 0 ? `(${neg(v)})` : '' + v);

// ---------- equations ----------
function balance(host, api) {
  const start = { boxes: 3, loose: 2, right: 14 };
  const weight = solveLinear(start.boxes, start.loose, 0, start.right);
  let { boxes, loose, right } = start, solved = false;
  const pic = svg('0 0 640 210');
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' });
  const units = (n, x) => Array.from({ length: n }, (_, i) => `<circle class="charge" cx="${x + (i % 7) * 22}" cy="${138 - Math.floor(i / 7) * 22}" r="9"/>`).join('');
  const draw = () => {
    let s = `<rect class="beam" x="40" y="150" width="560" height="8" rx="4"/><path class="beam" d="M320,158 l-22,40 h44 Z"/>`;
    for (let i = 0; i < boxes; i++) s += `<rect class="piece warm" x="${60 + i * 54}" y="102" width="46" height="46" rx="4"/><text class="svgtext" text-anchor="middle" x="${83 + i * 54}" y="130">${solved ? weight : '?'}</text>`;
    pic.innerHTML = s + units(loose, 72 + boxes * 54) + units(right, 380);
    read.textContent = `${boxes === 1 ? '' : boxes}x${loose ? ' + ' + loose : ''} = ${right}     x is the weight of one box, each dot weighs 1`;
  };
  const act = (label, fn) => h('button', { type: 'button', onclick: () => { if (!solved) { fn(); draw(); } } }, label);
  host.append(pic, h('div', { class: 'row' },
    act('Take 1 off both sides', () => {
      if (!loose) return api.miss('No loose weight is left on the left. Taking one from the right alone would tip the scale.');
      loose -= 1; right -= 1; api.note('Still level.');
    }),
    act('Take 1 off the right only', () => api.miss('The scale tips. Whatever you do to one side, you must do to the other.')),
    act('Share both sides into 3, keep one share', () => {
      if (loose) return api.miss('The loose weights on the left are in the way: 3 boxes and 2 dots do not make 3 equal shares of boxes. Clear the dots first.');
      right /= boxes; boxes = 1; solved = true;
      api.solve(`One box weighs ${weight}. Check: 3 × ${weight} + 2 = 14. Every move did the same thing to both sides, so the scale stayed level all the way. That is all solving an equation is.`);
    })), read);
  draw();
}

function bothSides(host, api) {
  const L = { a: 5, b: -3 }, R = { a: 2, b: 9 }, answer = solveLinear(L.a, L.b, R.a, R.b);
  let x = 0, solved = false;
  const chart = h('div', {});
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const left = L.a * x + L.b, right = R.a * x + R.b;
    chart.replaceChildren(bars([{ label: '5x − 3', score: left, mark: left === right }, { label: '2x + 9', score: right, mark: left === right }], 50));
    read.textContent = `x = ${x}:  left side ${neg(left)}, right side ${neg(right)}` + (left === right ? ', equal' : `, the ${left < right ? 'left' : 'right'} is ${Math.abs(left - right)} behind`);
    if (!solved && x === answer) { solved = true; api.solve(`At x = ${answer} both sides are ${left}. Each step of x adds 5 on the left and only 2 on the right, so the gap of 12 closes by 3 a step: 12 ÷ 3 = 4. The solution is the one x where the two sides agree.`); }
  };
  host.append(slider({ label: 'x', min: 0, max: 10, value: x, oninput: (v) => { x = v; draw(); } }), chart, read);
  draw();
}

// ---------- negative numbers ----------
function numberLine(min, max, y = 80) {
  const X = (v) => 20 + ((v - min) * 600) / (max - min);
  const every = max - min > 40 ? 10 : 5;
  let s = `<line class="axis" x1="20" y1="${y}" x2="620" y2="${y}"/>`;
  for (let v = min; v <= max; v++) {
    const big = v % every === 0;
    s += `<line class="${v === 0 ? 'tick' : 'gridline'}" x1="${X(v)}" y1="${y - (big ? 8 : 4)}" x2="${X(v)}" y2="${y + (big ? 8 : 4)}"/>`;
    if (big) s += `<text class="svgtext" text-anchor="middle" x="${X(v)}" y="${y + 26}">${neg(v)}</text>`;
  }
  return { X, y, base: s };
}
const hop = (N, from, to) => `<path class="helper" d="M${N.X(from)},${N.y} Q${(N.X(from) + N.X(to)) / 2},${N.y - 46} ${N.X(to)},${N.y}"/>`;

function walk(host, api) {
  const start = 3, goal = -4, N = numberLine(-10, 15);
  let add = 0, solved = false;
  const pic = svg('0 0 640 120');
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const end = start + add;
    pic.innerHTML = N.base + `<circle class="target" cx="${N.X(goal)}" cy="${N.y}" r="7"/>` + (add ? hop(N, start, end) : '') + `<circle class="ball" cx="${N.X(end)}" cy="${N.y}" r="7"/>`;
    read.textContent = `${start} + ${inBrackets(add)} = ${neg(end)}`;
    if (!solved && end === goal) { solved = true; api.solve('Adding −7 is walking 7 steps to the left. From 3, the first three steps reach zero and four more go below it.'); }
  };
  host.append(pic, slider({ label: 'the number you add', min: -10, max: 10, value: add, show: neg, oninput: (v) => { add = v; draw(); } }), read);
  draw();
}

function hops(host, api) {
  const goal = 12, N = numberLine(-36, 36);
  let a = 2, b = 3, solved = false;
  const pic = svg('0 0 640 120');
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const step = a < 0 ? -b : b;
    let s = N.base;
    for (let i = 0; i < Math.abs(a); i++) s += hop(N, i * step, (i + 1) * step);
    pic.innerHTML = s + `<circle class="ball" cx="${N.X(a * b)}" cy="${N.y}" r="7"/>`;
    read.textContent = `${inBrackets(a)} × ${inBrackets(b)} = ${neg(a * b)}:  ${Math.abs(a)} hop${Math.abs(a) === 1 ? '' : 's'} of ${neg(b)}` + (a < 0 ? ', each one turned around' : '');
    if (!solved && a < 0 && b < 0 && a * b === goal) { solved = true; api.solve('A negative number of hops means: hop the opposite way. The opposite of going left is going right, so minus times minus is plus.'); }
    else if (!solved) api.note(a * b === goal ? 'That is 12, but the task asks for two negative numbers.' : '');
  };
  host.append(pic,
    slider({ label: 'how many hops', min: -6, max: 6, value: a, show: neg, oninput: (v) => { a = v; draw(); } }),
    slider({ label: 'the size of a hop', min: -6, max: 6, value: b, show: neg, oninput: (v) => { b = v; draw(); } }), read);
  draw();
}

// ---------- the coordinate plane ----------
function point(host, api, { goal, dots = [], done }) {
  const lim = 6, S = 26, P = plane({ x0: -lim, x1: lim, y0: -lim, y1: lim, S });
  const p = { x: 2, y: -1 };
  let solved = false;
  const pic = svg(P.box, P.grid + dots.map((d) => `<circle class="target" r="7" cx="${P.X(d.x)}" cy="${P.Y(d.y)}"/>`).join('') + `<path id="legs" class="helper"/><circle id="p" class="handle" r="10"/>`);
  pic.classList.add('board');
  const read = h('p', { class: 'readout' });
  const across = slider({ label: 'across (first number)', min: -lim, max: lim, value: p.x, show: neg, oninput: (v) => { p.x = v; draw(); } });
  const up = slider({ label: 'up (second number)', min: -lim, max: lim, value: p.y, show: neg, oninput: (v) => { p.y = v; draw(); } });
  const draw = () => {
    const dot = pic.querySelector('#p');
    dot.setAttribute('cx', P.X(p.x)); dot.setAttribute('cy', P.Y(p.y));
    pic.querySelector('#legs').setAttribute('d', `M${P.X(0)},${P.Y(0)} H${P.X(p.x)} V${P.Y(p.y)}`);
    across.set(p.x); up.set(p.y);
    read.textContent = `(${neg(p.x)}, ${neg(p.y)}):  ${Math.abs(p.x)} ${p.x < 0 ? 'left' : 'right'}, then ${Math.abs(p.y)} ${p.y < 0 ? 'down' : 'up'}`;
    if (!solved && p.x === goal.x && p.y === goal.y) { solved = true; api.solve(done); }
  };
  const clamp = (v) => Math.max(-lim, Math.min(lim, Math.round(v)));
  drag(pic, pic.querySelector('#p'), (at) => { p.x = clamp(at.x / S - lim); p.y = clamp(lim - at.y / S); draw(); });
  host.append(pic, across, up, read);
  draw();
}

// ---------- percents ----------
function shade(host, api) {
  const whole = 80, want = 20;
  let p = 50, solved = false;
  const box = h('div', {});
  const read = h('p', { class: 'readout' });
  const draw = () => {
    box.replaceChildren(grid(Array.from({ length: 100 }, (_, i) => (i < p ? 1 : 0)), 10));
    read.textContent = `${p} % means ${p} of every 100. Of ${whole} pupils that is ${percentOf(p, whole)}.`;
    if (!solved && percentOf(p, whole) === want) { solved = true; api.solve('20 out of 80 is one quarter, and a quarter of 100 is 25: so 25 %. A percent is a share, counted as if the whole were 100.'); }
  };
  host.append(box, slider({ label: 'shaded', min: 0, max: 100, step: 5, value: p, show: (v) => v + ' %', oninput: (v) => { p = v; draw(); } }), read);
  draw();
}

function upDown(host, api) {
  const start = 200, rise = 25, high = changeBy(start, rise);
  let cut = 0, solved = false;
  const chart = h('div', {});
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const now = changeBy(high, -cut);
    chart.replaceChildren(bars([{ label: 'at the start', score: start }, { label: `after +${rise} %`, score: high }, { label: `after −${cut} %`, score: now, mark: true }], 300));
    read.textContent = `${cut} % of ${high} is ${percentOf(cut, high)}, so the price is now ${now}` + (now === start ? ': back at the start' : now < start ? ': below the start' : ': still above the start');
    if (!solved && now === start) { solved = true; api.solve(`The rise was ${rise} % of ${start}, which is ${high - start}. The cut is counted from ${high}, and ${high - start} is only ${cut} % of ${high}. With percents, always ask: percent of what?`); }
  };
  host.append(chart, slider({ label: 'the price cut', min: 0, max: 50, value: cut, show: (v) => v + ' %', oninput: (v) => { cut = v; draw(); } }), read);
  draw();
}

// ---------- proportion ----------
function recipe(host, api) {
  const flourFor = 300, serves = 4, people = 10, need = scaleTo(flourFor, serves, people);
  let flour = flourFor, solved = false;
  const chart = h('div', {});
  const read = h('p', { class: 'readout' });
  const draw = () => {
    chart.replaceChildren(bars([{ label: 'recipe, g a head', score: flourFor / serves }, { label: 'yours, g a head', score: flour / people, mark: true }], 100));
    read.textContent = `recipe: ${flourFor} g for ${serves} = ${flourFor / serves} g a head   ·   yours: ${flour} g for ${people} = ${flour / people} g a head`;
    if (!solved && flour === need) { solved = true; api.solve(`${people} people is 2.5 times ${serves} people, so the flour is taken 2.5 times too: ${flourFor} × 2.5 = ${need} g. Or: ${flourFor / serves} g a head, times ${people}. Both ways keep the same share for everyone.`); }
    else if (!solved) api.note(flour < need ? 'Thinner than the recipe: less flour a head.' : 'Thicker than the recipe: more flour a head.');
  };
  host.append(chart, slider({ label: 'flour for 10 people', min: 100, max: 1000, step: 50, value: flour, show: (v) => v + ' g', oninput: (v) => { flour = v; draw(); } }), read);
  draw();
}

function constant(host, api) {
  const P = plane({ x0: 0, x1: 8, y0: 0, y1: 10, S: 30 });
  const dots = [{ x: 2, y: 3 }, { x: 4, y: 6 }, { x: 6, y: 9 }];
  let k = 1, solved = false;
  const pic = svg(P.box, P.grid + `<line id="ln" class="curve"/>` + dots.map((d) => `<circle class="target" r="7" cx="${P.X(d.x)}" cy="${P.Y(d.y)}"/>`).join(''));
  pic.classList.add('board');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const endX = Math.min(8, 10 / k), ln = pic.querySelector('#ln');
    ln.setAttribute('x1', P.X(0)); ln.setAttribute('y1', P.Y(0)); ln.setAttribute('x2', P.X(endX)); ln.setAttribute('y2', P.Y(k * endX));
    const hit = dots.filter((d) => k * d.x === d.y).length;
    read.textContent = `up = ${k} × across   ·   the line goes through ${hit} of the 3 dots`;
    if (!solved && hit === dots.length) { solved = true; api.solve('Every dot is 1.5 times as high as it is far across: 3 ÷ 2 = 6 ÷ 4 = 9 ÷ 6 = 1.5. Things in proportion lie on a straight line through the corner where both are zero.'); }
  };
  host.append(pic, slider({ label: 'how many times', min: 0.5, max: 3, step: 0.25, value: k, oninput: (v) => { k = v; draw(); } }), read);
  draw();
}

export const FOUNDATIONS = [{
  id: 'math-foundations', subject: 'Math', title: 'Numbers for every day',
  blurb: 'Keep a scale level, walk below zero, find a point, and ask what a percent is a percent of.',
  lessons: [
    { id: 'equations', title: 'Solving equations', screens: [
      { title: 'Keep it level', text: 'Three equal boxes and two loose weights balance fourteen weights.<br><b>Your task:</b> find what one box weighs, without ever tipping the scale.', mount: balance },
      { title: 'Where two sides agree', text: 'An equation says that two sides are worth the same. Often that is true for one x only.<br><b>Your task:</b> find the x for which 5x − 3 and 2x + 9 are equal.', mount: bothSides },
      { title: 'Check yourself', text: 'Solve <b>2x + 5 = 17</b>.',
        mount: (host, api) => choice(host, api, { options: ['x = 6', 'x = 11', 'x = 12'], correct: 0,
          why: 'Take 5 off both sides: 2x = 12. Halve both sides: x = 6.', wrong: { 1: 'That takes off the 5 and the 2 one after the other. The 2 multiplies x: undo it by dividing.', 2: '12 is 2x, after the 5 is gone. One more move: halve both sides.' } }) },
    ] },
    { id: 'negatives', title: 'Negative numbers', screens: [
      { title: 'Below zero', text: 'Numbers go on to the left of zero. Adding a negative number walks left.<br><b>Your task:</b> start at 3 and land on the green dot at −4.', mount: walk },
      { title: 'Predict first', text: 'What is <b>5 − (−3)</b>?',
        mount: (host, api) => choice(host, api, { options: ['2', '8', '−8'], correct: 1,
          why: 'Eight. Taking away a debt of 3 leaves you 3 better off: subtracting a negative is adding.', wrong: { 0: 'That is 5 − 3. Here a negative 3 is taken away.' } }) },
      { title: 'Minus times minus', text: 'Multiplying is hopping: how many hops, and how big.<br><b>Your task:</b> land on 12 using two negative numbers.', mount: hops },
    ] },
    { id: 'plane', title: 'The coordinate plane', screens: [
      { title: 'Two numbers, one place', text: 'A point has two numbers: first how far across, then how far up. Left and down are negative.<br><b>Your task:</b> drag the point to (−3, 2), or use the sliders.',
        mount: (host, api) => point(host, api, { goal: { x: -3, y: 2 }, done: 'Three to the left, two up. The order matters: (2, −3) is a different place.' }) },
      { title: 'In the mirror', text: 'The upright axis is a mirror.<br><b>Your task:</b> put the point where the green dot would see itself.',
        mount: (host, api) => point(host, api, { goal: mirror({ x: 4, y: 3 }, 'upright'), dots: [{ x: 4, y: 3 }], done: '(4, 3) becomes (−4, 3). The mirror swaps left and right, so only the first number changes its sign.' }) },
      { title: 'Check yourself', text: 'Which point lies on the flat axis?',
        mount: (host, api) => choice(host, api, { options: ['(0, 5)', '(5, 0)', '(5, 5)'], correct: 1,
          why: 'Its second number is 0: it has not gone up or down at all.', wrong: { 0: 'That one has not gone across at all: it sits on the upright axis.' } }) },
    ] },
    { id: 'percents', title: 'Percents', screens: [
      { title: 'Predict first', text: 'A price goes up by 50 %, then down by 50 %. Compared with the start it is now…',
        mount: (host, api) => choice(host, api, { options: ['the same', 'lower', 'higher'], correct: 1,
          why: 'Lower. 100 becomes 150, and half of 150 is 75. The second 50 % is taken from a bigger number.', wrong: { 0: 'Try it with 100: up to 150, then half of that.' } }) },
      { title: 'Out of a hundred', text: 'A school has 80 pupils and 20 of them cycle.<br><b>Your task:</b> shade the percent of pupils who cycle.', mount: shade },
      { title: 'Up, then back', text: 'A price of 200 has gone up by 25 %.<br><b>Your task:</b> find the cut that brings it back to exactly 200.', mount: upDown },
    ] },
    { id: 'proportion', title: 'Proportion', screens: [
      { title: 'Cooking for more', text: 'A recipe for 4 people takes 300 g of flour. Ten people are coming.<br><b>Your task:</b> set the flour so that everyone gets the same as in the recipe.', mount: recipe },
      { title: 'Predict first', text: 'A child is 90 cm tall at the age of 3. How tall will the child be at 6?',
        mount: (host, api) => choice(host, api, { options: ['180 cm', '135 cm', 'Scaling cannot answer this'], correct: 2,
          why: 'Height does not grow in step with age. Scaling works only when doubling one thing always doubles the other.', wrong: { 0: 'Then a 12-year-old would be 3.6 m tall.', 1: 'That is a guess, not a rule: nothing ties the two numbers together.' } }) },
      { title: 'Always the same number of times', text: 'Three measurements are marked with dots.<br><b>Your task:</b> find the one number that turns every dot\'s "across" into its "up".', mount: constant },
    ] },
  ],
}];
