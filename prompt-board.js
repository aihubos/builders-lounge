import { coverMarkup, promptCard, imageSource } from './prompt-media.js';

export function promptBoard({api, auth, main, esc, guide, renderGuide}) {
  const categories = ['업무', '글쓰기', '이미지', '영상', '코딩', '학습', '기타'];
  const url = id => '#prompt-board' + (id ? '/' + encodeURIComponent(id) : '');
  let generation = 0, current = null, pendingImage = '', processingImage = false, imageVersion = 0;
  const tags = post => (post.tags || []).map(tag => `<span>#${esc(tag)}</span>`).join('');
  const date = value => value ? new Date(value).toLocaleDateString('ko-KR') : '';
  const errorText = err => ({invalid_prompt:'제목·설명·분류·본문을 확인해 주세요.', invalid_prompt_image:'이미지를 다시 선택하거나 올바른 HTTPS 이미지 주소를 입력해 주세요.', prompt_image_storage_unavailable:'이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', request_too_large:'이미지 용량이 큽니다. 더 작은 이미지를 선택해 주세요.'})[err.message] || err.message;

  function form(post = {}) {
    pendingImage = ''; processingImage = false; ++imageVersion;
    main.innerHTML = `<section class="library-panel prompt-compose"><a class="back-link" href="${url(post.id)}">← ${post.id ? '상세로 돌아가기' : '프롬프트 둘러보기'}</a><div class="compose-heading"><p class="eyebrow">SHARE YOUR IDEA</p><h1>${post.id ? '프롬프트 수정' : '나만의 프롬프트 공유하기'}</h1><p>잘 쓰고 있는 프롬프트 하나가 누군가의 시작이 돼요.</p></div><form data-prompt-form data-id="${esc(post.id || '')}"><div class="compose-layout"><div class="member-form"><label>제목<input class="field" name="title" minlength="2" maxlength="100" value="${esc(post.title || '')}" placeholder="어떤 일을 도와주는 프롬프트인가요?" required></label><label>한 줄 소개<textarea class="field" name="description" maxlength="500" rows="3" placeholder="언제, 어떻게 쓰면 좋은지 알려 주세요." required>${esc(post.description || '')}</textarea></label><div class="compose-fields"><label>분류<select class="field" name="category">${categories.map(c => `<option ${c === post.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label>태그 <small>선택</small><input class="field" name="tags" maxlength="220" value="${esc((post.tags || []).join(', '))}" placeholder="예: 업무, 보고서, ChatGPT"></label></div><label>프롬프트<textarea class="field prompt-editor" name="content" maxlength="20000" rows="12" required placeholder="다른 사람이 복사해서 바로 쓸 수 있도록 적어 주세요.">${esc(post.content || '')}</textarea></label></div><aside class="compose-preview"><h2>대표 이미지</h2><div data-cover-preview>${coverMarkup(post, esc, true)}</div><label class="btn-line image-file-label">이미지 선택<input type="file" accept="image/jpeg,image/png,image/webp" data-prompt-image></label><p class="field-help">JPG·PNG·WebP, 최대 10MB<br>카드에는 정사각형으로 보여요.</p><label class="image-url-label">또는 이미지 주소<input class="field" type="url" name="imageUrl" value="${esc(post.imageUrl || '')}" placeholder="https://…" maxlength="2048"></label><button class="link" type="button" data-remove-cover>이미지 없이 게시</button><p class="field-help">이미지가 없으면 분류에 맞는 표지를 사용해요.</p><p data-image-status role="status"></p></aside></div><div class="compose-submit"><p>게시하면 누구나 볼 수 있어요.<br><small>직접 만든 이미지나 공유 권한이 있는 이미지를 사용해 주세요.</small></p><p data-prompt-status role="status" aria-live="polite"></p><div><a class="btn-line" href="${url(post.id)}">취소</a><button class="btn" type="submit">${post.id ? '수정 저장' : '바로 게시하기'}</button></div></div></form></section>`;
  }

  function preview(formNode) {
    if (!formNode?.isConnected) return;
    const post = Object.fromEntries(new FormData(formNode));
    const box = formNode.querySelector('[data-cover-preview]');
    box.innerHTML = coverMarkup(post, esc, true);
    if (pendingImage) {
      const img = document.createElement('img'); img.src = pendingImage; img.alt = '선택한 대표 이미지 미리보기';
      box.querySelector('.prompt-cover').append(img);
    }
  }

  function listShell(q, category) {
    const link = c => '?' + new URLSearchParams({q, category:c}) + url();
    return `<section class="prompt-board"><div class="panel-heading"><div><p class="eyebrow">PROMPT LIBRARY</p><h1>아이디어가 결과물이 되는 곳</h1><p>직접 써 본 프롬프트를 발견하고, 나만의 방법을 나눠 보세요.</p></div><a class="btn" href="${url('new')}">＋ 프롬프트 올리기</a></div><form data-prompt-search class="prompt-search" role="search"><input class="field" type="search" name="q" aria-label="프롬프트 검색" value="${esc(q)}" placeholder="제목, 태그, 프롬프트로 검색" maxlength="120"><input type="hidden" name="category" value="${esc(category)}"><button class="btn" type="submit">검색</button></form><nav class="prompt-filters" aria-label="프롬프트 분류">${['', ...categories].map(c => `<a href="${link(c)}" ${c === category ? 'aria-current="page"' : ''}>${c || '전체'}</a>`).join('')}</nav><div data-prompt-results aria-live="polite"><p class="empty">프롬프트를 불러오는 중이에요.</p></div></section>`;
  }

  async function render(id) {
    const ticket = ++generation; current = null; ++imageVersion;
    if (guide && id === guide.id) {renderGuide(id); return;}
    if (id === 'new') {
      if (!auth.user) {main.innerHTML = `<section class="library-panel login-gate"><div class="gate-symbol" aria-hidden="true">＋</div><h1>나의 노하우를 나눠 볼까요?</h1><p>로그인하면 프롬프트와 이미지를 바로 올릴 수 있어요.<br>작성한 글은 언제든 수정하거나 삭제할 수 있어요.</p><button class="btn" data-login>로그인하고 시작하기</button><a class="btn-line" href="#signup">회원가입</a><a class="back-link" href="${url()}">먼저 둘러보기 →</a></section>`; return;}
      form(); return;
    }
    const params = new URLSearchParams(location.search);
    const q = (params.get('q') || '').slice(0, 120), category = params.get('category') || '', page = params.get('page') || '1';
    main.innerHTML = id ? '<p class="empty">프롬프트를 불러오는 중이에요.</p>' : listShell(q, category);
    const active = () => ticket === generation && location.hash.startsWith('#prompt-board');
    const guideMatches = guide && (!category || category === guide.category) && (!q || [guide.title, guide.summary, guide.copyText, ...(guide.tags || [])].join(' ').toLocaleLowerCase().includes(q.toLocaleLowerCase()));
    try {
      if (id) {
        const {post} = await api('/lounge/prompts/' + encodeURIComponent(id)); if (!active()) return;
        current = post; document.title = post.title + ' | Builders Lounge';
        main.innerHTML = `<article class="library-panel prompt-detail"><a class="back-link" href="${url()}">← 프롬프트 둘러보기</a><div class="prompt-detail-intro">${coverMarkup(post, esc, true)}<div><span class="prompt-category">${esc(post.category)}</span><h1>${esc(post.title)}</h1><p>${esc(post.description)}</p><div class="prompt-tags">${tags(post)}</div><p class="prompt-meta">${esc(post.author)} · ${date(post.updatedAt)}</p><div class="prompt-actions"><button class="btn" data-copy-prompt-post>프롬프트 복사</button>${post.canEdit ? '<button class="btn-line" data-edit-prompt-post>수정</button><button class="btn-line" data-delete-prompt-post>삭제</button>' : ''}</div><p data-prompt-status role="status"></p></div></div><h2>복사해서 바로 써 보세요</h2><pre class="prompt-full" tabindex="0">${esc(post.content)}</pre></article>`;
        return;
      }
      const data = await api('/lounge/prompts?' + new URLSearchParams({q, category, page})); if (!active()) return;
      const showGuide = guideMatches && data.page === 1;
      const total = data.total + (guideMatches ? 1 : 0);
      main.querySelector('[data-prompt-results]').innerHTML = `<div class="prompt-results-meta"><span>총 <strong>${total}</strong>개 프롬프트</span><span>최근 올라온 순</span></div><div class="prompt-card-grid">${showGuide ? promptCard(guide, esc, {guide:true}) : ''}${data.posts.map(post => promptCard(post, esc)).join('')}</div>${!data.posts.length && !showGuide ? `<div class="prompt-empty"><h2>${q || category ? '찾는 프롬프트가 아직 없어요' : '첫 프롬프트를 공유해 주세요'}</h2><p>${q || category ? '다른 검색어나 분류로 다시 찾아보세요.' : '잘 쓰고 있는 질문 하나부터 시작해 보세요.'}</p><a class="btn-line" href="${q || category ? url() : url('new')}">${q || category ? '전체 보기' : '프롬프트 올리기'}</a></div>` : ''}<nav class="prompt-pagination" aria-label="프롬프트 페이지">${data.page > 1 ? `<a class="btn-line" href="?${new URLSearchParams({q,category,page:String(data.page-1)})}${url()}">이전</a>` : ''}<span>${data.page} / ${data.pages}</span>${data.page < data.pages ? `<a class="btn-line" href="?${new URLSearchParams({q,category,page:String(data.page+1)})}${url()}">다음</a>` : ''}</nav>`;
    } catch (error) {
      if (!active()) return;
      const notice = `<div class="prompt-empty"><h2>잠시 연결이 어려워요</h2><p>${esc(errorText(error))}</p><button class="btn-line" data-retry-prompts>다시 불러오기</button></div>`;
      if (id) main.innerHTML = notice;
      else main.querySelector('[data-prompt-results]').innerHTML = notice + (guideMatches ? `<div class="prompt-card-grid">${promptCard(guide,esc,{guide:true})}</div>` : '');
    }
  }

  document.addEventListener('input', event => {
    const formNode = event.target.closest('[data-prompt-form]'); if (!formNode) return;
    if (event.target.name === 'imageUrl') {pendingImage = ''; ++imageVersion; processingImage = false; formNode.querySelector('[data-prompt-image]').value = ''; formNode.querySelector('[data-image-status]').textContent = '';}
    if (['imageUrl','title','category'].includes(event.target.name)) preview(formNode);
  });
  document.addEventListener('change', async event => {
    if (!event.target.matches('[data-prompt-image]')) return;
    const formNode = event.target.closest('form'), file = event.target.files[0]; if (!file) return;
    const version = ++imageVersion, status = formNode.querySelector('[data-image-status]');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {status.textContent = '10MB 이하의 JPG·PNG·WebP 이미지를 선택해 주세요.'; event.target.value = ''; return;}
    processingImage = true; status.textContent = '이미지를 준비하고 있어요.';
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const size = Math.min(960, bitmap.width, bitmap.height), side = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,size,size);
      ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);
      let result = canvas.toDataURL('image/jpeg',0.82);
      if (result.length > 400000) result = canvas.toDataURL('image/jpeg',0.55);
      if (result.length > 400000) throw new Error('이미지가 복잡하거나 큽니다. 더 작은 이미지로 선택해 주세요.');
      if (version !== imageVersion || !formNode.isConnected) return;
      pendingImage = result; formNode.elements.imageUrl.value = ''; preview(formNode); status.textContent = '이미지 준비 완료. 게시할 때 함께 저장돼요.';
    } catch (error) {if (version === imageVersion && formNode.isConnected) status.textContent = error.message || '이미지를 읽지 못했습니다. 다른 이미지를 선택해 주세요.';}
    finally {bitmap?.close(); if (version === imageVersion) processingImage = false;}
  });
  document.addEventListener('submit', async event => {
    const f = event.target; if (!f.matches('[data-prompt-form],[data-prompt-search]')) return; event.preventDefault();
    if (f.matches('[data-prompt-search]')) {history.pushState(null, '', '?' + new URLSearchParams(new FormData(f)) + url()); window.dispatchEvent(new PopStateEvent('popstate')); return;}
    const status = f.querySelector('[data-prompt-status]'), button = f.querySelector('button[type="submit"]');
    if (button.disabled) return;
    if (processingImage) {status.textContent = '이미지 준비가 끝난 뒤 게시해 주세요.'; return;}
    const payload = Object.fromEntries(new FormData(f));
    if (payload.imageUrl && !imageSource(payload.imageUrl)) {status.textContent = 'HTTPS로 시작하는 이미지 주소를 입력해 주세요.'; return;}
    payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (pendingImage) payload.imageData = pendingImage;
    button.disabled = true; status.textContent = '프롬프트를 저장하고 있어요.';
    try {
      if (payload.imageUrl || payload.imageData) {
        const capabilities = await api('/lounge/prompts?page=1');
        if (!capabilities.supportsImages) throw new Error('지금은 이미지 첨부를 준비 중이에요. 입력 내용은 유지됩니다. 잠시 후 다시 게시해 주세요.');
      }
      const {post} = await api('/lounge/prompts' + (f.dataset.id ? '/' + encodeURIComponent(f.dataset.id) : ''), {method:f.dataset.id ? 'PATCH' : 'POST', body:JSON.stringify(payload)});
      pendingImage = '';
      if (location.hash === url(post.id)) render(post.id); else location.hash = url(post.id);
    } catch (error) {status.textContent = errorText(error);} finally {button.disabled = false;}
  });
  document.addEventListener('click', async event => {
    if (event.target.closest('[data-retry-prompts]')) {render(decodeURIComponent(location.hash.split('/')[1] || '')); return;}
    if (event.target.closest('[data-remove-cover]')) {const f = event.target.closest('form'); ++imageVersion; pendingImage = ''; processingImage = false; f.elements.imageUrl.value = ''; f.querySelector('[data-prompt-image]').value = ''; f.querySelector('[data-image-status]').textContent = ''; preview(f); return;}
    const button = event.target.closest('[data-copy-prompt-post],[data-edit-prompt-post],[data-delete-prompt-post]'); if (!button || !current) return;
    const status = main.querySelector('[data-prompt-status]');
    if (button.hasAttribute('data-edit-prompt-post')) {if (current.canEdit) form(current); return;}
    if (button.hasAttribute('data-copy-prompt-post')) {try {await navigator.clipboard.writeText(current.content); status.textContent = '프롬프트를 복사했어요.';} catch {status.textContent = '아래 본문을 선택해 직접 복사해 주세요.';} return;}
    if (!current.canEdit || !confirm('이 프롬프트를 삭제할까요?')) return;
    button.disabled = true;
    try {await api('/lounge/prompts/' + encodeURIComponent(current.id), {method:'DELETE'}); location.hash = url();} catch (error) {status.textContent = errorText(error); button.disabled = false;}
  });
  return {render};
}
