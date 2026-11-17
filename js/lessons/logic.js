// Logic: and, or, not; truth-tellers and liars; gates that add.
import { h, svg, choice, slider } from '../ui.js';
import { GATES, NOT, ROWS, sameTable, addBits, BOXES, trueLabels, bothLiarsFits } from '../science.js';

const cell = (c) => (c && typeof c === 'object' ? h('td', { class: c.cls }, '' + c.text) : h('td', {}, '' + c));
const truth = (heads, rows) => h('table', { class: 'truth' }, h('tr', {}, heads.map((t) => h('th', {}, t))), rows.map((r) => h('tr', {}, r.map(cell))));
const pick = (text, on, onclick) => h('button', { type: 'button', class: 'toggle' + (on ? ' on' : ''), onclick }, text);
const list = (items) => (items.length === 1 ? items[0] : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]);

// ---------- and, or, not ----------
function alarm(host, api) {
  const s = { door: 0, night: 0, button: 0 }, seen = new Set();
  let solved = false;
  const pic = svg('0 0 640 110');
  pic.classList.add('board', 'wide');
  const row = h('div', { class: 'row' });
  const sw = (label, key) => pick(`${label}: ${s[key] ? 'yes' : 'no'}`, s[key], () => { s[key] = 1 - s[key]; draw(); });
  const draw = () => {
    const rings = GATES.OR(GATES.AND(s.door, s.night), s.button);
    pic.innerHTML = `<circle class="${rings ? 'glow' : 'lamp'}" cx="320" cy="46" r="30"/><text class="svgtext strong" text-anchor="middle" x="320" y="100">${rings ? 'the alarm rings' : 'silent'}</text>`;
    row.replaceChildren(sw('the door is open', 'door'), sw('it is night', 'night'), sw('the test button is pressed', 'button'));
    if (rings) seen.add(s.button ? 'button' : 'door');
    if (solved) return;
    if (seen.size === 2) { solved = true; api.solve('Two roads to the same bell: (door open AND night) OR test button. AND needs both of its parts. OR is content with either one.'); }
    else api.note(rings ? 'That is one way. Now make it ring in another way.' : seen.size ? 'Silent. One way found, one to go.' : '');
  };
  host.append(pic, row, h('p', { class: 'readout' }, 'rings = (door open AND night) OR test button'));
  draw();
}

function deMorgan(host, api) {
  const left = (a, b) => NOT(GATES.AND(a, b));
  let gate = null, solved = false;
  const box = h('div', {}), row = h('div', { class: 'row' });
  const draw = () => {
    const right = gate && ((a, b) => GATES[gate](NOT(a), NOT(b)));
    box.replaceChildren(truth(['A', 'B', 'not (A and B)', gate ? `(not A) ${gate.toLowerCase()} (not B)` : '(not A) ? (not B)'],
      ROWS.map(([a, b]) => [a, b, left(a, b), right ? { text: right(a, b), cls: right(a, b) === left(a, b) ? 'on' : 'bad' } : '?'])));
    row.replaceChildren(...['AND', 'OR'].map((g) => pick(`not A ${g.toLowerCase()} not B`, gate === g, () => { if (!solved) { gate = g; draw(); } })));
    if (!right || solved) return;
    if (sameTable(left, right)) { solved = true; api.solve('The same in all four rows. "Not both" means: at least one of them is missing. Pushing a not inside the brackets turns and into or.'); }
    else api.miss('The marked rows differ. When only one of A and B is true, "not (A and B)" is still true.');
  };
  host.append(box, row);
  draw();
}

// ---------- truth and lies ----------
function boxes(host, api) {
  let solved = false;
  const row = h('div', { class: 'row' });
  const labels = h('ol', {}, BOXES.map((b) => h('li', {}, `"${b.text}"`)));
  BOXES.forEach((_, gold) => row.append(h('button', { type: 'button', onclick: () => {
    if (solved) return;
    const t = trueLabels(gold).map((i) => i + 1);
    if (t.length === 1) { solved = true; api.solve(`With the gold in box ${gold + 1}, label ${t[0]} is true and the other two are false: exactly one, as promised. The other two boxes each make two labels true. You did not guess: you tried every case and kept the one that fits.`); }
    else api.miss(`If the gold were in box ${gold + 1}, labels ${list(t)} would be true. That is ${t.length} true labels, and only one is allowed.`);
  } }, `The gold is in box ${gold + 1}`)));
  host.append(labels, row);
}

