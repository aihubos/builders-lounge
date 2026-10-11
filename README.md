# Builders Lounge

AI Builders Lab 모임 자료실과 커뮤니티입니다. 첫 화면은 프롬프트·교육자료·강의자료·영상 통합 검색 홈입니다. 왼쪽 메뉴 · 가운데 검색과 자료 · 오른쪽 Google 모임 일정의 3단 구조입니다. 큰 로고와 파란색 링크를 유지했습니다. 기존 Google 로그인과 게시판 서버를 유지합니다.

- 공개 주소: https://aihubos.github.io/builders-lounge/
- 상단: 큰 로고 · 통합 검색 · 가로 메뉴 · 가입 및 로그인
- 오른쪽 일정: 1주·2주·월 전환, 이전·다음 기간, 오늘로 이동
- Google 공개 캘린더의 반복·예외 일정도 반영하며 약 30분마다 갱신합니다.
- 검색 단축키: Cmd/Ctrl+K
- 모든 메뉴는 왼쪽에 표시하며 모바일에서는 가로 메뉴로 전환합니다.
- 본문: 통합 검색 · 자료 분류 · 시작 안내 · 추천 자료 · 영상
- 커뮤니티 메뉴: 기존 게시판 · 일정 · 교육 과정 · 뉴스레터 · 문의
- 홈: 실제 자료 개수 · 추천 자료 · 다음 모임 · 시작 안내
- `hub.css`: 중앙 집중형 레이아웃 및 반응형 디자인
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
| `calendar-worker/` | 공개 Google 캘린더 원본 조회 API. 최대 10초 캐시. 화면은 30초마다, 화면 복귀 시, 새로고침 버튼으로 갱신합니다. |
| `calendar.json` | 보관용 일정 스냅샷. 화면에는 사용하지 않습니다. |
| `data.js` | 교육 커리큘럼·배움터·교육자료·프롬프트·영상 목록. 추가·수정은 이 파일을 직접 고칩니다. |

게시판 글·댓글과 로그인은 `reportmode-request-board` 서버(Cloudflare Worker)에 저장됩니다. 글·댓글 작성 시 서버의 빌드 적립은 그대로 동작하지만 화면에는 표시하지 않습니다.

## 실행

```bash
npm ci            # 최초 실행 전 의존성 설치
npm run dev       # http://127.0.0.1:4173
npm run calendar    # calendar.json 바로 갱신
npm run newsletter  # newsletter.json 바로 갱신
npm run build  # 문법 확인 후 dist/client 생성
node scripts/check-landing.mjs # 홈·자료실·게시글 주소와 로컬 이미지 연결 확인
```

GitHub Pages는 `main` 브랜치 루트 파일을 그대로 공개합니다. API 키·로그인 토큰·비밀번호는 저장소에 넣지 않습니다.

## 회원 관리와 보관함 (2026-10-11)
- 일반 회원은 당근모임 아이디·별도 비밀번호로 가입합니다. 생년월일·가입 이유·선택 개선 설문을 받습니다.
- 관리자 Google 로그인 후 회원·설문·이용 상태·기존 도구/빌드/관리자 설정과 콘텐츠 보관함에 접근합니다.
- 공개 메뉴: 모임 소개, 게시판, 일정, 브랜드 룩북. 모든 프롬프트와 교육자료도 보관합니다. 나머지는 서버에 보관 상태를 저장하고 메뉴·검색·일반 상세 접근에서 제외합니다. 정적 원본 파일은 보존되므로 보관은 비밀 문서 접근통제가 아닙니다.
- 회원 데이터는 기존 D1에 즉시 저장하며, 비공개 Apps Script가 5분마다 Google Sheets에 비밀번호를 제외하고 반영합니다. 시트는 관리용 사본이며 역방향 수정은 반영되지 않습니다.
- 시트: https://docs.google.com/spreadsheets/d/155MdQirY4laJLsxeHCQj1Lx2_OSdYmhnWZgySYCd5zI/edit
- Apps Script: https://script.google.com/home/projects/1EUnDmmcZ01XlxpDGoZLS_c_0abSDOZP9Fc0rytQh3flkEduhQD_5irwh/edit
- 연결 비밀키는 Worker secret과 비공개 Apps Script에만 저장합니다. 공개 저장소에 넣지 않습니다.
