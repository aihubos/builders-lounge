import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const routeCode = source.slice(source.indexOf('function route()'), source.indexOf('function go('));
for (const [hash, search, expected] of [['', '', 'home'], ['', '?post=example', 'board'], ['#board', '', 'board'], ['#home/story', '', 'home'], ['#prompts/example', '', 'prompts']]) {
  assert.equal(runInNewContext(routeCode + '; route().name', { window: { location: { hash, search } } }), expected);
}
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(html.includes('id="landing-page"'));
assert.ok(html.includes('assets/intro-tall.mp4') && html.includes('assets/intro-wide.mp4'));
assert.ok(!html.includes('data-intro'));
console.log('Landing routes and responsive video markup passed.');
