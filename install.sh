#!/usr/bin/env bash
set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  DIALOGUE ENGINE — 의존성 설치${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Python 가상환경 ──────────────────────────────────────────
echo -e "${YELLOW}[1/3] Python 가상환경 설정...${NC}"
cd "$ROOT_DIR/backend"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo "  가상환경 생성 완료"
fi

source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo -e "${GREEN}  ✓ Python 패키지 설치 완료${NC}"

# ── Node.js 확인 ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/3] Node.js 확인...${NC}"
if ! command -v node &>/dev/null; then
  echo "  ❌ Node.js가 없습니다. https://nodejs.org 에서 설치해주세요."
  exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v) 확인됨${NC}"

# ── 프론트엔드 빌드 ───────────────────────────────────────────
echo ""
echo -e "${YELLOW}[3/3] 프론트엔드 빌드...${NC}"
cd "$ROOT_DIR/frontend"
npm install --silent
npm run build --silent
echo -e "${GREEN}  ✓ 프론트엔드 빌드 완료${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  설치 완료!  ./start.sh 로 실행하세요${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
