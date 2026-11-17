// AI: looking things up (RAG), chains of parts, graphs that decide. Every answer is computed by js/core.js.
import { h, svg, choice, slider, grid, bars, sleep, round } from '../ui.js';
import { CHUNKS, SOURDOUGH } from '../data.js';
import { chunk, embed, cosine, cellOf, tokens, search, answer, runChain, MODELS, kind, newRun, advance, runAll } from '../core.js';

const Q_STARTER = 'When is my sourdough starter ready?';
const Q_COFFEE = 'How hot should the water be for coffee?';
const Q_PLANTS = 'which plants tolerate low light?';
const Q_MONSTERA = 'I just bought a monstera, where exactly should I put it regarding light?';
const ORDER = ['retriever', 'prompt', 'model', 'parser'];

// ---------- looking things up ----------
function askBoth(host, api) {
  const out = h('div', { class: 'answer' }, 'Press a button.');
  const seen = new Set();
  const ask = (withNotes) => {
    const picked = withNotes ? search(Q_STARTER).slice(0, 2) : [];
    out.replaceChildren(h('b', {}, withNotes ? 'With notes: ' : 'Without notes: '), answer(Q_STARTER, picked).text,
      withNotes ? h('ol', { class: 'notes' }, picked.map((c) => h('li', {}, c.text))) : '');
    seen.add(withNotes);
    if (seen.size === 2) api.solve('The model was the same both times. Only what it was handed changed. Finding the right notes and handing them over is the whole trick.');
    else api.note('Now press the other button.');
  };
  host.append(h('p', { class: 'question' }, Q_STARTER), h('div', { class: 'row' },
    h('button', { type: 'button', onclick: () => ask(false) }, 'Ask without notes'),
    h('button', { class: 'primary', type: 'button', onclick: () => ask(true) }, 'Ask with notes')), out);
}

function chunker(host, api, { overlapTask }) {
  let size = overlapTask ? 120 : 300, overlap = 0, solved = false;
  const box = h('div', { class: 'chunks' });
  const read = h('p', { class: 'readout' });
  const draw = () => {
    const parts = chunk(SOURDOUGH, size, overlap);
    box.replaceChildren(...parts.map((p, i) => {
      const repeated = i ? Math.max(0, parts[i - 1].end - p.start) : 0;
      return h('div', { class: 'chunkbox' }, h('b', {}, i + 1), ' ', repeated ? h('mark', {}, p.text.slice(0, repeated)) : '', p.text.slice(repeated));
    }));
    read.textContent = `${parts.length} chunk${parts.length === 1 ? '' : 's'} of at most ${size} characters` + (overlapTask ? `, overlap ${overlap}` : '');
    if (solved) return;
    if (!overlapTask && parts.length === 3) { solved = true; api.solve('Three chunks, close to one idea in each. Too big and a chunk mixes subjects; too small and a sentence is cut from its meaning.'); }
    if (overlapTask && overlap >= 40 && parts.every((p, i) => !i || p.start < parts[i - 1].end)) { solved = true; api.solve('The marked words are in two chunks. A sentence cut at the border is now whole in one of them.'); }
  };
  host.append(overlapTask
    ? slider({ label: 'overlap', min: 0, max: 80, step: 10, value: overlap, show: (v) => v + ' characters', oninput: (v) => { overlap = v; draw(); } })
    : slider({ label: 'chunk size', min: 60, max: 400, step: 10, value: size, show: (v) => v + ' characters', oninput: (v) => { size = v; draw(); } }), read, box);
  draw();
}

