# AI Builders Lab 멤버 전용 AI Workspace 구현 계획

> **2026-08-27 현재 상태:** 이 문서는 과거 멤버 전용 Workspace 설계의 보존본입니다. 현재 Builders Lounge 전면 UI/UX 구현에는 사용하지 않습니다. 현재 구현 기준은 Jeremy가 제공한 `Builders Lounge 전면 UI/UX 고도화 및 전체 QA 실행 계획`이며, 기준 커밋은 `93a549d`입니다. Phase 0 기준선은 [`docs/qa-baseline.md`](docs/qa-baseline.md)에 기록합니다.

> **2026-08-23 승인 변경:** GitHub Pages의 `https://aihubos.github.io/builders-lounge/`는 기존 교육 랜딩을 제거하고 Builders Lounge 화면을 루트에서 직접 제공한다. 이 문서의 기존 홈페이지 보존 및 `/lounge` 분리 배포 내용은 해당 GitHub Pages 저장소에 한해 이 변경으로 대체한다. `AI 회의록`과 `AI 쇼츠 스튜디오`는 실제 연결 주소가 승인될 때까지 연결 예정 상태를 유지한다.

- 작성일: 2026-08-22
- 기준 사이트: https://builderslab.ai-hub-os.com
- YouTube 채널: https://www.youtube.com/@AIBuildersLabKR
- 기준 저장소: `jeremylee0213/aibuilderslab`
- 로컬 경로: `/Users/JeremyLee/.buzz/REPOS/aibuilderslab-homepage-v2`
- 문서 상태: 구현 전 상세 설계안
- 최종 승인권: Jeremy

---

## 0. 최종 결론

기존 홈페이지의 브랜드·교육 랜딩 구조와 상단바는 유지하고, 로그인한 멤버에게만 `/lounge` 작업공간을 연다. `/lounge`는 데스크톱에서 **고정 상단바 + 좌측 모듈 메뉴 + 중앙 작업영역 + 우측 작업상태 패널(필요할 때만)** 구조로 만든다. 모바일에서는 좌측 메뉴를 서랍 메뉴로 전환한다.

1차 MVP는 **AI 회의록 한 모듈만 실제 유료 품질로 완성**한다.

- **1차 — AI 회의록**: 녹음/영상 업로드 → 전사 → 화자·안건·결정·할 일 정리 → 편집 → DOCX/Markdown/TXT 내보내기
- **2차 비공개 베타 — AI 쇼츠 스튜디오**: 1차 화면에는 `준비 중`으로만 표시한다. 이후 사용자가 직접 업로드한 원본 영상에 한해 후보 구간 3개 추천 → 1개 선택 → 9:16 크롭·자막 → MP4 내보내기를 제공한다.

YouTube 멤버십은 접근권한으로 사용하고, 등급별 월간 크레딧을 제공한다. MVP에서 별도 월 구독이나 추가 결제를 구현하지 않는다. 외부 결제는 향후 Jeremy의 별도 금전 승인 시에만 검토한다.

현재 채널 멤버십 활성 상태와 Members API 접근 상태는 미확인이다. YouTube `members.list`에는 다음 선행조건이 있다.

- 채널 멤버십이 실제 활성화되어 있어야 한다.
- 채널 소유자가 `youtube.channel-memberships.creator` 범위로 승인해야 한다.
- 개별 크리에이터가 자신의 채널에 대해서만 호출할 수 있다.
- Google/YouTube에 Members API 접근을 별도 요청해야 한다.

따라서 **YouTube 멤버십 API 접근 승인 전에는 정식 자동 인증을 출시하지 않는다.** 실제 회원 1명과 비회원 1명을 `members.list`로 정확히 구분하는 것을 P0 첫 완료 조건으로 둔다. P0가 실패하면 Jeremy 승인 아래 운영자 allowlist 기반 폐쇄 베타만 진행한다.

---

## 1. 프로젝트 목표와 비목표

### 1.1 목표

- 기존 홈페이지의 교육·브랜드 자산을 훼손하지 않는다.
- YouTube 콘텐츠 → 멤버십 → 멤버 전용 AI 도구 → 교육/커뮤니티 참여로 연결한다.
- 모듈을 추가해도 공통 인증·크레딧·파일·작업·결과·감사 체계를 재사용한다.
- 긴 AI 작업을 브라우저가 닫혀도 계속 실행되는 비동기 작업으로 만든다.
- 파일, 모델 비용, 개인정보, 저작권을 운영자가 통제할 수 있게 한다.
- 기능별 원가·완료율·재사용률을 측정하여 유료 가치가 낮은 모듈은 제거한다.

### 1.2 비목표

- 첫 버전에서 5~10개 AI 도구를 동시에 출시하지 않는다.
- arbitrary YouTube URL에서 타인의 영상을 내려받거나 재가공하지 않는다.
- 첫 버전에서 YouTube 자동 업로드·SNS 자동 게시까지 수행하지 않는다.
- 브라우저에서 직접 모델 API 키를 호출하지 않는다.
- 업로드 원본을 무기한 보관하지 않는다.
- AI 결과를 검토 없이 외부로 자동 발송하지 않는다.
- 기존 공개 홈페이지 전체를 React/Next.js로 즉시 다시 작성하지 않는다.

---

## 2. 현재 상태와 핵심 제약

### 2.1 현재 사이트

현재 사이트는 정적 HTML/CSS/JS 중심 교육 랜딩이며 Cloudflare Worker가 정적 자산과 캘린더 보조 API를 제공한다.

- `index.html`: 공개 홈페이지
- `hermes.html`: Hermes/LLM Wiki 상세
- `install/`: 설치 안내
- `script.js`, `styles.css`, `site-config.js`: 공개 UI
- `worker/index.js`: Cloudflare Worker 진입점
- 빌드/검사: `npm run check`, `npm run build`, `npm run test`

### 2.2 유지할 공개 경험

- 기존 로고, 브랜드 네이비/블루, 흰 배경, 넓은 여백
- 기존 상단바의 높이·톤·주요 교육 메뉴
- 교육 결과, 커리큘럼, 일정, 신청 CTA
- 기존 `hermes.html`, `/install`, 캘린더 및 SEO 경로
- 공개 페이지의 빠른 초기 로딩과 검색 노출

### 2.3 신규 서비스가 정적 사이트와 다른 점

신규 `/lounge`에는 다음 서버 기능이 필요하다.

