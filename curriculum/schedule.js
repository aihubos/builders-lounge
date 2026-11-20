(() => {
  'use strict';

  // 일정 데이터: 날짜·시간은 한국 시간(KST) 기준입니다.
  window.SCHEDULE = window.SCHEDULE || {
    updated: '2026-10-28',
    months: ['2026-11', '2026-12'],
    types: {
      free: { label: '무료 설치반 (수강료 0원)', short: '무료' },
      morning: { label: '유료 · 평일 오전반', short: '오전반' },
      afternoon: { label: '유료 · 평일 오후반', short: '오후반' },
      weekend: { label: '유료 · 주말반', short: '주말반' }
    },
    events: [
      {
            "id": "free-1107",
            "type": "free",
            "date": "2026-11-07",
            "start": "07:00",
            "end": "09:00",
            "title": "무료 설치반 · Aside + Grok Bot",
            "place": "오프라인 · 동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "정원 5명",
            "price": "수강료 무료 · 장소비 1/n 별도",
            "detail": "Aside와 Grok Bot을 함께 설치하고 첫 요청을 해 봅니다. Grok Premium 구독자는 로그인과 첫 요청까지 진행합니다. 기수제 1기(평일 오전·오후반, 주말반) 수강 전에 참석하세요.",
            "link": ""
      },
      {
            "id": "free-1121",
            "type": "free",
            "date": "2026-11-21",
            "start": "07:00",
            "end": "09:00",
            "title": "무료 설치반 · Aside + Grok Bot",
            "place": "오프라인 · 동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "정원 5명",
            "price": "수강료 무료 · 장소비 1/n 별도",
            "detail": "격주로 열리는 같은 내용의 설치반입니다. 편한 날짜 하나를 골라 참석하세요.",
            "link": ""
      },
      {
            "id": "free-1205",
            "type": "free",
            "date": "2026-12-05",
            "start": "07:00",
            "end": "09:00",
            "title": "무료 설치반 · Aside + Grok Bot",
            "place": "오프라인 · 동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "정원 5명",
            "price": "수강료 무료 · 장소비 1/n 별도",
            "detail": "격주로 열리는 같은 내용의 설치반입니다. 편한 날짜 하나를 골라 참석하세요.",
            "link": ""
      },
      {
            "id": "free-1219",
            "type": "free",
            "date": "2026-12-19",
            "start": "07:00",
            "end": "09:00",
            "title": "무료 설치반 · Aside + Grok Bot",
            "place": "오프라인 · 동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "정원 5명",
            "price": "수강료 무료 · 장소비 1/n 별도",
            "detail": "격주로 열리는 같은 내용의 설치반입니다. 편한 날짜 하나를 골라 참석하세요.",
            "link": ""
      },
      {
            "id": "mo1",
            "type": "morning",
            "date": "2026-11-11",
            "start": "10:00",
            "end": "12:00",
            "title": "평일 오전반 1회 · 비서 + 블로그·SNS",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 평일 오전반 1회차입니다. 끝나면: 매일 아침 브리핑 + 예약 직전까지 준비된 블로그·SNS 글",
            "link": ""
      },
      {
            "id": "mo2",
            "type": "morning",
            "date": "2026-11-18",
            "start": "10:00",
            "end": "12:00",
            "title": "평일 오전반 2회 · LLM Wiki + 홈페이지",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 평일 오전반 2회차입니다. 끝나면: 출처가 달린 작은 위키 + grok.me 공개 주소",
            "link": ""
      },
      {
            "id": "mo3",
            "type": "morning",
            "date": "2026-11-25",
            "start": "10:00",
            "end": "12:00",
            "title": "평일 오전반 3회 · 캐릭터·쇼츠·롱폼",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 평일 오전반 3회차입니다. 끝나면: 캐릭터 시트 + 30초 쇼츠 + 1~3분 롱폼",
            "link": ""
      },
      {
            "id": "mo4",
            "type": "morning",
            "date": "2026-12-02",
            "start": "10:00",
            "end": "12:00",
            "title": "평일 오전반 4회 · 주문 + 대시보드",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 평일 오전반 4회차입니다. 끝나면: 결제 직전에서 멈춘 주문 + 숫자가 바뀌는 대시보드 + 하루 루틴",
            "link": ""
      },
      {
            "id": "af1",
            "type": "afternoon",
            "date": "2026-11-11",
            "start": "14:00",
            "end": "16:00",
            "title": "평일 오후반 1회 · 비서 + 블로그·SNS",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 평일 오후반 1회차입니다. 끝나면: 매일 아침 브리핑 + 예약 직전까지 준비된 블로그·SNS 글",
            "link": ""
      },
      {
            "id": "af2",
            "type": "afternoon",
            "date": "2026-11-18",
            "start": "14:00",
            "end": "16:00",
            "title": "평일 오후반 2회 · LLM Wiki + 홈페이지",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 평일 오후반 2회차입니다. 끝나면: 출처가 달린 작은 위키 + grok.me 공개 주소",
            "link": ""
      },
      {
            "id": "af3",
            "type": "afternoon",
            "date": "2026-11-25",
            "start": "14:00",
            "end": "16:00",
            "title": "평일 오후반 3회 · 캐릭터·쇼츠·롱폼",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 평일 오후반 3회차입니다. 끝나면: 캐릭터 시트 + 30초 쇼츠 + 1~3분 롱폼",
            "link": ""
      },
      {
            "id": "af4",
            "type": "afternoon",
            "date": "2026-12-02",
            "start": "14:00",
            "end": "16:00",
            "title": "평일 오후반 4회 · 주문 + 대시보드",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 평일 오후반 4회차입니다. 끝나면: 결제 직전에서 멈춘 주문 + 숫자가 바뀌는 대시보드 + 하루 루틴",
            "link": ""
      },
      {
            "id": "we1",
            "type": "weekend",
            "date": "2026-11-14",
            "start": "10:00",
            "end": "12:00",
            "title": "주말반 1회 · 비서 + 블로그·SNS",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 주말반 1회차입니다. 끝나면: 매일 아침 브리핑 + 예약 직전까지 준비된 블로그·SNS 글",
            "link": ""
      },
      {
            "id": "we2",
            "type": "weekend",
            "date": "2026-11-21",
            "start": "10:00",
            "end": "12:00",
            "title": "주말반 2회 · LLM Wiki + 홈페이지",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 주말반 2회차입니다. 끝나면: 출처가 달린 작은 위키 + grok.me 공개 주소",
            "link": ""
      },
      {
            "id": "we3",
            "type": "weekend",
            "date": "2026-11-28",
            "start": "10:00",
            "end": "12:00",
            "title": "주말반 3회 · 캐릭터·쇼츠·롱폼",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 주말반 3회차입니다. 끝나면: 캐릭터 시트 + 30초 쇼츠 + 1~3분 롱폼",
            "link": ""
      },
      {
            "id": "we4",
            "type": "weekend",
            "date": "2026-12-05",
            "start": "10:00",
            "end": "12:00",
            "title": "주말반 4회 · 주문 + 대시보드",
            "place": "동탄호수공원 인근 스터디카페 예정 · 추후 별도 공지",
            "capacity": "수강생 5명",
            "price": "1회 3만원 · 장소 대여비 포함",
            "detail": "기수제 1기 주말반 4회차입니다. 끝나면: 결제 직전에서 멈춘 주문 + 숫자가 바뀌는 대시보드 + 하루 루틴",
            "link": ""
      }
]
  };

  const data = window.SCHEDULE;
  const root = document.getElementById('schedule-app');
  if (!root || !data) return;
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  let monthIndex = 0;
  let selected = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const parts = date => date.split('-').map(Number);
  const weekday = date => { const [y, m, d] = parts(date); return DAYS[new Date(y, m - 1, d).getDay()]; };
  const label = date => { const [, m, d] = parts(date); return `${m}월 ${d}일 (${weekday(date)})`; };
  const compact = (date, time) => date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
  const toUtc = (date, time) => {
    const [y, m, d] = parts(date); const [hh, mm] = time.split(':').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d, hh - 9, mm));
    return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  const sorted = () => data.events.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  function googleUrl(ev) {
    const q = new URLSearchParams({
      action: 'TEMPLATE', text: 'AI빌더스랩 · ' + ev.title,
      dates: compact(ev.date, ev.start) + '/' + compact(ev.date, ev.end),
      ctz: 'Asia/Seoul', details: [ev.detail, ev.capacity, ev.price].filter(Boolean).join('\n'), location: ev.place || ''
    });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  function icsText(list) {
    const stamp = toUtc(data.updated, '09:00');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AI Builders Lab//Schedule//KO', 'CALSCALE:GREGORIAN'];
    const fold = s => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    list.forEach(ev => lines.push('BEGIN:VEVENT', 'UID:' + ev.id + '@aibuilderslab', 'DTSTAMP:' + stamp,
      'DTSTART:' + toUtc(ev.date, ev.start), 'DTEND:' + toUtc(ev.date, ev.end),
      'SUMMARY:' + fold('AI빌더스랩 · ' + ev.title), 'LOCATION:' + fold(ev.place || ''),
      'DESCRIPTION:' + fold([ev.detail, ev.capacity, ev.price].filter(Boolean).join('\n')), 'END:VEVENT'));
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function download(list, name) {
    const blob = new Blob([icsText(list)], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function render() {
    const month = data.months[monthIndex];
    const [y, m] = parts(month + '-01');
    const first = new Date(y, m - 1, 1).getDay();
    const days = new Date(y, m, 0).getDate();
    const events = sorted().filter(ev => ev.date.startsWith(month));
    const byDate = {};
    events.forEach(ev => (byDate[ev.date] = byDate[ev.date] || []).push(ev));
    const usedTypes = Object.keys(data.types).filter(t => events.some(ev => ev.type === t));
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell empty" aria-hidden="true"></div>';
    for (let d = 1; d <= days; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      const list = byDate[date] || [];
      const dow = (first + d - 1) % 7;
      const chips = list.map(ev => `<span class="cal-chip t-${esc(ev.type)}"><b>${esc(ev.start)}</b> ${esc(data.types[ev.type]?.short || '')}</span>`).join('');
      const inner = `<span class="cal-date">${d}</span>${chips}`;
      cells += list.length
        ? `<button type="button" class="cal-cell has-event${dow === 0 ? ' sun' : ''}${dow === 6 ? ' sat' : ''}${selected === date ? ' selected' : ''}" data-date="${date}" aria-label="${label(date)} 일정 ${list.length}개 보기">${inner}</button>`
        : `<div class="cal-cell${dow === 0 ? ' sun' : ''}${dow === 6 ? ' sat' : ''}">${inner}</div>`;
    }
    const shown = selected ? events.filter(ev => ev.date === selected) : events;
    root.innerHTML = `
      <div class="cal-top">
        <div class="cal-month">${data.months.length > 1 ? '<button type="button" class="cal-nav" data-nav="-1" aria-label="이전 달">‹</button>' : ''}<strong>${y}년 ${m}월</strong>${data.months.length > 1 ? '<button type="button" class="cal-nav" data-nav="1" aria-label="다음 달">›</button>' : ''}</div>
        <div class="cal-legend">${usedTypes.map(t => `<span class="cal-key t-${t}">${esc(data.types[t].label)}</span>`).join('')}</div>
      </div>
      <div class="cal-layout">
        <div class="cal-grid" role="grid" aria-label="${y}년 ${m}월 달력">
          ${DAYS.map((d, i) => `<div class="cal-head${i === 0 ? ' sun' : ''}${i === 6 ? ' sat' : ''}">${d}</div>`).join('')}
          ${cells}
        </div>
        <div class="cal-list">
          <div class="cal-list-head"><strong>${selected ? esc(label(selected)) : `${m}월 일정 ${events.length}개`}</strong>${selected ? '<button type="button" class="cal-reset">전체 보기</button>' : ''}</div>
          ${shown.length ? shown.map(ev => `
            <article class="cal-event t-${esc(ev.type)}">
              <p class="cal-event-type">${esc(data.types[ev.type]?.label || '')}</p>
              <h3>${esc(label(ev.date))} · ${esc(ev.start)}–${esc(ev.end)}</h3>
              <p class="cal-event-title">${esc(ev.title)}</p>
              <p class="cal-event-detail">${esc(ev.detail)}</p>
              <dl><div><dt>장소</dt><dd>${esc(ev.place)}</dd></div><div><dt>인원</dt><dd>${esc(ev.capacity)}</dd></div><div><dt>비용</dt><dd>${esc(ev.price)}</dd></div></dl>
              <div class="cal-actions"><a class="button" href="${esc(googleUrl(ev))}" target="_blank" rel="noopener">Google 캘린더에 추가</a><button type="button" class="button quiet" data-ics="${esc(ev.id)}">캘린더 파일(.ics)</button>${ev.link ? `<a class="cal-link" href="${esc(ev.link)}">수업 교안</a>` : ''}</div>
            </article>`).join('') : '<p class="cal-empty">이 날은 일정이 없습니다.</p>'}
          <button type="button" class="button cal-all" data-ics-all>${m}월 전체 일정 캘린더 파일 저장</button>
        </div>
      </div>`;
  }

  root.addEventListener('click', e => {
    const day = e.target.closest('[data-date]');
    if (day) { selected = selected === day.dataset.date ? null : day.dataset.date; render(); root.querySelector('.cal-list')?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
    if (e.target.closest('.cal-reset')) { selected = null; render(); return; }
    const nav = e.target.closest('[data-nav]');
    if (nav) { monthIndex = Math.min(data.months.length - 1, Math.max(0, monthIndex + Number(nav.dataset.nav))); selected = null; render(); return; }
    const one = e.target.closest('[data-ics]');
    if (one) { const ev = data.events.find(x => x.id === one.dataset.ics); if (ev) download([ev], 'aibuilderslab-' + ev.id + '.ics'); return; }
    if (e.target.closest('[data-ics-all]')) { const month = data.months[monthIndex]; download(sorted().filter(ev => ev.date.startsWith(month)), 'aibuilderslab-' + month + '.ics'); }
  });

  render();
})();
