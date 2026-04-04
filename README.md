# Dialogue Memorization Engine

## Railway 배포

1. **railway.app** 접속 → GitHub 로그인
2. **New Project** → **Deploy from GitHub repo** → `streaming` 선택
3. 빌드 완료 후 **Variables** 탭에서 환경변수 추가:
   - `DATABASE_URL` — Railway PostgreSQL 플러그인 추가하면 자동 설정됨
4. **Settings → Domains → Generate Domain** 으로 URL 발급

### PostgreSQL 추가 방법
Railway 프로젝트 내에서 **+ New** → **Database** → **PostgreSQL** 선택하면
`DATABASE_URL` 이 자동으로 연결됩니다.

---

## 로컬 실행 (Windows PowerShell)

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\install.ps1
.\start.ps1
# http://localhost:8000
```

DATABASE_URL 없이 실행하면 SQLite로 자동 대체됩니다.

---

## 프로젝트 구조

```
streaming/
├── backend/
│   └── app/
│       ├── core/              # chunker, templates, tts, models
│       ├── services/          # session_builder, content, db_service
│       ├── db.py              # DB 연결 (PostgreSQL / SQLite fallback)
│       ├── models_db.py       # SQLAlchemy 모델
│       ├── init_db.py         # 초기 데이터 로드
│       └── main.py            # FastAPI
├── frontend/
│   └── src/                   # React + Vite
├── railway.json               # Railway 설정
├── nixpacks.toml              # 빌드 설정
├── install.ps1                # 로컬 설치
└── start.ps1                  # 로컬 실행
```

## 훈련 템플릿

| 템플릿 | 난이도 | 설명 |
|--------|--------|------|
| dialogue_memorization | 중 | 영어듣기→한글→청크반복×2→전체반복×2→인출→정답 |
| chunked_repetition | 쉬움 | 청크별 따라말하기 |
| simple_repeat | 쉬움 | 듣고 따라말하기 |
| cue_based_recall | 어려움 | 한글 큐→영어 인출 |
| progressive_gap | 중 | 점진적 빈칸 채우기 |
