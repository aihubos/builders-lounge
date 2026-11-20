// 1기 모집 페이지: 화면에 들어온 핵심 키워드를 네온 형광펜처럼 칠합니다.
(function () {
  'use strict';
  var marks = document.querySelectorAll('.recruit mark');
  if (!('IntersectionObserver' in window)) { marks.forEach(function (m) { m.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.6 });
  marks.forEach(function (m) { io.observe(m); });
})();
