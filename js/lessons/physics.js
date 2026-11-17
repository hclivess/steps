// Physics: a throw, a pendulum, a lever.
import { h, svg, choice, slider, round } from '../ui.js';
import { G, throwRange, throwTime, throwAt, pendulumPeriod, turning, wavelength, waveAt, current, inSeries, inParallel,
  EARTH, circularSpeed, escapeSpeed, farSide, staysUp, isRound, orbitPath } from '../science.js';

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

// ---------- waves ----------
function rope(host, api) {
  const speed = 2, metres = 4, u = 150, x0 = 20, mid = 110, amp = 50, slow = 4;   // 150 units per metre; shown 4 times slower
  let f = 1, solved = false;
  const t0 = performance.now();
  const pic = svg('0 0 640 220', `<line class="gridline" x1="${x0}" y1="${mid}" x2="${x0 + metres * u}" y2="${mid}"/>
    ${[0, 1, 2, 3, 4].map((m) => `<line class="tick" x1="${x0 + m * u}" y1="204" x2="${x0 + m * u}" y2="212"/><text class="svgtext faint" x="${x0 + m * u + (m === 4 ? -4 : 4)}" y="214"${m === 4 ? ' text-anchor="end"' : ''}>${m} m</text>`).join('')}
    <path id="w" class="curve"/><path id="len" class="helper"/><text id="lenT" class="svgtext" y="16"></text>`);
  pic.classList.add('board', 'wide');
  const $ = (id) => pic.querySelector('#' + id);
  const read = h('p', { class: 'readout' });
  const tell = () => {
    const len = wavelength(speed, f);
    $('len').setAttribute('d', `M${x0},30 v-8 v4 h${len * u} v-4 v8`);
    $('lenT').setAttribute('x', x0 + 6); $('lenT').textContent = `one wave: ${round(len)} m`;
    read.textContent = `speed ${speed} m/s ÷ ${f} waves a second = ${round(len)} m for each wave   (drawn ${slow} times slower than real)`;
    if (!solved && Math.abs(len - 0.5) < 1e-9) { solved = true; api.solve('Four waves a second, half a metre each: 4 × 0.5 = 2 m/s. The rope sets the speed, so more waves a second must each be shorter. speed = frequency × wavelength.'); }
  };
  const frame = (now) => {
    if (!pic.isConnected) return;
    const t = (now - t0) / 1000 / slow, len = wavelength(speed, f);
    let d = '';
    for (let px = 0; px <= metres * u; px += 3) d += (d ? 'L' : 'M') + (x0 + px) + ',' + (mid - amp * waveAt(len, f, px / u, t)).toFixed(1);
    $('w').setAttribute('d', d);
    requestAnimationFrame(frame);
  };
  host.append(pic, slider({ label: 'waves a second (frequency)', min: 1, max: 8, step: 0.5, value: f, show: (v) => v + ' Hz', oninput: (v) => { f = v; tell(); } }), read);
  tell();
  requestAnimationFrame(frame);
}

function twoWaves(host, api) {
  const len = 1, u = 150, x0 = 20, mid = 120, amp = 40;
  let phase = 0, solved = false;
  const pic = svg('0 0 640 240', `<line class="gridline" x1="${x0}" y1="${mid}" x2="${x0 + 4 * u}" y2="${mid}"/><path id="a" class="trace"/><path id="b" class="helper"/><path id="sum" class="curve"/>`);
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const d = { a: '', b: '', sum: '' };
    let peak = 0;
    for (let px = 0; px <= 4 * u; px += 3) {
      const a = waveAt(len, 0, px / u, 0), b = waveAt(len, 0, px / u, 0, phase), at = (y) => (d.a ? 'L' : 'M') + (x0 + px) + ',' + (mid - amp * y).toFixed(1);
      const pa = at(a), pb = at(b), ps = at(a + b);
      d.a += pa; d.b += pb; d.sum += ps;
      peak = Math.max(peak, Math.abs(a + b));
    }
    for (const k of ['a', 'b', 'sum']) pic.querySelector('#' + k).setAttribute('d', d[k]);
    read.textContent = `second wave shifted by ${phase}° (${round(phase / 360)} of a wave)   ·   the sum is ${round(peak, 1)} times as high as one wave`;
    if (!solved && peak < 0.01) { solved = true; api.solve('Shifted by half a wave, every crest meets a trough and the two add up to nothing. Noise-cancelling headphones do this to sound.'); }
    else if (!solved) api.note(peak > 1.99 ? 'Crest on crest: twice as high.' : '');
  };
  host.append(pic, slider({ label: 'shift the second wave', min: 0, max: 360, step: 15, value: phase, show: (v) => v + '°', oninput: (v) => { phase = v; draw(); } }),
    h('p', { class: 'readout' }, 'dotted grey: first wave   ·   dashed orange: second wave   ·   solid: both together'), read);
  draw();
}

