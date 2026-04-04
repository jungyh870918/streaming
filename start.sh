#!/usr/bin/env bash
set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT_DIR/backend"
VENV="$BACKEND/.venv"

# 가상환경 확인
if [ ! -d "$VENV" ]; then
  echo -e "${YELLOW}가상환경이 없습니다. ./install.sh 를 먼저 실행해주세요.${NC}"
  exit 1
fi

# 프론트 빌드 결과물 확인
if [ ! -d "$BACKEND/app/static" ] || [ -z "$(ls -A $BACKEND/app/static 2>/dev/null)" ]; then
  echo -e "${YELLOW}프론트 빌드가 없습니다. ./install.sh 를 먼저 실행해주세요.${NC}"
  exit 1
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  DIALOGUE ENGINE 시작중...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  🌐  http://localhost:8000"
echo ""

source "$VENV/bin/activate"
cd "$BACKEND"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
