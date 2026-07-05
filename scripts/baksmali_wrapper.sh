#!/data/data/com.termux/files/usr/bin/bash
# baksmali wrapper - decompila DEX para Smali via jadx
MCP_BIN="/data/data/com.termux/files/home/android-mcp/bin"
JADX="/data/data/com.termux/files/usr/share/java/jadx-1.5.5-all.jar"
JCOMMANDER="$MCP_BIN/jcommander-1.64.jar"

if [ ! -f "$JADX" ]; then
    # Fallback: procura qualquer jadx
    JADX=$(find /data/data/com.termux/files/usr/share/java -name "jadx-*.jar" 2>/dev/null | head -1)
fi

CP="${JCOMMANDER}:${JADX}"
exec java -cp "$CP" com.android.tools.smali.baksmali.Main "$@"