// ---------- circuits ----------
// A point on the wire loop, a fraction of the way round (clockwise from the top left corner).
const loop = { x: 110, y: 50, w: 420, h: 150 };
function onLoop(part) {
  const { x, y, w, h: hh } = loop, around = 2 * (w + hh);
  let d = (((part % 1) + 1) % 1) * around;
  if (d < w) return [x + d, y];
  d -= w; if (d < hh) return [x + w, y + d];
  d -= hh; if (d < w) return [x + w - d, y + hh];
  return [x, y + hh - (d - w)];
}
const lamp = (cx, cy, glow, label) => `<circle class="glow" cx="${cx}" cy="${cy}" r="34" opacity="${(0.55 * Math.min(1, glow)).toFixed(2)}"/><circle class="lamp" cx="${cx}" cy="${cy}" r="20"/>
  <circle class="glow" cx="${cx}" cy="${cy}" r="18" opacity="${Math.min(1, glow).toFixed(2)}"/><text class="svgtext" x="${cx + 26}" y="${cy + 38}">${label}</text>`;
const battery = (volts) => `<rect class="weight" x="${loop.x - 16}" y="${loop.y + loop.h / 2 - 28}" width="32" height="56" rx="4"/><text class="svgtext" x="${loop.x - 78}" y="${loop.y + loop.h / 2 + 5}">${volts} V</text>`;

function circuit(host, api) {
  let volts = 3, ohms = 100, solved = false, turn = 0, last = performance.now();
  const pic = svg('0 0 640 250');
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' });
  const tell = () => {
    const amps = current(volts, ohms);
    read.textContent = `current = volts ÷ ohms = ${volts} ÷ ${ohms} = ${round(amps, 3)} A`;
    if (!solved && Math.abs(amps - 0.1) < 1e-9) { solved = true; api.solve(`${volts} V across ${ohms} Ω pushes 0.1 A. Any pair with the same ratio does it: the current only knows volts ÷ ohms.`); }
    else if (!solved) api.note(amps < 0.1 ? 'Too little current. More push, or less in the way.' : 'Too much current.');
  };
  const frame = (now) => {
    if (!pic.isConnected) return;
    const amps = current(volts, ohms);
    turn += ((now - last) / 1000) * amps * 0.8; last = now;          // the dots only show direction and pace
    let dots = '';
    for (let i = 0; i < 16; i++) { const [x, y] = onLoop(turn + i / 16); dots += `<circle class="charge" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`; }
    pic.innerHTML = `<rect class="wire" x="${loop.x}" y="${loop.y}" width="${loop.w}" height="${loop.h}" rx="6"/>${dots}${battery(volts)}${lamp(loop.x + loop.w, loop.y + loop.h / 2, amps / 0.3, ohms + ' Ω')}`;
    requestAnimationFrame(frame);
  };
  host.append(pic,
    slider({ label: 'battery (push)', min: 1.5, max: 12, step: 1.5, value: volts, show: (v) => v + ' V', oninput: (v) => { volts = v; tell(); } }),
    slider({ label: 'lamp (resistance)', min: 10, max: 200, step: 10, value: ohms, show: (v) => v + ' Ω', oninput: (v) => { ohms = v; tell(); } }), read);
  tell();
  requestAnimationFrame(frame);
}

