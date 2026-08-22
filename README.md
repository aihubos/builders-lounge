# Builders Lounge

AI Builders Lab의 공개 홈페이지와 멤버 작업공간을 함께 제공하는 정적 사이트입니다. 별도 프레임워크나 외부 분석·결제 서비스를 사용하지 않습니다.

## 공개 주소

- 홈페이지: https://aihubos.github.io/builders-lounge/
- Builders Lounge: https://aihubos.github.io/builders-lounge/lounge/

`AI 회의록`과 `AI 쇼츠 스튜디오`는 기존 기능을 연결할 자리만 제공하며, 현재 저장소에는 OAuth, 업로드, 생성, 결제가 포함되지 않습니다.

## 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다.

## 확인과 빌드

```bash
npm run check
npm run build
npm run test
```

`npm run test`는 전환 섹션, 단일 카카오 CTA, 지연 영상, 정적 ICS 캘린더, JSON-LD, sitemap, 설치 페이지 보존 조건을 검사합니다.

## 공개 운영 정보

- 수요일·토요일, 3시간
- 참가비 20,000원
- 최대 3명, 동탄
- 개인 노트북과 충전기 지참
- 주 신청 채널: 개인 카카오톡
- 당근 모임은 보조 채널로 제공합니다.

정확한 일정, 공간, 주차, 신청 확정 절차, 취소·환불·노쇼 기준은 신청 전 개인 카카오로 확인합니다. 공개 댓글과 채팅에는 주민등록번호, 상세 주소, 계정 비밀번호, API 키, 결제정보를 보내지 마세요.

## 일정 스냅샷

브라우저에서 외부 Google Calendar ICS나 API를 호출하지 않습니다. `assets/google-calendar.ics`를 정적 스냅샷으로 읽고, 읽기 실패 시 개인 카카오 확인 안내를 표시합니다. 최신 일정은 개인 카카오로 확인하세요.

## 관련 페이지

- `hermes.html`: Hermes와 LLM Wiki 3시간 상세 안내
- `install/`: macOS·Windows 설치 사전 안내
- `lounge/`: 기존 도구 연결 전의 멤버 작업공간 UI. `AI 회의록`과 `AI 쇼츠 스튜디오`는 이름과 연결 자리만 제공하며 OAuth, 업로드, 생성, 결제는 포함하지 않습니다.
- `site-config.js`: 공개 신청 채널, 교육 정보, 캘린더 주소

비밀키, 토큰, 비밀번호, 결제정보를 저장소나 공개 문서에 넣지 않습니다.
