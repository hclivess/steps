// Small building blocks every lesson uses. Nothing here knows a subject.

export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;                 // only for text written in the lesson files
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const kid of kids.flat(3)) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

export function svg(viewBox, inner = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', viewBox);
  s.innerHTML = inner;
  return s;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const round = (x, d = 2) => Number(x).toFixed(d);

// A question with buttons. correct is an index; why is shown after the right answer.
export function choice(host, api, { options, correct, why, wrong }) {
  const box = h('div', { class: 'choices' });
  options.forEach((text, i) => {
    const b = h('button', { class: 'choice', type: 'button', onclick: () => {
      for (const other of box.children) other.classList.remove('wrong');
      if (i === correct) {
        for (const other of box.children) other.disabled = true;
        b.classList.add('right');
        api.solve(why);
      } else {
        b.classList.add('wrong');
        api.miss((wrong && wrong[i]) || 'Not that one. Try again.');
      }
    } }, text);
    box.append(b);
  });
  host.append(box);
  return box;
}

// A labelled slider. show(value) gives the text next to the label.
export function slider({ label, min, max, step = 1, value, show = (v) => v, oninput }) {
  const out = h('output', {}, show(value));
  const input = h('input', { type: 'range', min, max, step, value, oninput: () => {
    out.textContent = show(+input.value);
    oninput(+input.value);
  } });
  const el = h('label', { class: 'slider' }, h('span', {}, label, ' ', out), input);
  el.input = input;
  el.set = (v) => { input.value = v; out.textContent = show(+v); };
  return el;
}

// A vector as a grid of cells: the darker, the larger the number.
export function grid(vec, columns = 16) {
  const max = Math.max(1, ...vec);
  const box = h('div', { class: 'grid', style: `grid-template-columns: repeat(${columns}, 1fr)` });
  vec.forEach((v) => box.append(h('i', { style: v ? `opacity:${0.35 + 0.65 * (v / max)}` : '', class: v ? 'on' : '' })));
  return box;
}

// Score bars: [{ label, score, mark }]
export function bars(rows, max = 1) {
  return h('div', { class: 'bars' }, rows.map((r) => h('div', { class: 'bar-row' + (r.mark ? ' mark' : '') },
    h('span', { class: 'bar-label' }, r.label),
    h('span', { class: 'bar-track' }, h('i', { style: `width:${Math.max(0, Math.min(1, r.score / max)) * 100}%` })),
    h('span', { class: 'bar-num' }, round(r.score)))));
}

// Drag inside an svg: calls move({x, y}) in viewBox units while the pointer is down on target.
export function drag(svgEl, target, move) {
  const at = (ev) => {
    const p = svgEl.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(svgEl.getScreenCTM().inverse());
  };
  target.addEventListener('pointerdown', (ev) => { target.setPointerCapture(ev.pointerId); ev.preventDefault(); });
  target.addEventListener('pointermove', (ev) => { if (target.hasPointerCapture(ev.pointerId)) move(at(ev)); });
}