function twoLamps(host, api) {
  const volts = 9, ohms = 90, full = (volts * volts) / ohms;       // the power of one lamp alone on the battery
  const seen = new Set();
  const pic = svg('0 0 640 250');
  pic.classList.add('board', 'wide');
  const read = h('p', { class: 'readout' }, 'Pick a wiring.');
  const show = (how) => {
    seen.add(how);
    const { x, y, w, h: hh } = loop;
    if (how === 'row') {
      const amps = current(volts, inSeries(ohms, ohms)), power = amps * amps * ohms;
      pic.innerHTML = `<rect class="wire" x="${x}" y="${y}" width="${w}" height="${hh}" rx="6"/>${battery(volts)}${lamp(x + w / 3, y, power / full, ohms + ' Ω')}${lamp(x + (2 * w) / 3, y, power / full, ohms + ' Ω')}`;
      read.textContent = `In a row: the current must pass both lamps, ${ohms} + ${ohms} = ${inSeries(ohms, ohms)} Ω. The battery gives ${round(amps, 3)} A. Each lamp gets half the push, ${volts / 2} V, and ${round(power, 3)} W.`;
    } else {
      const amps = current(volts, inParallel(ohms, ohms)), each = current(volts, ohms), power = each * each * ohms;
      pic.innerHTML = `<rect class="wire" x="${x}" y="${y}" width="${w}" height="${hh}" rx="6"/><line class="wire" x1="${x + w - 130}" y1="${y}" x2="${x + w - 130}" y2="${y + hh}"/>${battery(volts)}${lamp(x + w - 130, y + hh / 2, power / full, ohms + ' Ω')}${lamp(x + w, y + hh / 2, power / full, ohms + ' Ω')}`;
      read.textContent = `Side by side: each lamp has its own path and the full ${volts} V, so ${round(each, 3)} A and ${round(power, 3)} W each. The battery gives both currents together, ${round(amps, 3)} A, as if it saw ${inParallel(ohms, ohms)} Ω.`;
    }
    if (seen.size === 2) api.solve('Side by side each lamp shines as if it were alone, and the battery gives four times the current it gives to the row. Sockets in a house are wired side by side for this reason.');
    else api.note('Now try the other wiring.');
  };
  host.append(pic, h('div', { class: 'row' },
    h('button', { type: 'button', onclick: () => show('row') }, 'In a row'),
    h('button', { type: 'button', onclick: () => show('side') }, 'Side by side')), read);
  pic.innerHTML = `<rect class="wire" x="${loop.x}" y="${loop.y}" width="${loop.w}" height="${loop.h}" rx="6"/>${battery(volts)}`;
}