- Google OAuth 로그인
- 사용자와 YouTube 채널 연결
- YouTube 멤버십 검증 및 권한 회수
- 업로드용 서명 URL
- 비동기 큐와 작업 상태
- 모델/API 호출 오케스트레이션
- 크레딧 원장과 원가 기록
- 결과 파일 보관·삭제
- 관리자 운영·감사·장애 대응

따라서 공개 홈페이지는 정적 구조를 유지하고, `/lounge`만 별도 애플리케이션으로 분리한다.

---

## 3. 제품 구조

### 3.1 브랜드/URL 구조

```text
builderslab.ai-hub-os.com/
├── /                  공개 교육·브랜드 홈페이지(현 구조 유지)
├── /hermes.html       기존 상세 안내 유지
├── /install/          기존 설치 안내 유지
├── /membership        멤버십 혜택·등급·가입·연결 안내
├── /lounge            멤버 전용 AI Workspace
│   ├── /home          대시보드
│   ├── /meeting       AI 회의록
│   ├── /shorts        AI 쇼츠 스튜디오
│   ├── /jobs          전체 작업
│   ├── /files         내 파일과 결과물
│   ├── /usage         크레딧·사용내역
│   └── /settings      계정·연결·삭제
├── /admin             운영자 전용
└── /api/*             서버 API
```

### 3.2 상단바 변경

기존 공개 상단바는 유지하되 오른쪽에 다음만 추가한다.

- 비로그인: `멤버 전용 도구` 버튼
- 로그인·권한 없음: `멤버십 연결` 버튼
- 로그인·활성 멤버: `AI Workspace` 버튼 + 사용자 메뉴

기존 교육 신청 CTA를 제거하지 않는다. 공개 홈페이지 목적과 멤버 도구 목적을 충돌시키지 않도록 상단 CTA를 두 개 이상 과도하게 강조하지 않는다.

### 3.3 `/lounge` 정보구조

#### 데스크톱 좌측 메뉴

```text
[AI Builders Lab 로고]

홈

만들기
  AI 회의록
  AI 쇼츠 스튜디오

내 작업
  진행 중
  결과물
  업로드 파일

계정
  크레딧·사용량
  멤버십 상태
  설정

[남은 크레딧]
[문의/오류 신고]
```

- 기본 폭: 248px
- 축소 폭: 72px
- 사용자가 축소 상태를 저장할 수 있다.
- 활성 메뉴는 색상 + 왼쪽 3px 표시 + 텍스트로 구분한다.
- 아이콘만으로 상태를 전달하지 않는다.

#### 모바일

- 상단바 유지
- 좌측 메뉴는 슬라이드 드로어 또는 하단 4탭으로 전환
- 핵심 4탭: 홈 / 만들기 / 작업 / 내 계정
- 긴 편집 화면은 단계형 wizard로 단순화
- 모바일에서 대용량 영상 렌더 설정 전체를 한 화면에 노출하지 않는다.

### 3.4 공통 작업 화면

모든 모듈은 같은 5단계를 쓴다.

```text
1. 입력 → 2. 설정 → 3. 처리 → 4. 검토·수정 → 5. 내보내기
```

공통 상태:

- `draft`: 설정 중
- `queued`: 대기 중
- `running`: 처리 중
- `needs_review`: 사용자 검토 필요
- `completed`: 완료
- `failed_retryable`: 재시도 가능
- `failed_final`: 운영자 확인 필요
- `cancelled`: 취소
- `expired`: 결과 보관기간 만료

---

## 4. 멤버십·로그인·권한 설계

### 4.1 올바른 인증 구조

사용자와 운영자 OAuth를 분리한다.

#### A. 멤버 사용자 로그인

1. `Google로 로그인` 클릭
2. OpenID Connect로 사용자 식별
3. YouTube 읽기 범위를 통해 사용자의 YouTube 채널 ID 확인
4. 채널이 여러 개면 본인이 멤버십을 가입한 채널을 선택
5. 서버가 선택한 `memberChannelId`를 저장

#### B. 채널 소유자 연결

1. Jeremy가 관리자에서 AI Builders Lab 소유 Google 계정 연결
2. 서버가 `youtube.channel-memberships.creator` 권한의 refresh token을 암호화 저장
3. 서버만 `members.list` 호출
4. 일반 사용자 브라우저에는 creator token을 절대 전달하지 않음

#### C. 멤버 여부 검증

```http
GET https://www.googleapis.com/youtube/v3/members
  ?part=snippet
  &filterByMemberChannelId={사용자 채널 ID}
```

- 결과에 현재 멤버가 있으면 `active`
- 접근 가능한 등급을 내부 entitlement로 변환
- 로그인 시 즉시 확인
- 6시간마다 백그라운드 재확인
- 고비용 작업 제출 직전 캐시가 6시간 이상 되었으면 재확인
- 멤버십 종료가 확인되면 새 작업 생성만 차단하고, 기존 결과는 유예기간 동안 다운로드 허용

### 4.2 YouTube API 선행 게이트

아래를 모두 통과하기 전 자동 인증을 정식 출시하지 않는다.

- [ ] AI Builders Lab 채널이 YPP/채널 멤버십 요건 충족
- [ ] 실제 멤버십 기능 활성화
- [ ] 멤버십 등급과 혜택 문구 승인
- [ ] Members API 접근 요청 제출 및 승인
- [ ] Google OAuth consent screen 검증
- [ ] 개인정보처리방침·이용약관·데이터 삭제 URL 공개
- [ ] 운영자 creator refresh token 발급·암호화·회전 절차 검증
- [ ] 테스트 멤버 가입/해지/등급 변경 시나리오 통과

### 4.3 API 승인 전 알파 대안

자동 인증인 것처럼 속이지 않는다. Members API를 사용할 수 없으면 Jeremy 승인 아래 운영자 allowlist에 등록한 제한된 테스트 사용자만 폐쇄 베타에 참여시킨다. 자기신고, 공유코드, 확인되지 않은 CSV 동기화는 사용하지 않는다.

### 4.4 등급·크레딧 정책 초안

금액은 YouTube Studio의 허용 가격과 실제 모델 원가 확인 후 Jeremy가 승인한다. 계획 단계에서는 금액을 확정하지 않는다.

| 내부 등급 | 혜택 예시 | 월간 크레딧 예시 | 동시 작업 |
|---|---|---:|---:|
| `member_basic` | 회의록 중심, 쇼츠 체험 | 100 | 1 |
| `member_creator` | 회의록 + 쇼츠 표준 | 300 | 2 |
| `member_pro` | 긴 파일·우선 큐·고급 export | 800 | 3 |

