# Threads to Obsidian

Threads.com 게시글을 Obsidian에 저장하는 Chrome 확장 프로그램입니다.

## 기능

- 👍 **좋아요 클릭 시 저장** - 좋아요 버튼 활성화 시 자동 저장
- 🔖 **저장 클릭 시 저장** - 북마크 버튼 활성화 시 자동 저장
- 📝 **마크다운 변환** - 게시글을 Obsidian 호환 마크다운으로 변환
- 🖼️ **이미지 다운로드** - 첨부 이미지를 로컬에 저장 (옵션)
- 🔗 **Local REST API 연동** - Obsidian REST API 플러그인 통해 직접 저장
- 🤖 **AI 변환** - AI를 활용하여 게시글을 요약·분석·재구성 (옵션)
- 📂 **동적 폴더 경로** - 연/월 기반 자동 폴더 분류
- 🏷️ **토픽/태그 추출** - 게시글의 주제와 태그 자동 추출
- 🔔 **알림** - 저장 완료 시 Chrome 알림

## 지원하는 게시글 유형

- ✅ 단일 게시글
- ✅ 엮인 글 (Thread)
- ✅ 리포스트
- ✅ 인용 게시글
- ✅ 캐러셀 이미지

## AI 변환 기능

AI 변환을 활성화하면 게시글을 AI가 분석하여 구조화된 노트로 변환합니다.

### 지원 AI 제공자

| 제공자 | 기본 모델 | 비고 |
|--------|-----------|------|
| OpenAI | gpt-4o | |
| Google Gemini | gemini-2.0-flash | |
| Anthropic | claude-3-5-sonnet | |
| Grok (xAI) | grok-3-mini-fast | |
| zai | — | 커스텀 엔드포인트 |
| Custom | — | 사용자 지정 엔드포인트 |

- 각 제공자별 API Key, 모델, 엔드포인트를 개별 설정
- **연결 테스트** 버튼으로 설정 검증
- 커스텀 프롬프트 템플릿 지원

## 설치

### 1. Obsidian 설정
1. Obsidian에서 **Local REST API** 플러그인 설치
2. 플러그인 설정에서 포트 번호 확인 (기본: 27123)
3. 필요시 API Key 설정

### 2. Chrome 확장 프로그램 설치
1. Chrome에서 `chrome://extensions` 접속
2. 우측 상단 **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. 이 폴더 선택

### 3. 설정
1. 확장 프로그램 아이콘 클릭 → 설정
2. Local REST API 연결 정보 입력
3. 저장 경로 및 옵션 설정
4. (선택) AI 변환 활성화 및 AI 제공자 설정

## 사용법

1. [Threads.com](https://www.threads.net) 접속
2. 저장하고 싶은 게시글의 **좋아요** 또는 **저장** 버튼 클릭
3. Obsidian에 자동 저장됨

> ⚠️ **주의**: 좋아요/저장 **취소** 시에는 저장되지 않습니다. (첫 활성화 클릭만 저장)

## 설정 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| 트리거 (좋아요) | 좋아요 클릭 시 저장 | ✅ |
| 트리거 (저장) | 저장 클릭 시 저장 | ✅ |
| 노트 폴더 | 저장 경로 | `Threads` |
| 연/월 폴더 | 연/월 기반 하위 폴더 자동 생성 (예: `Threads/2026/02`) | ❌ |
| 이미지 저장 | 이미지 로컬 저장 여부 | ✅ |
| 이미지 폴더 모드 | 중앙 집중 / 노트별 하위 폴더 | 중앙 집중 |
| AI 변환 | AI 기반 콘텐츠 변환 | ❌ |

## 파일 구조

```
sns_to_obsidian/
├── manifest.json            # 확장 프로그램 설정
├── background/
│   ├── service-worker.js    # 백그라운드 서비스 워커
│   └── ai-service.js        # AI API 호출 모듈
├── content/
│   ├── content.js           # 콘텐츠 스크립트 (DOM 감지·추출)
│   └── styles.css           # 토스트 알림 스타일
├── popup/
│   ├── popup.html           # 팝업 UI
│   ├── popup.js             # 팝업 로직
│   └── popup.css            # 팝업 스타일
├── options/
│   ├── options.html         # 설정 페이지
│   ├── options.js           # 설정 로직
│   └── options.css          # 설정 스타일
└── assets/icons/            # 아이콘
```

## 저장 형식

### 기본 저장 형식

```markdown
---
source: threads
author: "@username"
post_url: "https://threads.net/..."
saved_at: "2026-01-14T20:00:00+09:00"
type: single
tags:
  - threads
---

# @username의 게시글

> 게시글 내용

---
*원본 링크: [Threads에서 보기](https://threads.net/...)*
```

### AI 변환 형식 (AI 활성화 시)

AI가 게시글을 분석하여 다음 섹션으로 구조화합니다:

- **핵심 요약** - 게시글의 핵심 내용 요약
- **상세 분석** - 심화 분석 및 인사이트
- **핵심 키워드** - 주요 키워드 추출
- **Action Items** - 실행 가능한 항목 체크리스트
- **쉬운 설명** - Feynman 기법을 활용한 쉬운 설명

## 라이선스

MIT License
