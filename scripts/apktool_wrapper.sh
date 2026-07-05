#!/data/data/com.termux/files/usr/bin/bash
# APKTool wrapper for Termux
prog="$0"
progdir=$(dirname "$(readlink -f "$0" || echo "$0")")
jarfile="$progdir/../apktool.jar"

# Busca o apktool.jar mais recente
if [ ! -f "$jarfile" ]; then
    # Tenta em /data/data/com.termux/files/usr/share/java/
    jarfile="/data/data/com.termux/files/usr/share/java/apktool.jar"
    if [ ! -f "$jarfile" ]; then
        # Baixa se não existe
        APKTOOL_VER="2.11.0"
        echo "⚠️ Baixando apktool $APKTOOL_VER..."
        curl -sSL "https://github.com/iBotPeaches/Apktool/releases/download/v${APKTOOL_VER}/apktool_${APKTOOL_VER}.jar" -o "$progdir/apktool.jar"
        jarfile="$progdir/apktool.jar"
    fi
fi

javaOpts="-Xmx1024M -Dfile.encoding=utf-8 -Djdk.util.zip.disableZip64ExtraFieldValidation=true"
exec java $javaOpts -jar "$jarfile" "$@"
