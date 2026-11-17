// Math: slope, the right triangle, chance.
import { h, svg, choice, slider, drag, bars, round } from '../ui.js';
import { slope, hypotenuse, coin, die, sameFraction, roots, waysToSum, atLeastOnce } from '../science.js';

// ---------- slope: a line through two points you can drag ----------
function slopeBoard(host, api, goal) {
  const S = 30, N = 10;                                     // 30 units per square, 10 squares each way
  const X = (x) => x * S, Y = (y) => (N - y) * S;
  const pts = [{ x: 2, y: 3 }, { x: 7, y: 4 }];
  let lines = '';
  for (let i = 0; i <= N; i++) lines += `<line class="gridline" x1="${X(i)}" y1="0" x2="${X(i)}" y2="${N * S}"/><line class="gridline" x1="0" y1="${Y(i)}" x2="${N * S}" y2="${Y(i)}"/>`;
  const board = svg(`-6 -6 ${N * S + 12} ${N * S + 12}`, `${lines}
    <line id="ln" class="curve"/><path id="rise" class="helper"/>
    <text id="runT" class="svgtext"></text><text id="riseT" class="svgtext"></text>
    <circle id="p0" class="handle" r="9"/><circle id="p1" class="handle" r="9"/>`);
  board.classList.add('board');
  const read = h('p', { class: 'readout' });
  const $ = (id) => board.querySelector('#' + id);
  let solved = false;
  const draw = () => {
    const [a, b] = pts[0].x <= pts[1].x ? pts : [pts[1], pts[0]];
    const m = slope(a, b);
    pts.forEach((p, i) => { $('p' + i).setAttribute('cx', X(p.x)); $('p' + i).setAttribute('cy', Y(p.y)); });
    if (m === null) {
      $('ln').setAttribute('x1', X(a.x)); $('ln').setAttribute('x2', X(a.x)); $('ln').setAttribute('y1', 0); $('ln').setAttribute('y2', N * S);
      $('rise').setAttribute('d', ''); $('runT').textContent = ''; $('riseT').textContent = '';
      read.textContent = 'Straight up: the line never goes sideways, so it has no slope number.';
      return;
    }
    $('ln').setAttribute('x1', X(0)); $('ln').setAttribute('y1', Y(a.y - m * a.x));
    $('ln').setAttribute('x2', X(N)); $('ln').setAttribute('y2', Y(a.y + m * (N - a.x)));
    $('rise').setAttribute('d', `M${X(a.x)},${Y(a.y)} H${X(b.x)} V${Y(b.y)}`);
    $('runT').setAttribute('x', X((a.x + b.x) / 2) - 18); $('runT').setAttribute('y', Y(a.y) + 16);
    $('runT').textContent = `run ${b.x - a.x}`;
    $('riseT').setAttribute('x', X(b.x) + 6); $('riseT').setAttribute('y', Y((a.y + b.y) / 2) + 4);
    $('riseT').textContent = `rise ${b.y - a.y}`;
    read.textContent = `slope = rise ÷ run = ${b.y - a.y} ÷ ${b.x - a.x} = ${round(m)}`;
    if (!solved && goal(m)) { solved = true; api.solve(goal.done); }
  };
  pts.forEach((p, i) => drag(board, $('p' + i), (at) => {
    p.x = Math.max(0, Math.min(N, Math.round(at.x / S)));
    p.y = Math.max(0, Math.min(N, Math.round(N - at.y / S)));
    draw();
  }));
  host.append(board, read);
  draw();
}