크레딧 예시:

- 회의록 1분 전사: 1 credit
- 고급 요약/화자 분석: 추가 5~20 credits
- 쇼츠 후보 분석: 원본 1분당 2 credits
- 1080×1920 쇼츠 렌더: 완성 1분당 30~60 credits

실제 차감량은 `예상치 표시 → 사용자 확인 → 최대치 예약 → 완료 후 실제 사용량 정산 → 잔액 반환` 방식으로 계산한다.

### 4.5 별도 결제 원칙

MVP:

- YouTube 멤버십이 유일한 월 접근권한
- 별도 정기결제 없음
- 크레딧 소진 시 다음 달까지 대기 또는 낮은 품질/짧은 길이 옵션

향후 검토:

- 외부 결제와 별도 크레딧 판매는 이번 계획의 구현 대상이 아니다.
- 향후 Jeremy의 별도 금전 승인 시에만 결제수단·환불·정산 구조를 새 계획으로 검토한다.

---

## 5. 모듈 1: AI 회의록

### 5.1 사용자 가치

`녹음 파일 하나를 올리면, 원문과 근거를 잃지 않은 채 결정·담당자·기한이 정리된 수정 가능한 회의록을 받는다.`

### 5.2 지원 입력

MVP:

- MP3, M4A, WAV, MP4, MOV
- 최대 2GB
- 최대 180분
- 한국어 우선, 영어 혼합 허용
- 사용자가 녹음 당사자 동의 체크

후속:

- Zoom/Google Meet/Teams 파일 가져오기
- 실시간 녹음
- 캘린더 연결

### 5.3 화면 단계

#### 1단계: 업로드

- 파일 선택/드래그
- 길이·용량·코덱 사전 검사
- 녹음 동의·개인정보 확인
- 예상 크레딧과 예상 처리시간

#### 2단계: 설정

- 회의 언어
- 회의 유형: 일반 / 프로젝트 / 영업 / 인터뷰 / 교육
- 참석자 이름(선택)
- 화자 분리: 자동 / 사용 안 함
- 템플릿: 간단 / 표준 / 상세
- 원본 자동삭제: 24시간 / 7일

#### 3단계: 처리

```text
업로드 완료
→ 오디오 추출·정규화
→ 음성 구간 검출
→ 전사
→ 화자 분리
→ 타임스탬프 정렬
→ 회의 구조화
→ 근거 링크 생성
→ 품질 검사
```

#### 4단계: 검토·수정

- 좌측: 전사 원문과 타임스탬프
- 우측: 요약/안건/결정/할 일
- 문장 클릭 시 해당 오디오 구간 재생
- 할 일 필드: 내용 / 담당자 / 기한 / 상태 / 근거 시점
- AI 재작성은 선택 영역에만 적용
- 사용자가 확정하기 전 `AI 초안` 표시

#### 5단계: 내보내기

- DOCX
- Markdown
- TXT
- JSON
- 클립보드 복사
- 후속 단계에서 Google Docs/Notion/Obsidian 직접 전송

### 5.4 결과 스키마

```json
{
  "title": "주간 제품 회의",
  "meetingDate": "2026-08-22",
  "durationSec": 3420,
  "participants": [],
  "summary": "...",
  "agenda": [
    {
      "topic": "...",
      "summary": "...",
      "evidence": [{"startMs": 120000, "endMs": 145000}]
    }
  ],
  "decisions": [
    {
      "text": "...",
      "owner": null,
      "evidence": [{"startMs": 420000, "endMs": 438000}]
    }
  ],
  "actionItems": [
    {
      "text": "...",
      "assignee": "...",
      "dueDate": null,
      "status": "open",
      "evidence": [{"startMs": 610000, "endMs": 625000}]
    }
  ]
}
```

### 5.5 품질 수용 기준

- 60분 파일 업로드 후 브라우저를 닫아도 작업 계속
- 작업 진행률과 현재 단계 표시
- 모든 결정·할 일에 원문 근거 타임스탬프 존재
- 사용자가 편집한 내용은 AI 재처리로 덮어쓰지 않음
- 실패 시 크레딧 자동 복원
- 원본 삭제 후 signed URL 접근 불가
- DOCX/MD export가 한글을 깨뜨리지 않음
- 최소 10개 실제 샘플에서 사람이 유용성을 5점 척도 4점 이상 평가

---

## 6. 모듈 2: AI 쇼츠 스튜디오

### 6.1 사용자 가치

`내 긴 영상에서 시청 가치가 있는 구간을 찾아, 세로 자막 쇼츠 초안을 빠르게 만든다.`

### 6.2 저작권 원칙

- MVP는 사용자가 직접 업로드한 파일만 처리
- 사용자가 원본 영상·음원·초상권을 보유하거나 허가받았음을 확인
- 임의 YouTube URL 다운로드 기능 금지
- 채널 연결 후에도 본인 소유 영상만 가져오는 기능은 별도 검토
- 상용 음원 라이브러리 무단 포함 금지
- 얼굴 합성/음성 복제는 별도 명시 동의 없이는 제공하지 않음

### 6.3 화면 단계

#### 1단계: 원본 업로드

- MP4/MOV/WebM
- 최대 5GB, 최대 120분
- 해상도·프레임·오디오 검사
- 예상 크레딧 표시

#### 2단계: 분석 설정

- 목표: 정보형 / 인터뷰 / 강의 / 후기 / 하이라이트
- 쇼츠 길이: 15~30초 / 30~45초 / 45~60초
- 후보 수: 3개 / 5개
- 금지어·제외 구간
- 브랜드 프리셋 선택

#### 3단계: 후보 추천

각 후보에 다음을 표시한다.

- 시작/종료 시점
- 한 줄 훅
- 추천 이유
- 예상 제목
- 전사 내용
- 위험 표시: 문맥 단절 / 개인정보 / 욕설 / 저작권 음원 가능성

사용자가 후보를 선택해야 렌더로 넘어간다. 분석만으로 완성 렌더 비용을 소모하지 않는다.

#### 4단계: 편집

- 9:16 미리보기
- 자동 얼굴/주요 객체 추적 크롭
- 자막 문장·단어 단위 편집
- 안전영역 표시
- 제목·강조색·로고 위치
- 시작/종료 미세조정
- BGM은 사용자가 권리를 가진 파일만 선택

