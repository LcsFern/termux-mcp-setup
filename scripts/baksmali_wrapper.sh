#!/data/data/com.termux/files/usr/bin/bash
# baksmali wrapper - decompila DEX para Smali usando o jar do jadx (bundla baksmali)
MCP_BIN="/data/data/com.termux/files/home/android-mcp/bin"
JCOMMANDER="$MCP_BIN/jcommander-1.64.jar"
JADX_DIR="/data/data/com.termux/files/usr/share/java"

# Localiza o jadx-*-all.jar instalado (versão-agnóstico)
JADX=$(find "$JADX_DIR" -maxdepth 1 -name "jadx-*-all.jar" 2>/dev/null | head -1)

if [ -z "$JADX" ]; then
    echo "✗ jadx não encontrado em $JADX_DIR. Instale com: pkg install jadx" >&2
    exit 1
fi

CP="${JCOMMANDER}:${JADX}"
exec java -cp "$CP" com.android.tools.smali.baksmali.Main "$@"