function similarity(host, api) {
  const a = h('input', { type: 'text', value: 'my starter is full of bubbles' });
  const b = h('input', { type: 'text', value: 'coffee tastes bitter' });
  const out = h('div', {});
  let solved = false;
  const cells = (text) => h('p', { class: 'cells' }, tokens(text).map((w) => h('span', {}, `${w} → cell ${cellOf(w)}`)));
  const draw = () => {
    const va = embed(a.value), vb = embed(b.value), s = cosine(va, vb);
    out.replaceChildren(cells(a.value), grid(va), cells(b.value), grid(vb), bars([{ label: 'similarity', score: s, mark: s > 0.5 }]));
    if (!solved && s > 0.5 && a.value.trim().toLowerCase() !== b.value.trim().toLowerCase()) {
      solved = true;
      api.solve('Shared words light the same cells, so the two patterns point the same way. This toy only sees shared words; a real embedder is a trained network that also puts "loaf" near "bread".');
    }
  };
  a.addEventListener('input', draw); b.addEventListener('input', draw);
  host.append(h('label', { class: 'field' }, 'Sentence 1', a), h('label', { class: 'field' }, 'Sentence 2 (change me)', b), out);
  draw();
}

function predictTop(host, api) {
  const options = [4, 9, 5, 6].map((id) => CHUNKS.find((c) => c.id === id));
  const ranked = search(Q_COFFEE, options);
  const out = h('div', {});
  const box = h('div', { class: 'choices' }, options.map((c) => h('button', { class: 'choice', type: 'button', onclick: (ev) => {
    for (const other of box.children) other.classList.remove('wrong');
    if (c.id !== ranked[0].id) { ev.currentTarget.classList.add('wrong'); return api.miss('The search scored another note higher. Look for the words the question uses.'); }
    ev.currentTarget.classList.add('right');
    for (const other of box.children) other.disabled = true;
    out.replaceChildren(bars(ranked.map((r) => ({ label: r.title, score: r.score, mark: r.id === ranked[0].id }))));
    api.solve('The search turned the question and every note into numbers and compared them. These are the scores it computed.');
  } }, c.text)));
  host.append(h('p', { class: 'question' }, Q_COFFEE), box, out);
}

function topK(host, api) {
  let k = 2;
  const seen = new Set();
  const out = h('div', {});
  const draw = (count) => {
    const picked = search(Q_COFFEE).slice(0, k);
    out.replaceChildren(h('ol', { class: 'notes' }, picked.map((c) => h('li', {}, c.text))), h('div', { class: 'answer' }, h('b', {}, 'Answer: '), answer(Q_COFFEE, picked).text));
    if (!count) return;
    seen.add(k === 0 ? 'none' : 'some');
    if (seen.size === 2) api.solve('With no notes the model says it does not know, instead of inventing something. The [1] in an answer points at the note it came from, so you can check it.');
    else api.note(k === 0 ? 'Now give it some notes again.' : 'Now set it to 0.');
  };
  host.append(h('p', { class: 'question' }, Q_COFFEE),
    slider({ label: 'notes handed to the model', min: 0, max: 3, value: k, oninput: (v) => { k = v; draw(true); } }), out);
  draw(false);
}

// ---------- chains ----------
const show = (x) => (typeof x === 'string' ? x : x.chunks ? x.chunks.map((c) => c.title).join('  ·  ')
  : x.messages ? x.messages.map((m) => `${m.role}: ${m.content}`).join('\n') : x.content);

const stepsView = (res) => h('div', { class: 'steps' },
  res.steps.map((s) => h('div', { class: 'step' }, h('b', {}, s.part), h('span', { class: 'kinds' }, `${kind(s.input)} → ${kind(s.output)}`), h('pre', {}, show(s.output)))),
  res.error ? h('div', { class: 'step broken' }, h('b', {}, res.error.part), h('span', { class: 'kinds' }, res.error.message)) : '');

function pipe(host, api) {
  const out = h('div', {});
  host.append(h('p', { class: 'question' }, Q_COFFEE), h('div', { class: 'blocks' }, ORDER.map((p) => h('span', { class: 'block' }, p))),
    h('button', { class: 'primary', type: 'button', onclick: () => {
      out.replaceChildren(stepsView(runChain(ORDER, Q_COFFEE)));
      api.solve('Four parts, each doing one small job. What one part gives is exactly what the next one wants.');
    } }, 'Run the chain'), out);
}

