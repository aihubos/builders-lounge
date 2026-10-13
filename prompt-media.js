const icons = {
  업무: '<rect x="28" y="35" width="104" height="82" rx="15"/><path d="M60 35v-9h40v9M28 68h104M71 65v15h18V65"/>',
  글쓰기: '<path d="M43 28h53l23 23v80H43zM96 28v25h23M58 77h43M58 94h43M58 111h26"/>',
  이미지: '<rect x="27" y="29" width="106" height="102" rx="18"/><circle cx="61" cy="62" r="12"/><path d="m31 112 32-28 22 18 22-34 23 38"/>',
  영상: '<rect x="24" y="41" width="84" height="80" rx="18"/><path d="m108 66 29-18v65l-29-18z"/>',
  코딩: '<path d="m55 48-32 32 32 32m50-64 32 32-32 32M91 31l-22 98"/>',
  학습: '<path d="M23 36c26-8 40-1 57 10 17-11 31-18 57-10v88c-24-8-39-1-57 10-18-11-33-18-57-10zM80 46v88"/>',
  기타: '<path d="m80 23 15 34 37 5-27 26 7 38-32-18-33 18 7-38-27-26 37-5z"/>'
};
export function imageSource(value) {
  if (typeof value !== 'string') return '';
  if (/^assets\/[a-zA-Z0-9/_.-]+$/.test(value)) return value;
  try { const u = new URL(value); return u.protocol === 'https:' || (u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname)) ? u.href : ''; } catch { return ''; }
}
export function coverMarkup(post, esc, eager = false) {
  const source = imageSource(post.imageUrl || post.videos?.[0]?.poster);
  return `<div class="prompt-cover" data-category="${esc(post.category || '기타')}"><div class="cover-art" aria-hidden="true"><svg viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${icons[post.category] || icons.기타}</svg><span>${esc(post.category || '프롬프트')}</span></div>${source ? `<img src="${esc(source)}" alt="${esc(post.title)} 대표 이미지" width="640" height="640" loading="${eager ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer">` : ''}</div>`;
}
export function promptCard(post, esc, {guide = false} = {}) {
  return `<a class="prompt-card image-card" href="#prompt-board/${encodeURIComponent(post.id)}">${coverMarkup(post, esc)}<div class="prompt-card-body"><span class="prompt-category">${esc(post.category || '기타')}${guide ? ' · 운영팀 가이드' : ''}</span><h2>${esc(post.title)}</h2><p>${esc(post.description || post.summary || '')}</p><footer><span>${esc(post.author || '빌더')}</span><span aria-hidden="true">↗</span></footer></div></a>`;
}
// A failed external cover leaves the category artwork visible underneath it.
document.addEventListener('error', event => {
  if (event.target.matches?.('.prompt-cover img')) event.target.hidden = true;
}, true);