// ---------- the right triangle ----------
function triangle(host, api, goal) {
  let a = 3, b = 4, solved = false;
  const pic = svg('0 0 320 220');
  pic.classList.add('board', 'small');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const s = 190 / Math.max(a, b, 6);
    const x0 = 40, y0 = 200;
    pic.innerHTML = `<path class="shape" d="M${x0},${y0} h${a * s} v${-b * s} Z"/>
      <path class="helper" d="M${x0 + a * s - 10},${y0} v-10 h10"/>
      <text class="svgtext" x="${x0 + (a * s) / 2 - 12}" y="${y0 + 16}">a = ${a}</text>
      <text class="svgtext" x="${x0 + a * s + 6}" y="${y0 - (b * s) / 2}">b = ${b}</text>
      <text class="svgtext strong" x="${x0 + (a * s) / 2 - 50}" y="${y0 - (b * s) / 2 - 8}">c = ${round(hypotenuse(a, b))}</text>`;
    read.textContent = `a² + b² = ${a * a} + ${b * b} = ${a * a + b * b}, and c = √${a * a + b * b} = ${round(hypotenuse(a, b))}`;
    if (!solved && goal(a, b)) { solved = true; api.solve(goal.done); }
  };
  host.append(pic,
    slider({ label: 'side a', min: 1, max: 15, value: a, oninput: (v) => { a = v; draw(); } }),
    slider({ label: 'side b', min: 1, max: 15, value: b, oninput: (v) => { b = v; draw(); } }), read);
  draw();
}

// ---------- chance ----------
function coins(host, api) {
  const flip = coin(7);
  let heads = 0, total = 0, sawSmall = false;
  const strip = h('div', { class: 'coins' });
  const read = h('p', { class: 'readout' }, 'No flips yet.');
  const meter = h('div', { class: 'meter' }, h('i'), h('b'));
  const add = (n) => {
    for (let i = 0; i < n; i++) {
      const hd = flip();
      heads += hd; total += 1;
      if (total <= 60) strip.append(h('i', { class: hd ? 'heads' : 'tails' }, hd ? 'H' : 'T'));
    }
    const share = heads / total;
    meter.firstChild.style.width = share * 100 + '%';
    read.textContent = `${total} flips, ${heads} heads: ${round(share * 100, 1)} % heads` + (total > 60 ? ' (only the first 60 coins are drawn)' : '');
    if (total <= 20) sawSmall = true;
    if (total >= 1000) api.solve(`After ${total} flips the share sits close to 50 %. Each flip is still pure luck; only the long run is predictable.`);
    else api.note(sawSmall && total <= 20 ? 'With so few flips the share jumps around. Keep flipping.' : 'Getting steadier. Go on to 1000.');
  };
  host.append(h('div', { class: 'row' },
    h('button', { type: 'button', onclick: () => add(1) }, 'Flip 1'),
    h('button', { type: 'button', onclick: () => add(10) }, 'Flip 10'),
    h('button', { class: 'primary', type: 'button', onclick: () => add(100) }, 'Flip 100')),
  strip, meter, read);
}

// ---------- fractions ----------
// One bar cut into d pieces with the first n filled.
const fracBar = (y, n, d, label, cls = 'on') => {
  const x0 = 30, W = 580, w = W / d;
  let s = `<text class="svgtext" x="${x0}" y="${y - 8}">${label}</text>`;
  for (let i = 0; i < d; i++) s += `<rect class="piece${i < n ? ' ' + cls : ''}" x="${x0 + i * w}" y="${y}" width="${w}" height="40"/>`;
  return s;
};

function sameAmount(host, api) {
  const goal = { n: 3, d: 4 };
  let n = 1, d = 2, solved = false;
  const pic = svg('0 0 640 170');
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    pic.innerHTML = fracBar(28, goal.n, goal.d, `the goal: ${goal.n}/${goal.d}`, 'warm') + fracBar(110, n, d, `yours: ${n}/${d}`);
    const same = sameFraction(n, d, goal.n, goal.d);
    read.textContent = `${n} of ${d} pieces` + (same ? `: the same amount as ${goal.n}/${goal.d}` : n * goal.d < d * goal.n ? ': less than the goal' : ': more than the goal');
    if (same && d === goal.d) api.note('That is the goal itself. Find a different pair of numbers that fills the same amount.');
    else if (same && !solved) { solved = true; api.solve(`${n}/${d} = ${goal.n}/${goal.d}. Cutting every piece into ${d / goal.d} gives ${d / goal.d} times as many pieces and ${d / goal.d} times as many filled: the amount stays.`); }
    else if (!solved) api.note('');
  };
  const top = slider({ label: 'filled pieces (top number)', min: 0, max: 12, value: n, oninput: (v) => { n = Math.min(v, d); top.set(n); draw(); } });
  const bottom = slider({ label: 'pieces in the whole (bottom number)', min: 1, max: 12, value: d, oninput: (v) => { d = v; n = Math.min(n, d); top.set(n); draw(); } });
  host.append(pic, top, bottom, read);
  draw();
}

