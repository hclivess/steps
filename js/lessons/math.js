// Math: slope, the right triangle, chance.
import { h, svg, choice, slider, drag, round } from '../ui.js';
import { slope, hypotenuse, coin } from '../science.js';

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
}];
