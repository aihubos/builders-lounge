# Builders Lounge

AI Builders Lab의 멤버 작업공간을 정적 사이트 루트에서 제공합니다. 별도 프레임워크나 외부 분석·결제 서비스를 사용하지 않습니다.

## 공개 주소

- Builders Lounge: https://aihubos.github.io/builders-lounge/

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

빌드 결과는 루트 `index.html`, `styles.css`, `assets/`, `lounge/` 지원 파일, `robots.txt`, `sitemap.xml`, `.nojekyll`만 공개 경로에 포함합니다. sitemap에는 Builders Lounge 루트 주소만 등록합니다.

## 작업공간 범위

현재 화면에서 홈, 작업·결과물·파일, 사용량, 멤버십, 설정·도움말 메뉴 골격을 확인할 수 있습니다. 멤버십 연결 전 상태에서는 계정 권한, 업로드, 생성, 외부 API 호출, 결제를 요청하지 않습니다.

정확한 연결 주소와 권한이 승인되기 전까지 `AI 회의록`과 `AI 쇼츠 스튜디오`는 연결 예정 상태로 유지합니다.

## 저장소 운영

`styles.css`와 `assets/`는 정적 배포 호환을 위해 유지합니다. Lounge 화면의 스타일과 동작은 `lounge/` 아래 파일에서 관리합니다.

비밀키, 토큰, 비밀번호, 결제정보를 저장소나 공개 문서에 넣지 않습니다.
