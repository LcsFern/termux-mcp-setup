#!/system/bin/sh
# rish - Shizuku shell for Termux
# Requires: Shizuku app installed and running

export RISH_APPLICATION_ID="com.termux"
DEX="/data/data/com.termux/files/home/bin/rish_shizuku.dex"

# Unset Termux env vars that interfere with app_process
unset LD_PRELOAD
unset LD_LIBRARY_PATH

# Check if dex exists
if [ ! -f "$DEX" ]; then
    echo "⚠️ rish_shizuku.dex não encontrado em $DEX"
    echo "Extraia do APK do Shizuku ou copie via:"
    echo "  cp /sdcard/Android/data/moe.shizuku.privileged.api/files/rish_shizuku.dex $DEX"
    exit 1
fi

export CLASSPATH="$DEX"
exec /system/bin/app_process /system/bin rikka.shizuku.shell.ShizukuShellLoader "$@"
