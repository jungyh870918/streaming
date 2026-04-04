# Dialogue Memorization Engine

YouTube 다이얼로그를 청크 단위로 반복 훈련하는 영어 암기 앱입니다.

## 빠른 시작 (Windows PowerShell)

PowerShell 에서 스크립트 실행이 막혀 있을 경우 먼저 아래를 실행하세요:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 설치 및 실행

```powershell
# 1. 설치 (최초 1회)
.\install.ps1

# 2. 실행
.\start.ps1
# → 브라우저에서 http://localhost:8000 접속
```

### 개발 모드 (프론트 핫리로드)

```powershell
.\dev.ps1
# 백엔드: http://localhost:8000
# 프론트: http://localhost:5173  (소스 수정 시 자동 반영)
```

## 프로젝트 구조

```
dialogue_app/
├── backend/
│   └── app/
│       ├── core/
│       │   ├── models.py          # 데이터 모델
│       │   ├── chunker.py         # 문장 → 청크 분할
│       │   ├── templates.py       # 훈련 템플릿
│       │   └── tts_service.py     # TTS 생성 + 캐싱
│       ├── services/
│       │   ├── session_builder.py # 다이얼로그 → 세션 조립
│       │   └── content.py         # 내장 샘플 다이얼로그
│       └── main.py                # FastAPI 라우터
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── DialogueList       # 다이얼로그/템플릿 선택
│       │   ├── TrainingSession    # 훈련 메인 컨트롤러
│       │   ├── StepDisplay        # 스텝별 UI
│       │   └── ProgressBar        # 진행 상황
│       └── hooks/
│           └── useSpeech.js       # Web Speech API 래퍼
├── install.ps1   # 의존성 설치
├── start.ps1     # 서버 실행
└── dev.ps1       # 개발 모드
```

## 훈련 템플릿

| 템플릿 | 설명 | 난이도 |
|--------|------|--------|
| dialogue_memorization | 핵심: 영어듣기→한글→청크반복×2→전체반복×2→인출→정답 | 중 |
| chunked_repetition | 워밍업: 청크별 따라말하기 | 쉬움 |
| simple_repeat | 입문: 듣고 따라말하기 | 쉬움 |
| cue_based_recall | 고급: 한글 큐→영어 인출 | 어려움 |
| progressive_gap | 중급: 점진적 빈칸 채우기 | 중 |

## 커스텀 다이얼로그 추가

`backend/app/services/content.py` 의 `SAMPLE_DIALOGUES` 에 추가하거나
`POST /api/dialogues/custom` API 사용:

```json
{
  "title": "My Dialogue",
  "lines": [
    {"speaker": "A", "text": "Hello!", "translation": "안녕!"},
    {"speaker": "B", "text": "Hi there!", "translation": "안녕하세요!"}
  ],
  "template": "dialogue_memorization"
}
```

## 요구사항

- Python 3.10+
- Node.js 18+
- 인터넷 연결 (TTS 생성 시 edge-tts 사용)
- Chrome / Edge 권장 (Web Speech API 지원)