function island(host, api) {
  const s = { a: true, b: true };
  let solved = false;
  const row = h('div', { class: 'row' }), read = h('p', { class: 'readout' });
  const who = (name, key) => pick(`${name} is a ${s[key] ? 'truth-teller' : 'liar'}`, !s[key], () => { if (!solved) { s[key] = !s[key]; draw(); } });
  const draw = () => {
    const sentence = !s.a && !s.b;
    row.replaceChildren(who('A', 'a'), who('B', 'b'));
    read.textContent = `Then "we are both liars" is ${sentence ? 'true' : 'false'}, and it is said by a ${s.a ? 'truth-teller' : 'liar'}.`;
    if (solved) return;
    if (bothLiarsFits(s.a, s.b)) { solved = true; api.solve('The only case that holds together. A truth-teller could never call himself a liar, so A lies. Then his sentence must be false, so they are not both liars: B tells the truth.'); }
    else api.note(s.a ? 'A truth-teller cannot say a false sentence.' : 'A liar cannot say a true sentence.');
  };
  host.append(row, read);
  draw();
}

// ---------- digital circuits ----------
function gatePicker(host, api, { parts, out, want, wantHead, outHead, done, hint }) {
  const chosen = parts.map(() => null);
  let solved = false;
  const box = h('div', {}), rows = h('div', {});
  const draw = () => {
    const ready = chosen.every(Boolean);
    box.replaceChildren(truth(['A', 'B', wantHead, outHead], ROWS.map(([a, b]) => {
      const got = ready ? out(chosen, a, b) : '?';
      return [a, b, want(a, b), ready ? { text: got, cls: '' + got === '' + want(a, b) ? 'on' : 'bad' } : '?'];
    })));
    rows.replaceChildren(...parts.map((p, i) => h('div', { class: 'row' }, p.gates.map((g) => pick(`${p.name}: ${g}`, chosen[i] === g, () => { if (!solved) { chosen[i] = g; draw(); } })))));
    if (!ready || solved) return;
    if (ROWS.every(([a, b]) => '' + out(chosen, a, b) === '' + want(a, b))) { solved = true; api.solve(done); }
    else api.note(hint);
  };
  host.append(box, rows);
  draw();
}

function ripple(host, api) {
  const n = 3;
  let a = 2, b = 1, solved = false;
  const box = h('div', {}), read = h('p', { class: 'readout' });
  const bitsOf = (v) => Array.from({ length: n }, (_, i) => (v >> (n - 1 - i)) & 1);
  const draw = () => {
    const r = addBits(a, b, n), carries = [...r.carries].reverse(), sum = [...r.bits].reverse();
    box.replaceChildren(truth(['', 'eights', 'fours', 'twos', 'ones'], [
      ['carried over', ...carries.map((c) => ({ text: c, cls: c ? 'bad' : '' })), ''],
      ['first number', '', ...bitsOf(a)],
      ['second number', '', ...bitsOf(b)],
      ['sum', carries[0], ...sum],
    ]));
    read.textContent = `${a} + ${b} = ${r.value}   ·   ${r.carries.filter(Boolean).length} of the 3 columns carry a one over`;
    if (!solved && r.carries.every(Boolean)) { solved = true; api.solve('Every column passes a one to the next, like a row of dominoes. Each column is the same small circuit of gates, and a chain of them adds numbers of any size. A processor adds this way.'); }
  };
  host.append(slider({ label: 'first number', min: 0, max: 7, value: a, oninput: (v) => { a = v; draw(); } }),
    slider({ label: 'second number', min: 0, max: 7, value: b, oninput: (v) => { b = v; draw(); } }), box, read);
  draw();
}