function reorder(host, api) {
  const order = ['model', 'retriever', 'parser', 'prompt'];
  let picked = -1;
  const blocks = h('div', { class: 'blocks' });
  const out = h('div', {});
  const draw = () => blocks.replaceChildren(...order.map((p, i) => h('button', { class: 'block' + (i === picked ? ' picked' : ''), type: 'button', onclick: () => {
    if (picked < 0) picked = i;
    else { [order[picked], order[i]] = [order[i], order[picked]]; picked = -1; }
    draw();
  } }, p)));
  host.append(h('p', { class: 'question' }, Q_COFFEE), blocks, h('button', { class: 'primary', type: 'button', onclick: () => {
    const res = runChain(order, Q_COFFEE);
    out.replaceChildren(stepsView(res));
    if (res.ok) api.solve('It runs. There is only one order in which every part gets what it wants.');
    else api.miss(res.error.message + ' Tap two blocks to swap them.');
  } }, 'Run the chain'), out);
  draw();
}

function swapModel(host, api) {
  const tried = new Set();
  const out = h('div', { class: 'answer' }, 'Pick a model.');
  host.append(h('p', { class: 'question' }, Q_COFFEE), h('div', { class: 'row' }, Object.entries(MODELS).map(([id, m]) => h('button', { type: 'button', onclick: () => {
    out.replaceChildren(h('b', {}, m.label + ': '), runChain(ORDER, Q_COFFEE, id).output);
    tried.add(id);
    if (tried.size >= 2) api.solve('Only one block changed. The retriever, the prompt and the parser never noticed.');
    else api.note('Try another one.');
  } }, m.label))), out);
}

function stream(host, api) {
  const out = h('div', { class: 'answer' });
  const read = h('p', { class: 'readout' }, 'Nothing sent yet.');
  let busy = false;
  host.append(h('p', { class: 'question' }, Q_COFFEE), h('button', { class: 'primary', type: 'button', onclick: async () => {
    if (busy) return;
    busy = true;
    out.textContent = '';
    const words = runChain(ORDER, Q_COFFEE).output.split(' ');
    for (let i = 0; i < words.length && host.isConnected; i++) {
      out.append(words[i] + ' ');
      read.textContent = `${i + 1} of ${words.length} pieces arrived`;
      await sleep(70);
    }
    busy = false;
    api.solve('The answer was the same. It was sent piece by piece, so the reader starts reading before the model has finished.');
  } }, 'Stream the answer'), read, out);
}

// ---------- graphs ----------
const POS = { START: [60, 45], retrieve: [200, 45], grade: [400, 45], rewrite: [200, 165], approve: [400, 165], generate: [600, 165], give_up: [400, 280], END: [600, 280] };
const EDGES = [['START', 'retrieve'], ['retrieve', 'grade'], ['grade', 'generate', 'enough'], ['grade', 'approve', 'ask a human'], ['grade', 'rewrite', 'try again'],
  ['rewrite', 'retrieve'], ['grade', 'give_up', 'out of attempts'], ['approve', 'generate', 'yes'], ['approve', 'give_up', 'no'], ['generate', 'END'], ['give_up', 'END']];
const HW = 50, HH = 17;

function edgeShape([from, to, label]) {
  const id = `e-${from}-${to}`;
  if (from === 'grade' && to === 'give_up') {
    return `<path id="${id}" class="edge" d="M436,62 Q545,170 452,276"/><text class="edgetext" x="492" y="228">${label}</text>`;
  }
  const [x1, y1] = POS[from], [x2, y2] = POS[to], dx = x2 - x1, dy = y2 - y1;
  const cut = Math.min(dx ? (HW + 3) / Math.abs(dx) : 9, dy ? (HH + 3) / Math.abs(dy) : 9);
  const ax = x1 + dx * cut, ay = y1 + dy * cut, bx = x2 - dx * cut, by = y2 - dy * cut;
  const text = label ? `<text class="edgetext" x="${(ax + bx) / 2 + (dy && dx ? 8 : dy ? 6 : -20)}" y="${(ay + by) / 2 + (dy ? 4 : -6)}">${label}</text>` : '';
  return `<path id="${id}" class="edge" d="M${ax},${ay} L${bx},${by}"/>${text}`;
}

