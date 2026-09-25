# Builders Lounge

AI Builders Lab 커뮤니티 게시판입니다. 클리앙처럼 단순한 글 목록 중심으로 구성합니다.

- 공개 주소: https://aihubos.github.io/builders-lounge/
- 3단 구조: 왼쪽 메뉴 · 가운데 본문 · 오른쪽 로그인·검색·최근 글
- 맨 위: 로고(왼쪽 고정), 시계, 다음 일정 (AI Builders Lab 구글 캘린더 기준)
- 메뉴: 자유게시판(첫 화면), 일정, 교육자료, 프롬프트, 뉴스레터, 영상
- 하단: 커뮤니티 운영정책, 개인정보 처리 안내, 이용약관

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 상단 바, 왼쪽 메뉴, 로그인 창, 약관 문구 |
| `styles.css` | 전체 디자인 |
| `app.js` | Google 로그인, 게시판, 읽을거리·약관 화면 전환 |
| `newsletter.json` | 키라쨩 카드뉴스(aihubos/kira-chan) 날짜별 발행본 목록. 같은 작업이 30분마다 `scripts/newsletter.mjs`로 갱신합니다. |
| `calendar.json` | 구글 캘린더에서 뽑은 다가오는 일정. GitHub Actions(`.github/workflows/calendar.yml`)가 30분마다 `scripts/calendar.mjs`로 갱신합니다. |
| `data.js` | 교육자료·프롬프트·뉴스레터·영상 목록. 추가·수정은 이 파일을 직접 고칩니다. |

게시판 글·댓글과 로그인은 `reportmode-request-board` 서버(Cloudflare Worker)에 저장됩니다. 글·댓글 작성 시 서버의 빌드 적립은 그대로 동작하지만 화면에는 표시하지 않습니다.

## 실행

```bash
npm run dev       # http://127.0.0.1:4173
npm run calendar    # calendar.json 바로 갱신
npm run newsletter  # newsletter.json 바로 갱신
npm run build  # 문법 확인 후 dist/client 생성
```

GitHub Pages는 `main` 브랜치 루트 파일을 그대로 공개합니다. API 키·로그인 토큰·비밀번호는 저장소에 넣지 않습니다.