export const LOGIC = [{
  id: 'logic-first', subject: 'Logic', title: 'True, false and switches',
  blurb: 'Ring an alarm two ways, find the gold by ruling cases out, and build a circuit that adds.',
  lessons: [
    { id: 'andornot', title: 'And, or, not', screens: [
      { title: 'Two ways to ring', text: 'An alarm rings when the door is open <b>and</b> it is night, <b>or</b> when someone presses the test button.<br><b>Your task:</b> make it ring in two different ways.', mount: alarm },
      { title: 'Predict first', text: 'When it rains, the street is wet. This morning the street is wet. Did it rain?',
        mount: (host, api) => choice(host, api, { options: ['Yes, certainly', 'No', 'It cannot be told from this'], correct: 2,
          why: 'Rain makes the street wet, but so does a street-cleaning truck. "If rain, then wet" says nothing about what else makes it wet.', wrong: { 0: 'The rule runs one way only: from rain to wet, not from wet to rain.', 1: 'Rain is still possible. It is just not certain.' } }) },
      { title: 'Not both', text: 'In the table 1 means true and 0 means false. A and B are any two statements.<br><b>Your task:</b> find the way to say "not (A and B)" with a not on each statement.', mount: deMorgan },
    ] },
    { id: 'liars', title: 'Truth and lies', screens: [
      { title: 'One true label', text: 'One of three boxes holds gold. Each box has a label, and <b>exactly one label is true</b>.<br><b>Your task:</b> find the gold.', mount: boxes },
      { title: 'Both liars', text: 'On this island everyone either always tells the truth or always lies. A points at B and says: "We are both liars."<br><b>Your task:</b> find who is what.', mount: island },
      { title: 'Check yourself', text: 'On the same island someone says: "I am a liar." Who is speaking?',
        mount: (host, api) => choice(host, api, { options: ['A truth-teller', 'A liar', 'Nobody on this island can say it'], correct: 2,
          why: 'A truth-teller would be lying, and a liar would be telling the truth. Neither can say the sentence.', wrong: { 0: 'Then the sentence would be true, and he would be a liar.', 1: 'Then the sentence would be true, and a liar never says a true thing.' } }) },
    ] },
    { id: 'gates', title: 'Digital circuits', screens: [
      { title: 'One or the other', text: 'A gate is a tiny switch circuit: AND gives 1 when both inputs are 1, OR when at least one is. The circuit below is <b>(A ? B) and not (A ? B)</b>.<br><b>Your task:</b> pick the two gates so that the output is 1 only when A and B differ.',
        mount: (host, api) => gatePicker(host, api, {
          parts: [{ name: 'first gate', gates: ['AND', 'OR'] }, { name: 'second gate', gates: ['AND', 'OR'] }],
          out: ([g1, g2], a, b) => GATES.AND(GATES[g1](a, b), NOT(GATES[g2](a, b))), want: GATES.XOR,
          wantHead: 'wanted', outHead: 'your circuit',
          done: 'At least one of them, but not both. This circuit is used so often that it has its own name: XOR.',
          hint: 'The marked rows are wrong. Read your circuit aloud for the row where both are 1.' }) },
      { title: 'Adding two bits', text: 'In twos, 1 + 1 is written 10: zero ones, and one carried over to the twos.<br><b>Your task:</b> pick the gate that makes the ones digit and the gate that makes the carry.',
        mount: (host, api) => gatePicker(host, api, {
          parts: [{ name: 'carry', gates: ['AND', 'OR', 'XOR'] }, { name: 'ones', gates: ['AND', 'OR', 'XOR'] }],
          out: ([c, o], a, b) => `${GATES[c](a, b)}${GATES[o](a, b)}`, want: (a, b) => (a + b).toString(2).padStart(2, '0'),
          wantHead: 'A + B', outHead: 'carry, ones',
          done: 'XOR makes the ones digit and AND makes the carry. Two gates, and the circuit adds. It is called a half adder.',
          hint: 'The marked rows are wrong. The carry is 1 only for 1 + 1; the ones digit is 1 when exactly one input is 1.' }) },
      { title: 'A chain of adders', text: 'Three such columns in a row add numbers up to 7. A column that overflows hands a one to the next.<br><b>Your task:</b> find two numbers that make every column carry.', mount: ripple },
      { title: 'Check yourself', text: 'How many different on-off patterns can three switches make?',
        mount: (host, api) => choice(host, api, { options: ['3', '6', '8'], correct: 2,
          why: 'Each switch doubles the count: 2 × 2 × 2 = 8. That is why three columns count from 0 to 7.', wrong: { 0: 'That counts the switches, not their patterns.', 1: 'Each new switch doubles the patterns; it does not add two.' } }) },
    ] },
  ],
}];