function commonPieces(host, api) {
  let pieces = 1, solved = false;
  const x0 = 30, W = 580;
  const pic = svg('0 0 640 250');
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' });
  const cuts = (y) => Array.from({ length: pieces + 1 }, (_, i) => `<line class="cut" x1="${x0 + (i * W) / pieces}" y1="${y}" x2="${x0 + (i * W) / pieces}" y2="${y + 40}"/>`).join('');
  const bar = (y, parts, label) => `<text class="svgtext" x="${x0}" y="${y - 8}">${label}</text><rect class="piece" x="${x0}" y="${y}" width="${W}" height="40"/>` +
    parts.map(([from, size, cls]) => `<rect class="piece ${cls}" x="${x0 + from * W}" y="${y}" width="${size * W}" height="40"/>`).join('') + cuts(y);
  const draw = () => {
    const fits2 = pieces % 2 === 0, fits3 = pieces % 3 === 0;
    pic.innerHTML = bar(28, [[0, 1 / 2, 'on']], '1/2') + bar(108, [[0, 1 / 3, 'warm']], '1/3') + bar(188, [[0, 1 / 2, 'on'], [1 / 2, 1 / 3, 'warm']], '1/2 + 1/3');
    if (fits2 && fits3) {
      read.textContent = `${pieces} pieces: 1/2 = ${pieces / 2}/${pieces} and 1/3 = ${pieces / 3}/${pieces}, together ${pieces / 2 + pieces / 3}/${pieces}`;
      if (!solved) { solved = true; api.solve(`Both fit the same cuts, so now the pieces can be counted: ${pieces / 2} + ${pieces / 3} = ${pieces / 2 + pieces / 3} pieces out of ${pieces}. Fractions are added by first giving them the same bottom number.`); }
    } else {
      read.textContent = `${pieces} piece${pieces === 1 ? '' : 's'}: ` + (fits2 ? 'the half ends on a cut, the third does not' : fits3 ? 'the third ends on a cut, the half does not' : 'neither the half nor the third ends on a cut');
    }
  };
  host.append(pic, slider({ label: 'cut every bar into', min: 1, max: 12, value: pieces, show: (v) => v + (v === 1 ? ' piece' : ' pieces'), oninput: (v) => { pieces = v; draw(); } }), read);
  draw();
}

// ---------- functions ----------
function machine(host, api) {
  const rule = (x) => 2 * x + 1;
  const seen = new Map([[2, rule(2)]]);
  const read = h('p', { class: 'readout' });
  const show = () => { read.textContent = 'seen so far:   ' + [...seen].map(([x, y]) => `${x} → ${y}`).join('   ·   '); };
  host.append(slider({ label: 'put in', min: -5, max: 5, value: 2, show: (v) => `${v}  →  out comes ${rule(v)}`, oninput: (v) => { seen.set(v, rule(v)); show(); } }), read);
  show();
  choice(host, api, { options: ['x + 3', '2x + 1', '3x − 1'], correct: 1,
    why: 'Double it, then add one. All three rules give 5 for the input 2, so one try could not tell them apart. A function is the rule, not one pair of numbers.',
    wrong: { 0: 'Put in 0. With x + 3 the machine would give 3. What does it give?', 2: 'Put in 0. With 3x − 1 the machine would give −1. What does it give?' } });
}

// A squared-paper plane. Gives the drawing of the grid and the two functions that place a point on it.
export function plane({ x0, x1, y0, y1, S = 30 }) {
  const X = (x) => (x - x0) * S, Y = (y) => (y1 - y) * S;
  let grid = '';
  for (let x = x0; x <= x1; x++) grid += `<line class="${x === 0 ? 'axis' : 'gridline'}" x1="${X(x)}" y1="0" x2="${X(x)}" y2="${Y(y0)}"/>`;
  for (let y = y0; y <= y1; y++) grid += `<line class="${y === 0 ? 'axis' : 'gridline'}" x1="0" y1="${Y(y)}" x2="${X(x1)}" y2="${Y(y)}"/>`;
  return { X, Y, grid, box: `-6 -6 ${X(x1) + 12} ${Y(y0) + 12}` };
}
export const sign = (v) => (v < 0 ? `− ${-v}` : `+ ${v}`);

