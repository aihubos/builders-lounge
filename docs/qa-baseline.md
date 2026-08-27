# Builders Lounge UI QA 기준선

기준 커밋: `93a549dd3fe9a89f8a1294ada9e8e1d09dad6532`  
기록일: 2026-08-27  
대상: `http://127.0.0.1:4173/`

## 실행한 검사

- `npm install`: PASS, 취약점 0개
- `npm run check`: PASS
- `npm test`: PASS
- 실제 Chromium에서 비로그인 상태로 전체 해시 경로 확인

## 해시 경로 기준선

| 경로 | 제목 | 표시 | 가로 넘침 |
|---|---|---:|---:|
| `#home` | 지금 라운지에서 볼 글 | 정상 | 없음 |
| `#board` | 자유게시판 | 정상 | 없음 |
| `#prompts` | 프롬프트 모음 | 정상 | 없음 |
| `#newsletter` | 뉴스레터 | 정상 | 없음 |
| `#videos` | 영상 모음 | 정상 | 없음 |
| `#memes` | 이미지 게시판 | 정상 | 없음 |
| `#games` | 게임방 | 정상 | 없음 |
| `#shorts` | AI 쇼츠 스튜디오 | 정상 | 없음 |
| `#webtoon` | 웹툰 제작기 | 정상 | 없음 |
| `#masterpiece` | 세계명화 프롬프트 | 정상 | 없음 |
| `#jobs` | 진행 중 작업 | 정상 | 없음 |
| `#results` | 결과물 | 정상 | 없음 |
| `#files` | 파일 | 정상 | 없음 |
| `#usage` | 빌드 내역 | 정상 | 없음 |
| `#membership` | 내 계정 | 정상 | 없음 |
| `#settings` | 설정 | 정상 | 없음 |
| `#help` | 이용 안내 | 정상 | 없음 |
| `#admin` | 관리자 설정 | 비로그인 접근 거부 상태 확인 필요 | 없음 |

## 반응형 화면

홈 화면을 아래 크기로 캡처했다.

- 390×844: `../.superloopy/evidence/frontend/20260827T000000Z-lounge-ui-overhaul-baseline/home-390.png`
- 768×1024: `../.superloopy/evidence/frontend/20260827T000000Z-lounge-ui-overhaul-baseline/home-768.png`
- 1180×820: `../.superloopy/evidence/frontend/20260827T000000Z-lounge-ui-overhaul-baseline/home-1180.png`
- 1440×900: `../.superloopy/evidence/frontend/20260827T000000Z-lounge-ui-overhaul-baseline/home-1440.png`

## 현재 알려진 기준선 이슈

1. `lounge/lounge.css`가 `styles.css`와 5개 Lounge CSS 파일을 `@import`한다.
2. Lounge CSS에 8px~10px 텍스트 규칙이 97개 있다.
3. 홈을 포함한 모든 경로에서 웹툰·세계명화 iframe 2개가 미리 로드된다.
4. 상단바가 시계와 외부 채널 카드까지 포함해 과밀하다.
5. 사이드바에는 `진행 중 작업`, `결과물`, `파일`, `내 계정`, `설정` 이동 경로가 없다.
6. 설정과 일부 샘플 안내에는 현재 기능과 맞지 않는 과거 문구가 남아 있다.

## 오류 기록

- Chromium 콘솔 오류: 0개
- 실패한 네트워크 요청: 0개
- 비로그인 상태 기준으로 가로 넘침: 0개
- 관리자 로그인 상태는 이 기준선에 포함하지 않았다. 실제 관리자 권한 검증은 Phase 6에서 별도로 수행한다.