#### 5단계: 렌더·내보내기

- 1080×1920 H.264/AAC MP4
- 30fps 기본
- SRT/VTT 자막 별도 다운로드
- 썸네일 PNG
- 제목/설명/해시태그 초안
- YouTube 자동 게시 기능은 MVP 제외

### 6.4 처리 파이프라인

```text
업로드
→ 미디어 probe
→ 저해상도 proxy 생성
→ 오디오 추출·전사
→ 장면 전환/침묵/화자 분석
→ 후보 구간 점수화
→ 사용자 선택
→ 자막·크롭 preview
→ 최종 FFmpeg 렌더
→ 품질검사
→ 결과 저장
```

### 6.5 품질 수용 기준

- 60분 영상 분석 작업이 비동기로 완료
- 렌더 전 예상 크레딧을 사용자에게 재확인
- 자동 크롭이 얼굴을 프레임 밖으로 지속적으로 밀어내지 않음
- 자막이 모바일 안전영역 밖으로 벗어나지 않음
- 출력이 1080×1920, H.264/AAC, 재생 가능
- 원본과 결과의 오디오 싱크 오차가 허용범위 내
- 실패한 렌더의 크레딧 복원
- 최소 20개 후보 중 사람이 실제 사용할 만하다고 고른 비율 40% 이상

---

## 7. 공통 플랫폼 아키텍처

### 7.1 권장 구성

기존 Cloudflare 기반을 확장하되 장시간 영상 처리는 별도 worker runtime으로 분리한다.

```text
Browser
  ├─ Public static site
  └─ /lounge SPA
        │
        ▼
Cloudflare Worker API
  ├─ Auth/session
  ├─ Entitlement guard
  ├─ Signed upload/download URLs
  ├─ Job API
  ├─ Credit ledger
  └─ Admin API
        │
        ├─ D1 or managed PostgreSQL: metadata/ledger
        ├─ R2: original/proxy/result files
        ├─ Queue/Workflow: durable jobs and retries
        ├─ AI Gateway: LLM/STT provider routing and cost logs
        └─ Media worker on Hostinger VPS or container platform
             ├─ FFmpeg/ffprobe
             ├─ scene detection
             ├─ subtitle render
             └─ optional local/remote model adapters
```

### 7.2 배포 선택

#### 권장 MVP

- 공개 정적 사이트: 현재 방식 유지
- API/auth/job coordinator: Cloudflare Workers
- 파일: R2
- 데이터: PostgreSQL(권장) 또는 D1
- 큐: Cloudflare Queues/Workflows
- 영상 worker: Hostinger VPS의 컨테이너
- 모델 호출: provider adapter + AI Gateway 또는 자체 비용 로그

#### PostgreSQL을 권장하는 이유

- 크레딧 원장과 결제 원장은 트랜잭션이 중요
- 관리자 조회와 분석 쿼리가 증가
- 향후 별도 승인된 결제, 조직/B2B, 팀 워크스페이스 확장에 유리

소규모 알파에서 D1로 시작할 수 있으나, 원장 불변성·동시 차감 테스트를 반드시 통과해야 한다.

### 7.3 모듈 플러그인 계약

모든 모듈은 공통 인터페이스를 구현한다.

```ts
interface ToolModule {
  id: 'meeting' | 'shorts' | string;
  version: string;
  entitlement: string;
  estimate(input: JobInput): Promise<CreditEstimate>;
  validate(input: JobInput): Promise<ValidationResult>;
  enqueue(input: JobInput, context: JobContext): Promise<JobRef>;
  getProgress(jobId: string): Promise<JobProgress>;
  cancel(jobId: string): Promise<void>;
  export(jobId: string, format: string): Promise<ArtifactRef>;
}
```

신규 모듈은 인증·결제·파일 업로드를 새로 만들지 않고 이 계약을 사용한다.

### 7.4 공급자 추상화

```text
SpeechToTextProvider
  ├─ primary cloud STT
  ├─ secondary cloud STT
  └─ local Whisper fallback

LanguageModelProvider
  ├─ primary structured-output LLM
  └─ secondary LLM

MediaRenderer
  └─ FFmpeg container
```

공급자 장애 시 자동 무한 재시도하지 않는다. 동일 입력의 중복 비용을 막기 위해 idempotency key를 사용한다.

---

## 8. 데이터 모델

### 8.1 핵심 테이블

#### `users`

- `id` UUID PK
- `google_sub` unique
- `email` encrypted/normalized
- `display_name`
- `selected_youtube_channel_id`
- `status`
- `created_at`, `updated_at`, `deleted_at`

#### `oauth_connections`

- `id`
- `user_id`
- `provider`
- `scopes`
- `access_token_encrypted`
- `refresh_token_encrypted`
- `expires_at`
- `revoked_at`

운영자 creator token은 일반 사용자 connection과 별도 secret store에 둔다.

#### `entitlements`

- `id`
- `user_id`
- `source`: `youtube_api | youtube_csv | allowlist | invite`
- `external_member_channel_id`
- `external_level_id`
- `internal_plan`
- `status`: `active | grace | inactive | blocked`
- `verified_at`
- `expires_at`
- `raw_hash` (원문 개인정보 대신 검증용 해시)

#### `credit_ledger`

- `id`
- `user_id`
- `job_id` nullable
- `entry_type`: `grant | reserve | consume | release | refund | expire | adjustment | purchase`
- `amount` signed integer
- `balance_after`
- `idempotency_key` unique
- `metadata_json`
- `created_at`

잔액은 클라이언트 계산을 신뢰하지 않고 서버 원장으로만 산출한다.

#### `jobs`

- `id`
- `user_id`
- `module_id`
- `module_version`
- `status`
- `input_manifest_json`
- `settings_json`
- `progress_percent`
- `progress_stage`
- `estimated_credits`
- `reserved_credits`
- `consumed_credits`
- `provider_cost_micros`
- `error_code`, `error_safe_message`
- `idempotency_key`
- `created_at`, `started_at`, `completed_at`, `expires_at`

#### `artifacts`

- `id`
- `job_id`
- `user_id`
- `kind`: `original | proxy | transcript | document | video | subtitle | thumbnail`
- `object_key`
- `mime_type`
- `size_bytes`
- `sha256`
- `retention_class`
- `expires_at`
- `deleted_at`

#### `audit_events`

- actor, action, target, result, IP hash, user-agent summary, timestamp
- 원문 프롬프트나 회의 내용은 감사로그에 기록하지 않는다.

