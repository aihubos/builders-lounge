/* =========================================================
   Design Systems Gallery — SPA
   - Loads data/brands-index.json (slim, ~104KB / gzip ~24KB) for the grid
   - Lazy-fetches data/hero/{slug}.json when a card scrolls into view (~4.9KB each)
   - Lazy-fetches data/detail/{slug}.json on detail view (cached)
   - Hash routing: '#/' (index) | '#/<slug>' (detail)
   - Facet filters (single + multi), free-text search, sort
   - Card hero rendered via iframe srcdoc (lazy)
   - Detail view extracts CSS tokens and shows live signature demo
========================================================= */

(function () {
  'use strict';

  // ---------- 워드프레스 판 ----------
  // 템플릿 tools/design-systems-site.php 가 window.OPD_DSG 를 넣으면 워드프레스 판이다
  // (2026-10-09 운영자 「룩북을 워드프레스 안으로 · 화면 끝에 닿을 때만 불러오기」).
  //   base   = 데이터·정적 브랜드 페이지 주소 앞부분(정적 index.html 은 상대 주소라 '')
  //   paged  = 세 줄씩 그리고 목록 끝에 닿으면 세 줄 더(아래 renderGrid)
  //   member = 서버가 아는 로그인 여부 — 계정 REST 를 부르지 않는다(loadAccount)
  //   login  = 로그인 주소
  // 정적 index.html 에는 이 값이 없다 — 아래 CFG 분기는 전부 그 화면을 바꾸지 않는다.
  const CFG = window.OPD_DSG || null;
  const BASE = (CFG && typeof CFG.base === 'string') ? CFG.base : '';
  const PAGED = !!(CFG && CFG.paged);

  // ---------- Constants ----------
  const SECTION_KEYS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫'];
  // 섹션 윗줄 라벨 — 한글 제목의 영어 번역(eyebrow). 아랫줄 h3는 한글 제목 유지.
  const SECTION_EN_LABELS = {
    '①': 'Brand DNA',
    '②': 'Tone & Mood',
    '③': 'Color System',
    '④': 'Typography',
    '⑤': 'Spacing',
    '⑥': 'Border Radius',
    '⑦': 'Shadow / Elevation',
    '⑧': 'Iconography',
    '⑨': 'Component Guide',
    '⑩': 'Motion',
    '⑪': 'Anti-patterns',
    '⑫': 'Design System in Use'
  };
  const FACET_LABELS = {
    region: { korea: '한국', asia: '아시아', western: '서양' },
    color_tone: { warm: '따뜻한', cool: '차가운', neutral: '중립', mixed: '복합' },
    color_family: {
      red: '빨강', orange: '주황', yellow: '노랑', green: '초록', teal: '청록',
      blue: '파랑', purple: '보라', pink: '분홍', black: '검정', gray: '회색', white: '흰색'
    },
    font_category: { 'sans-serif': '고딕', serif: '명조', display: '디자인폰트', mono: '고정폭', mixed: '복합' },
    industry: {
      'design-system':'디자인 시스템','productivity':'생산성','dev-tools':'개발 도구',
      'fintech':'핀테크','ecommerce':'이커머스','enterprise':'엔터프라이즈',
      'creative-tools':'크리에이티브 도구','consumer':'소비자','food':'식품','marketing':'마케팅',
      'mobility':'모빌리티','ai':'AI','media':'미디어','social':'소셜','infra':'인프라','lifestyle':'라이프스타일',
      'gaming':'게이밍','telecom':'통신','manufacturing':'제조',
      'public':'공공','recruitment':'채용','sports':'스포츠'
    },
    theme_view: { light: '라이트', dark: '다크' },
    released_decade: { 'pre-2000': '그 이전', '2000s': '2000년대', '2010s': '2010년대', '2020s': '2020년대' }
  };
  // 「컬러」 스와치에 칠할 대표색. 브랜드 실제 색이 아니라 칸을 알아보게 하는 견본이라
  // 계열마다 하나씩 고정한다(build.js 의 colorFamily 가 나누는 구간의 한가운데 값).
  const COLOR_FAMILY_HEX = {
    red: '#E5484D', orange: '#F76B15', yellow: '#FFC53D', green: '#30A46C', teal: '#00A2C7',
    blue: '#3E63DD', purple: '#8E4EC6', pink: '#E93D82', black: '#18181B', gray: '#8B8D98',
    white: '#FFFFFF'
  };

  // 넓은 화면 거르기 줄에 처음부터 보이는 색 수 — 나머지는 [펼침] 뒤(buildFilterUI)
  const COLOR_LEAD = 5;

  // Fixed option order for theme_view single-select (no enum in data; we control it client-side).
  const THEME_VIEW_OPTIONS = ['light', 'dark'];
  const DECADE_ORDER = ['pre-2000', '2000s', '2010s', '2020s'];
  function decadeBucket(year) {
    if (year == null || !Number.isFinite(year)) return null;
    if (year < 2000) return 'pre-2000';
    if (year < 2010) return '2000s';
    if (year < 2020) return '2010s';
    return '2020s';
  }

  const FACET_GROUP_LABEL = {
    region: '지역', industry: '산업', color_family: '컬러',
    font_category: '폰트',
    theme_view: '테마 보기',
    released_decade: '출시 연도'
  };

  // ---------- State ----------
  const state = {
    data: null,
    filters: {
      search: '',
      region: '',                        // '' = all
      industry: new Set(),               // multi
      color_family: '',                  // '' = all
      font_category: new Set(),
      theme_view: '',                    // '' = 모두 | 'light' | 'dark' — also drives preview theme
      released_decade: new Set()
    },
    sort: 'newest-desc',                 // 기본 정렬 = 최신순(2026-09-20 운영자 지시)
    theme: 'light'                       // 'light' | 'dark' — applies to brand previews only; derived from theme_view
  };

  // ---------- Theme ----------
  // theme_view ('' | 'light' | 'dark') is the single source of truth — drives both grid filter
  // (theme_modes membership) AND iframe preview theme. Persisted across reloads.
  const THEME_KEY = 'ds-gallery-theme-view';
  const CARD_TOKEN_KEYS = ['bg', 'surface', 'border', 'fg', 'fg_muted', 'accent'];
  // Card iframes that should refresh their srcdoc when the theme toggles.
  // Held strongly so toggling is O(visible cards); cleared on grid re-render.
  const themedCards = new Set();

  function loadThemeView() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return (v === 'light' || v === 'dark') ? v : '';
    } catch (e) { return ''; }
  }
  function saveThemeView(v) {
    try { localStorage.setItem(THEME_KEY, v || ''); } catch (e) { /* ignore */ }
  }
  // '모두'(theme_view='') 일 때 호스트 UI 는 라이트다. 카드·상세 미리보기는 브랜드 기본 테마를 따른다(cardTheme).
  function previewThemeFor(v) { return v === 'dark' ? 'dark' : 'light'; }
  // 브랜드의 기본 테마 = theme_modes 의 첫 값(md 규약: 정본 파일의 hero·③·⑫ 톤 = 1차 테마).
  // 예: 치지직 [dark, light] → '모두' 보기에서도 다크로 그린다. (2026-09-20 운영자 지시)
  function primaryTheme(b) {
    const m = (b && b.theme_modes && b.theme_modes[0]) || 'light';
    return m === 'dark' ? 'dark' : 'light';
  }
  // 카드 한 장의 미리보기 테마. 사이드바에서 라이트/다크를 골랐으면 그것, '모두'면 브랜드 기본 테마.
  function cardTheme(b) {
    return state.filters.theme_view ? state.theme : primaryTheme(b);
  }
  function applyHostTheme(t) {
    document.documentElement.dataset.theme = t;
  }
  // Set both the filter value and the preview theme in one shot.
  function setThemeView(v) {
    if (v !== 'light' && v !== 'dark') v = '';
    if (state.filters.theme_view === v) return;
    state.filters.theme_view = v;
    saveThemeView(v);
    const nextTheme = previewThemeFor(v);
    if (state.theme !== nextTheme) {
      state.theme = nextTheme;
      applyHostTheme(nextTheme);
      refreshThemedIframes();
    }
  }

  // Refresh srcdoc for every currently-rendered card iframe + the detail demo iframe.
  // themedCards 에는 히어로를 이미 받은 카드만 들어 있으므로 여기서 fetch 는 일어나지 않는다.
  function refreshThemedIframes() {
    for (const card of themedCards) {
      const iframe = card.querySelector('iframe');
      if (!iframe || !iframe.srcdoc) continue;
      const brand = card._brand;
      if (!brand) continue;
      const rec = heroCache.get(brand.slug);
      if (!rec) continue;
      iframe.srcdoc = wrapHeroSrcdoc(rec.hero, rec.card_tokens, cardTheme(brand));
    }
    const demo = document.querySelector('iframe.sig-demo');
    if (demo && demo._brand) {
      demo.srcdoc = wrapDemoSrcdoc(demo._brand.signature_demo, buildBrandTokens(demo._brand), demo._brand.card_tokens, state.theme);
    }
  }

  // Build the <style> block injected into every theme-aware iframe.
  // Renders both light and dark token sets so toggling can later be done
  // by flipping the iframe <html data-theme> attribute (we currently re-set srcdoc).
  function buildCardTokenStyle(tokens) {
    if (!tokens || (!tokens.light && !tokens.dark)) return '';
    const fallback = tokens.light || tokens.dark || {};
    const decl = (mode) => {
      const m = tokens[mode] || fallback;
      return CARD_TOKEN_KEYS
        .filter(k => m[k])
        .map(k => `  --card-${k.replace('_', '-')}: ${m[k]};`)
        .join('\n');
    };
    return `:root, :root[data-theme="light"] {\n${decl('light')}\n}\n` +
           (tokens.dark ? `:root[data-theme="dark"] {\n${decl('dark')}\n}\n` : '');
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    // Apply persisted theme_view BEFORE fetching so first paint of the sidebar + previews matches.
    state.filters.theme_view = loadThemeView();
    state.theme = previewThemeFor(state.filters.theme_view);
    applyHostTheme(state.theme);

    try {
      // ⭐ 라이브 집계(/counts)를 기다리지 않는다.
      // 예전엔 Promise.all 로 묶어서, 인덱스가 20ms 에 도착해도 WP REST(PHP+DB, 실측 137ms)가
      // 끝나야 그리드를 그렸다. 그 사이 카드도 히어로도 아무것도 시작되지 않았다.
      // 임베드된 빌드시점 집계로 즉시 렌더하고, 라이브값은 도착하는 대로 반영한다.
      const res = await fetch(BASE + 'data/brands-index.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('failed to load brands-index.json');
      state.data = await res.json();
    } catch (e) {
      // 상세 주소로 들어왔으면 index.html 이 목록을 감춰 둔 상태다 — 오류 문구가 보이게 되돌린다.
      document.body.dataset.view = 'index';
      document.getElementById('grid').innerHTML = `<div class="empty"><p>데이터 로드 실패: ${escapeHtml(e.message)}</p><p style="font-size:12px;color:var(--text-tertiary)">먼저 <code>node build.js</code> 를 실행해 <code>data/brands-index.json</code> 를 생성하세요.</p></div>`;
      document.getElementById('resultCount').textContent = '';
      return;
    }
    state.detailCache = {};
    buildFilterUI();
    bindEvents();
    route();
    // 워드프레스 판은 라이브 집계를 「인기도순」을 고를 때만 받는다(bindEvents) — 기본 정렬(최신순)엔 쓰지 않아
    // 들어올 때마다 워드프레스를 한 번 더 깨우던 요청이 빠진다. 빌드 때 넣어 둔 집계로 먼저 정렬한다.
    if (!CFG) syncLiveCounts();
  }
  let liveAsked = false;

  /**
   * 라이브 집계를 뒤늦게 반영한다.
   *
   * 조회수는 '인기도순' 정렬에만 쓰이므로 첫 렌더를 막을 이유가 없다.
   * 다만 도착 후 순서가 실제로 바뀌었을 때만 다시 그린다 — 빌드시점 값과 같은 순서면
   * 재렌더가 히어로를 새로 굽는 깜빡임만 만든다(대개 순서가 같다).
   */
  function syncLiveCounts() {
    fetchLiveCounts().then(live => {
      if (!live || !state.data) return;
      const before = orderSignature();

      // 상세 진입 직후 보낸 view 히트보다 /counts 응답이 먼저 만들어졌다면 응답 값이 1 작을 수 있다.
      // 카운터는 단조 증가하므로 세션의 낙관적 view 값이 더 크면 그 값을 보존한다.
      if (state.liveCounts) {
        for (const slug of Object.keys(state.liveCounts)) {
          const localView = state.liveCounts[slug] && (state.liveCounts[slug].view || 0);
          const remote = live[slug] || (live[slug] = {});
          if (localView > (remote.view || 0)) remote.view = localView;
        }
      }
      state.liveCounts = live;
      applyLiveCounts(state.data.brands, live);
      // 상세 화면을 보고 있으면 건드리지 않는다(돌아갈 때 새 순서로 그려진다).
      if (orderSignature() !== before) {
        if (document.body.dataset.view === 'index' && !(viewer && viewer.dlg.open)) renderIndex();
        else gridFresh = false;
      }
    });
  }

  /** 현재 필터·정렬로 나오는 순서를 문자열 하나로 — 재렌더가 필요한지 판단할 때만 쓴다. */
  function orderSignature() {
    if (!state.data) return '';
    return applySort(applyFilters(state.data.brands)).map(b => b.slug).join(',');
  }

  async function loadBrandDetail(slug) {
    if (state.detailCache[slug]) return state.detailCache[slug];
    const res = await fetch(`${BASE}data/detail/${encodeURIComponent(slug)}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`detail not found: ${slug}`);
    const detail = await res.json();
    state.detailCache[slug] = detail;
    return detail;
  }

  // ---- Card hero (data/hero/{slug}.json) ----
  // 히어로 마크업과 card_tokens 는 인덱스에서 떼어냈다 — 인덱스의 86%(1,304KB 중 1,118KB)를
  // 먹으면서 필터·정렬·검색에는 쓰이지 않았다. 카드가 뷰포트에 들어올 때만 받는다.
  // 캐시는 그리드 재렌더를 건너 살아남으므로 필터를 오가도 같은 카드를 다시 받지 않는다.
  const heroCache = new Map();     // slug → { hero, card_tokens } | null (영구 실패)
  const heroInflight = new Map();  // slug → Promise (동시 요청 합류)

  function loadHero(slug) {
    if (heroCache.has(slug)) return Promise.resolve(heroCache.get(slug));
    const pending = heroInflight.get(slug);
    if (pending) return pending;
    // cache:'default' — 인덱스/상세와 달리 매번 재검증하지 않는다. 히어로는 빌드 때만
    // 바뀌고 서버가 max-age=3600 을 주므로, 카드마다 조건부 요청을 왕복시킬 이유가 없다.
    const p = fetch(`${BASE}data/hero/${encodeURIComponent(slug)}.json`, { cache: 'default' })
      .then(res => {
        if (!res.ok) { heroCache.set(slug, null); return null; }  // 404 = 재시도해도 소용없음
        return res.json().then(rec => {
          const out = { hero: (rec && rec.hero) || '', card_tokens: (rec && rec.card_tokens) || null };
          heroCache.set(slug, out);
          return out;
        });
      })
      .catch(() => null)   // 네트워크 실패는 캐시하지 않는다 — 다음 렌더에서 다시 시도
      .then(v => { heroInflight.delete(slug); return v; });
    heroInflight.set(slug, p);
    return p;
  }

  /** 받아 둔 히어로를 iframe 에 굽는다. 테마는 호출 시점 값을 쓴다. */
  function paintHero(card, rec) {
    const iframe = card.querySelector('iframe');
    if (!iframe || !rec) return;
    iframe.srcdoc = wrapHeroSrcdoc(rec.hero, rec.card_tokens, cardTheme(card._brand));
    card.dataset.hero = 'on';
    if (rec.card_tokens) themedCards.add(card);
  }

  // 카드 히어로를 받아 iframe 에 굽는다. 중복 호출·재렌더·테마 전환 경합에 안전하다.
  function hydrateHero(card) {
    if (card.dataset.hero) return;          // 'loading' | 'on'
    const b = card._brand;
    if (!b) return;

    // 이미 받아 둔 것(프리페치·이전 렌더 캐시)은 기다리지 않고 이 프레임에 굽는다.
    const cached = heroCache.get(b.slug);
    if (cached) { paintHero(card, cached); return; }

    card.dataset.hero = 'loading';
    loadHero(b.slug).then(rec => {
      if (!rec) { delete card.dataset.hero; return; }   // 실패 → 다음 기회에 재시도
      if (!card.isConnected) return;                     // 그 사이 그리드가 다시 그려짐
      paintHero(card, rec);
    });
  }

  // ---- Live counts (oppadu-tools DB) ----
  // 인기도순은 상세 조회수(view)를 쓰며, 빌드 시점 스냅샷은 /counts 실시간값으로 덮는다.
  // download·copy 는 구 app.js 호환과 별도 이용 지표를 위해 응답에 계속 남아 있다.
  async function fetchLiveCounts() {
    if (CFG && CFG.localPackage) return null;
    try {
      const res = await fetch('/wp-json/oppadu-tools/v1/design-systems/counts?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      const m = await res.json();
      return (m && typeof m === 'object') ? m : null;
    } catch (e) { return null; }   // plugin/endpoint down → keep embedded fallback
  }
  // Overwrite each brand's embedded count with the live DB value (where present).
  function applyLiveCounts(brands, map) {
    if (!map || !brands) return;
    for (const b of brands) {
      const c = map[b.slug];
      if (c) {
        b.view_count = c.view || 0;
        b.download_count = c.download || 0;
      }
    }
  }
  // 상세 조회의 낙관적 +1을 라이브 맵·인덱스·상세 캐시에 함께 반영한다.
  // /counts 가 아직 안 왔다면 빌드에 임베드된 view_count 를 기준으로 올린다.
  function bumpLiveCount(slug) {
    const indexBrand = state.data && state.data.brands
      ? state.data.brands.find(x => x.slug === slug)
      : null;
    const embeddedView = indexBrand ? (indexBrand.view_count || 0) : 0;
    if (!state.liveCounts) state.liveCounts = {};
    const lc = state.liveCounts[slug] || (state.liveCounts[slug] = { view: embeddedView });
    lc.view = Math.max(lc.view || 0, embeddedView) + 1;
    if (indexBrand) indexBrand.view_count = lc.view;
    if (state.detailCache && state.detailCache[slug]) {
      state.detailCache[slug].view_count = lc.view;
    }
  }

  // ---------- Filter UI builder ----------
  function buildFilterUI() {
    const valuesByFacet = collectFacetValues();

    document.querySelectorAll('.filter-group[data-facet]').forEach(group => {
      const facet = group.dataset.facet;
      const mode = group.querySelector('.filter-options').dataset.mode;
      const wrap = group.querySelector('.filter-options');
      const knownValues = orderFacetValues(facet, valuesByFacet[facet] || []);

      // 컬러는 색 자체가 라벨이라 텍스트 칩 대신 스와치 타일로 고른다.
      // 넓은 화면 거르기 줄에서는 늘 펼쳐 둔다(2026-10-11 운영자 「고르면 '1' 로 접히지 말고 색 목록이 항상 보이게」).
      // 다 늘어놓으면 줄이 길어서 브랜드가 많은 색 COLOR_LEAD 개만 줄에 두고(무지개 순서 = enum), [펼침]은 그 아래에
      // 모든 색 판을 띄운다 — 줄 안에서 늘리면 1440px 폭에서 정렬 칸이 다음 줄로 밀려 목록 전체가 내려갔다.
      // 숨긴 색을 골라 두면 그 색도 줄에 보인다(app.css). 880px 이하 서랍은 줄에 모든 색 + 「전체」를 늘어놓는다.
      if (facet === 'color_family') {
        wrap.appendChild(makeSwatch(facet, '', '전체'));
        const n = {};
        for (const b of state.data.brands) n[b.color_family] = (n[b.color_family] || 0) + 1;
        const lead = new Set(knownValues.slice().sort((a, b) => (n[b] || 0) - (n[a] || 0)).slice(0, COLOR_LEAD));
        const label = v => (FACET_LABELS[facet] && FACET_LABELS[facet][v]) || String(v);
        for (const v of knownValues) {
          const sw = makeSwatch(facet, v, label(v));
          if (!lead.has(v)) sw.dataset.extra = 'true';
          wrap.appendChild(sw);
        }
        if (knownValues.length > lead.size) {
          // 판의 견본도 data-facet 을 가진 .filter-options 라 고르기·초기화·칩 × 동기화에 그대로 낀다
          const panel = document.createElement('div');
          panel.className = 'filter-options color-more-panel';
          panel.id = 'colorMorePanel';
          panel.dataset.mode = 'single';
          panel.setAttribute('role', 'group');
          panel.setAttribute('aria-label', '모든 컬러');
          panel.hidden = true;
          for (const v of knownValues) panel.appendChild(makeSwatch(facet, v, label(v)));
          wrap.appendChild(makeSwatchMore(panel));
          group.appendChild(panel);
        }
        return;
      }

      // Prepend an "all" chip for single-select facets only (multi facets toggle values directly).
      if (mode === 'single') {
        const allLabel = facet === 'theme_view' ? '모두' : '전체';
        wrap.appendChild(makeChip(facet, '', allLabel, mode, true));
      }
      for (const v of knownValues) {
        const baseLabel = (FACET_LABELS[facet] && FACET_LABELS[facet][v]) || String(v);
        const label = facet === 'released_decade'
          ? `${baseLabel} (${countByDecade(v)})`
          : baseLabel;
        wrap.appendChild(makeChip(facet, v, label, mode, false));
      }
    });
  }

  function collectFacetValues() {
    const acc = {};
    for (const facet of ['region','industry','color_family','font_category']) {
      const set = new Set();
      for (const b of state.data.brands) {
        const v = b[facet];
        if (Array.isArray(v)) v.forEach(x => set.add(x));
        else if (v != null) set.add(v);
      }
      acc[facet] = Array.from(set);
    }
    const decadeSet = new Set();
    for (const b of state.data.brands) {
      const d = decadeBucket(b.released_year);
      if (d) decadeSet.add(d);
    }
    acc.released_decade = Array.from(decadeSet);
    // theme_view is a UI-only facet (not a brand field). Always offer both options.
    acc.theme_view = THEME_VIEW_OPTIONS.slice();
    return acc;
  }

  function countByDecade(decadeKey) {
    let n = 0;
    for (const b of state.data.brands) {
      if (decadeBucket(b.released_year) === decadeKey) n++;
    }
    return n;
  }

  function orderFacetValues(facet, observed) {
    if (facet === 'released_decade') return DECADE_ORDER.filter(v => observed.includes(v));
    if (facet === 'theme_view') return THEME_VIEW_OPTIONS.filter(v => observed.includes(v));
    const enums = state.data.enum || {};
    const canonical = enums[facet];
    if (canonical) return canonical.filter(v => observed.includes(v));
    return observed.slice().sort();
  }

  function makeChip(facet, value, label, mode, isAll) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'facet-chip';
    btn.dataset.facet = facet;
    btn.dataset.value = value;
    btn.dataset.mode = mode;
    btn.textContent = label;
    btn.setAttribute('aria-pressed', String(facetIsActive(facet, value)));
    btn.addEventListener('click', () => onChipClick(btn));
    return btn;
  }

  // 스와치 타일. 칩과 같은 data-* 계약(facet/value/mode)을 지키므로 선택 동기화 코드는 공유한다.
  // ⭐ 화면에 글자가 없다 — 색 견본 하나가 곧 선택지다(2026-09-16 운영자 지시로 이름·개수 제거).
  //    이름은 aria-label·title 로만 남긴다. 둘까지 지우면 스크린리더엔 「버튼」 13개가 되고
  //    마우스 사용자도 어느 계열인지 확인할 길이 없어진다.
  function makeSwatch(facet, value, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'facet-swatch';
    btn.dataset.facet = facet;
    btn.dataset.value = value;
    btn.dataset.mode = 'single';
    btn.setAttribute('aria-pressed', String(facetIsActive(facet, value)));
    btn.setAttribute('aria-label', label);
    btn.title = label;

    const chip = document.createElement('span');
    chip.className = 'facet-swatch-color';
    // '전체' 타일엔 칠할 색이 없다 — 점선 테두리로 "색을 고르지 않음"을 표시한다.
    if (value === '') chip.dataset.all = 'true';
    else chip.style.background = COLOR_FAMILY_HEX[value] || 'var(--bg-subtle)';

    btn.append(chip);
    btn.addEventListener('click', () => onChipClick(btn));
    return btn;
  }

  // [펼침] — 컬러 줄 끝. 누르면 모든 색 판(panel)을 줄 아래에 띄운다. 판에서 고르거나 바깥을 누르거나 Esc 면 닫는다.
  // data-facet 이 없어 고르기·초기화 동기화(.filter-options [data-facet])에 끼지 않는다.
  // 880px 이하 서랍은 색을 다 늘어놓아서 이 단추와 판을 숨긴다(app.css).
  function makeSwatchMore(panel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'facet-swatch-more';
    btn.setAttribute('aria-controls', panel.id);
    btn.setAttribute('aria-label', '모든 컬러 보기');
    btn.title = '모든 컬러 보기';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    const set = (open) => {
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    };
    set(false);
    btn.addEventListener('click', () => set(panel.hidden));
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-facet]')) { set(false); btn.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) set(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); }
    });
    return btn;
  }

  function onChipClick(btn) {
    const facet = btn.dataset.facet;
    let value = btn.dataset.value;
    const mode = btn.dataset.mode;
    if (mode === 'single') {
      // 색 타일은 토글로 읽힌다 — 이미 고른 색을 다시 누르면 '전체'로 돌아간다.
      if (facet === 'color_family' && state.filters[facet] === value) value = '';
      // theme_view also flips the preview theme — handle via setThemeView so iframes refresh.
      if (facet === 'theme_view') setThemeView(value);
      else state.filters[facet] = value; // '' means all
      // update siblings — 묶음 전체(컬러는 줄 + 모든 색 판 두 군데에 같은 견본이 있다)
      (btn.closest('.filter-group') || btn.parentElement).querySelectorAll('[data-facet]').forEach(c => {
        c.setAttribute('aria-pressed', String(c.dataset.value === value));
      });
    } else {
      const set = state.filters[facet];
      if (value === '') {
        set.clear();                       // '모두' → 해당 facet 선택 해제(전체)
      } else if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      // '모두'는 set이 비었을 때 활성, 값 칩은 set 포함 시 활성
      btn.parentElement.querySelectorAll('[data-facet]').forEach(c => {
        const v = c.dataset.value;
        c.setAttribute('aria-pressed', String(v === '' ? set.size === 0 : set.has(v)));
      });
    }
    renderIndex();
  }

  function facetIsActive(facet, value) {
    const f = state.filters[facet];
    if (f instanceof Set) return value === '' ? f.size === 0 : f.has(value);  // '' = '모두'
    return f === value;
  }

  // ---------- Events ----------
  function bindEvents() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
      state.filters.search = e.target.value.trim().toLowerCase();
      renderIndex();
    });
    const sortBy = document.getElementById('sortBy');
    sortBy.value = state.sort;                 // 컨트롤이 기본 정렬(최신순)을 반영
    sortBy.addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderIndex();
      // 워드프레스 판 — 인기도순을 처음 고른 순간 라이브 집계를 받는다(순서가 바뀌면 그때 다시 그린다)
      if (CFG && state.sort === 'popularity-desc' && !liveAsked) {
        liveAsked = true;
        syncLiveCounts();
      }
    });
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.querySelector('.empty button[data-action="reset-filters"]').addEventListener('click', resetFilters);

    // Mobile drawer
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('scrim');
    const toggle = document.getElementById('filterToggle');
    toggle.addEventListener('click', () => openDrawer(true));
    scrim.addEventListener('click', () => openDrawer(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.dataset.open === 'true') openDrawer(false);
    });

    // Hash routing
    window.addEventListener('hashchange', route);
  }

  function openDrawer(open) {
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('scrim');
    const toggle = document.getElementById('filterToggle');
    sidebar.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    scrim.hidden = !open;
    if (open) {
      sidebar.querySelector('input,button,select')?.focus();
    }
  }

  function resetFilters() {
    state.filters.search = '';
    state.filters.region = '';
    state.filters.color_family = '';
    state.filters.industry.clear();
    state.filters.font_category.clear();
    setThemeView('');                   // reverts preview to light + clears filter
    state.filters.released_decade.clear();

    document.getElementById('searchInput').value = '';

    document.querySelectorAll('.filter-options [data-facet]').forEach(c => {
      const isAll = c.dataset.value === '';   // single·multi 공통 '모두/전체' 칩
      c.setAttribute('aria-pressed', isAll ? 'true' : 'false');
    });
    renderIndex();
  }

  // ---------- Routing ----------
  // 카드는 같은 탭에서 상세로 간다(2026-10-06 운영자 지시 — 9/4 부터 새 탭이었다).
  // 상세는 목록 위에 화면 전체를 덮는 보기 창(아래 「상세 보기 창」)으로 연다(2026-10-11 운영자 채용 시안 A —
  // 모션 스타일 상세와 같은 창). 목록은 창 뒤에 그대로 있으니 닫으면 보던 자리·필터 그대로다.
  // 상세 주소(#/{slug})로 바로 들어왔으면 목록이 아직 없다 — 닫을 때 그린다.
  const INDEX_TITLE = document.title;
  let gridFresh = false;     // 그려 둔 그리드가 지금 필터·정렬·순서와 맞는가

  function route() {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/([\w-]+)\/?$/);
    if (m) { renderDetail(m[1]); return; }
    const wasOpen = closeViewer();
    if (!wasOpen || !gridFresh || document.body.dataset.view !== 'index') renderIndex();
  }

  // 목록↔상세를 오갈 때의 스크롤은 순간 이동이다. 워드프레스 판은 테마가 html 에 scroll-behavior:smooth 를 걸어
  // 그냥 scrollTo 를 부르면 화면이 미끄러져 내려간다(style.css).
  function jumpTo(y) {
    if (CFG) {
      try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); return; } catch (e) { /* 옛 브라우저 */ }
    }
    window.scrollTo(0, y);
  }

  // ---------- Index ----------
  function renderIndex() {
    document.body.dataset.view = 'index';
    document.getElementById('main').hidden = false;
    document.title = INDEX_TITLE;
    jumpTo(0);
    if (!state.data) return;
    gridFresh = true;

    const filtered = applyFilters(state.data.brands);
    const sorted = applySort(filtered);
    navList = sorted.map(b => b.slug);   // 상세 보기 창의 이전·다음 순서

    document.getElementById('resultCount').textContent = `${sorted.length}개 시스템`;
    renderActiveChips();
    renderGrid(sorted);
  }

  function applyFilters(list) {
    const f = state.filters;
    return list.filter(b => {
      if (f.search) {
        const hay = (b.brand + ' ' + (b.brand_ko || '') + ' ' + (b.signature_keyword || '') + ' ' + (b.mood || []).join(' ')).toLowerCase();
        if (!hay.includes(f.search)) return false;
      }
      if (f.region && b.region !== f.region) return false;
      if (f.color_family && b.color_family !== f.color_family) return false;
      if (f.industry.size && !(b.industry || []).some(v => f.industry.has(v))) return false;
      if (f.theme_view && !(b.theme_modes || []).includes(f.theme_view)) return false;
      if (f.font_category.size && !f.font_category.has(b.font_category)) return false;
      if (f.released_decade.size) {
        const d = decadeBucket(b.released_year);
        if (!d || !f.released_decade.has(d)) return false;
      }
      return true;
    });
  }

  function applySort(list) {
    const arr = list.slice();
    switch (state.sort) {
      case 'brand-asc': arr.sort((a,b) => a.brand.localeCompare(b.brand, 'ko')); break;
      // 최신순 = md frontmatter `generated`(작성일) 내림차순. 같은 날짜는 표시 이름 순으로 고정.
      case 'newest-desc': arr.sort((a,b) =>
        String(b.generated || '').localeCompare(String(a.generated || ''))
        || displayName(a).localeCompare(displayName(b), 'ko')
        || a.slug.localeCompare(b.slug)
      ); break;
      case 'revision-desc': arr.sort((a,b) => (b.last_major_revision||0) - (a.last_major_revision||0)); break;
      // 인기도 = 상세 조회수. 동점은 표시 이름, slug 순으로 고정해 렌더마다 흔들리지 않게 한다.
      case 'popularity-desc': arr.sort((a,b) =>
        (b.view_count || 0) - (a.view_count || 0)
        || displayName(a).localeCompare(displayName(b), 'ko')
        || a.slug.localeCompare(b.slug)
      ); break;
    }
    return arr;
  }

  function renderActiveChips() {
    const f = state.filters;
    const wrap = document.getElementById('activeChips');
    wrap.innerHTML = '';
    const chips = [];

    const single = (facet, val) => {
      if (val) chips.push({
        facet, value: val,
        text: `${FACET_GROUP_LABEL[facet]}: ${(FACET_LABELS[facet] && FACET_LABELS[facet][val]) || val}`
      });
    };
    const multi = (facet, set) => {
      for (const v of set) chips.push({
        facet, value: v,
        text: `${FACET_GROUP_LABEL[facet]}: ${(FACET_LABELS[facet] && FACET_LABELS[facet][v]) || v}`
      });
    };

    single('region', f.region);
    single('color_family', f.color_family);
    single('theme_view', f.theme_view);
    multi('industry', f.industry);
    multi('font_category', f.font_category);
    multi('released_decade', f.released_decade);
    if (f.search) chips.push({ facet: 'search', value: '', text: `검색: ${f.search}` });

    for (const c of chips) {
      const el = document.createElement('span');
      el.className = 'active-chip';
      el.innerHTML = `<span></span><button type="button" aria-label="제거">×</button>`;
      el.firstChild.textContent = c.text;
      el.querySelector('button').addEventListener('click', () => removeChip(c.facet, c.value));
      wrap.appendChild(el);
    }
  }

  function removeChip(facet, value) {
    if (facet === 'search') {
      state.filters.search = '';
      document.getElementById('searchInput').value = '';
    } else if (state.filters[facet] instanceof Set) {
      state.filters[facet].delete(value);
    } else if (facet === 'theme_view') {
      setThemeView('');                 // also flips preview back to light
    } else {
      state.filters[facet] = '';
    }
    // sync facet chip pressed state
    document.querySelectorAll(`.filter-options [data-facet="${facet}"]`).forEach(c => {
      const v = c.dataset.value;
      const f2 = state.filters[facet];
      const active = f2 instanceof Set
        ? (v === '' ? f2.size === 0 : f2.has(v))           // '모두' = set 비었을 때
        : (c.dataset.mode === 'single' && (f2 === v));
      c.setAttribute('aria-pressed', String(active));
    });
    renderIndex();
  }

  // 점진 렌더링: 첫 화면은 즉시(INITIAL), 나머지는 idle 시간에 배치로 채움.
  // 필터·정렬이 바뀌어 renderGrid가 재호출되면 renderToken 증가 → 진행 중이던 배치는 자동 중단.
  //
  // INITIAL 은 12 — 첫 화면에 실제로 보이는 만큼만 동기로 만든다. 30장이던 때는 그 동기 루프가
  // ~130ms 를 먹었고, 그 시간에는 마이크로태스크가 돌지 못해 히어로 캐시도 채워지지 않았다.
  const RENDER_INITIAL = 12;
  const RENDER_BATCH = 30;
  // 첫 화면 히어로는 IntersectionObserver 를 기다리지 않고 미리 받는다.
  // IO 는 카드가 DOM 에 붙은 뒤에야 콜백이 돌아서, 카드 30장 생성(실측 ~130ms)이 끝날 때까지
  // 네트워크가 놀았다. 목록이 정해진 순간 앞쪽 것부터 요청을 걸어 두면 그 시간과 겹친다.
  // 16 = 넓은 화면(6열 × 2행 + 여유)까지 커버. 나머지는 그대로 IO 가 맡는다.
  const HERO_PREFETCH = 16;
  // 첫 배치를 그리기 전에 기다려 줄 히어로 수 + 대기 상한.
  // 카드 DOM 생성은 동기 루프라 그 사이 fetch 콜백(마이크로태스크)이 돌지 못한다. 그래서
  // 기다리지 않으면 "카드 먼저, 히어로 150ms 뒤" 로 보인다 — 파일은 이미 도착해 있는데도.
  // 상한을 두는 이유: 회선이 느리면 히어로 때문에 카드까지 늦어지는 게 더 나쁘다.
  const HERO_FIRST_WAIT = 12;
  const HERO_WAIT_MS = 250;
  let renderToken = 0;
  const scheduleIdle = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 200 })
    : (fn) => setTimeout(fn, 16);

  // 워드프레스 판(PAGED) = 「화면 끝에 닿을 때만 불러오기」(2026-10-09 운영자).
  // 예전 판은 284장을 2초에 걸쳐 전부 붙였다 — 그동안 스크롤 막대가 계속 늘어나 「천천히 하나씩 다 불러온다」로 보였고
  // 카드마다 iframe 이 하나씩 생겼다. 이제 지금 열 수 × 3줄만 그리고, 목록 끝(#gridMore)이 화면 아래
  // MORE_MARGIN 안에 들어오면 세 줄을 더 붙인다. 거르기·정렬을 바꾸면 그 목록의 처음 세 줄부터 다시.
  // 덧붙인 묶음은 곧 보일 카드라 히어로를 바로 받는다(카드마다 IO 를 기다리지 않는다).
  const PAGE_ROWS = 3;
  const MORE_MARGIN = 100;
  let moreIO = null;

  /** 한 번에 그리는 카드 수 = 그리드의 지금 열 수 × PAGE_ROWS (AI 활용 틀: 4·3·2·1열 — app.css .aihx .grid). */
  function pageSize() {
    const g = document.getElementById('grid');
    let cols = 0;
    if (g) {
      const v = getComputedStyle(g).gridTemplateColumns || '';
      const m = /repeat\(\s*(\d+)/.exec(v);   // 숨겨진 그리드는 계산값 대신 선언값(repeat(4, …))을 돌려준다
      cols = m ? Number(m[1]) : v.split(' ').filter(Boolean).length;
    }
    return Math.max(1, Math.min(cols || 4, 8)) * PAGE_ROWS;
  }

  function stopMore() {
    if (moreIO) { moreIO.disconnect(); moreIO = null; }
  }

  /** 목록 끝을 지켜보다 닿으면 more() — more() 가 false(다 붙였다)를 돌려주면 끝낸다. */
  function watchMore(more) {
    let s = document.getElementById('gridMore');
    if (!s) {
      s = document.createElement('div');
      s.id = 'gridMore';
      s.className = 'grid-more';
      s.setAttribute('aria-hidden', 'true');
      document.getElementById('grid').insertAdjacentElement('afterend', s);
    }
    if (!('IntersectionObserver' in window)) {
      while (more()) { /* 옛 브라우저 — 전부 붙인다 */ }
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (moreIO !== io) { io.disconnect(); return; }   // 그 사이 목록이 바뀌었다
      if (!entries.some(e => e.isIntersecting)) return;
      if (!more()) { stopMore(); return; }
      // 붙인 뒤에도 끝이 아직 화면 안이면(키 큰 화면) 한 번 더 — 관찰을 다시 걸면 지금 상태로 한 번 더 알려 준다
      io.unobserve(s);
      io.observe(s);
    }, { rootMargin: `0px 0px ${MORE_MARGIN}px 0px` });
    moreIO = io;
    io.observe(s);
  }

  async function renderGrid(list) {
    const myToken = ++renderToken;
    const grid = document.getElementById('grid');
    const empty = document.getElementById('empty');

    // ⭐ 카드 DOM 을 만들기 **전에** 앞쪽 히어로 요청을 띄운다. hydrateHero() 는 이미 날아간
    // 같은 Promise 에 합류하므로(heroInflight) 중복 요청은 생기지 않는다.
    const first = PAGED ? pageSize() : HERO_PREFETCH;
    const head = list.slice(0, first).map(b => b.slug);
    const inflight = head.map(loadHero);
    const waitN = PAGED ? first : HERO_FIRST_WAIT;

    // 첫 화면 몫이 아직 안 왔으면 짧게 기다려 카드와 함께 굽는다.
    // 이미 캐시에 있으면(필터 왕복 등) 대기 없이 지나간다.
    if (head.slice(0, waitN).some(s => !heroCache.has(s))) {
      await Promise.race([
        Promise.all(inflight.slice(0, waitN)),
        new Promise(r => setTimeout(r, HERO_WAIT_MS))
      ]);
      if (myToken !== renderToken) return;   // 기다리는 동안 새 렌더가 들어왔다
    }

    grid.innerHTML = '';
    themedCards.clear();
    if (PAGED) stopMore();
    if (!list.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    if (PAGED) {
      let cursor = 0;
      const append = (n) => {
        if (myToken !== renderToken) return false;
        const end = Math.min(cursor + n, list.length);
        const frag = document.createDocumentFragment();
        const cards = [];
        for (let i = cursor; i < end; i++) {
          const card = makeCard(list[i]);
          cards.push(card);
          frag.appendChild(card);
        }
        grid.appendChild(frag);
        cards.forEach(hydrateHero);   // 받아 둔 것은 이 프레임에 굽고, 나머지는 받는 대로 굽는다
        cursor = end;
        return cursor < list.length;
      };
      if (append(first)) watchMore(() => append(pageSize()));
      return;
    }

    const io = ('IntersectionObserver' in window)
      ? new IntersectionObserver((entries) => {
          for (const ent of entries) {
            if (ent.isIntersecting) {
              hydrateHero(ent.target);
              io.unobserve(ent.target);
            }
          }
        }, { rootMargin: '200px' })
      : null;

    const renderRange = (start, end) => {
      const frag = document.createDocumentFragment();
      const cards = [];
      for (let i = start; i < end; i++) {
        const card = makeCard(list[i]);
        cards.push(card);
        frag.appendChild(card);
      }
      grid.appendChild(frag);
      // 이미 받아 둔 히어로는 IO 를 기다리지 않고 지금 굽는다(카드와 같은 프레임).
      // 나머지는 IO 가 뷰포트 진입 때 맡는다.
      for (const c of cards) {
        const rec = heroCache.get(c._brand.slug);
        if (rec) paintHero(c, rec);
      }
      if (io) cards.forEach(c => io.observe(c));
      // IO 미지원 폴백 — 렌더 자체가 30장씩 배치라 요청도 그만큼 나뉜다.
      else cards.forEach(hydrateHero);
    };

    // 1) 첫 배치는 동기 — 사용자가 즉시 카드 그리드를 본다
    const initialEnd = Math.min(RENDER_INITIAL, list.length);
    renderRange(0, initialEnd);

    // 2) 나머지는 idle 시간에 채움. 도중에 새 renderGrid 호출이 오면 myToken 불일치로 중단
    let cursor = initialEnd;
    function pump() {
      if (myToken !== renderToken) return;
      if (cursor >= list.length) return;
      const end = Math.min(cursor + RENDER_BATCH, list.length);
      renderRange(cursor, end);
      cursor = end;
      scheduleIdle(pump);
    }
    if (cursor < list.length) scheduleIdle(pump);
  }

  function makeCard(b) {
    const card = document.createElement('a');
    card.className = 'card';
    // href 는 프리렌더된 실제 페이지를 가리킨다 — 크롤러가 따라갈 수 있는 링크가 되고
    // (해시는 별도 URL 로 취급되지 않는다), 공유 가능한 URL 이 나온다.
    // 일반 클릭은 아래에서 가로채 같은 탭의 SPA 상세로 보낸다.
    card.href = `${BASE}brand/${b.slug}.html`;
    card.setAttribute('role', 'listitem');
    card._brand = b;
    // 히어로는 원칙적으로 카드가 뷰포트에 들어올 때 hydrateHero() 가 받아 굽는다.
    // 단, 프리페치가 이미 끝나 캐시에 있으면 아래에서 카드 생성과 동시에 굽는다 —
    // IO 콜백을 한 프레임 기다리면 "카드 먼저, 히어로 나중에" 로 보인다.
    // 항목은 같은 탭에서 연다(2026-10-06 운영자 지시). 목록으로 돌아오면 보던 자리로
    // 돌아간다(route() 참고). 주소는 갤러리 SPA 의 #/{slug} 다 — 프리렌더 문서(href)에는
    // 적용 예시 데모·가이드 다운로드·프롬프트 복사가 없어서, 그쪽으로 보내면 클릭으로 얻던 기능이 사라진다.
    card.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // 브라우저 기본 새 탭에 맡긴다
      e.preventDefault();
      const target = `#/${b.slug}`;
      if (location.hash === target) route(); else location.hash = target;
    });

    const hero = document.createElement('div');
    hero.className = 'card-hero';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = `${displayName(b)} hero preview`;
    hero.appendChild(iframe);

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';
    titleRow.innerHTML =
      `<span class="card-swatch" style="background:${escapeAttr(b.primary_color_hex || '#ccc')}"></span>` +
      `<h3 class="card-title">${escapeHtml(displayName(b))}</h3>`;
    const subtitle = document.createElement('p');
    subtitle.className = 'card-subtitle';
    subtitle.textContent = b.signature_keyword || '';
    const badges = document.createElement('div');
    badges.className = 'card-badges';
    if (b.region) badges.appendChild(makeBadge((FACET_LABELS.region[b.region] || b.region), 'badge-region'));
    if ((b.industry || [])[0]) badges.appendChild(makeBadge(FACET_LABELS.industry[b.industry[0]] || b.industry[0]));
    if ((b.industry || [])[1]) badges.appendChild(makeBadge(FACET_LABELS.industry[b.industry[1]] || b.industry[1]));

    // 카드 하단: 배지만.
    // 집계 숫자는 화면에 내보내지 않는다. 인기도순은 상세 조회수를 쓰고,
    // 다운로드·복사는 별도 이용 지표로만 계속 기록한다.
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.appendChild(badges);

    meta.appendChild(titleRow);
    meta.appendChild(subtitle);
    meta.appendChild(footer);

    card.appendChild(hero);
    card.appendChild(meta);
    return card;
  }

  function makeBadge(text, extra) {
    const s = document.createElement('span');
    s.className = 'badge' + (extra ? ' ' + extra : '');
    s.textContent = text;
    return s;
  }

  function wrapHeroSrcdoc(heroHtml, cardTokens, theme) {
    const themeAttr = (cardTokens && cardTokens[theme === 'dark' ? 'dark' : 'light']) ? ` data-theme="${theme}"` : '';
    const tokenStyle = buildCardTokenStyle(cardTokens);
    const tokenStyleTag = tokenStyle ? `<style>${tokenStyle}</style>` : '';
    return `<!doctype html><html${themeAttr}><head><meta charset="utf-8">${tokenStyleTag}<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:var(--card-bg,#fff);color:var(--card-fg,inherit);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Pretendard',sans-serif}*{box-sizing:border-box}</style></head><body>${heroHtml}</body></html>`;
  }

  // ---------- Detail ----------
  // 상세 = 화면 전체를 덮는 보기 창(<dialog class="dsv">) — 2026-10-11 운영자 채용 「시안 A」.
  // 모션 스타일 상세(테마 tools/_motion-styles-assets/css/light.css .msl-d)와 같은 뼈대:
  //   위 막대(브랜드 룩북 › 산업 · n / 전체 · 이전·다음 · 닫기)
  //   왼쪽 = ⑫ 적용 예시 웹페이지(남은 높이를 다 채움) + 코드 보기 → 이름 · 한 줄 설명 · 특징 두 단(분류·분위기·스타일 / 글꼴·모양·연도)
  //          — 한 화면에 꼭 맞게(스크롤도 아래 빈칸도 없이). ⑫ 해설 글은 보이지 않는다.
  //   오른쪽 = 탭 줄(색·글꼴 ③④ | 컴포넌트·규칙 ⑤~⑪ | 가이드 다운로드 + 오른쪽 끝 해/달 = 라이트·다크) · 맨 끝 상표 문구
  //            가이드 다운로드 = 단추(다운로드 · 프롬프트 복사)만 → ①~⑪ 전부 · 출처 → 가이드 원문(회원)
  // 창은 한 번 만들어 두고 브랜드가 바뀔 때 안쪽만 갈아 끼운다. 목록은 창 뒤에 그대로 있다.
  // ⭐ 창(dialog)은 셸(.otl) 안에 둔다 — 이 파일의 토큰·되돌리기 규칙이 셸 안에만 걸린다(맨 위 :root 주석).
  //    showModal 의 맨 위 층이라 사이트 머리글·관리자 막대도 덮는다(모션 스타일 창과 같다).
  const DETAIL_LABELS = {
    density: { compact: '촘촘한 간격', comfortable: '보통 간격', spacious: '넉넉한 간격' },
    corner_style: { sharp: '각진 모서리', soft: '살짝 둥근 모서리', round: '둥근 모서리', pill: '알약형 모서리' },
    flatness: { flat: '평면', subtle: '옅은 그림자', layered: '겹친 그림자' },
    visual_style: {
      'modern-minimal': '모던 미니멀', humanism: '휴머니즘', brutalism: '브루탈리즘',
      neumorphism: '뉴모피즘', glassmorphism: '글래스모피즘', 'retro-craft': '레트로 크래프트'
    }
  };
  // 오른쪽 탭 — 어느 섹션이 어느 탭에 들어가나. 첫 탭이 기본.
  // 2026-10-11 운영자 4차: 순서 = 색·글꼴 | 컴포넌트·규칙 | 가이드 다운로드. 「전체」 탭은 걷고 그 내용(①~⑪ · 출처)을 가이드 다운로드 탭에.
  const VIEWER_TABS = [
    { id: 'look', label: '색·글꼴', keys: ['③', '④'] },
    { id: 'parts', label: '컴포넌트·규칙', keys: ['⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪'] },
    { id: 'guide', label: '가이드 다운로드', keys: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪'] }
  ];
  const SVG = (d, size) => `<svg width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    prev: SVG('<path d="m15 18-6-6 6-6"/>'),
    next: SVG('<path d="m9 18 6-6-6-6"/>'),
    close: SVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    copy: SVG('<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>', 16),
    download: SVG('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>', 16),
    lock: SVG('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', 16),
    sun: SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>', 16),
    moon: SVG('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', 16)
  };

  let viewer = null;         // { dlg, main, side, body, cat, count, prev, next }
  let viewerSlug = '';       // 창에 지금 그려진 브랜드
  let viewerTab = VIEWER_TABS[0].id;   // 마지막으로 고른 탭(브랜드를 넘겨도 유지)
  let viewerBack = false;    // 목록에서 열었나 — 닫을 때 history.back() 으로 목록 주소로 돌아간다
  let viewerOpener = null;   // 닫은 뒤 포커스를 돌려줄 카드
  let navList = null;        // 지금 목록의 순서(거르기·정렬 반영) — 이전·다음

  function ensureViewer() {
    if (viewer) return viewer;
    const dlg = document.createElement('dialog');
    dlg.className = 'dsv';
    dlg.setAttribute('aria-labelledby', 'dsvTitle');
    // 열 때 첫 단추(이전)가 아니라 창 자체에 포커스(openViewer) — 주소로 바로 들어오면 첫 단추에 포커스 테두리가 떴다
    dlg.tabIndex = -1;
    dlg.innerHTML = `
      <div class="dsv-top">
        <p class="dsv-crumb"><span class="dsv-cat"></span><span class="dsv-count"></span></p>
        <button type="button" class="dsv-ib" data-act="prev" aria-label="이전 브랜드" title="이전 브랜드 (←)">${ICON.prev}</button>
        <button type="button" class="dsv-ib" data-act="next" aria-label="다음 브랜드" title="다음 브랜드 (→)">${ICON.next}</button>
        <button type="button" class="dsv-ib" data-act="close" aria-label="닫기" title="닫기 (Esc)">${ICON.close}</button>
      </div>
      <div class="dsv-body">
        <div class="dsv-main"></div>
        <div class="dsv-side"></div>
      </div>`;
    document.getElementById('main').parentNode.appendChild(dlg);
    viewer = {
      dlg,
      body: dlg.querySelector('.dsv-body'),
      main: dlg.querySelector('.dsv-main'),
      side: dlg.querySelector('.dsv-side'),
      cat: dlg.querySelector('.dsv-cat'),
      count: dlg.querySelector('.dsv-count'),
      prev: dlg.querySelector('[data-act="prev"]'),
      next: dlg.querySelector('[data-act="next"]')
    };
    dlg.querySelector('[data-act="close"]').addEventListener('click', requestCloseViewer);
    viewer.prev.addEventListener('click', () => stepViewer(-1));
    viewer.next.addEventListener('click', () => stepViewer(1));
    // Esc 는 직접 받는다 — 사이트 쪽 키 처리가 먼저 기본 동작을 막아 dialog 의 cancel 이 오지 않는 경우가 있다(10/11 실측).
    // cancel 은 그 밖의 닫기 요청(안드로이드 뒤로 가기 몸짓 등)용으로 남긴다.
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); requestCloseViewer(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); requestCloseViewer(); return; }
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.target.closest('input, textarea, select, [contenteditable], [role="tab"]')) return;
      e.preventDefault();
      stepViewer(e.key === 'ArrowLeft' ? -1 : 1);
    });
    return viewer;
  }

  function openViewer() {
    const v = ensureViewer();
    if (!v.dlg.open) {
      // 목록에서 열었으면 닫을 때 그 주소로 뒤로 간다. 상세 주소로 바로 들어왔으면 뒤로 가면 사이트 밖이다.
      viewerBack = document.body.dataset.view === 'index' && gridFresh;
      viewerOpener = viewerBack && document.activeElement && document.activeElement.closest ? document.activeElement.closest('.card') : null;
      if (typeof v.dlg.showModal === 'function') v.dlg.showModal();
      else v.dlg.setAttribute('open', '');
      try { v.dlg.focus({ preventScroll: true }); } catch (e) { /* 옛 브라우저 */ }
      document.documentElement.classList.add('dsv-noscroll');
    }
    return v;
  }

  /** 창을 닫는다(주소는 건드리지 않는다). 열려 있었으면 true. */
  function closeViewer() {
    if (!viewer || !viewer.dlg.open) return false;
    if (typeof viewer.dlg.close === 'function') viewer.dlg.close();
    else viewer.dlg.removeAttribute('open');
    document.documentElement.classList.remove('dsv-noscroll');
    document.title = INDEX_TITLE;
    if (viewerOpener && viewerOpener.isConnected) {
      try { viewerOpener.focus({ preventScroll: true }); } catch (e) { /* 옛 브라우저 */ }
    }
    viewerOpener = null;
    return true;
  }

  /** 닫기 단추·Esc — 목록 주소(#/)로 돌아가면 route() 가 창을 닫는다. */
  function requestCloseViewer() {
    if (viewerBack) history.back();
    else location.hash = '#/';
  }

  function viewerList() {
    if (navList && navList.length) return navList;
    return applySort(applyFilters(state.data.brands)).map(b => b.slug);
  }

  /** 이전·다음 — 주소는 바꿔 끼우기만 한다(브랜드마다 뒤로 가기 기록이 쌓이지 않게). */
  function stepViewer(d) {
    const list = viewerList();
    const i = list.indexOf(viewerSlug);
    const to = i < 0 ? null : list[i + d];
    if (!to) return;
    history.replaceState(null, '', `#/${to}`);
    renderDetail(to);
  }

  function paintViewerNav(slug, b) {
    const v = viewer;
    let list = viewerList();
    if (!list.includes(slug)) list = applySort(state.data.brands).map(x => x.slug);  // 거르기 밖 브랜드로 바로 들어온 경우
    const i = list.indexOf(slug);
    const ind = (b.industry || [])[0];
    v.cat.textContent = `브랜드 룩북 › ${ind ? (FACET_LABELS.industry[ind] || ind) : '전체'}`;
    v.count.textContent = `${i + 1} / ${list.length}`;
    v.prev.disabled = i <= 0;
    v.next.disabled = i < 0 || i >= list.length - 1;
  }

  async function renderDetail(slug) {
    const indexEntry = state.data.brands.find(x => x.slug === slug);
    if (!indexEntry) {
      location.hash = '#/';
      return;
    }
    const v = openViewer();
    paintViewerNav(slug, indexEntry);
    if (viewerSlug !== slug && !v.main.firstChild) {
      v.main.innerHTML = '<p class="dsv-loading">불러오는 중…</p>';
    }
    v.dlg.setAttribute('aria-busy', 'true');

    // 오른쪽 칸 잠금(손님)·다운로드 칸이 쓸 로그인 상태 — 상세 JSON 과 나란히 오가게 미리 건다(세션당 한 번).
    const accP = loadAccount();

    let b, acc;
    try {
      b = await loadBrandDetail(slug);
      acc = await accP;
    } catch (err) {
      v.main.innerHTML = `<div class="empty"><p>상세 정보 로드 실패: ${escapeHtml(err.message)}</p></div>`;
      v.side.innerHTML = '';
      v.side.classList.remove('dsv-side--locked');
      v.dlg.removeAttribute('aria-busy');
      return;
    }
    // 불러오는 사이 다른 곳으로 옮겼으면 그리지 않는다
    if (location.hash !== `#/${slug}` && location.hash !== `#/${slug}/`) return;

    // 라이브 집계로 카운트 덮어쓰기 — 화면 표시는 없지만 '인기도순'이 조회수를 쓴다.
    if (state.liveCounts && state.liveCounts[slug]) {
      b.view_count = state.liveCounts[slug].view || 0;
      b.download_count = state.liveCounts[slug].download || 0;
    }
    // 상세 JSON 로드와 현재 라우트 확인을 통과한 실제 상세 열람만 세션당 한 번 집계한다.
    if (recordHit(slug, 'view')) bumpLiveCount(slug);

    // 라이트/다크 — 다운로드·복사·원문의 md 와 적용 예시 테마를 함께 바꾼다.
    // 한쪽만 있는 브랜드는 그 쪽, 둘 다면 거르기 줄의 선택(없으면 브랜드 기본 테마).
    const onlyMode = (b.theme_modes && b.theme_modes.length === 1) ? b.theme_modes[0] : '';
    const detailMode = makeDetailMode(onlyMode || cardTheme(b));

    viewerSlug = slug;
    v.main.replaceChildren(buildViewerMain(b, detailMode));
    v.side.replaceChildren(buildViewerSide(b, detailMode, acc));
    v.side.classList.toggle('dsv-side--locked', !acc.loggedIn);
    v.main.scrollTop = 0;
    v.side.scrollTop = 0;
    v.body.scrollTop = 0;   // 휴대폰(한 줄로 쌓일 때)은 몸통 전체가 스크롤된다
    v.dlg.removeAttribute('aria-busy');
    document.title = `${displayName(b)} — Design Systems`;
  }

  /**
   * 왼쪽 — 적용 예시 웹페이지 · 코드 · 이름 · 한 줄 요약 · 특징(두 단).
   * 웹페이지가 이름·특징을 뺀 남은 높이를 다 채운다(app.css .dsv-main) — 왼쪽은 스크롤도, 아래 빈칸도 없게.
   * 2026-10-11 운영자 3차: 「좌측 아래가 너무 비어 있다 → 데모 예전처럼 높게 · 특징은 그 아래 2열 · 예시 해설은 빼기」.
   */
  function buildViewerMain(b, detailMode) {
    const frag = document.createDocumentFragment();
    const demo = buildSignatureDemo(b, detailMode);
    const box = el('div', 'dsv-demo');
    box.appendChild(demo.wrap);
    frag.appendChild(box);
    if (demo.code) frag.appendChild(demo.code);

    const tr = (map, v) => (map && map[v]) || v;
    const region = b.region ? tr(FACET_LABELS.region, b.region) : '';
    const inds = (b.industry || []).map(v => tr(FACET_LABELS.industry, v));
    const facts = [];
    const kind = [region, ...inds].filter(Boolean);
    if (b.is_official) kind.push('공식 디자인 시스템');
    if (kind.length) facts.push(['분류', kind.join(' · ')]);
    const mood = [b.color_tone ? tr(FACET_LABELS.color_tone, b.color_tone) : '', ...(b.mood || [])].filter(Boolean);
    if (mood.length) facts.push(['분위기', mood.join(' · ')]);
    const styles = (b.visual_style || []).map(v => tr(DETAIL_LABELS.visual_style, v));
    if (styles.length) facts.push(['스타일', styles.join(' · ')]);
    const font = [b.font_category ? tr(FACET_LABELS.font_category, b.font_category) : '', b.font_primary || ''].filter(Boolean).join(' — ');
    if (font) facts.push(['글꼴', font + (b.font_korean_supported ? ' · 한글 지원' : '')]);
    const shape = [
      b.corner_style ? tr(DETAIL_LABELS.corner_style, b.corner_style) : '',
      b.density ? tr(DETAIL_LABELS.density, b.density) : '',
      b.flatness ? tr(DETAIL_LABELS.flatness, b.flatness) : ''
    ].filter(Boolean);
    if (shape.length) facts.push(['모양', shape.join(' · ')]);
    const years = [b.released_year ? `출시 ${b.released_year}` : '', b.last_major_revision ? `개정 ${b.last_major_revision}` : ''].filter(Boolean);
    if (years.length) facts.push(['연도', years.join(' · ')]);

    const info = el('div', 'dsv-info');
    info.innerHTML = `
      <h1 class="dsv-title" id="dsvTitle"><span class="dsv-sw" style="background:${escapeAttr(b.primary_color_hex || '#ccc')}"></span><span>${escapeHtml(displayName(b))}</span></h1>
      ${b.signature_keyword ? `<p class="dsv-tagline">${escapeHtml(b.signature_keyword)}</p>` : ''}
      ${facts.length ? `<dl class="dsv-facts">${facts.map(([k, val]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(val)}</dd></div>`).join('')}</dl>` : ''}`;
    frag.appendChild(info);
    return frag;
  }

  /**
   * 오른쪽 — 탭 줄(탭 3개 + 해/달) · 탭 내용 · 맨 끝 상표 문구(예전 상세 페이지처럼 출처 다음 마지막 줄).
   * 손님은 탭 내용을 흐리게 가리고(inert — 고르기·포커스·화면 낭독 모두 막음) 그 위에 로그인 안내를 띄운다.
   * 탭 줄·해/달은 살려 둔다(해/달은 손님도 보는 왼쪽 웹페이지를 바꾼다). 2026-10-11 운영자 「우측 영역은 로그인 사용자에게만, 비로그인은 블러」.
   * ⚠️ 화면 단속일 뿐이다 — 내용은 DOM 과 data/detail/{slug}.json 에 그대로 있다.
   */
  function buildViewerSide(b, detailMode, acc) {
    const locked = !(acc && acc.loggedIn);
    const frag = document.createDocumentFragment();
    // 해/달(라이트·다크)은 탭 줄 오른쪽 끝 — 어느 탭에서든 웹페이지·가이드를 함께 바꾼다.
    // tablist 안에는 탭만 둔다(접근성) — 그래서 탭 줄을 한 겹 더 감싼다.
    const bar = el('div', 'dsv-tabbar');
    const tabs = el('div', 'dsv-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '브랜드 설명');
    bar.appendChild(tabs);
    bar.appendChild(buildModeSwitch(b, detailMode));
    frag.appendChild(bar);
    const box = el('div', 'dsv-panes');   // 탭 내용 + 상표 문구 — 손님은 이 칸째 흐린다
    frag.appendChild(box);
    const panes = {};
    if (!VIEWER_TABS.some(t => t.id === viewerTab)) viewerTab = VIEWER_TABS[0].id;

    for (const t of VIEWER_TABS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dsv-tab';
      btn.id = `dsvTab-${t.id}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', `dsvPane-${t.id}`);
      btn.setAttribute('aria-selected', String(t.id === viewerTab));
      btn.textContent = t.label;
      btn.addEventListener('click', () => {
        viewerTab = t.id;
        tabs.querySelectorAll('.dsv-tab').forEach(x => x.setAttribute('aria-selected', String(x === btn)));
        Object.keys(panes).forEach(id => { panes[id].hidden = id !== t.id; });
        // 탭이 위에 붙은 채로 내려가 있었다면 새 탭의 첫머리(탭 바로 아래)로, 아니면 그 자리 그대로.
        // 넓은 화면은 오른쪽 칸이, 휴대폰(한 줄로 쌓임)은 몸통 전체가 스크롤된다.
        const sc = getComputedStyle(viewer.side).overflowY === 'visible' ? viewer.body : viewer.side;
        const tabsTop = sc === viewer.side ? 0 : viewer.side.getBoundingClientRect().top + viewer.side.clientTop - sc.getBoundingClientRect().top + sc.scrollTop;
        if (sc.scrollTop > tabsTop) sc.scrollTop = tabsTop;
      });
      tabs.appendChild(btn);

      const pane = el('div', 'dsv-pane');
      pane.id = `dsvPane-${t.id}`;
      pane.setAttribute('role', 'tabpanel');
      pane.setAttribute('aria-labelledby', btn.id);
      pane.hidden = t.id !== viewerTab;
      panes[t.id] = pane;
      box.appendChild(pane);

      // 손님은 흐린 칸 위 안내 카드가 로그인 단추를 대신한다(흐린 초록 단추가 얼룩처럼 비쳐서 뺀다)
      if (t.id === 'guide' && !locked) pane.appendChild(buildGuideCard(b, detailMode));
      const secs = el('div', 'dsv-secs');
      for (const k of t.keys) {
        if (b.sections[k]) secs.appendChild(buildSection(k, b, detailMode));
      }
      if (t.id === 'guide' && b.sources && b.sources.length) {
        const sec = el('section', 'detail-section');
        sec.innerHTML = `<h3>출처</h3><ol class="sources-list">${b.sources.map(u => `<li><a href="${escapeAttr(u)}" target="_blank" rel="noopener">${escapeHtml(u)}</a></li>`).join('')}</ol>`;
        secs.appendChild(sec);
      }
      if (secs.firstChild) pane.appendChild(secs);
      if (t.id === 'guide') pane.appendChild(buildGuideSource(b, detailMode));
    }
    const tm = el('p', 'dsv-tm');
    tm.textContent = `${displayName(b)} 이름과 로고는 각 권리자의 상표입니다.`;
    box.appendChild(tm);
    if (locked) {
      box.inert = true;
      const lock = el('div', 'dsv-lock');
      lock.innerHTML = `
        <div class="dsv-lock-card">
          <p class="dsv-lock-t">로그인하면 볼 수 있어요</p>
          <p class="dsv-lock-d">색·글꼴 · 컴포넌트 규칙 · 가이드 다운로드</p>
          <a class="dsv-btn dsv-btn--primary" href="${escapeAttr(loginUrlWithRedirect(acc ? acc.loginUrl : FALLBACK_LOGIN_URL, location.href))}">${ICON.lock}<span>로그인하고 보기</span></a>
        </div>`;
      frag.appendChild(lock);
    }
    return frag;
  }

  /**
   * 해/달 — 라이트·다크(웹페이지 · 가이드 다운로드 · 프롬프트 복사 · 원문이 함께 바뀐다). 아이콘은 실제 해·달 색(app.css .dsv-modes).
   * 한쪽만 있는 브랜드(라이트 103 · 다크 24 / 284)는 그쪽 하나만 — 둘일 때와 같은 회색 틀 안 흰 네모(눌린 모양)에 담되 누르는 단추는 아니다.
   * 2026-10-11 운영자 4차 「해/달 모양으로」 → 5차 「실제 해/달 색상 · 라이트만 있으면 해만」 → 6차 「하나만 있어도 버튼처럼 네모 안에」.
   */
  function buildModeSwitch(b, detailMode) {
    if (!detailMode || !hasDarkVariant(b)) {
      const only = (b.theme_modes && b.theme_modes[0] === 'dark') ? 'dark' : 'light';
      const one = el('span', 'dsv-seg dsv-modes dsv-mode-one');
      one.dataset.mode = only;
      one.setAttribute('role', 'img');
      one.setAttribute('aria-label', `이 브랜드는 ${only === 'dark' ? '다크' : '라이트'}만 있어요`);
      one.title = one.getAttribute('aria-label');
      one.innerHTML = `<span class="dsv-mode-chip">${only === 'dark' ? ICON.moon : ICON.sun}</span>`;
      return one;
    }
    const seg = el('div', 'dsv-seg dsv-modes');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', '라이트·다크 — 웹페이지와 가이드');
    for (const [m, label, icon] of [['light', '라이트', ICON.sun], ['dark', '다크', ICON.moon]]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.mode = m;
      btn.innerHTML = icon;
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('aria-pressed', String(detailMode.mode === m));
      btn.addEventListener('click', () => detailMode.set(m));
      seg.appendChild(btn);
    }
    detailMode.onChange(mm => seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mode === mm))));
    return seg;
  }

  /**
   * 「가이드 다운로드」 머리 — 단추만(가이드 다운로드 · 프롬프트 복사). 떠 있는 상자 없이 오른쪽 칸 바탕에 바로 놓는다.
   * 2026-10-11 운영자 4차 「버튼이 너무 붕 뜨지 않게」 → 5차 「설명·.md 한 파일·글자 수는 지우고 버튼만 깔끔하게」.
   * 다운로드·복사·원문은 로그인 회원만(2026-08-10). 판정이 끝나기 전에는 어느 쪽도 그리지 않는다 —
   * 버튼을 먼저 그렸다가 지우면 회원에게 깜빡임, 잠금 문구를 먼저 그리면 회원에게 잠깐 거짓말이 된다.
   * ⚠️ 화면 단속일 뿐이다 — md 원문은 data/detail/{slug}.json 에 그대로 있다.
   */
  function buildGuideCard(b, detailMode) {
    const wrap = el('div', 'dsv-guide');
    if (!b.raw_markdown) {
      const none = el('p', 'dsv-note');
      none.textContent = '이 브랜드는 가이드 파일을 준비하고 있어요.';
      wrap.appendChild(none);
      return wrap;
    }

    const btns = el('div', 'dsv-acts');
    wrap.appendChild(btns);

    const current = () => currentDownloadMd(b, detailMode ? detailMode.mode : 'light');
    loadAccount().then(acc => {
      if (!acc.loggedIn) {
        const a = document.createElement('a');
        a.className = 'dsv-btn dsv-btn--primary';
        a.href = loginUrlWithRedirect(acc.loginUrl, location.href);
        a.title = '로그인하면 가이드 다운로드 · 프롬프트 복사 · 가이드 원문을 쓸 수 있어요';
        a.innerHTML = `${ICON.lock}<span>로그인하고 받기</span>`;
        btns.appendChild(a);
        return;
      }
      btns.innerHTML = `
        <button type="button" class="dsv-btn" data-act="download">${ICON.download}<span>가이드 다운로드</span></button>
        <button type="button" class="dsv-btn dsv-btn--primary" data-act="copy">${ICON.copy}<span>프롬프트 복사</span></button>`;
      const copyBtn = btns.querySelector('[data-act="copy"]');
      copyBtn.addEventListener('click', () => copyGuide(b, current().md, copyBtn));
      const dlBtn = btns.querySelector('[data-act="download"]');
      dlBtn.addEventListener('click', () => {
        const { md, suffix } = current();
        const fname = `${(b.slug || b.brand || 'design-system')}${suffix}.md`;
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const downloadDocument = CFG && CFG.localPackage && window.parent !== window ? window.parent.document : document;
        const a = downloadDocument.createElement('a');
        a.href = url;
        a.download = fname;
        downloadDocument.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        flashLabel(dlBtn, '받았어요');
        recordHit(b.slug, 'download');   // 서버의 이용 지표 집계(화면 표시 없음)
      });
    });
    return wrap;
  }

  /** 「가이드 다운로드」 끝 — 가이드 원문(회원만). 라이트/다크를 바꾸면 그 판으로. */
  function buildGuideSource(b, detailMode) {
    const out = el('div', 'dsv-out');
    if (!b.raw_markdown) return out;
    loadAccount().then(acc => {
      if (!acc.loggedIn) return;
      const current = () => currentDownloadMd(b, detailMode ? detailMode.mode : 'light');
      out.innerHTML = `
        <div class="dsv-out-h"><h3>가이드 원문</h3><span class="dsv-len"></span>
          <button type="button" class="dsv-mini" data-act="copy">${ICON.copy}<span>복사</span></button></div>
        <pre class="dsv-md"></pre>`;
      const pre = out.querySelector('pre');
      const len = out.querySelector('.dsv-len');
      const sync = () => { const md = current().md; pre.textContent = md; len.textContent = `${md.length.toLocaleString()}자`; };
      sync();
      if (detailMode) detailMode.onChange(sync);
      const btn = out.querySelector('[data-act="copy"]');
      btn.addEventListener('click', () => copyGuide(b, current().md, btn));
    });
    return out;
  }

  async function copyGuide(b, md, btn) {
    recordHit(b.slug, 'copy');
    let ok = false;
    try {
      await navigator.clipboard.writeText(md);
      ok = true;
    } catch (err) {
      // 보안 문맥이 아닐 때의 예비 길
      const ta = document.createElement('textarea');
      ta.value = md;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      (viewer ? viewer.dlg : document.body).appendChild(ta);   // 모달 창 밖 요소는 고를 수 없다
      ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
    }
    flashLabel(btn, ok ? '복사했어요' : '복사 실패 — 원문에서 직접 골라 주세요');
  }

  /** 단추 글자를 잠깐 바꿨다 되돌린다(복사·다운로드 결과 알림) */
  function flashLabel(btn, text) {
    const span = btn.querySelector('span');
    if (!span) return;
    if (!btn.dataset.label) btn.dataset.label = span.textContent;
    span.textContent = text;
    btn.classList.add('is-done');
    clearTimeout(btn._flash);
    btn._flash = setTimeout(() => {
      span.textContent = btn.dataset.label;
      btn.classList.remove('is-done');
    }, 2200);
  }

  /**
   * ⑫ 적용 예시 — 브랜드 CSS 를 입힌 웹페이지(iframe) + [코드 보기] + 해설 글.
   * ⑫ 본문의 코드 블록은 전부 한 단추 아래로 모은다(2026-06-25 요청 1). 예시가 없으면 카드 히어로를 크게.
   */
  function buildSignatureDemo(b, detailMode) {
    const wrap = el('div', 'sig-demo-wrap');
    wrap.innerHTML = `
      <iframe class="sig-demo" sandbox="allow-same-origin" title="${escapeAttr(displayName(b))} 적용 예시"></iframe>
      ${b.signature_demo ? '<div class="sig-demo-actions"><button type="button" data-action="toggle-code" aria-expanded="false">&lt;/&gt; 코드 보기</button></div>' : ''}`;
    const iframe = wrap.querySelector('iframe');
    iframe._brand = b;
    // 예시 안을 누르면 키가 iframe 문서로 간다 — Esc 만 창으로 넘긴다(화살표는 예시 스크롤 몫)
    iframe.addEventListener('load', () => {
      try {
        iframe.contentDocument.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { e.preventDefault(); requestCloseViewer(); }
        });
      } catch (e) { /* 다른 출처면 못 건다 */ }
    });
    if (!b.signature_demo) {
      iframe.srcdoc = wrapHeroSrcdoc(b.hero_html || '', b.card_tokens, detailMode ? detailMode.mode : 'light');
      return { wrap, code: null };
    }
    // 고른 모드로 그린다. 다크 판이 있으면 다시 칠한 예시 + 다크 컴포넌트 CSS 로 진짜 다크 미리보기.
    const paint = (mode) => {
      const dark = mode === 'dark' && hasDarkVariant(b);
      const demoHtml = (dark && b.signature_demo_dark) ? b.signature_demo_dark : b.signature_demo;
      const brandCss = (dark && b.brand_css_dark != null) ? b.brand_css_dark : buildBrandTokens(b);
      iframe.srcdoc = wrapDemoSrcdoc(demoHtml, brandCss, b.card_tokens, dark ? 'dark' : 'light');
    };
    paint(detailMode ? detailMode.mode : state.theme);
    if (detailMode) detailMode.onChange(paint);

    // ⑫ 에서는 코드(pre.code)만 쓴다 — 예시를 어떻게 그렸나 적은 해설 글은 보이지 않는다(2026-10-11 운영자 「예시는 표시하지 말자」)
    const codeNodes = Array.from(htmlToFragment(b.sections['⑫'] || '').querySelectorAll('pre.code'));
    const code = el('div', 'sig-code hidden');
    if (codeNodes.length) {
      codeNodes.forEach(n => code.appendChild(n));
    } else {
      const pre = document.createElement('pre');
      pre.className = 'code';
      pre.innerHTML = `<code>${escapeHtml(b.signature_demo)}</code>`;
      code.appendChild(pre);
    }
    const toggleBtn = wrap.querySelector('[data-action="toggle-code"]');
    toggleBtn.addEventListener('click', () => {
      // 웹페이지 칸은 남은 높이를 채운다 — 코드가 열린 동안은 연 순간의 높이에 묶어 둔다(안 묶으면 코드 몫만큼 줄어든다).
      // 높이는 코드를 펼치기 전에 잰다.
      const box = wrap.parentElement && wrap.parentElement.classList.contains('dsv-demo') ? wrap.parentElement : null;
      const boxH = box ? box.offsetHeight : 0;
      const nowHidden = code.classList.toggle('hidden');
      toggleBtn.setAttribute('aria-expanded', String(!nowHidden));
      toggleBtn.innerHTML = nowHidden ? '&lt;/&gt; 코드 보기' : '&lt;/&gt; 코드 숨기기';
      if (box) {
        box.style.flex = nowHidden ? '' : 'none';
        box.style.height = nowHidden ? '' : `${boxH}px`;
      }
      if (!nowHidden) code.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return { wrap, code };
  }

  // ---- Per-page mode (light/dark) helpers (Request 3) ----
  function isDualMode(b) {
    const t = b.theme_modes || [];
    return t.includes('light') && t.includes('dark');
  }
  // Brands offer the toggle only when a generated dark variant actually exists.
  function hasDarkVariant(b) {
    return isDualMode(b) && typeof b.raw_markdown_dark === 'string' && b.raw_markdown_dark.length > 0;
  }
  // Tiny observable holding the current detail-page mode.
  function makeDetailMode(initial) {
    return {
      mode: (initial === 'dark' ? 'dark' : 'light'),
      _subs: [],
      onChange(fn) { this._subs.push(fn); },
      set(next) {
        if (next !== 'light' && next !== 'dark' || next === this.mode) return;
        this.mode = next;
        this._subs.forEach(fn => { try { fn(next); } catch (e) { /* ignore */ } });
      }
    };
  }
  // Which md text + filename suffix to serve for the selected mode.
  function currentDownloadMd(b, mode) {
    if (mode === 'dark' && hasDarkVariant(b)) return { md: b.raw_markdown_dark, suffix: '-dark' };
    if (hasDarkVariant(b)) return { md: stripDarkBlock(b.raw_markdown), suffix: '-light' };
    return { md: b.raw_markdown, suffix: '' };   // single-mode brand: unchanged
  }
  // Remove every `[data-theme="dark"] { … }` rule from the md so the light download
  // is a clean light-only spec. Brace-matched (CSS rules contain no nested braces).
  function stripDarkBlock(md) {
    if (!md) return md;
    let out = md;
    let idx;
    while ((idx = out.indexOf('[data-theme="dark"]')) !== -1) {
      const open = out.indexOf('{', idx);
      if (open === -1) break;
      let depth = 1, i = open + 1;
      for (; i < out.length && depth > 0; i++) {
        const ch = out[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      let start = idx;
      while (start > 0 && (out[start - 1] === ' ' || out[start - 1] === '\t')) start--;
      if (start > 0 && out[start - 1] === '\n') start--;   // drop the block's own line
      out = out.slice(0, start) + out.slice(i);
    }
    return out;
  }

  // Fire-and-forget view/download/copy hit → oppadu-tools counter (same-origin, no auth).
  // Deduped once per (slug, action) per session to soften click-spam inflation.
  // Returns true if a hit was sent (view caller uses it for the optimistic +1).
  function recordHit(slug, action) {
    if (CFG && CFG.localPackage) return false;
    if (!slug) return false;
    try {
      const key = `ds-hit:${slug}:${action}`;
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
    } catch (e) { /* private mode etc. — still count */ }
    const url = `/wp-json/oppadu-tools/v1/design-systems/hit?slug=${encodeURIComponent(slug)}&action=${encodeURIComponent(action)}`;
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url)) return true;
    } catch (e) { /* fall through */ }
    try { fetch(url, { method: 'POST', keepalive: true, cache: 'no-store' }).catch(() => {}); } catch (e) { /* ignore */ }
    return true;
  }

  /* ─────────────────────────────────────────────
   * 로그인 상태 (툴 셸 계정 엔드포인트 재사용)
   *
   * 이 도구는 WP 밖 정적 SPA 라 PHP 로 로그인 여부를 알 수 없다.
   * 셸이 계정 슬롯을 채울 때 쓰는 바로 그 엔드포인트를 다시 쓴다 —
   * 로그인 쿠키를 직접 검증하므로 X-WP-Nonce 없이도 정확하다(shell.php 주석 참고).
   *
   * ⚠️ 응답은 회원마다 다르다. 서버가 `private, no-store` 를 주므로 cache:'no-store' 로 맞춘다.
   * 실패하면 '비로그인'으로 떨어진다 — 애매할 때 잠가 두는 쪽이 열어 두는 쪽보다 낫고,
   * 로그인 링크는 어차피 살아 있어 회원은 한 번 더 눌러 들어올 수 있다.
   * ───────────────────────────────────────────── */
  const FALLBACK_LOGIN_URL = '/login/';
  let accountPromise = null;

  function loadAccount() {
    if (accountPromise) return accountPromise;
    // 워드프레스 판은 서버가 그린 판이 곧 로그인 상태다(손님 판만 페이지 캐시에 들어가고 회원은 늘 새로 그린 판을 받는다)
    if (CFG && typeof CFG.member === 'boolean') {
      accountPromise = Promise.resolve({
        loggedIn: CFG.member,
        loginUrl: (typeof CFG.login === 'string' && CFG.login) ? CFG.login : FALLBACK_LOGIN_URL
      });
      return accountPromise;
    }
    accountPromise = fetch('/wp-json/oppadu-tools/v1/shell/account', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    })
      .then(res => (res.ok ? res.json() : null))
      .then(d => ({
        loggedIn: !!(d && d.logged_in),
        loginUrl: (d && typeof d.login_url === 'string' && d.login_url) ? d.login_url : FALLBACK_LOGIN_URL
      }))
      .catch(() => ({ loggedIn: false, loginUrl: FALLBACK_LOGIN_URL }));
    return accountPromise;
  }

  /**
   * 로그인 후 복귀 지점을 지금 보고 있는 주소로 갈아 끼운다.
   *
   * 계정 응답은 세션에 한 번만 받아 두는데(그 시점의 해시가 박혀 있다), 회원은 브랜드를 옮겨 다닌다.
   * 여기서 다시 씌워야 로그인 후 '보던 브랜드'로 돌아온다 — 해시(#/slug)까지 포함된다.
   * 우리 사이트 주소가 아니면 손대지 않는다(오픈 리다이렉트 차단).
   */
  function loginUrlWithRedirect(base, href) {
    try {
      const u = new URL(base, location.origin);
      if (u.origin !== location.origin) return base;
      const back = new URL(href, location.origin);
      if (back.origin !== location.origin) return u.href;
      u.searchParams.set('redirect_to', back.href);
      return u.href;
    } catch (e) {
      return base;
    }
  }

  function buildSection(k, b, detailMode) {
    const sec = el('section', 'detail-section');
    // 윗줄(eyebrow) = 한글 제목의 영어 번역, 아랫줄(h3) = 한글 제목 유지.
    // ⑫는 브랜드별 부제 대신 고정 한글 제목 '디자인 시스템 적용 예시' 사용.
    const heading = (k === '⑫') ? '디자인 시스템 적용 예시' : (b.section_titles[k] || '');
    const enLabel = SECTION_EN_LABELS[k] || '';
    sec.innerHTML = `${enLabel ? `<h2>${escapeHtml(enLabel)}</h2>` : ''}<h3>${escapeHtml(heading)}</h3>`;

    // Inject extras BEFORE the raw HTML. ⑫(적용 예시)는 상세 보기 창 왼쪽이 따로 그린다(buildSignatureDemo).
    if (k === '③') {
      // Color swatches from primary, neutral, semantic groups
      const cssText = extractCssText(b.sections[k]);
      const groups = extractColorGroups(cssText);
      if (groups.length) {
        const wrap = el('div', '');
        wrap.innerHTML = groups.map(g => `
          <h4>${escapeHtml(g.label)}</h4>
          <div class="swatch-grid">
            ${g.tokens.map(t => `
              <div class="swatch">
                <div class="swatch-color" style="background:${escapeAttr(t.value)}"></div>
                <div class="swatch-meta">
                  <span class="swatch-name">${escapeHtml(t.name)}</span>
                  <span>${escapeHtml(t.value)}</span>
                </div>
              </div>`).join('')}
          </div>`).join('');
        sec.appendChild(wrap);
      }
      sec.appendChild(htmlToFragment(b.sections[k]));
      return sec;
    }

    if (k === '④') {
      // Type preview using brand's primary font
      const fontStack = `${b.font_primary ? `'${b.font_primary}', ` : ''}-apple-system, 'Pretendard', BlinkMacSystemFont, sans-serif`;
      const tp = el('div', 'type-preview');
      tp.style.fontFamily = fontStack;
      tp.innerHTML = `
        <h3 class="type-preview-display">${escapeHtml(b.brand)}</h3>
        <p class="type-preview-body">${escapeHtml(b.signature_keyword || '')} — 가나다라마바사 The quick brown fox jumps over the lazy dog. 0123456789</p>
      `;
      sec.appendChild(tp);
      sec.appendChild(htmlToFragment(b.sections[k]));
      return sec;
    }

    if (k === '⑥') {
      const cssText = extractCssText(b.sections[k]);
      const radii = extractTokens(cssText, /^(--radius-[\w-]+)/);
      if (radii.length) sec.appendChild(renderRadiusGrid(radii));
      sec.appendChild(htmlToFragment(b.sections[k]));
      return sec;
    }

    if (k === '⑦') {
      const cssText = extractCssText(b.sections[k]);
      const shadows = extractTokens(cssText, /^(--shadow-[\w-]+)/);
      if (shadows.length) sec.appendChild(renderShadowGrid(shadows));
      sec.appendChild(htmlToFragment(b.sections[k]));
      return sec;
    }

    sec.appendChild(htmlToFragment(b.sections[k]));
    return sec;
  }

  function renderRadiusGrid(tokens) {
    const wrap = el('div', 'token-grid');
    wrap.innerHTML = tokens.map(t => `
      <div class="token-cell">
        <div class="token-vis" style="border-radius:${escapeAttr(t.value)};background:#0f172a;border-color:#0f172a"></div>
        <div class="token-name">${escapeHtml(t.name)}</div>
        <div class="token-value">${escapeHtml(t.value)}</div>
      </div>`).join('');
    return wrap;
  }

  // 화면을 덮는 그림자(모달 뒤 어둠막 — nvidia·valorant 의 `0 0 0 100vmax rgba(…)`)는 견본 칸 안에서만 보이게 자른다.
  // 안 자르면 칸 밖으로 번져 오른쪽 칸 전체가 어두워진다(2026-10-11 운영자 「컴포넌트 규칙이 깨집니다」).
  const isScrimShadow = v => /\d\s*(vmax|vmin|vw|vh)\b/i.test(v) || /(^|[\s,])\d{3,}(\.\d+)?px\b/.test(v);

  function renderShadowGrid(tokens) {
    const wrap = el('div', 'token-grid');
    wrap.innerHTML = tokens.map(t => `
      <div class="token-cell" style="background:#f8fafc;padding:24px 8px 12px${isScrimShadow(t.value) ? ';overflow:hidden' : ''}">
        <div class="token-vis" style="box-shadow:${escapeAttr(t.value)};background:#fff;border-color:rgba(0,0,0,0.05)"></div>
        <div class="token-name">${escapeHtml(t.name)}</div>
        <div class="token-value" title="${escapeAttr(t.value)}">${escapeHtml(t.value.length > 28 ? t.value.slice(0,28)+'…' : t.value)}</div>
      </div>`).join('');
    return wrap;
  }

  // ---------- Helpers: token extraction ----------
  // Concat all CSS-fenced code blocks (```css ... ```) in section html into one text.
  // Important: do NOT pick up html/code-* fences (e.g. ⑫'s html block contains <style>
  // markup that would corrupt token extraction).
  function extractCssText(sectionHtml) {
    const tmp = document.createElement('div');
    tmp.innerHTML = sectionHtml;
    let css = '';
    tmp.querySelectorAll('pre.code-css code').forEach(node => {
      css += '\n' + node.textContent;
    });
    return css;
  }

  // Aggregate brand-defined CSS from ③⑤⑥⑦⑨⑩ — used to make the ⑫ live demo render
  // with the brand's actual variables and component classes.
  function buildBrandTokens(b) {
    const parts = [];
    for (const k of ['③','⑤','⑥','⑦','⑨','⑩']) {
      if (b.sections[k]) parts.push(extractCssText(b.sections[k]));
    }
    return wrapBareDecls(parts.join('\n')).trim();
  }

  // ⑥ Radius·⑦ Shadow·⑩ Motion 은 선택자 없는 `--x: v;` 로 적혀 있어 그대로면 브라우저가 버린다.
  // 맨 선언만 모아 맨 앞 `:root{}` 로 감싼다. ⚠️ build.js wrapBareDecls() 와 같은 로직.
  function wrapBareDecls(css) {
    const root = [], rest = [];
    let depth = 0, open = null;
    const ends = /;\s*(\/\*.*\*\/\s*)?$/;
    for (const line of css.split('\n')) {
      if (open !== null) {
        open.push(line);
        if (ends.test(line)) { root.push(open.join('\n')); open = null; }
        continue;
      }
      if (depth === 0 && /^\s*--[\w-]+\s*:/.test(line)) {
        if (ends.test(line)) root.push(line); else open = [line];
        continue;
      }
      rest.push(line);
      for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth = Math.max(0, depth - 1); }
    }
    if (open !== null) root.push(open.join('\n'));
    if (!root.length) return css;
    return ':root {\n' + root.join('\n') + '\n}\n' + rest.join('\n');
  }

  // Generic CSS variable extractor.
  // Pass a regex with one capture group for the var name.
  function extractTokens(cssText, nameRe) {
    // Match `--name: value;` (value up to ; or newline)
    const lines = cssText.split(/\r?\n/);
    const out = [];
    const seen = new Set();
    for (const raw of lines) {
      const line = raw.trim();
      const m = line.match(/^(--[\w-]+)\s*:\s*([^;]+);?/);
      if (!m) continue;
      const name = m[1];
      const value = m[2].trim();
      if (!nameRe.test(name)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, value });
    }
    return out;
  }

  function extractColorGroups(cssText) {
    const all = extractTokens(cssText, /^(--color-|--bg-|--text-|--border-)/);
    const buckets = [
      { label: 'Primary', match: /^--color-primary-/, tokens: [] },
      { label: 'Secondary', match: /^--color-secondary-/, tokens: [] },
      { label: 'Neutral', match: /^--color-neutral-/, tokens: [] },
      { label: 'Semantic', match: /^--color-(success|warning|error|info)/, tokens: [] },
      { label: 'Surface', match: /^--bg-/, tokens: [] },
      { label: 'Text', match: /^--text-/, tokens: [] },
      { label: 'Border', match: /^--border-/, tokens: [] }
    ];
    for (const t of all) {
      // Skip values that don't look like colors (var refs etc.)
      if (!isColorValue(t.value)) continue;
      for (const b of buckets) {
        if (b.match.test(t.name)) { b.tokens.push(t); break; }
      }
    }
    return buckets.filter(b => b.tokens.length);
  }

  function isColorValue(v) {
    return /^#([0-9a-f]{3,8})$/i.test(v) || /^rgba?\(/i.test(v) || /^hsla?\(/i.test(v) || /^[a-z]+$/i.test(v) && CSS_NAMED_COLORS.has(v.toLowerCase());
  }
  const CSS_NAMED_COLORS = new Set(['white','black','transparent','red','blue','green','yellow','gray','grey','orange','purple','pink','cyan','magenta','silver','gold']);

  function wrapDemoSrcdoc(htmlWithStyle, brandCss, cardTokens, theme) {
    const hasDark = cardTokens && cardTokens.dark;
    const themeAttr = hasDark ? ` data-theme="${theme === 'dark' ? 'dark' : 'light'}"` : '';
    const tokenStyle = buildCardTokenStyle(cardTokens);
    return `<!doctype html><html${themeAttr}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;padding:0;background:var(--card-bg,#fff);color:var(--card-fg,inherit);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Pretendard',sans-serif}</style>
${tokenStyle ? `<style>${tokenStyle}</style>` : ''}
<style>${brandCss || ''}</style>
</head><body>${htmlWithStyle}</body></html>`;
  }

  // ---------- DOM utilities ----------
  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function htmlToFragment(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    return tpl.content;
  }
  // 국내 브랜드만 영문(한글) 병기. 해외 브랜드는 영문 그대로.
  function displayName(b) {
    if (b && b.region === 'korea' && b.brand_ko) return `${b.brand} (${b.brand_ko})`;
    return b ? b.brand : '';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/"/g,'&quot;');
  }
})();
