// node --test test/   Every task a lesson sets must be solvable, and every "correct" answer must be what the code does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chunk, search, answer, runChain, runAll, embed, cosine } from '../js/core.js';
import { CHUNKS, SOURDOUGH } from '../js/data.js';

const top = (q) => search(q)[0];

test('chunking: three chunks are reachable, chunks cover the text, overlap repeats text', () => {
  const sizes = [];
  for (let size = 60; size <= 400; size += 10) if (chunk(SOURDOUGH, size).length === 3) sizes.push(size);
  assert.ok(sizes.length > 0, 'no size gives 3 chunks');
  for (const size of [60, 100, 150, 250]) {
    const parts = chunk(SOURDOUGH, size);
    assert.equal(parts[0].start, 0);
    assert.equal(parts.at(-1).end, SOURDOUGH.length);
    for (const p of parts) assert.ok(p.text.length <= size);
  }
  const parts = chunk(SOURDOUGH, 120, 40);
  assert.ok(parts.length > 1);
  for (let i = 1; i < parts.length; i++) assert.ok(parts[i].start < parts[i - 1].end, 'no overlap');
});

test('similarity: same words 1, no shared words 0', () => {
  assert.ok(Math.abs(cosine(embed('starter bubbles'), embed('bubbles starter')) - 1) < 1e-9);
  assert.equal(cosine(embed('my starter is full of bubbles'), embed('coffee tastes bitter')), 0);
  assert.ok(cosine(embed('my starter is full of bubbles'), embed('the starter has bubbles')) > 0.5);
});

test('search finds the right note', () => {
  assert.equal(top('When is my sourdough starter ready?').id, 1);
  assert.equal(top('How hot should the water be for coffee?').id, 5);
  assert.equal(top('which plants tolerate low light?').id, 7);
});

test('the model answers only from notes', () => {
  const q = 'When is my sourdough starter ready?';
  assert.match(answer(q, []).text, /don't know/);
  assert.match(answer(q, search(q).slice(0, 2)).text, /doubled in size.*\[1\]/);
});

test('chain: right order works, wrong order names the part that broke', () => {
  const q = 'How hot should the water be for coffee?';
  const good = runChain(['retriever', 'prompt', 'model', 'parser'], q);
  assert.ok(good.ok);
  assert.match(good.output, /92 to 96/);
  const bad = runChain(['model', 'retriever', 'parser', 'prompt'], q);
  assert.equal(bad.error.part, 'model');
  assert.notEqual(runChain(['retriever', 'prompt', 'model', 'parser'], q, 'loud').output, good.output);
});

test('graph: answers at once, loops, gives up, waits for a human', () => {
  const base = { threshold: 0.3, maxAttempts: 3, askHuman: false };
  const easy = runAll({ ...base, question: 'which plants tolerate low light?' });
  assert.deepEqual(easy.log.map((s) => s.node), ['retrieve', 'grade', 'generate']);

  const hard = { ...base, question: 'I just bought a monstera, where exactly should I put it regarding light?' };
  const loop = runAll(hard);
  assert.deepEqual(loop.log.map((s) => s.node), ['retrieve', 'grade', 'rewrite', 'retrieve', 'grade', 'generate']);
  assert.match(loop.state.answer, /bright indirect light/);

  assert.equal(runAll({ ...hard, maxAttempts: 1 }).log.at(-1).node, 'give_up');
  assert.equal(runAll({ ...hard, threshold: 0.9 }).log.at(-1).node, 'give_up');

  const waiting = runAll({ ...base, askHuman: true, question: 'which plants tolerate low light?' });
  assert.ok(waiting.paused && !waiting.done);
  assert.equal(runAll({ ...base, askHuman: true, question: 'which plants tolerate low light?' }, true).log.at(-1).node, 'generate');
  assert.equal(runAll({ ...base, askHuman: true, question: 'which plants tolerate low light?' }, false).log.at(-1).node, 'give_up');
});

test('numbers the lessons quote', () => {
  const q = 'I just bought a monstera, where exactly should I put it regarding light?';
  console.log('monstera first search', search(q).slice(0, 3).map((d) => [d.id, d.score.toFixed(2)]).join(' '));
  console.log('monstera rewritten  ', runAll({ question: q, threshold: 0.3, maxAttempts: 3 }).state.query,
    runAll({ question: q, threshold: 0.3, maxAttempts: 3 }).state.documents.map((d) => [d.id, d.score.toFixed(2)]).join(' '));
  console.log('low light           ', search('which plants tolerate low light?').slice(0, 3).map((d) => [d.id, d.score.toFixed(2)]).join(' '));
  console.log('coffee water        ', search('How hot should the water be for coffee?').slice(0, 3).map((d) => [d.id, d.score.toFixed(2)]).join(' '));
  console.log('3-chunk sizes       ', [...Array(35)].map((_, i) => 60 + i * 10).filter((s) => chunk(SOURDOUGH, s).length === 3).join(','));
  assert.equal(CHUNKS.length, 9);
});
