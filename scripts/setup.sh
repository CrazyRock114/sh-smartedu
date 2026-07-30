#!/bin/bash
# 一键启动脚本(假设 PostgreSQL 已装好)
# 用法: bash scripts/setup.sh

set -e

cd "$(dirname "$0")/.."
ROOT=$(pwd)

echo "==========================================="
echo "  学迹 · 一键启动"
echo "==========================================="

# 1. 检查 PG
echo ""
echo "[1/4] 检查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "  ❌ psql 没找到, 请先装 PostgreSQL:"
    echo "     brew install postgresql@14"
    echo "     brew services start postgresql@14"
    exit 1
fi
echo "  ✅ psql 已装: $(psql --version)"

# 2. 检查数据库
echo ""
echo "[2/4] 检查数据库..."
if ! psql -U xueji -d xueji -h localhost -c "SELECT 1" &> /dev/null; then
    echo "  ⚠️  数据库连不上, 尝试创建..."
    createuser -s xueji 2>/dev/null || true
    createdb -O xueji xueji 2>/dev/null || true
    if psql -U xueji -d xueji -h localhost -c "SELECT 1" &> /dev/null; then
        echo "  ✅ 数据库已创建"
    else
        echo "  ❌ 数据库连不上, 请手动检查"
        exit 1
    fi
else
    echo "  ✅ 数据库连接正常"
fi

# 3. 启动后端
echo ""
echo "[3/4] 启动后端..."
cd "$ROOT/backend"

if [ ! -d "venv" ]; then
    echo "  创建 Python 虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  ✅ 创建 .env (用默认值, 后期可改)"
fi

# 启动后端 (后台)
echo "  启动 uvicorn (后台)..."
mkdir -p ../logs
nohup uvicorn app.main:app --reload --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "  ✅ 后端已启动 (PID: $BACKEND_PID), 日志: logs/backend.log"

# 等待后端启动
sleep 3
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✅ 后端健康检查通过"
else
    echo "  ⚠️  后端健康检查失败, 看 logs/backend.log"
fi

# 4. 启动前端
echo ""
echo "[4/4] 启动前端..."
cd "$ROOT/web"

if [ ! -d "node_modules" ]; then
    echo "  安装 npm 依赖 (可能要几分钟)..."
    npm install
fi

if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "  ✅ 创建 .env.local (用默认值)"
fi

echo "  启动 next dev (后台)..."
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  ✅ 前端已启动 (PID: $FRONTEND_PID), 日志: logs/frontend.log"

sleep 5
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  ✅ 前端响应正常"
else
    echo "  ⚠️  前端没起来, 看 logs/frontend.log"
fi

echo ""
echo "==========================================="
echo "  ✅ 启动完成!"
echo "  - 后端:  http://localhost:8000"
echo "  - API:   http://localhost:8000/docs"
echo "  - 前端:  http://localhost:3000"
echo "  - 日志:  logs/backend.log, logs/frontend.log"
echo "==========================================="
echo ""
echo "停止服务:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
