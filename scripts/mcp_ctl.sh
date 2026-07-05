#!/data/data/com.termux/files/usr/bin/bash
# MCP Server Controller
# Uso: mcp {start|stop|restart|status|log}

MCP_DIR="/data/data/com.termux/files/home/android-mcp"
PID_FILE="/data/data/com.termux/files/home/.mcp.pid"
LOG_FILE="/data/data/com.termux/files/home/mcp.log"

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ MCP server já está rodando (PID: $PID)"
            return
        fi
        rm "$PID_FILE"
    fi

    echo "🚀 Iniciando MCP server..."
    cd "$MCP_DIR" || { echo "❌ Erro: $MCP_DIR não encontrado"; exit 1; }
    
    nohup node server.js > "$LOG_FILE" 2>&1 &
    NEW_PID=$!
    echo "$NEW_PID" > "$PID_FILE"
    
    sleep 1
    if kill -0 "$NEW_PID" 2>/dev/null; then
        echo "✅ MCP server iniciado (PID: $NEW_PID)"
        echo "🌐 Endpoint: http://127.0.0.1:3000/mcp"
    else
        echo "❌ Falha ao iniciar. Verifique: $LOG_FILE"
    fi
}

stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️ MCP server não está rodando"
        pkill -f "node server.js" 2>/dev/null
        return
    fi

    PID=$(cat "$PID_FILE")
    if kill "$PID" 2>/dev/null; then
        echo "🛑 MCP server parado (PID: $PID)"
        rm "$PID_FILE"
    else
        echo "⚠️ Processo $PID não encontrado. Limpando..."
        rm "$PID_FILE"
    fi
    pkill -f "node server.js" 2>/dev/null
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ MCP server RODANDO (PID: $PID)"
            echo "🌐 http://127.0.0.1:3000/mcp"
            return
        fi
    fi
    echo "⭕ MCP server PARADO"
}

log() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "⚠️ Nenhum log encontrado em $LOG_FILE"
    fi
}

case "$1" in
    start)   start ;;
    stop)    stop ;;
    restart) stop; sleep 1; start ;;
    status)  status ;;
    log)     log ;;
    *)
        echo "Uso: mcp {start|stop|restart|status|log}"
        exit 1
        ;;
esac