### 8.2 권한 규칙

- 사용자: 자신의 user/job/artifact만 조회
- support: 메타데이터·오류코드만 조회, 원본 내용 접근 금지
- operator: 명시적 승인·감사기록 하에 제한된 디버그 접근
- admin: 등급·크레딧 조정 가능, 원장 삭제 불가
- service worker: 할당된 job prefix의 파일만 접근

---

## 9. API 설계

### 9.1 인증·멤버십

```http
GET  /api/auth/google/start
GET  /api/auth/google/callback
POST /api/auth/logout
GET  /api/me
GET  /api/me/youtube-channels
POST /api/me/youtube-channel
POST /api/membership/verify
GET  /api/membership/status
DELETE /api/me
```

### 9.2 업로드·작업

```http
POST /api/uploads/init
POST /api/uploads/{uploadId}/complete
POST /api/jobs/estimate
POST /api/jobs
GET  /api/jobs
GET  /api/jobs/{jobId}
GET  /api/jobs/{jobId}/events
POST /api/jobs/{jobId}/cancel
POST /api/jobs/{jobId}/retry
DELETE /api/jobs/{jobId}
GET  /api/artifacts/{artifactId}/download
```

### 9.3 모듈별

```http
POST  /api/modules/meeting/jobs
PATCH /api/modules/meeting/jobs/{jobId}/minutes
POST  /api/modules/meeting/jobs/{jobId}/export

POST  /api/modules/shorts/jobs/analyze
GET   /api/modules/shorts/jobs/{jobId}/candidates
POST  /api/modules/shorts/jobs/{jobId}/render
PATCH /api/modules/shorts/jobs/{jobId}/captions
```

### 9.4 관리자

```http
GET  /api/admin/dashboard
GET  /api/admin/jobs
POST /api/admin/jobs/{jobId}/retry
POST /api/admin/entitlements/sync
POST /api/admin/entitlements/import-csv
POST /api/admin/credits/adjust
GET  /api/admin/costs
GET  /api/admin/incidents
```

모든 쓰기 API는 CSRF 방어, 권한 확인, rate limit, idempotency를 적용한다.

---

## 10. 크레딧·원가·수익성

### 10.1 비용 통제

각 작업에서 기록한다.

- 입력 길이/용량
- STT 분량과 비용
- LLM 입력/출력 토큰과 비용
- 저장 용량·보관일
- 렌더 CPU/GPU 시간
- 재시도 비용
- 총 공급자 비용
- 사용자 차감 크레딧

### 10.2 원가 안전장치

- 사용자별 일일/월간 cap
- 모듈별 최대 입력 길이
- job 제출 전 크레딧 예약
- provider timeout과 circuit breaker
- 동일 idempotency key 중복 실행 방지
- 실패 단계별 재사용: 전사가 끝났으면 요약 실패 시 전사 재호출 금지
- 원본 hash가 같고 설정이 같으면 재사용 여부를 사용자에게 제안
- 운영자 budget alert

### 10.3 출시 경제성 게이트

정식 유료화 전에 4주 알파에서 확인한다.

- 활성 멤버 중 주간 도구 사용률 ≥ 25%
- 첫 작업 완료율 ≥ 90%
- 실패·운영자 수동개입률 ≤ 5%
- 사용자 1명당 월 변동원가 ≤ 해당 멤버십 실수령액의 35%
- 월 2회 이상 반복사용자 비율 ≥ 30%
- 환불/불만의 주요 원인이 품질이 아닌 경우에도 개선계획 존재

기준 미달 시 기능을 더 추가하지 말고 입력 제한·모델·UX를 조정한다.

---

## 11. 보안·개인정보·법적 요구사항

### 11.1 출시 차단 조건

다음 중 하나라도 미완료면 공개 출시 금지다.

- 개인정보처리방침, 이용약관, 환불/해지, AI 결과 고지 없음
- 녹음 당사자 동의 확인 없음
- 원본 파일 자동삭제 기능 없음
- 토큰·비밀키가 브라우저/저장소/로그에 노출
- signed URL이 짧게 만료되지 않음
- 다른 사용자 job/artifact 접근이 가능한 IDOR
- 악성 파일/확장자/코덱 검증 없음
- 크레딧 중복차감/무한사용 가능
- 멤버십 해지 후 무기한 신규 작업 가능
- 저작권 보유 확인 없이 URL 영상 다운로드 제공
- 관리자 콘텐츠 접근이 감사로그 없이 가능

### 11.2 파일 보안

- 브라우저 → R2 direct multipart upload
- 파일명은 UI 표시용으로만 저장, object key는 랜덤 UUID
- MIME과 magic bytes 모두 검사
- ffprobe를 sandbox/container에서 실행
- decompression bomb·비정상 duration·과도한 stream 수 제한
- 원본 bucket은 public access 금지
- 다운로드 URL 5~15분 만료
- 작업별 prefix와 service credential 분리

### 11.3 데이터 보존 기본값

| 데이터 | 기본 보관 | 사용자 변경 |
|---|---:|---|
| 원본 녹음/영상 | 24시간 | 최대 7일 |
| proxy/중간 파일 | 작업 완료 + 24시간 | 불가 |
| 전사·회의록 | 30일 | 즉시 삭제 가능 |
| 쇼츠 결과 | 30일 | 즉시 삭제 가능 |
| job 메타데이터 | 90일 | 계정 삭제 시 비식별화/삭제 |
| 크레딧·결제 원장 | 법적/회계 요구 기간 | 임의 삭제 불가 |
| 보안 감사로그 | 180일 | 내용 데이터 미포함 |

정확한 기간은 한국 법률/세무 자문 후 확정한다.

### 11.4 AI 데이터 원칙

- 모델 학습에 사용자 콘텐츠를 사용하는 공급자 옵션 비활성화
- 공급자별 데이터 보존정책 문서화
- 개인정보가 포함될 수 있음을 업로드 전에 고지
- 사용자가 삭제하면 우리 저장소와 삭제 가능한 공급자 캐시 모두 삭제 요청
- 프롬프트/원문을 오류 추적 서비스에 보내지 않음
- AI 결과는 초안이며 사용자가 확인해야 함

### 11.5 저작권·초상권

- 사용자 소유/허가 확인 체크
- 신고·삭제 접수 경로
- 반복 위반 사용자 차단
- 공용 브랜드 음악·폰트·템플릿 라이선스 목록 관리
- 타인의 YouTube 콘텐츠 스크래핑/다운로드 금지

