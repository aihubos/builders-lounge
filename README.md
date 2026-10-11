# Builders Lounge

AI Builders Lab 모임 자료실과 커뮤니티입니다. 첫 화면은 프롬프트·교육자료·강의자료·영상 통합 검색 홈입니다. AI Hub의 왼쪽 탐색 메뉴와 파란색 대시보드, Builders Lab의 큰 로고와 브랜드 표현을 적용했습니다. 기존 Google 로그인과 게시판 서버를 유지합니다.

- 공개 주소: https://aihubos.github.io/builders-lounge/
- PC: 큰 로고와 고정된 왼쪽 메뉴 · 검색 단축키(Cmd/Ctrl+K) · 가입 및 로그인
- 모바일: 큰 로고와 펼침 메뉴
- 본문: 통합 검색 · 자료 분류 · 시작 안내 · 추천 자료 · 영상
- 커뮤니티 메뉴: 기존 게시판 · 일정 · 교육 과정 · 뉴스레터 · 문의
- 홈: 실제 자료 개수 · 추천 자료 · 다음 모임 · 시작 안내
- `hub.css`: 전체 대시보드 및 반응형 디자인
- `home/` 기존 주소는 새 홈으로 이동합니다. 자료는 기존 공개 URL에서 열립니다.
- 메뉴: 모임 소개(첫 화면), 자유게시판, 일정, 교육 커리큘럼, 교육자료, 교육문의, 프롬프트, 뉴스레터, 영상, 리포트 허브
- 하단: 커뮤니티 운영정책, 개인정보 처리 안내, 이용약관

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 상단 바, 메뉴, 로그인 창, 약관 문구 |
| `styles.css` | 전체 디자인 |
| `app.js` | Google 로그인, 게시판, 읽을거리·약관 화면 전환 |
| `newsletter.json` | 키라쨩 카드뉴스(aihubos/kira-chan) 날짜별 발행본 목록. 같은 작업이 30분마다 `scripts/newsletter.mjs`로 갱신합니다. |
| `calendar.json` | 구글 캘린더에서 뽑은 다가오는 일정. GitHub Actions(`.github/workflows/calendar.yml`)가 30분마다 `scripts/calendar.mjs`로 갱신합니다. |
| `data.js` | 교육 커리큘럼·배움터·교육자료·프롬프트·영상 목록. 추가·수정은 이 파일을 직접 고칩니다. |

게시판 글·댓글과 로그인은 `reportmode-request-board` 서버(Cloudflare Worker)에 저장됩니다. 글·댓글 작성 시 서버의 빌드 적립은 그대로 동작하지만 화면에는 표시하지 않습니다.

## 실행

```bash
npm run dev       # http://127.0.0.1:4173
npm run calendar    # calendar.json 바로 갱신
npm run newsletter  # newsletter.json 바로 갱신
npm run build  # 문법 확인 후 dist/client 생성
node scripts/check-landing.mjs # 홈·자료실·게시글 주소와 로컬 이미지 연결 확인
```

GitHub Pages는 `main` 브랜치 루트 파일을 그대로 공개합니다. API 키·로그인 토큰·비밀번호는 저장소에 넣지 않습니다.
