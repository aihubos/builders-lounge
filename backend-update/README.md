# 프롬프트 대표 이미지 업데이트

`lounge-prompts.ts`는 공용 게시 서버의 기존 프롬프트 모듈을 확장한 파일입니다.
`0020_prompt_images.sql`은 기존 글을 보존하면서 대표 이미지 항목만 추가합니다.

- 회원은 JPG·PNG·WebP를 선택하면 브라우저에서 정사각형 JPEG로 최적화한 뒤 게시합니다.
- 서버는 기존 이미지 저장소의 `lounge/prompt-images/` 공간에 파일을 저장합니다.
- 공개 게시글에 연결된 대표 이미지만 해당 이미지 주소로 제공합니다.
- 이미지 주소 입력도 지원하며, 기존 글의 본문과 작성자 권한은 유지합니다.
- 이미지 지원 서버를 먼저 적용한 다음 홈페이지를 배포해야 합니다.

원본 서버 위치: `/Users/JeremyLee/Projects/02 보고서/Report Hub/workers/report-request-board`