function graphBox(host, api, cfg) {
  const opts = { question: cfg.question, threshold: cfg.threshold ?? 0.3, maxAttempts: cfg.maxAttempts ?? 3, askHuman: !!cfg.askHuman };
  let run = newRun(opts), ticket = 0;
  const history = [];
  const pic = svg('0 0 680 320', `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
    ${EDGES.map(edgeShape).join('')}
    ${Object.entries(POS).map(([n, [x, y]]) => `<g id="n-${n}" class="node${n === 'START' || n === 'END' ? ' cap' : ''}"><rect x="${x - HW}" y="${y - HH}" width="${HW * 2}" height="${HH * 2}" rx="8"/><text x="${x}" y="${y + 5}">${n}</text></g>`).join('')}`);
  pic.classList.add('board', 'wide', 'graph');
  const table = h('table', { class: 'state' });
  const human = h('div', { class: 'human', hidden: true }, h('b', {}, 'The graph is waiting for you. '), 'Use these notes for the answer?',
    h('div', { class: 'row' }, h('button', { class: 'primary', type: 'button', onclick: () => step(true) }, 'Approve'), h('button', { type: 'button', onclick: () => step(false) }, 'Reject')));
  const render = () => {
    pic.querySelectorAll('.taken, .last, .visited, .current').forEach((e) => e.classList.remove('taken', 'last', 'visited', 'current'));
    const walked = [['START', 'retrieve'], ...run.log.map((s) => [s.node, s.next])];
    walked.forEach(([a, b], i) => {
      pic.querySelector(`#e-${a}-${b}`).classList.add('taken');
      if (i === walked.length - 1) pic.querySelector(`#e-${a}-${b}`).classList.add('last');
      pic.querySelector(`#n-${a}`).classList.add('visited');
    });
    pic.querySelector(`#n-${run.done ? 'END' : run.next}`).classList.add('current');
    const s = run.state;
    const rows = [['question', s.question], ['query', s.query], ['attempts', s.attempts],
      ['documents', s.documents.map((d) => `${d.title} ${round(d.score)}`).join('  ·  ') || '-'],
      ['relevant', s.relevant.map((d) => d.title).join('  ·  ') || '-'],
      ...(opts.askHuman ? [['approved', s.approved === null ? '-' : s.approved ? 'yes' : 'no']] : []),
      ['answer', s.answer || '-']];
    const changed = run.log.length ? Object.keys(run.log.at(-1).update) : [];
    table.replaceChildren(...rows.map(([k, v]) => h('tr', { class: changed.includes(k) ? 'changed' : '' }, h('th', {}, k), h('td', {}, v))),
      h('tr', {}, h('th', {}, 'saved states'), h('td', {}, run.checkpoints.length)));
    human.hidden = !run.paused;
  };
  function step(decision) {
    if (run.done || (run.paused && decision === undefined)) return null;
    const st = advance(run, decision);
    render();
    if (run.done) {
      history.push(run);
      const msg = cfg.check(history);
      if (msg) api.solve(msg); else api.note(cfg.hint(history));
    }
    return st;
  }
  const reset = () => { ticket += 1; run = newRun(opts); render(); };
  const play = async () => {
    const mine = ++ticket;
    if (run.done) run = newRun(opts);
    render();
    while (!run.done && !run.paused && mine === ticket && host.isConnected) { step(); await sleep(450); }
  };
  const controls = h('div', { class: 'row' },
    h('button', { type: 'button', onclick: () => step() }, 'Step'),
    h('button', { class: 'primary', type: 'button', onclick: play }, 'Run'),
    h('button', { type: 'button', onclick: reset }, 'Reset'));
  host.append(h('p', { class: 'question' }, cfg.question));
  if (cfg.sliders?.includes('threshold')) host.append(slider({ label: 'a note counts as relevant from score', min: 0.1, max: 0.9, step: 0.05, value: opts.threshold, show: (v) => round(v), oninput: (v) => { opts.threshold = v; reset(); } }));
  if (cfg.sliders?.includes('attempts')) host.append(slider({ label: 'searches allowed', min: 1, max: 3, value: opts.maxAttempts, oninput: (v) => { opts.maxAttempts = v; reset(); } }));
  host.append(controls, pic, human, table);
  render();
}

