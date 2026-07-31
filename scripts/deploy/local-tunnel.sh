#!/usr/bin/env bash
# 学迹 / Xueji · 方案 C 本地 + Cloudflare Tunnel
# 用法:
#   scripts/deploy/local-tunnel.sh start     # 启动 tunnel + 抓 URL
#   scripts/deploy/local-tunnel.sh stop      # 停 tunnel
#   scripts/deploy/local-tunnel.sh restart   # 重启 (URL 会变)
#   scripts/deploy/local-tunnel.sh url       # 打印当前 URL
#   scripts/deploy/local-tunnel.sh status    # 后端/前端/tunnel 状态
#
# 依赖: 前端在 :3000, 后端在 :8000, cloudflared 二进制在 /tmp/cloudflared

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/cloudflared.log"
URL_FILE="$LOG_DIR/tunnel.url"
CLOUDFLARED_BIN="/tmp/cloudflared"
TUNNEL_PORT=3000
PID_FILE="$LOG_DIR/cloudflared.pid"

mkdir -p "$LOG_DIR"

is_running() {
    [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

cmd_start() {
    if is_running; then
        echo "⚠️  tunnel 已在运行 (PID $(cat "$PID_FILE"))"
        cmd_url
        return 0
    fi

    # 1. 检查后端 / 前端
    if ! curl -s -o /dev/null --max-time 2 http://localhost:8000/health; then
        echo "❌ 后端没起来 (http://localhost:8000/health 无响应), 先跑 ./scripts/setup.sh"
        exit 1
    fi
    if ! curl -s -o /dev/null --max-time 2 http://localhost:3000/; then
        echo "❌ 前端没起来 (http://localhost:3000 无响应), 先跑 ./scripts/setup.sh"
        exit 1
    fi

    # 2. 检查 cloudflared
    if [ ! -x "$CLOUDFLARED_BIN" ]; then
        echo "📥 cloudflared 不在 $CLOUDFLARED_BIN, 自动下载..."
        curl -fsSL -o /tmp/cloudflared.tgz \
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz" \
            || { echo "❌ 下载失败, 请手动装 cloudflared"; exit 1; }
        tar -xzf /tmp/cloudflared.tgz -C /tmp
        chmod +x /tmp/cloudflared
        rm -f /tmp/cloudflared.tgz
        echo "  ✓ cloudflared $(/tmp/cloudflared --version 2>&1 | head -1)"
    fi

    # 3. 杀掉旧的
    pkill -f "cloudflared tunnel" 2>/dev/null
    sleep 1

    # 4. 后台启动
    rm -f "$LOG_FILE" "$URL_FILE"
    nohup "$CLOUDFLARED_BIN" tunnel --url "http://localhost:$TUNNEL_PORT" \
        --no-autoupdate > "$LOG_FILE" 2>&1 &
    CLOUDFLARED_PID=$!
    echo "$CLOUDFLARED_PID" > "$PID_FILE"
    echo "🚀 tunnel 启动中 (PID $CLOUDFLARED_PID)..."

    # 5. 等 URL 出现 (最多 15s)
    for i in $(seq 1 30); do
        if [ -f "$URL_FILE" ]; then
            break
        fi
        # 抓日志里 trycloudflare 那一行
        NEW_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -1 || true)
        if [ -n "$NEW_URL" ]; then
            echo "$NEW_URL" > "$URL_FILE"
            break
        fi
        sleep 0.5
    done

    if [ ! -f "$URL_FILE" ]; then
        echo "❌ 15s 内没拿到 URL, 看日志: $LOG_FILE"
        tail -20 "$LOG_FILE"
        exit 1
    fi

    URL=$(cat "$URL_FILE")
    echo
    echo "✅ tunnel 已就绪"
    echo "   公网 URL: $URL"

    # 6. 等 Cloudflare 路由真正可达 (最多 15s)
    echo "   等待公网路由传播..."
    for i in $(seq 1 15); do
        if curl -s -o /dev/null --max-time 3 "$URL/"; then
            echo "   ✓ 公网可访问"
            break
        fi
        sleep 1
    done

    echo "   (本机 localhost:3000 仍然可用, 不影响开发)"
    echo
    echo "📤 把这个 URL 发给朋友:"
    echo "   $URL"
}

cmd_stop() {
    if is_running; then
        kill "$(cat "$PID_FILE")" 2>/dev/null
        rm -f "$PID_FILE"
        pkill -f "cloudflared tunnel" 2>/dev/null
        echo "✅ tunnel 已停"
    else
        echo "ℹ️  tunnel 没在跑"
    fi
    rm -f "$URL_FILE"
}

cmd_restart() {
    cmd_stop
    sleep 1
    cmd_start
}

cmd_url() {
    if [ -f "$URL_FILE" ] && is_running; then
        cat "$URL_FILE"
    else
        echo "(tunnel 未运行, 先跑 start)" >&2
        return 1
    fi
}

cmd_status() {
    echo "== 后端 (8000) =="
    if curl -s -o /dev/null --max-time 2 http://localhost:8000/health; then
        echo "  ✓ http://localhost:8000/health OK"
    else
        echo "  ✗ 无响应"
    fi

    echo "== 前端 (3000) =="
    if curl -s -o /dev/null --max-time 2 http://localhost:3000/; then
        echo "  ✓ http://localhost:3000 OK"
    else
        echo "  ✗ 无响应"
    fi

    echo "== cloudflared tunnel =="
    if is_running; then
        echo "  ✓ 跑着 (PID $(cat "$PID_FILE"))"
        if [ -f "$URL_FILE" ]; then
            echo "  URL: $(cat "$URL_FILE")"
        fi
    else
        echo "  ✗ 没跑"
    fi
}

case "${1:-}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_restart ;;
    url)     cmd_url ;;
    status)  cmd_status ;;
    *)
        echo "用法: $0 {start|stop|restart|url|status}"
        exit 1
        ;;
esac
