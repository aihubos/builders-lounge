import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// 첫 방문은 소개 페이지(home/)로, 게시판·공유 주소는 그대로 게시판으로 가는지 확인합니다.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rule = html.match(/if \((.*)\) location\.replace\("home\/"\)/)[1];
const goesHome = (search, hash) => new Function('location', 'return ' + rule)({ search, hash });
for (const [search, hash, expected] of [['', '', true], ['', '#home', true], ['?post=abc', '#board', false], ['', '#board', false], ['', '#prompts/x', false], ['?q=ai', '', false]]) {
  assert.equal(goesHome(search, hash), expected, search + hash);
}
const home = readFileSync(new URL('../home/index.html', import.meta.url), 'utf8');
assert.ok(!/30,000|30000|#pricing/.test(home), '소개 페이지에 금액이 남아 있습니다.');
for (const asset of home.matchAll(/(?:src|srcset|href)="(assets\/[^" ]+)"/g)) {
  assert.ok(existsSync(new URL('../home/' + asset[1], import.meta.url)), asset[1] + ' 파일이 없습니다.');
}
console.log('Home redirect, price removal, and home assets passed.');