function lineFit(host, api) {
  const P = plane({ x0: -6, x1: 6, y0: -6, y1: 6, S: 26 });
  const dots = [{ x: 1, y: 1 }, { x: 3, y: 5 }];
  let m = 0.5, b = 3, solved = false;
  const pic = svg(P.box, P.grid + `<line id="ln" class="curve"/>` + dots.map((d) => `<circle class="target" r="7" cx="${P.X(d.x)}" cy="${P.Y(d.y)}"/>`).join(''));
  pic.classList.add('board');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const ln = pic.querySelector('#ln');
    ln.setAttribute('x1', P.X(-6)); ln.setAttribute('y1', P.Y(m * -6 + b)); ln.setAttribute('x2', P.X(6)); ln.setAttribute('y2', P.Y(m * 6 + b));
    const hit = dots.filter((d) => m * d.x + b === d.y).length;
    read.textContent = `y = ${m}x ${sign(b)}   ·   the line goes through ${hit} of the 2 dots`;
    if (hit === 2 && !solved) { solved = true; api.solve(`y = ${m}x ${sign(b)}. From one dot to the other the line goes 2 right and 4 up, so the slope is 2. Two points fix a straight line: there is no other one through both.`); }
  };
  host.append(pic,
    slider({ label: 'slope', min: -3, max: 3, step: 0.5, value: m, oninput: (v) => { m = v; draw(); } }),
    slider({ label: 'height where it crosses the upright axis', min: -5, max: 5, value: b, oninput: (v) => { b = v; draw(); } }), read);
  draw();
}

function parabola(host, api) {
  const P = plane({ x0: -2, x1: 8, y0: -6, y1: 6, S: 30 });
  const want = [1, 5];
  let p = 0, q = 0, solved = false;
  const pic = svg(P.box, P.grid + `<path id="cv" class="curve"/>` + want.map((x) => `<circle class="target" r="7" cx="${P.X(x)}" cy="${P.Y(0)}"/>`).join(''));
  pic.classList.add('board');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    let d = '';
    for (let x = -2; x <= 8.001; x += 0.1) { const y = (x - p) * (x - p) + q; d += (d ? 'L' : 'M') + P.X(x).toFixed(1) + ',' + P.Y(Math.min(y, 9)).toFixed(1); }
    pic.querySelector('#cv').setAttribute('d', d);
    const r = roots(p, q);
    read.textContent = `y = (x ${sign(-p)})² ${sign(q)}   ·   lowest point at (${p}, ${q})   ·   ` + (r.length === 0 ? 'never reaches the flat axis' : r.length === 1 ? `touches the flat axis at x = ${round(r[0])}` : `crosses the flat axis at x = ${round(r[0])} and x = ${round(r[1])}`);
    if (!solved && r.length === 2 && r[0] === want[0] && r[1] === want[1]) { solved = true; api.solve('Lowest point at (3, −4): halfway between the two dots, and 4 below, because 2 steps to either side lift the curve by 2² = 4.'); }
  };
  host.append(pic,
    slider({ label: 'slide sideways', min: -2, max: 8, value: p, oninput: (v) => { p = v; draw(); } }),
    slider({ label: 'slide up and down', min: -6, max: 6, value: q, oninput: (v) => { q = v; draw(); } }), read);
  draw();
}