---

## 12. 운영 설계

### 12.1 사용자에게 보이는 장애 처리

- 공급자 장애: `현재 AI 처리 공급자가 지연 중입니다. 파일은 안전하게 보관되며 재개됩니다.`
- 입력 오류: 해결 가능한 형식·길이 안내
- 내부 오류: 안전한 오류코드만 표시
- 실패 시: 재시도 / 크레딧 복원 / 문의 선택
- ETA는 정확한 데이터가 없으면 확정 시간 대신 대기 작업 수와 처리 단계 표시

### 12.2 재시도 규칙

- 네트워크/429/5xx: 지수 backoff, 최대 3회
- 잘못된 입력/권한/잔액: 재시도 금지
- 렌더 worker crash: checkpoint 이후 1회 재개
- 동일 job의 병렬 실행 방지 lock
- dead-letter queue로 최종 실패 이동

### 12.3 일일 운영

- 큐 적체, 실패율, 비용, R2 사용량 확인
- 24시간 이상 `running` job 자동 탐지
- dead-letter queue 확인
- creator token 만료/실패 알림
- budget cap 70/90/100% 알림

### 12.4 주간 운영

- 모듈별 사용률·완료율·재시도율
- 멤버십 등급별 원가
- 사용자가 버린 결과/다운로드한 결과 비율
- 회의록 수정률, 쇼츠 후보 채택률
- CS 이슈 상위 5개
- 보안·삭제 요청 처리 현황

### 12.5 고객지원 권한

지원 담당자는 기본적으로 파일 내용이나 전사 내용을 볼 수 없다. 다음만 본다.

- job ID
- 단계
- provider 오류코드
- 입력 길이/형식
- 크레딧 예약/복원 상태

내용 접근이 꼭 필요하면 사용자가 `24시간 진단 접근 허용`을 직접 켜고 감사로그가 남아야 한다.

---

## 13. 관리자 화면

### 13.1 대시보드

- 활성 멤버 수
- 오늘/주간 활성 사용자
- 모듈별 작업 수·완료율
- 큐 대기시간
- 실패율
- 오늘/월간 공급자 비용
- 크레딧 발행·소비·복원
- 삭제 예정 파일 용량

### 13.2 멤버십 운영

- YouTube creator 연결 상태
- 마지막 sync 시각
- API 오류
- 등급 매핑
- allowlist 관리
- 사용자 entitlement 이력
- 강제 차단(부정사용에 한함)

### 13.3 작업 운영

- 내용 미리보기 없이 job metadata 조회
- retry/cancel/refund credits
- worker/provider별 필터
- 오류군 집계
- 개인정보 진단 접근 승인 이력

---

## 14. 분석 지표

### 14.1 퍼널

```text
공개 홈페이지 방문
→ 멤버 전용 도구 클릭
→ YouTube 멤버십 안내 조회
→ Google 로그인
→ 채널 연결
→ 멤버 검증 성공
→ 첫 작업 업로드
→ 첫 작업 완료
→ 결과 다운로드
→ 30일 내 재사용
```

### 14.2 핵심 KPI

- North Star: `월간 결과 다운로드를 2회 이상 완료한 활성 멤버 수`
- 멤버 연결 성공률
- 첫 가치 도달시간(TTFV)
- job 완료율
- 결과 다운로드율
- 회의록 action item 수동 수정률
- 쇼츠 후보 채택률
- 7/30일 재사용률
- 멤버 1명당 변동원가
- 크레딧 소진 전 이탈률

### 14.3 개인정보 친화 분석

- 원문·파일명·전사 내용 수집 금지
- 이벤트는 module/status/duration bucket 수준
- IP는 보안 목적 단기 hash만 허용
- 제3자 광고 추적 픽셀 사용 금지

---

## 15. 단계별 구현 로드맵

## Phase 0. 사업·API 가능성 검증 (1~2주)

### 작업

- YouTube 채널 멤버십 가능 여부 확인
- YPP/채널 콘텐츠 운영 계획 확정
- Jeremy 승인 후 Members API 접근 요청
- 멤버십 등급·혜택 초안
- 회의록/쇼츠 각 10명 인터뷰 또는 대체 수요검증
- 모델·STT·렌더 공급자 비용 benchmark
- 10개 회의 파일, 10개 영상 샘플 품질 테스트
- 개인정보·약관 초안

### 산출물

- API 승인 상태표
- 원가표
- 샘플 품질평가표
- 멤버십 혜택 문구
- Go/No-Go 결정

### Go 조건

- 실제 채널 소유자 권한으로 현재 회원 1명과 비회원 1명을 `members.list`에서 정확히 구분
- 채널 멤버십/API의 현실적 활성화 경로 존재
- 회의록 또는 쇼츠 중 최소 하나에서 강한 반복 수요 확인
- 예상 변동원가가 실수령액의 35% 이하가 될 설계 존재

## Phase 1. 플랫폼 기반 (2주)

### 작업

- `/lounge` shell과 좌측 메뉴
- Google 로그인
- allowlist entitlement
- 사용자·세션·job·artifact·credit ledger
- R2 multipart upload
- Queue/Workflow
- 작업 목록·상태·삭제
- 관리자 기본 대시보드
- 보안 테스트 기반

### 완료 기준

- 로그인→권한→업로드→가짜 worker→결과 다운로드 end-to-end
- 다른 사용자 데이터 접근 차단 테스트
- 중복 요청 크레딧 이중차감 방지 테스트
- 브라우저 종료 후 job 지속

## Phase 2. AI 회의록 MVP (2~3주)

### 작업

- 미디어 정규화
- STT adapter
- 화자 분리 선택
- 구조화 결과 schema
- 원문 근거 타임스탬프
- 편집 UI
- DOCX/Markdown/TXT export
- 자동삭제

### 완료 기준

- 10개 샘플 QA
- 완료율 90% 이상
- 한글 export 정상
- 실패 크레딧 복원
- 보관기간 삭제 검증

## Phase 3. AI 쇼츠 알파 (3~4주)

### 작업

- proxy·전사·장면 분석
- 후보 추천
- 9:16 크롭
- 자막 편집
- FFmpeg 렌더 worker
- SRT/썸네일/export
- 저작권 고지

### 완료 기준

- 20개 후보 채택률 측정
- 출력 호환성 테스트
- 싱크·자막 안전영역 검증
- 비용 cap과 queue backpressure 검증

