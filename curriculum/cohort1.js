(function () {
  'use strict';
  var D = window.COHORT1;
  if (!D) return;
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var params = new URLSearchParams(location.search);
  var cls = params.get('class') || store.get('c1-class') || 'morning';
  if (!D.schedule.classes[cls]) cls = 'morning';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function md(v) {
    var BT = String.fromCharCode(96);
    return esc(v)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(new RegExp(BT + '([^' + BT + ']+)' + BT, 'g'), '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
        var href = /^https?:/.test(u) ? u : '교안/' + u.replace(/^\.\.\//, '../');
        if (!/^https?:/.test(u) && u.indexOf('../') === 0) href = u.replace('../', '');
        return '<a href="' + href + '"' + (/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>';
      });
  }
  function parts(d) { return d.split('-').map(Number); }
  function dateLabel(d) { var p = parts(d); var w = DAYS[new Date(p[0], p[1] - 1, p[2]).getDay()]; return (p[0] !== 2026 ? p[0] + '년 ' : '') + p[1] + '월 ' + p[2] + '일 (' + w + ')'; }
  function clock(start, add) { var t = start.split(':').map(Number); var m = t[0] * 60 + t[1] + add; return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function when(i) {
    var s = D.sessions[i];
    if (s.kind === 'free') return { date: D.schedule.free.date, start: D.schedule.free.start, end: D.schedule.free.end };
    var c = D.schedule.classes[cls];
    return { date: c.dates[i - 1], start: c.start, end: c.end };
  }
  function kindLabel(k) { return k === 'free' ? '먼저 · 무료' : '1기 4회'; }
  function today() { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); }
  function nextIndex() { var t = today(); for (var i = 0; i < D.sessions.length; i++) if (when(i).date >= t) return i; return -1; }

  function renderTimeline() {
    var nx = nextIndex();
    function card(i) {
      var s = D.sessions[i], w = when(i);
      return '<a class="tl-card k-' + s.kind + '" href="#' + s.id + '">' +
        (i === nx ? '<span class="tl-next">다음 수업</span>' : '') +
        '<span class="tl-num">' + (s.kind === 'free' ? '무료' : esc(s.label.replace('회', ''))) + '</span>' +
        '<span class="tl-date">' + esc(dateLabel(w.date)) + ' · ' + esc(w.start) + '</span>' +
        '<span class="tl-topic">' + esc(s.label === '무료 설치반' ? '무료 설치반 · Aside + Grok Bot' : s.topic) + '</span>' +
        '<span class="tl-out">' + esc(s.outcome) + '</span></a>';
    }
    var c = D.schedule.classes[cls];
    document.getElementById('timeline').innerHTML =
      '<div class="tl-group"><h3>먼저 · 무료 설치반 <small>1기는 11/7 설치반에 먼저 참석합니다</small></h3><div class="tl-row one">' + card(0) + '</div></div>' +
      '<div class="tl-group"><h3>1기 4회 <small>' + esc(c.label) + ' · ' + esc(c.when) + ' · 회마다 두 가지</small></h3><div class="tl-row">' + [1, 2, 3, 4].map(card).join('') + '</div></div>';
    document.getElementById('overview-note').textContent = c.label + '(' + c.when + ') 날짜로 보여 드립니다. 무료 설치반은 두 반 모두 11/7 오전 7~9시입니다.';
  }

  function renderSessions() {
    var html = D.sessions.map(function (s, i) {
      var w = when(i);
      var flow = s.flow.map(function (f) {
        var practice = /따라 하기|내 것으로|실습|결과 발표/.test(f.text);
        return '<li class="' + (practice ? 'practice' : '') + '"><time>' + clock(w.start, f.start) + '–' + clock(w.start, f.end) + '<small>' + (f.end - f.start) + '분</small></time><span>' + md(f.text) + '</span></li>';
      }).join('');
      var saved = (store.get('c1-check-' + s.id) || '').split(',');
      var checks = s.checks.map(function (c, k) {
        var id = s.id + '-c' + k;
        return '<li><label for="' + id + '"><input type="checkbox" id="' + id + '" data-sid="' + s.id + '" data-k="' + k + '"' + (saved.indexOf(String(k)) > -1 ? ' checked' : '') + '><span>' + md(c) + '</span></label></li>';
      }).join('');
      var refs = s.refs.slice(0, 4).map(function (r) { return '<a class="ref" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.label) + '</a>'; }).join('');
      var notes = '';
      return '<article class="session" id="' + s.id + '" aria-labelledby="' + s.id + '-t">' +
        '<div class="s-head"><span class="badge k-' + s.kind + '">' + kindLabel(s.kind) + '</span><span class="s-when">' + esc(s.label) + ' · ' + esc(dateLabel(w.date)) + ' ' + esc(w.start) + '–' + esc(w.end) + (s.kind === 'free' ? '<small>오프라인 · 정원 5명 · 수강료 무료 · 장소비 1/n 별도</small>' : '<small>' + esc(D.schedule.classes[cls].label) + '</small>') + '</span></div>' +
        '<h3 class="s-title" id="' + s.id + '-t">' + esc(s.topic) + '</h3>' +
        '<p class="s-goal">' + md(s.goal) + '</p>' +
        '<div class="chips">' + s.tools.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="s-out"><span>이 회차가 끝나면 내 손에</span><strong>' + esc(s.outcome) + '</strong></div>' +
        (s.video ? '<video class="s-video" controls preload="none" playsinline poster="' + esc(s.poster) + '" src="' + esc(s.video) + '" aria-label="' + esc(s.label) + ' 소개 영상"></video>' : '') +
        '<div class="s-grid">' +
          '<div class="box"><h4>120분 진행</h4><ol class="flow">' + flow + '</ol></div>' +
          '<div class="box"><h4>오늘 따라 하는 것</h4><ol class="steps">' + s.steps.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ol>' +
            (s.prompt ? '<div class="prompt"><div class="prompt-top"><span>대표 요청문</span><button type="button" class="copy" data-copy="' + s.id + '">복사</button></div><pre id="' + s.id + '-p">' + esc(s.prompt) + '</pre></div>' : '') +
          '</div>' +
          '<div class="box"><h4>오늘의 완성 체크</h4><ul class="checks">' + checks + '</ul><p class="progress" id="' + s.id + '-prog"></p><p class="submit"><strong>제출</strong>' + md(s.submit) + '</p></div>' +
          (s.image ? '<figure class="shot box"><img src="' + esc(s.image) + '" alt="' + esc(s.topic) + ' 실제 화면" loading="lazy"><figcaption>실제 화면 예시</figcaption></figure>' : '') +
        '</div>' +
        '<div class="s-links">' + refs + '</div>' + notes +
        '</article>';
    }).join('');
    document.getElementById('session-list').innerHTML = html;
    D.sessions.forEach(function (s) { progress(s.id); });
  }

  function progress(sid) {
    var boxes = document.querySelectorAll('input[data-sid="' + sid + '"]');
    var done = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).length;
    var el = document.getElementById(sid + '-prog');
    if (el) el.textContent = done + ' / ' + boxes.length + ' 완료' + (done === boxes.length && done ? ' · 오늘 수업 완성!' : '');
  }

  function setClass(next) {
    cls = next; store.set('c1-class', next);
    document.querySelectorAll('[data-class]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.class === next)); });
    var u = new URL(location.href); u.searchParams.set('class', next); history.replaceState(null, '', u.pathname + u.search + u.hash);
    renderTimeline(); renderSessions();
    document.getElementById('live').textContent = D.schedule.classes[next].label + ' 날짜로 바꿨습니다.';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-class]');
    if (b) { setClass(b.dataset.class); return; }
    var c = e.target.closest('[data-copy]');
    if (c) {
      var text = document.getElementById(c.dataset.copy + '-p').textContent;
      var done = function () { c.textContent = '복사됨'; setTimeout(function () { c.textContent = '복사'; }, 1500); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
      function fallback() { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (err) { c.textContent = '직접 선택해 복사하세요'; } t.remove(); }
    }
  });
  document.addEventListener('keydown', function (e) {
    var b = e.target.closest && e.target.closest('[data-class]');
    if (b && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); var ks = Object.keys(D.schedule.classes), ix = ks.indexOf(cls); var n = ks[(ix + (e.key === 'ArrowRight' ? 1 : ks.length - 1)) % ks.length]; setClass(n); document.querySelector('[data-class="' + n + '"]').focus(); }
  });
  document.addEventListener('change', function (e) {
    var i = e.target.closest('input[data-sid]'); if (!i) return;
    var sid = i.dataset.sid;
    var on = Array.prototype.filter.call(document.querySelectorAll('input[data-sid="' + sid + '"]'), function (b) { return b.checked; }).map(function (b) { return b.dataset.k; });
    store.set('c1-check-' + sid, on.join(',')); progress(sid);
  });

  document.getElementById('updated').textContent = '내용 기준 ' + D.updated;
  setClass(cls);
})();