// ---------- orbits ----------
function cannon(host, api, goal) {
  const height = 400e3, r0 = EARTH.R + height, cx = 320, cy = 215, u = 60 / EARTH.R;   // the Earth is drawn 60 units in radius
  let kms = 5, flying = false;
  const pic = svg('0 0 640 430', `<circle class="planet" cx="${cx}" cy="${cy}" r="60"/><line class="tick" x1="${cx}" y1="${cy - 60}" x2="${cx}" y2="${cy - r0 * u}"/>
    <g id="old"></g><path id="path" class="curve"/><circle id="ball" class="ball" r="5" cx="${cx}" cy="${cy - r0 * u}"/>`);
  pic.classList.add('board', 'wide');
  const $ = (id) => pic.querySelector('#' + id);
  const read = h('p', { class: 'readout' }, 'Pick a speed and fire.');
  const km = (r) => Math.round((r - EARTH.R) / 1000);
  const fire = () => {
    if (flying) return;
    flying = true;
    const v = kms * 1000, shot = kms, { points, end } = orbitPath(r0, v), far = farSide(r0, v), began = performance.now(), time = 2600;
    const frame = (now) => {
      if (!pic.isConnected) return;
      const n = Math.max(1, Math.min(points.length - 1, Math.round(((now - began) / time) * (points.length - 1))));
      let d = '';
      for (let i = 0; i <= n; i++) d += (i ? 'L' : 'M') + (cx + points[i].x * u).toFixed(1) + ',' + (cy - points[i].y * u).toFixed(1);
      $('path').setAttribute('d', d);
      $('ball').setAttribute('cx', cx + points[n].x * u); $('ball').setAttribute('cy', cy - points[n].y * u);
      if (n < points.length - 1) return requestAnimationFrame(frame);
      flying = false;
      $('old').innerHTML += `<path class="trace" d="${d}"/>`;
      const up = staysUp(r0, v);
      read.textContent = `${shot} km/s: ` + (end === 'ground' ? 'it falls and hits the ground.' : !isFinite(far) ? 'it leaves and never comes back.'
        : `it stays up, between ${Math.min(km(r0), km(far))} km and ${Math.max(km(r0), km(far))} km above the ground` + (end === 'out' ? ' (the far end is outside the picture).' : '.'));
      if (goal === 'round') {
        if (isRound(r0, v)) api.solve(`A round orbit at about ${shot} km/s. The ball is falling the whole time, but the ground curves away under it just as fast. Gravity at this height is still ${Math.round(100 * (EARTH.R / r0) ** 2)} % of what it is on the ground.`);
        else api.note(!up ? 'Too slow: the ground is in the way. Faster.' : !isFinite(far) ? 'Much too fast: it is gone.' : far < r0 ? 'It stays up, but dips toward the ground on the far side. A little faster.' : 'It swings far out on the other side. A little slower.');
      } else if (!isFinite(far)) api.solve(`Gone for good. The lowest speed that does this here is ${round(escapeSpeed(r0) / 1000)} km/s, which is √2 times the round-orbit speed of ${round(circularSpeed(r0) / 1000)} km/s.`);
      else api.note('It still comes back. Faster.');
    };
    requestAnimationFrame(frame);
  };
  host.append(pic, h('div', { class: 'row' },
    slider({ label: 'speed, sideways', min: 4, max: 11.5, step: 0.1, value: kms, show: (v) => round(v, 1) + ' km/s', oninput: (v) => { kms = v; } }),
    h('button', { class: 'primary', type: 'button', onclick: fire }, 'Fire')), read);
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
}, {
  id: 'physics-second', subject: 'Physics', title: 'Waves, circuits, orbits',
  blurb: 'Shake a rope, light a lamp, and fire a cannon so hard that the ball never lands.',
  lessons: [
    { id: 'waves', title: 'Waves', screens: [
      { title: 'Predict first', text: 'Waves run along a rope at a fixed speed. You shake the end twice as often. What happens to the length of each wave?',
        mount: (host, api) => choice(host, api, { options: ['It doubles', 'It halves', 'It stays the same'], correct: 1,
          why: 'It halves. The rope carries every wave away at the same speed, so twice as many must fit into the same stretch.', wrong: { 0: 'More waves in the same stretch of rope cannot each be longer.', 2: 'Then twice as many waves would need twice the rope every second, but the speed is fixed.' } }) },
      { title: 'Shake it', text: 'This rope carries waves at 2 m/s whatever you do.<br><b>Your task:</b> make each wave exactly half a metre long.', mount: rope },
      { title: 'Two waves at once', text: 'Where two waves meet, their heights simply add.<br><b>Your task:</b> shift the second wave until the two cancel completely.', mount: twoWaves },
    ] },
    { id: 'circuits', title: 'Circuits', screens: [
      { title: 'Predict first', text: 'A lamp is lit by a battery. You swap in a lamp with twice the resistance. What does the current do?',
        mount: (host, api) => choice(host, api, { options: ['It doubles', 'It halves', 'Nothing: the battery decides'], correct: 1,
          why: 'It halves. The battery sets the push; the resistance decides how much current that push gets through.', wrong: { 2: 'The battery sets the push (volts), not the current.' } }) },
      { title: 'One lamp', text: 'The dots show the current: the faster they run, the more of it.<br><b>Your task:</b> make the current exactly 0.1 A.', mount: circuit },
      { title: 'Two lamps', text: 'Two equal lamps and one 9 V battery can be wired in two ways.<br><b>Your task:</b> try both and compare how the lamps shine.', mount: twoLamps },
    ] },
    { id: 'orbits', title: 'Orbits', screens: [
      { title: 'Predict first', text: 'The space station flies about 400 km up and does not come down. Why?',
        mount: (host, api) => choice(host, api, { options: ['There is no gravity that high', 'It falls all the time, but keeps missing the ground', 'Its engines hold it up'], correct: 1,
          why: 'It falls around the Earth. It moves sideways so fast that the ground curves away as quickly as it drops.', wrong: { 0: 'Gravity up there is nearly as strong as on the ground. The next screen gives the number.', 2: 'It coasts. The engines are off almost all the time.' } }) },
      { title: 'Fire sideways', text: 'A cannon stands 400 km above the ground and fires sideways. There is no air.<br><b>Your task:</b> find the speed at which the ball goes around in a circle.', mount: (host, api) => cannon(host, api, 'round') },
      { title: 'Leave for good', text: 'A faster ball swings farther out before it returns.<br><b>Your task:</b> fire fast enough that it never comes back.', mount: (host, api) => cannon(host, api, 'away') },
    ] },
  ],
}];