## Phase 4. YouTube 멤버십 자동 인증 (API 승인 후 1~2주)

### 작업

- creator OAuth secret 연결
- 사용자 YouTube 채널 선택
- `members.list` 검증
- 등급 매핑
- 주기 sync
- 가입/해지/업그레이드/다운그레이드 테스트
- grace period

### 완료 기준

- 실제 테스트 멤버 5명 시나리오 통과
- creator token 만료 복구
- API 장애 시 잘못된 대량 차단 방지
- 개인정보처리방침과 OAuth 검증 완료

## Phase 5. 비공개 베타 (4주)

- 20~50명 제한
- 지원 채널 운영
- 원가·완료율·채택률 계측
- 주간 품질 개선
- 등급별 크레딧 조정
- 정식 출시 Go/No-Go

## Phase 6. 유료 확장

조건 충족 시에만:

- 1회성 크레딧 팩(Toss)
- Google Docs/Notion/Obsidian export
- 본인 YouTube 영상 가져오기
- YouTube 업로드 초안
- 팀/B2B workspace
- 문서·이미지 등 신규 모듈

---

## 16. 구체 개발 작업 분해

### Epic A. 공개 사이트 보존·진입점

- A1. production `main`과 feature branch 차이 확인
- A2. `/membership` 페이지 추가
- A3. 상단바에 상태별 멤버 버튼
- A4. 기존 anchor/CTA/SEO 회귀 테스트
- A5. `/lounge` route가 공개 index fallback에 먹히지 않도록 라우팅

### Epic B. 앱 셸

- B1. 앱 디자인 토큰 추가
- B2. 데스크톱 sidebar
- B3. 모바일 navigation
- B4. module registry
- B5. job status component
- B6. global error/empty/loading states
- B7. WCAG keyboard/focus/reduced motion

### Epic C. 인증·권한

- C1. Google OIDC
- C2. secure session cookie
- C3. YouTube channel selection
- C4. allowlist/API entitlement adapter
- C5. route and API guard
- C6. logout/account deletion
- C7. OAuth token encryption/rotation

### Epic D. 크레딧

- D1. immutable ledger
- D2. monthly grant
- D3. estimate/reserve/consume/release
- D4. idempotency
- D5. admin adjustment with reason
- D6. concurrency tests

### Epic E. 파일·큐

- E1. multipart signed upload
- E2. media validation
- E3. job queue and checkpoints
- E4. progress events(SSE 우선, polling fallback)
- E5. cancellation
- E6. retention sweeper
- E7. dead-letter queue

### Epic F. 회의록

- F1. normalize/extract audio
- F2. STT adapter
- F3. diarization
- F4. structured summarization
- F5. evidence alignment
- F6. editor
- F7. export
- F8. QA fixtures

### Epic G. 쇼츠

- G1. proxy and ffprobe
- G2. transcript/scene features
- G3. candidate scoring
- G4. crop tracking
- G5. caption editor
- G6. render templates
- G7. output QA
- G8. copyright controls

### Epic H. 운영·보안

- H1. admin RBAC
- H2. cost dashboard
- H3. rate limit/WAF
- H4. audit log
- H5. incident alerts
- H6. privacy delete flow
- H7. backup/restore drill
- H8. penetration and IDOR tests

---

## 17. 테스트 전략

### 17.1 단위 테스트

- entitlement 상태변환
- 크레딧 reserve/consume/refund
- membership level mapping
- file validation
- job retry policy
- transcript schema validation
- caption line splitting

### 17.2 통합 테스트

- Google OAuth callback
- creator token refresh
- Members API mock: active/inactive/level change/429/500
- R2 multipart upload
- queue duplicate delivery
- provider timeout/fallback
- retention deletion
- Toss webhook는 도입 시 signature/re-query/idempotency

### 17.3 E2E

- 비회원 접근 차단
- 멤버 첫 로그인·채널 선택
- 회의록 업로드→편집→DOCX
- 쇼츠 분석→후보 선택→렌더→다운로드
- 잔액 부족
- 멤버십 해지와 grace
- 계정 삭제
- 모바일 390px, 태블릿, 데스크톱

### 17.4 보안 테스트

- IDOR
- CSRF
- XSS in filename/transcript/caption
- forged MIME
- zip/decompression bomb 계열
- path traversal
- signed URL 재사용/만료
- replayed webhook/job request
- prompt injection in transcript
- admin privilege escalation
- OAuth state/PKCE/session fixation

### 17.5 성능 목표

- 공개 홈페이지 Lighthouse 기존 수준 유지
- `/lounge` 초기 shell p75 LCP < 2.5s
- 일반 API p95 < 500ms(외부 모델 작업 제외)
- job 생성 응답 < 1s
- progress update 지연 < 5s
- 동시 50명 알파에서 큐 유실 0

---

## 18. 디자인 상세

### 18.1 디자인 원칙

- 기존 `DESIGN.md`의 네이비·블루·흰색과 4px spacing 유지
- 공개 홈페이지는 넓은 서사형 레이아웃 유지
- 앱은 작업 밀도가 높으므로 최대폭을 강제하지 않고 workspace형으로 전환
- 카드 남발 대신 구분선·섹션·상태를 사용
- 보라색 AI SaaS 그라데이션, 네온 글로우, 가짜 통계 금지
- threeui.com은 레이아웃·상호작용 참고만 하고 복제하지 않음

### 18.2 앱 토큰 추가안

```css
--app-header-height: 64px;
--app-sidebar-width: 248px;
--app-sidebar-collapsed-width: 72px;
--app-inspector-width: 360px;
--app-content-min-width: 0;
--app-status-info: #0b63ce;
--app-status-success: #0b6e4f;
--app-status-warning: #8a5a00;
--app-status-danger: #b42318;
```

### 18.3 상태 카피

- 빈 상태: `아직 만든 결과물이 없습니다. 첫 회의록을 만들어 보세요.`
- 대기: `작업 대기열에 등록했습니다. 창을 닫아도 계속 처리됩니다.`
- 처리: `음성을 글로 바꾸고 있습니다. 완료되면 작업 목록에 표시됩니다.`
- 검토: `AI 초안이 준비됐습니다. 결정과 담당자를 확인해 주세요.`
- 실패: `이 단계에서 처리를 완료하지 못했습니다. 차감한 크레딧은 복원했습니다.`
- 멤버십 만료: `새 작업을 만들 수 없습니다. 기존 결과는 {date}까지 내려받을 수 있습니다.`

