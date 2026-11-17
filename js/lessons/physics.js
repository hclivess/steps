// Physics: a throw, a pendulum, a lever.
import { h, svg, choice, slider, round } from '../ui.js';
import { G, throwRange, throwTime, throwAt, pendulumPeriod, turning } from '../science.js';

// ---------- a throw without air ----------
function thrower(host, api, { target }) {
  const speed = 20, W = 640, H = 320, scale = 14, x0 = 30, y0 = 290;   // 14 units per metre
  let angle = 30, flying = false;
  const tried = new Set();
  const pic = svg(`0 0 ${W} ${H}`, `<line class="ground" x1="0" y1="${y0}" x2="${W}" y2="${y0}"/>
    ${target ? `<rect class="target" x="${x0 + (target - 1.5) * scale}" y="${y0 - 4}" width="${3 * scale}" height="8"/><text class="svgtext" x="${x0 + target * scale - 16}" y="${y0 + 22}">${target} m</text>` : ''}
    <g id="old"></g><path id="aim" class="helper"/><path id="path" class="curve" d=""/><circle id="ball" class="ball" r="7" cx="${x0}" cy="${y0}"/>`);
  pic.classList.add('board', 'wide');
  const $ = (id) => pic.querySelector('#' + id);
  const read = h('p', { class: 'readout' }, 'Pick an angle and throw.');
  const aim = () => $('aim').setAttribute('d', `M${x0},${y0} l${60 * Math.cos((angle * Math.PI) / 180)},${-60 * Math.sin((angle * Math.PI) / 180)}`);
  const fire = () => {
    if (flying) return;
    flying = true;
    const total = throwTime(speed, angle), range = throwRange(speed, angle), began = performance.now();
    let d = '';
    const frame = (now) => {
      const t = Math.min(total, ((now - began) / 1000) * 1.6);
      const p = throwAt(speed, angle, t);
      const x = x0 + p.x * scale, y = y0 - Math.max(0, p.y) * scale;
      d += (d ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
      $('path').setAttribute('d', d);
      $('ball').setAttribute('cx', x); $('ball').setAttribute('cy', y);
      if (t < total) return requestAnimationFrame(frame);
      flying = false;
      $('old').innerHTML += `<path class="trace" d="${d}"/><text class="svgtext faint" x="${x - 10}" y="${y0 - 8}">${angle}°</text>`;
      read.textContent = `${angle}°: landed ${round(range, 1)} m away after ${round(total, 1)} s.`;
      tried.add(angle);
      if (target) {
        if (Math.abs(range - target) <= 1.5) api.solve(`Hit. Try the other one too: ${angle < 45 ? 'a steep throw near ' + (90 - angle) : 'a flat throw near ' + (90 - angle)}° lands in the same place. Angles that add up to 90° always pair up.`);
        else api.note(range < target ? 'Short. Change the angle.' : 'Too far. Change the angle.');
      } else if (tried.size >= 3) {
        api.solve('Without air the range is speed² × sin(2 × angle) ÷ g. It peaks at 45°, where 2 × angle is 90°.');
      } else api.note(`Throw at ${3 - tried.size} more different angle${tried.size === 2 ? '' : 's'}.`);
    };
    requestAnimationFrame(frame);
  };
  host.append(pic, h('div', { class: 'row' },
    slider({ label: 'angle', min: 5, max: 85, value: angle, show: (v) => v + '°', oninput: (v) => { angle = v; aim(); } }),
    h('button', { class: 'primary', type: 'button', onclick: fire }, 'Throw')), read);
  aim();
}

// ---------- a pendulum ----------
function pendulum(host, api) {
  let length = 0.5, mass = 1, t0 = performance.now(), alive = true, triedMass = false;
  const pic = svg('0 0 320 300', `<line class="ground" x1="60" y1="20" x2="260" y2="20"/><line id="rod" class="rod"/><circle id="bob" class="ball"/>`);
  pic.classList.add('board', 'small');
  const $ = (id) => pic.querySelector('#' + id);
  const read = h('p', { class: 'readout' });
  const tell = () => {
    const T = pendulumPeriod(length);
    read.textContent = `length ${round(length)} m, mass ${mass} kg: one full swing takes ${round(T)} s`;
    if (Math.abs(T - 2) < 0.02 && triedMass) api.solve('About one metre gives two seconds, with any mass. The swing time is 2π × √(length ÷ g): the mass is not in the formula.');
    else if (Math.abs(T - 2) < 0.02) api.note('Two seconds. Now change the mass and see what it does to the time.');
    else api.note(triedMass ? 'The mass changed nothing. Use the length to reach 2.00 s.' : '');
  };
  const frame = (now) => {
    if (!alive || !pic.isConnected) return;
    const T = pendulumPeriod(length);
    const a = 0.3 * Math.cos((2 * Math.PI * (now - t0)) / 1000 / T);    // small swing, 0.3 rad to each side
    const L = length * 125, x = 160 + L * Math.sin(a), y = 20 + L * Math.cos(a);
    $('rod').setAttribute('x1', 160); $('rod').setAttribute('y1', 20); $('rod').setAttribute('x2', x); $('rod').setAttribute('y2', y);
    $('bob').setAttribute('cx', x); $('bob').setAttribute('cy', y); $('bob').setAttribute('r', 6 + 3 * Math.sqrt(mass));
    requestAnimationFrame(frame);
  };
  host.append(pic,
    slider({ label: 'length', min: 0.2, max: 2, step: 0.01, value: length, show: (v) => round(v) + ' m', oninput: (v) => { length = v; tell(); } }),
    slider({ label: 'mass', min: 1, max: 10, value: mass, show: (v) => v + ' kg', oninput: (v) => { mass = v; triedMass = true; tell(); } }), read);
  tell();
  requestAnimationFrame(frame);
}

// ---------- a lever ----------
function lever(host, api) {
  const left = { mass: 6, distance: 2 };
  let mass = 4, distance = 1, solved = false;
  const pic = svg('0 0 640 220');
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const l = turning(left.mass, left.distance), r = turning(mass, distance);
    const tilt = Math.max(-12, Math.min(12, (r - l) * 1.5));
    const u = 70;                                              // 70 units per metre along the beam
    const box = (m, d, side) => `<rect class="weight" x="${side * d * u - 8 - 2 * m}" y="${-22 - 4 * m}" width="${16 + 4 * m}" height="${16 + 4 * m}"/><text class="svgtext" x="${side * d * u - 14}" y="${-30 - 4 * m}">${m} kg</text>`;
    pic.innerHTML = `<path class="shape" d="M320,150 l-22,50 h44 Z"/>
      <g transform="translate(320,150) rotate(${tilt})"><rect class="beam" x="-300" y="-6" width="600" height="8"/>
      ${[1, 2, 3, 4].map((i) => `<line class="tick" x1="${i * u}" y1="2" x2="${i * u}" y2="12"/><line class="tick" x1="${-i * u}" y1="2" x2="${-i * u}" y2="12"/>`).join('')}
      ${box(left.mass, left.distance, -1)}${box(mass, distance, 1)}</g>`;
    read.textContent = `left: ${left.mass} kg × ${left.distance} m = ${l}   ·   right: ${mass} kg × ${distance} m = ${r}` + (l === r ? '   ·   balanced' : l > r ? '   ·   tips left' : '   ·   tips right');
    if (!solved && l === r) { solved = true; api.solve('Balanced: weight × distance is the same on both sides. A lighter weight wins by sitting farther out.'); }
  };
  host.append(pic, slider({ label: 'distance of the 4 kg weight', min: 1, max: 4, step: 0.5, value: distance, show: (v) => v + ' m', oninput: (v) => { distance = v; draw(); } }), read);
  draw();
}