const nodes = (run) => run.log.map((s) => s.node);
const topPlants = search(Q_PLANTS)[0].score;
const firstEdge = runAll({ question: Q_PLANTS, threshold: 0.3, maxAttempts: 3 }).log[1].next;

export const AI = [{
  id: 'ai-lookup', subject: 'AI', title: 'How an AI looks things up',
  blurb: 'Chunks, numbers, search: what happens before a model answers from your documents.',
  lessons: [
    { id: 'why', title: 'Why look things up?', screens: [
      { title: 'Same model, two answers', text: 'This small model knows nothing about baking. Nine short notes on sourdough, coffee and houseplants sit next to it.<br><b>Your task:</b> ask it both ways.', mount: askBoth },
      { title: 'Check yourself', text: 'What changed between the two answers?',
        mount: (host, api) => choice(host, api, { options: ['The model was retrained', 'The model got notes to read', 'The question was reworded'], correct: 1,
          why: 'Nothing was retrained. The notes were put in front of the model together with the question.', wrong: { 0: 'Nothing was trained. It took a moment, not weeks.', 2: 'The question was the same both times.' } }) },
    ] },
    { id: 'chunks', title: 'Chunks', screens: [
      { title: 'Cut the text', text: 'A long text is cut into pieces so the search can hand over only the piece that matters. This text has three ideas: when a starter is ready, the float test, and baking.<br><b>Your task:</b> pick a size that gives exactly 3 chunks.', mount: (host, api) => chunker(host, api, {}) },
      { title: 'Let them overlap', text: 'A cut can land in the middle of a thought. Overlap repeats the end of one chunk at the start of the next.<br><b>Your task:</b> raise the overlap to 40 or more and find the repeated words.', mount: (host, api) => chunker(host, api, { overlapTask: true }) },
    ] },
    { id: 'numbers', title: 'Meaning as numbers', screens: [
      { title: 'A sentence becomes a pattern', text: 'A computer cannot compare meanings, but it can compare numbers. Here every word lights one of 128 cells. Two sentences are similar when their patterns point the same way: 0 is nothing in common, 1 is the same.<br><b>Your task:</b> rewrite sentence 2 until the similarity is above 0.5 (without copying sentence 1).', mount: similarity },
      { title: 'Check yourself', text: 'In this toy, why do "starter bubbles" and "bubbles starter" score 1?',
        mount: (host, api) => choice(host, api, { options: ['The same cells light up; order is not recorded', 'The computer understood both', 'They have the same length'], correct: 0,
          why: 'Each word adds to its cell, wherever it stands. Real embedders do notice order and meaning, but they still end in a list of numbers compared this way.' }) },
    ] },
    { id: 'search', title: 'Search', screens: [
      { title: 'Predict first', text: 'The search will score these four notes against the question. <b>Tap the one you think it puts on top.</b>', mount: predictTop },
      { title: 'How many notes?', text: 'The best notes go to the model with the question.<br><b>Your task:</b> move the slider to 0 and back up, and watch the answer.', mount: topK },
    ] },
  ],
}, {
  id: 'ai-chains', subject: 'AI', title: 'Chains',
  blurb: 'Small parts joined into a pipe: what one gives, the next one takes.',
  lessons: [
    { id: 'pipe', title: 'A chain is a pipe', screens: [
      { title: 'Run it', text: 'Four parts in a row. <b>Your task:</b> run the chain and read what each part passed on.', mount: pipe },
      { title: 'Check yourself', text: 'What does the prompt part hand to the model?',
        mount: (host, api) => choice(host, api, { options: ['The final answer', 'Messages: the rules, the notes and the question', 'Only the question'], correct: 1,
          why: 'The prompt part writes no answer. It packs the rules, the notes and the question into messages for the model.' }) },
    ] },
    { id: 'order', title: 'Order matters', screens: [
      { title: 'Fix the pipe', text: 'Somebody shuffled the parts. <b>Your task:</b> tap two blocks to swap them, then run, until the chain works. The error tells you which part got the wrong thing.', mount: reorder },
    ] },
    { id: 'swap', title: 'Swap a part', screens: [
      { title: 'Change only the model', text: 'Because every part only cares what it gets and gives, one part can be replaced.<br><b>Your task:</b> run the chain with two different models.', mount: swapModel },
    ] },
    { id: 'stream', title: 'Streaming', screens: [
      { title: 'Piece by piece', text: '<b>Your task:</b> stream the answer and watch it arrive.', mount: stream },
      { title: 'Check yourself', text: 'What does streaming change?',
        mount: (host, api) => choice(host, api, { options: ['The answer gets better', 'The first words show up sooner', 'The model works less'], correct: 1,
          why: 'Same work, same answer. You just do not wait for the end to see the beginning.' }) },
    ] },
  ],
}, {
  id: 'ai-graphs', subject: 'AI', title: 'Graphs that decide',
  blurb: 'When a straight pipe is not enough: loops, choices and a human who can say no.',
  lessons: [
    { id: 'state', title: 'State', screens: [
      { title: 'One shared sheet', text: 'A graph has boxes (nodes) and one shared sheet of facts (the state). Each node reads the sheet and writes a few lines back.<br><b>Your task:</b> press Step until the graph reaches END and watch which lines change.',
        mount: (host, api) => graphBox(host, api, { question: Q_PLANTS, check: () => 'Each node changed only its own lines: retrieve wrote the documents, grade picked the relevant ones, generate wrote the answer.', hint: () => '' }) },
    ] },
    { id: 'decide', title: 'The graph decides', screens: [
      { title: 'Predict first', text: `After the search, the best note scores ${round(topPlants)}. A note counts as relevant from 0.30. Where does grade send the run?`,
        mount: (host, api) => choice(host, api, { options: ['generate: write the answer', 'rewrite: search again', 'give_up'], correct: ['generate', 'rewrite', 'give_up'].indexOf(firstEdge),
          why: `${round(topPlants)} is above the bar, so the edge "enough" is taken.`, wrong: { 1: 'That edge is for when no note passes the bar.', 2: 'That edge is for when the searches are used up.' } }) },
      { title: 'Move the bar', text: 'The edge after grade is a decision made from the state, not a fixed wire.<br><b>Your task:</b> set the bar so that the same question is sent to rewrite instead, and run it.',
        mount: (host, api) => graphBox(host, api, { question: Q_PLANTS, sliders: ['threshold'],
          check: (hist) => (nodes(hist.at(-1)).includes('rewrite') ? `With the bar above ${round(topPlants)} no note passes, so grade takes "try again". Same graph, same question, another path.` : null),
          hint: () => `It still went straight to generate. The best note scores ${round(topPlants)}: raise the bar above that.` }) },
    ] },
    { id: 'loops', title: 'Loops', screens: [
      { title: 'Try again', text: 'A chatty question hides its key words. The rewrite node keeps only the words the notes know, then the search runs again.<br><b>Your task:</b> run it and watch the loop. Then allow only 1 search and run it again.',
        mount: (host, api) => graphBox(host, api, { question: Q_MONSTERA, threshold: 0.34, sliders: ['attempts'],
          check: (hist) => (hist.some((r) => nodes(r).includes('rewrite') && nodes(r).includes('generate')) && hist.some((r) => nodes(r).at(-1) === 'give_up')
            ? 'A loop needs a way out. The attempt counter in the state is what stops it from circling forever.' : null),
          hint: (hist) => (nodes(hist.at(-1)).at(-1) === 'give_up' ? 'It gave up. Now allow 3 searches and run it.' : 'It looped once and answered. Now allow only 1 search and run it.') }) },
    ] },
    { id: 'human', title: 'A human in the loop', screens: [
      { title: 'Stop and ask', text: 'Some steps should not happen without a person. This graph stops at approve, saves its state and waits, for a second or for a week.<br><b>Your task:</b> run it and decide.',
        mount: (host, api) => graphBox(host, api, { question: Q_PLANTS, askHuman: true,
          check: (hist) => `You said ${hist.at(-1).state.approved ? 'yes, so it answered' : 'no, so it stopped'}. The state was saved after every node (${hist.at(-1).checkpoints.length} times), which is why it could wait for you. Press Reset to try the other answer.`, hint: () => '' }) },
    ] },
  ],
}];
