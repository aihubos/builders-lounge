import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const home = readFileSync(new URL('../home/index.html', import.meta.url), 'utf8');
const route = app.slice(app.indexOf('function route()'), app.indexOf('\nfunction go('));
for (const [search, hash, name, id] of [
  ['', '', 'home', ''], ['', '#home', 'home', ''], ['?post=abc', '#board', 'board', ''],
  ['', '#prompts/prompt-stic', 'prompts', 'prompt-stic'], ['?q=AI', '#library', 'library', ''],
  ['', '#lectures/material-4', 'lectures', 'material-4'],
]) {
  const location = { search, hash };
  const actual = runInNewContext(route + '\nroute()', { location, window: { location } });
  assert.equal(actual.name, name);
  assert.equal(actual.id, id);
}
assert.ok(!html.includes('location.replace("home/")'), '루트가 옛 소개 페이지로 돌아가면 안 됩니다.');
assert.ok(home.includes("location.search + (location.hash || '#home')"), '기존 home 주소의 검색·화면 경로를 보존합니다.');
for (const asset of html.matchAll(/(?:src|href)="(assets\/[^" ]+)"/g)) {
  assert.ok(existsSync(new URL('../' + asset[1], import.meta.url)), asset[1]);
}
assert.ok(html.includes('data-login-dialog') && html.includes('data-consent'));
console.log('홈·자료실·게시글 경로, 기존 주소 이동, 로컬 이미지 연결 확인 완료');
