// The whole machine in plain JavaScript: chunking, a toy embedder, search, a toy model,
// a chain of parts and a small graph engine. No library, no network. The lessons only draw what
// these functions return.
import { CHUNKS } from './data.js';

// ---------- words and vectors ----------
const STOP = new Set('a an the is are of to in on at for and or it its if'.split(' '));
const stem = (w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

export function tokens(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).map(stem).filter((w) => !STOP.has(w));
}

export const DIMS = 128;

export function cellOf(word) {            // FNV-1a hash of the word, folded into DIMS cells
  let x = 2166136261;
  for (let i = 0; i < word.length; i++) { x ^= word.charCodeAt(i); x = Math.imul(x, 16777619); }
  return (x >>> 0) % DIMS;
}

// A toy embedder: every word adds one to "its" cell. Real embedders are trained networks that
// also place different words with the same meaning close together; this one only sees shared words.
export function embed(text) {
  const vec = new Array(DIMS).fill(0);
  for (const w of tokens(text)) vec[cellOf(w)] += 1;
  return vec;
}

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

// ---------- chunking ----------
export function chunk(text, size, overlap = 0) {
  const out = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + size);
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > start) end = space;
    }
    out.push({ start, end, text: text.slice(start, end) });
    if (end >= text.length) break;
    let next = end + 1;
    if (overlap > 0) {
      const space = text.indexOf(' ', Math.max(start + 1, end - overlap));
      if (space >= 0 && space < end) next = space + 1;
    }
    start = next > start ? next : end + 1;
  }
  return out;
}

// ---------- search ----------
export function search(query, chunks = CHUNKS) {
  const q = embed(query);
  return chunks
    .map((c) => ({ ...c, score: cosine(q, embed(c.text)) }))
    .sort((a, b) => b.score - a.score || a.id - b.id);
}

// ---------- a toy model ----------
// It can only do one thing: pick the sentences of the notes it was given that share the most
// words with the question. Without notes it says so. That is the point of the first lesson.
export function answer(question, picked) {
  if (!picked.length) return { text: 'I don\'t know. No notes were given to me.', sources: [] };
  const want = new Set(tokens(question));
  const found = [];
  picked.forEach((c, i) => {
    for (const sentence of c.text.split(/(?<=[.!?])\s+/)) {
      const hits = tokens(sentence).filter((w) => want.has(w)).length;
      if (hits) found.push({ sentence, hits, n: i + 1 });
    }
  });
  if (!found.length) return { text: 'The notes I was given do not cover this.', sources: [] };
  found.sort((a, b) => b.hits - a.hits || a.n - b.n);
  const best = found.slice(0, 2);
  return { text: best.map((f) => `${f.sentence} [${f.n}]`).join(' '), sources: [...new Set(best.map((f) => f.n))] };
}

export function buildPrompt(question, picked) {
  const notes = picked.length ? picked.map((c, i) => `[${i + 1}] ${c.text}`).join('\n') : '(no notes)';
  return [
    { role: 'system', content: 'Answer only from the notes. Cite them as [n]. If the notes do not cover it, say so.' },
    { role: 'user', content: `Notes:\n${notes}\n\nQuestion: ${question}` },
  ];
}

function readPrompt(messages) {             // the toy model reads the prompt text back, as a real one would
  const user = messages.find((m) => m.role === 'user').content;
  const question = user.split('\n\nQuestion: ')[1] || '';
  const picked = [...user.matchAll(/^\[(\d+)\] (.*)$/gm)].map((m) => ({ text: m[2] }));
  return { question, picked };
}

// ---------- a chain: parts joined into a pipe ----------
export const MODELS = {
  plain: { label: 'plain model', say: (t) => t },
  loud: { label: 'LOUD model', say: (t) => t.toUpperCase() },
  brief: { label: 'brief model', say: (t) => t.split(/(?<=\])\s+/)[0] },
};

