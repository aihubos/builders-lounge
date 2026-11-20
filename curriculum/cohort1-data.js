window.COHORT1 = {
 "updated": "2026-10-28",
 "schedule": {
  "free": {
   "date": "2026-11-07",
   "start": "07:00",
   "end": "09:00"
  },
  "classes": {
   "morning": {
    "label": "평일 오전반",
    "when": "매주 수요일 10~12시",
    "start": "10:00",
    "end": "12:00",
    "dates": [
     "2026-11-11",
     "2026-11-18",
     "2026-11-25",
     "2026-12-02"
    ]
   },
   "afternoon": {
    "label": "평일 오후반",
    "when": "매주 수요일 14~16시",
    "start": "14:00",
    "end": "16:00",
    "dates": [
     "2026-11-11",
     "2026-11-18",
     "2026-11-25",
     "2026-12-02"
    ]
   },
   "weekend": {
    "label": "주말반",
    "when": "매주 토요일 10~12시",
    "start": "10:00",
    "end": "12:00",
    "dates": [
     "2026-11-14",
     "2026-11-21",
     "2026-11-28",
     "2026-12-05"
    ]
   }
  }
 },
 "sessions": [
  {
   "label": "무료 설치반",
   "topic": "설치하고 연결하기 (Aside + Grok Bot)",
   "goal": "내 컴퓨터에 Aside와 Grok Bot이 설치되어 있고, 두 도구에 첫 일을 시켜 본 상태가 됩니다.",
   "flow": [
    {
     "start": 0,
     "end": 10,
     "text": "완성된 모습 보기: 강사의 Aside와 Grok Bot 화면"
    },
    {
     "start": 10,
     "end": 20,
     "text": "준비물 확인: Grok 구독, Cursor 계정, 구글 계정"
    },
    {
     "start": 20,
     "end": 40,
     "text": "시연: 두 도구 설치하는 모습 보기"
    },
    {
     "start": 40,
     "end": 80,
     "text": "따라 하기: Aside 설치 → Grok Bot 설치"
    },
    {
     "start": 80,
     "end": 110,
     "text": "내 것으로: 두 도구에 내 일 하나씩 시켜 보기"
    },
    {
     "start": 110,
     "end": 120,
     "text": "확인과 제출"
    }
   ],
   "steps": [
    "Aside 설치 (약 20분)",
    "Grok Bot 설치 (약 20분)"
   ],
   "checks": [
    "Aside가 설치되고 크롬 북마크가 보인다",
    "확인 모드가 Ask first로 되어 있다",
    "(Premium 구독자) Grok Bot에 로그인되어 대화가 된다",
    "두 도구에 내 요청을 하나씩 시켜 결과를 받았다"
   ],
   "submit": "Aside 결과 화면 1장 + Grok Bot 대화 화면 1장 (개인정보는 가리기)",
   "prompt": "네이버 날씨에서 이번 주 서울 날씨를 찾아서\n요일별 최고·최저 기온과 비 소식을 표로 정리해 줘.",
   "refs": [
    {
     "label": "Aside 홈페이지",
     "url": "https://aside.com"
    },
    {
     "label": "Grok Bot 시작하기 (공식 문서)",
     "url": "https://docs.x.ai/grok-bot/get-started"
    },
    {
     "label": "Grok Bot 내려받기",
     "url": "https://x.ai/bot"
    },
    {
     "label": "Grok Bot 로그인 안내 (Cursor 도움말)",
     "url": "https://cursor.com/help/grok-bot/sign-in"
    },
    {
     "label": "요금제별 Grok Bot 이용 (Cursor 도움말)",
     "url": "https://cursor.com/help/grok-bot/plans"
    }
   ],
   "notes": [],
   "id": "s0",
   "kind": "free",
   "tools": [
    "Aside",
    "Grok Bot"
   ],
   "outcome": "Aside와 Grok Bot이 깔린 내 컴퓨터",
   "guide": "",
   "image": "assets/shots/grokbot-00-download.png",
   "video": "assets/cohort1-videos/s0.mp4",
   "poster": "assets/cohort1-videos/s0.jpg"
  },
  {
   "label": "1회",
   "topic": "일정·할 일 비서 + 업무 자동화 (블로그·SNS)",
   "goal": "매일 아침 일정과 메일을 정리해 주는 나만의 비서가 생기고, 블로그 글과 SNS 게시물을 AI가 써서 예약 직전까지 준비해 줍니다. **마지막 확인과 예약 버튼은 내가 누릅니다.**",
   "flow": [
    {
     "start": 0,
     "end": 5,
     "text": "오늘 결과물 먼저 보기: 아침 브리핑과 예약된 SNS 게시물"
    },
    {
     "start": 5,
     "end": 15,
     "text": "1부 시연: 연결 → 요청 → 루틴"
    },
    {
     "start": 15,
     "end": 50,
     "text": "1부 따라 하기: 캘린더·지메일 연결, 오늘 일정 정리, 아침 루틴 등록"
    },
    {
     "start": 50,
     "end": 60,
     "text": "1부 내 것으로: 내 생활에 맞게 루틴 고치고 시험 실행"
    },
    {
     "start": 60,
     "end": 70,
     "text": "2부 시연: 자료 → 블로그 초안 → SNS 글 → 예약 화면"
    },
    {
     "start": 70,
     "end": 105,
     "text": "2부 따라 하기: 블로그 초안과 SNS 게시물 만들고 예약 직전까지"
    },
    {
     "start": 105,
     "end": 115,
     "text": "2부 내 것으로: 내 주제로 바꾸고 매주 반복 루틴 저장"
    },
    {
     "start": 115,
     "end": 120,
     "text": "확인과 제출"
    }
   ],
   "steps": [
    "캘린더와 메일 연결하기",
    "오늘 일정 정리 받기",
    "매일 아침 루틴 만들기",
    "블로그 초안 만들기 (공통 주제: 가을 캠핑 준비물)",
    "SNS 게시물로 바꾸기",
    "예약 직전까지 준비하기",
    "매주 반복으로 저장하기"
   ],
   "checks": [
    "구글 캘린더와 지메일이 각각 연결되었다",
    "아침 브리핑 루틴을 등록하고 시험 실행했다",
    "출처 링크가 달린 블로그 초안을 내 말투로 고쳤다",
    "SNS 게시물 3종을 받았다",
    "예약 화면을 내가 확인했고, 예약 버튼은 내가 직접 눌렀다(또는 직전에서 멈췄다)"
   ],
   "submit": "브리핑 시험 실행 화면 + 블로그 초안 + 예약 직전(또는 예약 완료) 화면 (메일 주소·이름은 가리기)",
   "prompt": "@Google Calendar 오늘 일정을 시간 순서대로 정리해 줘.\n@Gmail 어제부터 받은 메일 중 답장이 필요한 것 3개만 골라서\n보낸 사람, 제목, 해야 할 일을 표로 정리해 줘.\n메일은 절대 보내지 말고 정리만 해 줘.",
   "refs": [
    {
     "label": "Grok Bot 컴퓨터와 앱 연결 (공식 문서)",
     "url": "https://docs.x.ai/grok-bot/computer-and-apps"
    },
    {
     "label": "Gmail·구글 캘린더 연결 (공식 문서)",
     "url": "https://docs.x.ai/grok/connectors/gmail-google-calendar"
    },
    {
     "label": "스킬과 루틴 (공식 문서)",
     "url": "https://docs.x.ai/grok-bot/skills-routines-and-automations"
    },
    {
     "label": "Aside 홈페이지",
     "url": "https://aside.com"
    }
   ],
   "notes": [],
   "id": "s1",
   "kind": "base",
   "tools": [
    "Grok Bot",
    "Google 캘린더·Gmail",
    "Aside"
   ],
   "outcome": "매일 아침 브리핑 + 예약 직전까지 준비된 블로그·SNS 글",
   "guide": "",
   "image": "assets/shots/grokbot-02-connect-apps.png",
   "video": "assets/cohort1-videos/s1.mp4",
   "poster": "assets/cohort1-videos/s1.jpg"
  },
  {
   "label": "2회",
   "topic": "나만의 지식창고 (LLM Wiki) + 내 홈페이지",
   "goal": "흩어진 자료를 출처와 함께 정리한 작은 위키가 생기고, 다른 사람에게 보낼 수 있는 내 홈페이지 주소(grok.me)가 생깁니다.",
   "flow": [
    {
     "start": 0,
     "end": 5,
     "text": "오늘 결과물 먼저 보기: 목차 → 노트 → 원문, 그리고 공개된 홈페이지"
    },
    {
     "start": 5,
     "end": 15,
     "text": "1부 시연: 원문 → 요약 → 연결 → 질문"
    },
    {
     "start": 15,
     "end": 50,
     "text": "1부 따라 하기: 여행 자료 3개로 작은 위키 만들기"
    },
    {
     "start": 50,
     "end": 60,
     "text": "1부 내 것으로: 내 자료 1개 넣고 근거를 붙여 질문하기"
    },
    {
     "start": 60,
     "end": 70,
     "text": "2부 시연: 계획 → 설명 → 수정 → 공개"
    },
    {
     "start": 70,
     "end": 105,
     "text": "2부 따라 하기: 동네 책모임 소개 페이지 만들고 공개"
    },
    {
     "start": 105,
     "end": 115,
     "text": "2부 내 것으로: 내 소개로 바꾸고 휴대전화로 확인"
    },
    {
     "start": 115,
     "end": 120,
     "text": "서로 주소 열어 보기, 제출"
    }
   ],
   "steps": [
    "준비",
    "원문을 요약 노트로",
    "연결하고 질문하기",
    "계획 3줄 쓰기",
    "Grok Build로 만들기",
    "한 번에 하나씩 고치기",
    "공개하기"
   ],
   "checks": [
    "원문(raw)과 요약(pages)이 나뉘어 있고 노트마다 출처가 있다",
    "근거를 붙여 답하는 질문과 '근거 없음' 질문을 해 보았다",
    "grok.me 주소로 홈페이지를 공개했다",
    "휴대전화로 열어 글자가 잘리지 않는 것을 확인했다"
   ],
   "submit": "위키 폴더 화면 + 질문·답변 화면 + 홈페이지 공개 주소",
   "prompt": "아래 자료를 내 개인 위키에 넣으려고 해.\n제목, 한 줄 요약, 핵심 내용 3개, 출처를 정리해 줘.\n관련 있을 만한 다른 노트 제목도 2개 추천해 줘.\n내가 준 자료에 없는 사실은 추가하지 마.\n[원문 붙여 넣기]",
   "refs": [
    {
     "label": "Obsidian",
     "url": "https://obsidian.md"
    },
    {
     "label": "Obsidian 링크 쓰는 법 (공식 도움말)",
     "url": "https://help.obsidian.md/links"
    },
    {
     "label": "Grok Build 소개 (x.ai)",
     "url": "https://x.ai/news/grok-build-for-everyone"
    }
   ],
   "notes": [],
   "id": "s2",
   "kind": "base",
   "tools": [
    "Obsidian",
    "Grok",
    "Grok Build"
   ],
   "outcome": "출처가 달린 작은 위키 + grok.me 공개 주소",
   "guide": "",
   "image": "assets/shots/grokbuild-01-publish.png",
   "video": "assets/cohort1-videos/s2.mp4",
   "poster": "assets/cohort1-videos/s2.jpg"
  },
  {
   "label": "3회",
   "topic": "캐릭터 시트 + 쇼츠 + 롱폼",
   "goal": "나만의 캐릭터 시트 1장, 그 캐릭터가 나오는 30초 세로 쇼츠 1편, 1~3분 가로 롱폼 영상 1편이 생깁니다.",
   "flow": [
    {
     "start": 0,
     "end": 5,
     "text": "오늘 결과물 먼저 보기: 캐릭터 시트 → 쇼츠 → 롱폼"
    },
    {
     "start": 5,
     "end": 15,
     "text": "시연: 캐릭터 시트 → 장면 → 조립"
    },
    {
     "start": 15,
     "end": 35,
     "text": "따라 하기: 내 캐릭터 시트 만들기"
    },
    {
     "start": 35,
     "end": 70,
     "text": "따라 하기: 쇼츠 30초 (대본 → 장면 → 조립)"
    },
    {
     "start": 70,
     "end": 110,
     "text": "따라 하기: 롱폼 1~3분 (대본 늘리기 → 장면 추가 → 가로 조립)"
    },
    {
     "start": 110,
     "end": 120,
     "text": "휴대전화·컴퓨터로 재생해 보기, 제출"
    }
   ],
   "steps": [
    "캐릭터 시트 만들기 (20분)",
    "쇼츠 30초 만들기 (35분)",
    "롱폼 1~3분 만들기 (40분)"
   ],
   "checks": [
    "앞·옆·뒤와 표정이 담긴 캐릭터 시트 1장이 있다",
    "쇼츠 MP4가 처음부터 끝까지 재생되고 세로로 잘 보인다",
    "롱폼 MP4가 1분 이상이고 가로로 잘 보인다",
    "쇼츠와 롱폼의 캐릭터가 같아 보인다"
   ],
   "submit": "캐릭터 시트 이미지 + 쇼츠 MP4 + 롱폼 MP4",
   "prompt": "귀여운 2D 일러스트 스타일의 캐릭터 시트를 만들어 줘.\n- 캐릭터: [책을 좋아하는 주황색 고양이 '북냥이', 동그란 안경, 초록 목도리]\n- 한 장 안에: 정면·옆모습·뒷모습 전신 + 표정 3가지(웃음, 놀람, 생각)\n- 흰 배경, 글자 없이\n- 모든 그림에서 옷·색·얼굴을 똑같이",
   "refs": [
    {
     "label": "HyperFrames 빠른 시작",
     "url": "https://hyperframes.heygen.com/quickstart"
    },
    {
     "label": "HyperFrames 에이전트 연결 (Grok 포함)",
     "url": "https://hyperframes.heygen.com/studio-app/connect-your-agent"
    },
    {
     "label": "HyperFrames 문제 해결 (FFmpeg 등)",
     "url": "https://hyperframes.heygen.com/help"
    },
    {
     "label": "Google Flow",
     "url": "https://labs.google/fx/tools/flow"
    },
    {
     "label": "크레딧 안내",
     "url": "https://support.google.com/flow/answer/16526234"
    },
    {
     "label": "Grok 요금제 비교",
     "url": "https://x.ai/pricing"
    },
    {
     "label": "Grok 사용량 FAQ",
     "url": "https://docs.x.ai/grok/faq"
    }
   ],
   "notes": [],
   "id": "s3",
   "kind": "base",
   "tools": [
    "Grok Imagine",
    "Google Flow",
    "HyperFrames"
   ],
   "outcome": "캐릭터 시트 + 30초 쇼츠 + 1~3분 롱폼",
   "guide": "",
   "image": "assets/shots/hyperframes-01-home.png",
   "video": "assets/cohort1-videos/s3.mp4",
   "poster": "assets/cohort1-videos/s3.jpg"
  },
  {
   "label": "4회",
   "topic": "주문 자동화 + 관리 자동화 (대시보드)",
   "goal": "항공권·쇼핑 상품을 AI가 비교해 결제 직전까지 준비하고, 포트폴리오·지출 숫자를 한눈에 보는 대시보드가 생깁니다. 마지막엔 4주 동안 만든 것을 하루 루틴으로 묶어 발표합니다.",
   "flow": [
    {
     "start": 0,
     "end": 5,
     "text": "오늘 결과물 먼저 보기: 결제 직전에 멈춘 화면과 대시보드"
    },
    {
     "start": 5,
     "end": 12,
     "text": "1부 시연: 조건을 정확히 주는 법, 멈출 지점 정하기"
    },
    {
     "start": 12,
     "end": 45,
     "text": "1부 따라 하기: 항공권 비교 + 쇼핑 장바구니 담기"
    },
    {
     "start": 45,
     "end": 55,
     "text": "1부 내 것으로: 자주 사는 물건 가격 비교 루틴 저장"
    },
    {
     "start": 55,
     "end": 62,
     "text": "2부 시연: 질문 정하기 → 만들기 → 검산"
    },
    {
     "start": 62,
     "end": 90,
     "text": "2부 따라 하기: 예시 포트폴리오 대시보드 만들고 검산"
    },
    {
     "start": 90,
     "end": 100,
     "text": "2부 내 것으로: 내 지출·업무 숫자로 바꾸기"
    },
    {
     "start": 100,
     "end": 115,
     "text": "결과 발표: 하루 루틴 묶기, 한 사람 3분"
    },
    {
     "start": 115,
     "end": 120,
     "text": "후기 작성, 수료"
    }
   ],
   "steps": [
    "항공권 비교 (공통 예제: 김포 → 제주)",
    "쇼핑 장바구니 담기 (공통 예제: 생활용품)",
    "가격 비교 루틴 저장",
    "예시 파일 보기",
    "Grok Build로 대시보드 만들기",
    "검산하기 (꼭!)",
    "나만의 하루 루틴으로 묶기",
    "결과 발표 (한 사람 5분)"
   ],
   "checks": [
    "확인 모드가 Ask first였고, 결제 직전 화면에서 멈췄다",
    "출처 링크가 달린 비교표를 받았다",
    "대시보드 합계가 원래 파일과 같다 (9,400,000원 / 9,870,000원)",
    "나만의 하루 루틴 표를 만들고 발표했다"
   ],
   "submit": "비교표 + 장바구니(또는 예약 직전) 화면 + 대시보드 주소 또는 화면 + 하루 루틴 표 (주소·연락처·카드 정보는 가리기)",
   "prompt": "다음 달 둘째 주 토요일 김포에서 제주로 가는 편도 항공권을 찾아 줘.\n- 오전 9시~12시 출발, 성인 1명, 위탁 수하물 포함\n- 항공권 비교 사이트 1곳과 항공사 홈페이지 2곳을 확인해 줘\n- 항공사, 출발 시각, 가격(수하물 포함 총액), 출처 링크를 표로 정리해 줘\n- 예약이나 결제는 하지 말고 표까지만",
   "refs": [
    {
     "label": "Aside 홈페이지",
     "url": "https://aside.com"
    },
    {
     "label": "Grok Build 소개 (x.ai)",
     "url": "https://x.ai/news/grok-build-for-everyone"
    },
    {
     "label": "Grok Bot 스킬과 루틴 (공식 문서)",
     "url": "https://docs.x.ai/grok-bot/skills-routines-and-automations"
    }
   ],
   "notes": [],
   "id": "s4",
   "kind": "base",
   "tools": [
    "Aside",
    "Grok Build"
   ],
   "outcome": "결제 직전에서 멈춘 주문 + 숫자가 바뀌는 대시보드 + 하루 루틴",
   "guide": "",
   "image": "",
   "video": "assets/cohort1-videos/s4.mp4",
   "poster": "assets/cohort1-videos/s4.jpg"
  }
 ]
};
