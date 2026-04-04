#!/usr/bin/env bash
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}개발 모드: 백엔드 :8000 + 프론트 :5173${NC}"

# 백엔드 (백그라운드)
source "$ROOT_DIR/backend/.venv/bin/activate"
cd "$ROOT_DIR/backend"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACK_PID=$!

# 프론트 (포그라운드)
cd "$ROOT_DIR/frontend"
npm run dev

# 종료 시 백엔드도 정리
kill $BACK_PID 2>/dev/null