export function kind(x) {
  if (typeof x === 'string') return 'plain text';
  if (x && x.chunks) return 'a question with chunks';
  if (x && x.messages) return 'prompt messages';
  if (x && x.role === 'ai') return 'a model message';
  return 'nothing';
}

export const PARTS = {
  retriever: {
    wants: 'plain text', gives: 'a question with chunks',
    run(x) { return { question: x, chunks: search(x).slice(0, 2) }; },
  },
  prompt: {
    wants: 'a question with chunks', gives: 'prompt messages',
    run(x) { return { messages: buildPrompt(x.question, x.chunks) }; },
  },
  model: {
    wants: 'prompt messages', gives: 'a model message',
    run(x, model) {
      const { question, picked } = readPrompt(x.messages);
      return { role: 'ai', content: MODELS[model].say(answer(question, picked).text), model };
    },
  },
  parser: {
    wants: 'a model message', gives: 'plain text',
    run(x) { return x.content; },
  },
};

export function runChain(order, question, model = 'plain') {
  const steps = [];
  let value = question;
  for (const name of order) {
    const part = PARTS[name];
    if (kind(value) !== part.wants) {
      return { steps, error: { part: name, message: `${name} wants ${part.wants}, but it was handed ${kind(value)}.` } };
    }
    const output = part.run(value, model);
    steps.push({ part: name, input: value, output });
    value = output;
  }
  return { steps, output: value, ok: typeof value === 'string' && order.length === 4 };
}

// ---------- a graph: nodes, one shared state, edges that decide ----------
const VOCAB = new Set(CHUNKS.flatMap((c) => tokens(c.text)));

export function newRun(opts) {
  return {
    opts,
    state: { question: opts.question, query: opts.question, attempts: 0, documents: [], relevant: [], approved: null, answer: null },
    next: 'retrieve', log: [], checkpoints: [], paused: false, done: false,
  };
}

// Runs one node. Returns { node, update, edge, next } or { node, paused: true } when the graph waits for a human.
export function advance(run, decision) {
  if (run.done) return null;
  const s = run.state;
  const node = run.next;
  let update = {}, edge = null, next;
  if (node === 'retrieve') {
    const documents = search(s.query).slice(0, 3).map((d) => ({ id: d.id, title: d.title, score: d.score }));
    update = { documents, attempts: s.attempts + 1 };
    next = 'grade';
  } else if (node === 'grade') {
    const relevant = s.documents.filter((d) => d.score >= run.opts.threshold);
    update = { relevant };
    if (relevant.length) [next, edge] = run.opts.askHuman ? ['approve', 'ask a human'] : ['generate', 'enough'];
    else if (s.attempts < run.opts.maxAttempts) [next, edge] = ['rewrite', 'try again'];
    else [next, edge] = ['give_up', 'out of attempts'];
  } else if (node === 'rewrite') {
    const kept = [...new Set(tokens(s.question).filter((w) => VOCAB.has(w)))];
    update = { query: kept.join(' ') || s.question };
    next = 'retrieve';
  } else if (node === 'approve') {
    if (decision === undefined) { run.paused = true; return { node, paused: true }; }
    run.paused = false;
    update = { approved: decision };
    [next, edge] = decision ? ['generate', 'yes'] : ['give_up', 'no'];
  } else if (node === 'generate') {
    const picked = s.relevant.map((d) => CHUNKS.find((c) => c.id === d.id));
    update = { answer: answer(s.query, picked).text };
    next = 'END';
  } else {
    update = { answer: s.approved === false ? 'Stopped: a human said no.' : 'I could not find this in the notes.' };
    next = 'END';
  }
  Object.assign(s, update);
  run.checkpoints.push({ after: node, state: JSON.parse(JSON.stringify(s)) });
  run.next = next;
  run.done = next === 'END';
  const step = { node, update, edge, next };
  run.log.push(step);
  return step;
}

export function runAll(opts, decision) {
  const run = newRun(opts);
  while (!run.done) { const st = advance(run); if (st.paused) { if (decision === undefined) break; advance(run, decision); } }
  return run;
}