export const PHYSICS = [{
  id: 'physics-first', subject: 'Physics', title: 'Throw, swing, balance',
  blurb: 'Guess what will happen, then run the experiment.',
  lessons: [
    { id: 'throw', title: 'How far does it fly?', screens: [
      { title: 'Predict first', text: 'You throw a ball at the same speed every time. There is no air. Which angle sends it farthest?',
        mount: (host, api) => choice(host, api, { options: ['30°: low and fast', '45°: in between', '60°: high'], correct: 1,
          why: '45°. Lower throws land too soon, higher ones spend their speed on going up.', wrong: { 0: 'It moves forward fast but hits the ground too soon.', 2: 'It stays up long but moves forward slowly.' } }) },
      { title: 'Check it', text: 'The speed is fixed at 20 m/s.<br><b>Your task:</b> throw at three different angles and compare.', mount: (host, api) => thrower(host, api, {}) },
      { title: 'Hit the mark', text: '<b>Your task:</b> land the ball on the mark 30 m away. There are two angles that do it.', mount: (host, api) => thrower(host, api, { target: 30 }) },
    ] },
    { id: 'pendulum', title: 'The pendulum', screens: [
      { title: 'Predict first', text: 'Two pendulums have the same length. One bob is ten times heavier. Which swings faster?',
        mount: (host, api) => choice(host, api, { options: ['The heavy one', 'The light one', 'They swing together'], correct: 2,
          why: 'Together. Gravity pulls ten times harder on the heavy bob, but it is also ten times harder to move.', wrong: { 0: 'More pull, but also more to move. The two cancel.', 1: 'Lighter is easier to move, but gravity also pulls it less. The two cancel.' } }) },
      { title: 'Tune it', text: `Gravity here is ${G} m/s².<br><b>Your task:</b> change the mass to see what it does, then make one full swing take 2.00 seconds.`, mount: pendulum },
    ] },
    { id: 'lever', title: 'The lever', screens: [
      { title: 'Balance it', text: 'A 6 kg weight sits 2 m left of the pivot.<br><b>Your task:</b> slide the 4 kg weight until the beam is level.', mount: lever },
      { title: 'Check yourself', text: 'A 10 kg weight sits 1 m from the pivot. Where must a 2 kg weight sit to balance it?',
        mount: (host, api) => choice(host, api, { options: ['1 m', '5 m', '8 m'], correct: 1, why: '10 × 1 = 2 × 5. A fifth of the weight needs five times the distance.' }) },
    ] },
  ],
}];