// ---------- two dice ----------
function twoDice(host, api) {
  const roll = die(11);
  const counts = new Array(13).fill(0);
  let total = 0;
  const chart = h('div', {});
  const read = h('p', { class: 'readout' }, 'No rolls yet.');
  const draw = () => {
    const top = Math.max(...counts);
    chart.replaceChildren(bars([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => ({ label: `sum ${s} · ${waysToSum(s)} way${waysToSum(s) === 1 ? '' : 's'}`, score: total ? counts[s] / total : 0, mark: total > 0 && counts[s] === top })), 0.25));
  };
  const add = (n) => {
    for (let i = 0; i < n; i++) { counts[roll() + roll()] += 1; total += 1; }
    draw();
    const lead = counts.indexOf(Math.max(...counts));
    read.textContent = `${total} rolls of two dice. Most often so far: ${lead}. "Ways" counts the pairs of faces, out of 36, that make the sum; the number on the right is its share of your rolls.`;
    if (total >= 500) api.solve((lead === 7 ? 'Seven leads.' : `Here ${lead} leads by luck; with more rolls seven takes over.`) + ' Six of the 36 pairs make 7 (1+6, 2+5, 3+4, 4+3, 5+2, 6+1), only one makes 2 and only one makes 12. The more ways, the more often.');
    else api.note(`Go on to 500 rolls.`);
  };
  host.append(h('div', { class: 'row' },
    h('button', { type: 'button', onclick: () => add(1) }, 'Roll 1'),
    h('button', { type: 'button', onclick: () => add(10) }, 'Roll 10'),
    h('button', { class: 'primary', type: 'button', onclick: () => add(100) }, 'Roll 100')), chart, read);
  draw();
}

function sixes(host, api) {
  let n = 1;
  const meter = h('div', { class: 'meter' }, h('i'), h('b'));
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const p = atLeastOnce(1 / 6, n);
    meter.firstChild.style.width = p * 100 + '%';
    read.textContent = `${n} roll${n === 1 ? '' : 's'}: the chance of no six at all is (5/6)^${n} = ${round((1 - p) * 100, 1)} %, so at least one six has ${round(p * 100, 1)} %. The mark is at 50 %.`;
  };
  host.append(slider({ label: 'rolls', min: 1, max: 10, value: n, oninput: (v) => { n = v; draw(); } }), meter, read,
    h('div', { class: 'row' }, h('button', { class: 'primary', type: 'button', onclick: () => {
      const here = atLeastOnce(1 / 6, n) > 0.5, before = n > 1 && atLeastOnce(1 / 6, n - 1) > 0.5;
      if (here && !before) api.solve(`With ${n} rolls it is ${round(atLeastOnce(1 / 6, n) * 100, 1)} %, with ${n - 1} only ${round(atLeastOnce(1 / 6, n - 1) * 100, 1)} %. Not ${n} × 1/6: chances of "at least once" are found by multiplying the chances of missing.`);
      else api.miss(here ? 'That is over half, but fewer rolls already do it.' : 'Still under half.');
    } }, 'This is the smallest number')));
  draw();
}