---

## 19. 임원 토의 통합 의제

### 빈즈: 사업·재무

- YouTube 멤버십 실수령액과 AI 변동원가의 균형
- 등급별 크레딧·공정사용 정책
- 별도 결제의 중복 청구 위험
- 정식 출시의 원가·반복사용 게이트

### 치들: 제품 전략

- 공개 홈페이지와 작업공간의 역할 분리
- 회의록 우선 출시, 쇼츠는 알파로 단계화
- North Star와 전환 퍼널
- 모듈 추가보다 반복사용 검증 우선

### 모라우: 운영

- 큐·provider 장애·크레딧 복원
- 파일 자동삭제와 고객지원 접근 통제
- 일일/주간 운영 dashboard
- 수동 entitlement에서 자동 API로의 안전한 전환

### 미자이스톰: 보안·법무

- 녹음 동의, 개인정보, 저작권, 초상권
- OAuth token과 creator 권한 분리
- 악성 업로드, IDOR, prompt injection
- 법적 문서와 삭제 절차 미완료 시 출시 차단

### 멜로디: 브랜드·UX

- 상단바 유지, 좌측 앱 런처 신설
- 공개 브랜드의 친근함과 유료 도구의 신뢰성 연결
- 처리 단계·실패·검토 카피의 투명성
- 모바일은 단계형 흐름으로 단순화

### 카파시: 기술

- 정적 공개 사이트 + 별도 `/lounge` 아키텍처
- Worker/R2/Queue/PostgreSQL/미디어 worker 분리
- 모듈 contract, provider adapter, checkpoint
- Members API 선행 승인과 비동기 작업 설계

### 제이: 최종 통합

- API 승인 전 정식 멤버 인증을 가장하지 않음
- 회의록으로 플랫폼 공통 기반 검증 후 쇼츠 확장
- YouTube 멤버십은 접근권한, 크레딧은 원가 통제 단위
- 보안·QA 게이트 후 운영 최종 승인
- 가격·결제·개인정보·약관·대외 공개는 Jeremy 승인

---

## 20. Go/No-Go 승인 게이트

### Gate 1. 채널/멤버십

- 채널 콘텐츠 운영과 멤버십 활성화 경로가 없으면 No-Go
- Members API 승인 경로가 없으면 자동 인증은 No-Go, 비공개 알파만 진행

### Gate 2. 제품 가치

- 회의록 또는 쇼츠가 실제 반복사용을 만들지 못하면 신규 모듈 추가 No-Go

### Gate 3. 경제성

- 변동원가가 실수령액의 35%를 안정적으로 넘으면 입력 제한/등급/공급자 조정 전 출시 No-Go

### Gate 4. 보안·법률

- 개인정보·저작권·삭제·토큰·IDOR·약관 중 하나라도 차단 이슈면 공개 출시 No-Go

### Gate 5. 운영

- 실패 크레딧 복원, dead-letter 처리, 비용 cap, 장애 알림이 없으면 공개 출시 No-Go

---

## 21. Jeremy 승인 필요 항목

다음은 설계자가 임의 확정하지 않는다.

1. YouTube 채널 멤버십 등급명과 월 가격
2. 등급별 월 크레딧과 공정사용 제한
3. Members API 접근 요청 및 Google OAuth 심사 제출
4. 개인정보처리방침·이용약관·환불·저작권 정책
5. 유료 API/클라우드/GPU 월 예산
6. 외부 결제 또는 별도 크레딧 판매의 도입 여부
7. 원본/결과 보관기간 최종값
8. 운영자가 사용자 콘텐츠를 볼 수 있는 예외 절차
9. 정식 공개 출시
10. B2B·팀 계정 확장

---

## 22. 첫 10개 실행 항목

1. production `main`과 현재 feature branch를 비교해 구현 기준 branch 결정
2. AI Builders Lab YouTube 채널의 YPP/멤버십 활성화 가능 상태 확인
3. Jeremy 승인 후 Members API 접근 요청 절차 시작
4. 멤버십 혜택·등급·크레딧 초안 승인
5. 회의록 샘플 10개, 쇼츠 원본 10개 benchmark 세트 준비
6. 공급자별 품질·비용 benchmark 실행
7. `/lounge` 기술 spike: 로그인→allowlist→업로드→비동기 job→다운로드
8. 크레딧 원장 concurrency 테스트
9. 개인정보처리방침·약관·동의 UI 초안 검토
10. 회의록 MVP 구현 시작, 쇼츠는 공통 기반 통과 후 착수

---

## 23. 공식 근거

- 현재 홈페이지: https://builderslab.ai-hub-os.com
- YouTube 채널: https://www.youtube.com/@AIBuildersLabKR
- YouTube Members API: https://developers.google.com/youtube/v3/docs/members
- `members.list`: https://developers.google.com/youtube/v3/docs/members/list
- YouTube 3rd-party membership integrations: https://support.google.com/youtube/answer/9315687
- 멤버십 운영·수익배분: https://support.google.com/youtube/answer/7491256
- Google OAuth 민감 범위 검증: https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- 내부 맥락 문서: `/Users/JeremyLee/.buzz/RESEARCH/BUILDERS_LOUNGE_WEBSITE_CONTEXT.md`

---

## 24. 최종 권고

이 프로젝트를 `홈페이지에 AI 버튼 몇 개를 붙이는 작업`으로 시작하면 인증·원가·개인정보·장시간 처리 문제 때문에 빠르게 무너진다. 반대로 처음부터 거대한 SaaS를 만들면 현재 채널과 멤버 수요가 검증되지 않은 상태에서 비용이 과도하다.

따라서 권장 순서는 다음과 같다.

```text
기존 홈페이지 보존
→ /lounge 공통 기반
→ allowlist 기반 AI 회의록 MVP
→ 쇼츠 비공개 알파
→ YouTube Members API 승인
→ 실제 멤버 자동 인증
→ 4주 베타로 반복사용·원가 검증
→ 정식 공개
→ 필요 시 크레딧 추가구매·신규 모듈
```

최초 구현의 핵심은 **기능 개수**가 아니라 `멤버 인증`, `비동기 작업`, `크레딧 원장`, `파일 삭제`, `운영 가시성`이다. 이 기반을 먼저 만들면 회의록·쇼츠 이후 문서 변환, 이미지, 리서치, 강의자료 생성 모듈을 안전하게 추가할 수 있다.
