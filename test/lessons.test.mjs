// The lesson list is well formed: unique addresses, every screen has a title, a text and something to do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from '../js/lessons/index.js';

test('courses, lessons and screens are complete', () => {
  const keys = new Set();
  let screens = 0;
  for (const c of COURSES) {
    assert.ok(c.id && c.subject && c.title && c.blurb, 'course ' + c.id);
    for (const l of c.lessons) {
      const key = `${c.id}/${l.id}`;
      assert.ok(!keys.has(key), 'twice: ' + key);
      keys.add(key);
      assert.ok(l.title && l.screens.length, key);
      for (const s of l.screens) {
        assert.ok(s.title && s.text && typeof s.mount === 'function', key + ' / ' + s.title);
        screens += 1;
      }
    }
  }
  console.log(`${COURSES.length} courses, ${keys.size} lessons, ${screens} screens`);
});