export const MATH = [{
  id: 'math-first', subject: 'Math', title: 'Lines, triangles and chance',
  blurb: 'Three ideas you can drag, stretch and flip until they make sense.',
  lessons: [
    { id: 'slope', title: 'Slope', screens: [
      { title: 'How steep is a line?', text: 'Drag the two points. The slope says how far the line climbs for every step to the right: <b>rise ÷ run</b>.<br><b>Your task:</b> make a line with slope exactly 2.',
        mount: (host, api) => slopeBoard(host, api, Object.assign((m) => m === 2, { done: 'Slope 2: for every step right, the line climbs two.' })) },
      { title: 'Downhill', text: '<b>Your task:</b> now make a line with a negative slope.',
        mount: (host, api) => slopeBoard(host, api, Object.assign((m) => m < 0, { done: 'Negative slope: going right, the line goes down. The rise is a drop.' })) },
      { title: 'Check yourself', text: 'A line has slope 0. What does it look like?',
        mount: (host, api) => choice(host, api, { options: ['Straight up', 'Flat', 'Climbing at 45°'], correct: 1,
          why: 'Rise 0 over any run is 0: the line is flat.', wrong: { 0: 'Straight up has no run at all, so no slope number.', 2: 'That line climbs 1 for every 1: slope 1.' } }) },
    ] },
    { id: 'pythagoras', title: 'The right triangle', screens: [
      { title: 'Predict first', text: 'A right triangle has short sides 3 and 4. How long is the long side?',
        mount: (host, api) => choice(host, api, { options: ['5', '6', '7'], correct: 0,
          why: '3² + 4² = 9 + 16 = 25, and √25 = 5. Not 3 + 4: the long side is a shortcut across.', wrong: { 2: '7 is 3 + 4: walking along both sides. The long side cuts across, so it is shorter.' } }) },
      { title: 'Try it', text: 'Move the sliders and watch the rule <b>a² + b² = c²</b>.<br><b>Your task:</b> find whole numbers a and b that give c = 13 exactly.',
        mount: (host, api) => triangle(host, api, Object.assign((a, b) => hypotenuse(a, b) === 13, { done: '5² + 12² = 25 + 144 = 169 = 13². Whole-number triples like this are rare.' })) },
    ] },
    { id: 'chance', title: 'Chance', screens: [
      { title: 'Predict first', text: 'You flip a fair coin 10 times. Which is true?',
        mount: (host, api) => choice(host, api, { options: ['You get exactly 5 heads', 'Anything from 0 to 10 heads can happen', 'After 3 heads in a row, tails is more likely'], correct: 1,
          why: 'Ten flips can give anything. The coin has no memory, so earlier flips change nothing.', wrong: { 0: 'Five is the most likely count, but it happens only about one time in four.', 2: 'The coin does not remember. Every flip is 50 : 50.' } }) },
      { title: 'Flip a lot', text: 'A few flips are wild. Many flips are calm.<br><b>Your task:</b> flip until you have 1000 and watch the share of heads.', mount: coins },
    ] },
  ],
}, {
  id: 'math-second', subject: 'Math', title: 'Fractions, functions, dice',
  blurb: 'Cut bars into pieces, find the rule inside a machine, and roll two dice five hundred times.',
  lessons: [
    { id: 'fractions', title: 'Fractions', screens: [
      { title: 'Predict first', text: 'Which is more: <b>2/3</b> of a cake or <b>3/5</b> of the same cake?',
        mount: (host, api) => choice(host, api, { options: ['2/3', '3/5', 'They are the same'], correct: 0,
          why: 'Cut the cake into 15 pieces: 2/3 is 10 of them, 3/5 is 9. Bigger numbers do not make a bigger fraction.', wrong: { 1: '3 and 5 are bigger numbers, but fifths are smaller pieces than thirds.', 2: 'Close, but not the same: cut the cake into 15 pieces and count.' } }) },
      { title: 'Same amount, other numbers', text: 'The top number counts filled pieces, the bottom number says how many pieces make the whole.<br><b>Your task:</b> fill exactly as much as the goal bar, with different numbers.', mount: sameAmount },
      { title: 'Adding', text: 'A half and a third cannot be counted together while their pieces differ in size.<br><b>Your task:</b> find a number of pieces in which both the half and the third end on a cut.', mount: commonPieces },
    ] },
    { id: 'functions', title: 'Functions', screens: [
      { title: 'The machine', text: 'A machine takes a number and gives one back, always by the same rule.<br><b>Your task:</b> put numbers in, then say which rule is inside.', mount: machine },
      { title: 'A rule drawn as a line', text: 'Every point of the line is one pair: a number put in (across) and the number that comes out (up).<br><b>Your task:</b> make the line go through both dots.', mount: lineFit },
      { title: 'A rule with a square in it', text: 'Squaring bends the line into a curve with a lowest point.<br><b>Your task:</b> slide the curve so that it crosses the flat axis exactly at the two dots.', mount: parabola },
    ] },
    { id: 'dice', title: 'Two dice', screens: [
      { title: 'Predict first', text: 'You roll two dice and add them. Which sum comes up most often?',
        mount: (host, api) => choice(host, api, { options: ['2', '7', '12', 'All sums are equally likely'], correct: 1,
          why: 'Seven. Whatever the first die shows, one face of the second die completes a 7.', wrong: { 3: 'Each face of one die is equally likely. The sums are not: some can be made in more ways.' } }) },
      { title: 'Roll them', text: '<b>Your task:</b> roll the two dice 500 times and watch which sums pile up.', mount: twoDice },
      { title: 'At least one six', text: 'One roll gives a six with chance 1/6.<br><b>Your task:</b> find the smallest number of rolls in which at least one six is more likely than not.', mount: sixes },
    ] },
  ],
}];
