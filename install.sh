#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
#  TERMUX MCP SETUP - Instalador Completo (One Command)
#  Repo: https://github.com/LcsFern/termux-mcp-setup
#  Uso: curl -sSL <raw_url>/install.sh | bash
#  ou:  bash install.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
TERMUX_HOME="/data/data/com.termux/files/home"
TERMUX_PREFIX="/data/data/com.termux/files/usr"

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
header() { echo -e "\n${CYAN}${BOLD}=== $1 ===${NC}\n"; }

# ===========================[ BOAS-VINDAS ]===========================
clear
echo -e "${CYAN}"
cat << "BANNER"
╔══════════════════════════════════════════════════════╗
║            TERMUX MCP SETUP v1.0                     ║
║     Android Reverse Engineering Environment          ║
║     MCP Server + 33 Ferramentas + ZSH Custom         ║
╚══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

# ===========================[ CHECKS ]===========================
header "VERIFICAÇÕES INICIAIS"

if [ ! -d "$TERMUX_PREFIX" ]; then
    err "Este script só funciona no Termux! Saindo."
    exit 1
fi

# Storage
if [ ! -d ~/storage ]; then
    info "Configurando acesso ao storage..."
    termux-setup-storage
    sleep 2
fi

log "Termux detectado: $(termux-info 2>/dev/null | grep TERMUX_VERSION | head -1 | cut -d= -f2)"

# ===========================[ ETAPA 1: PACOTES ]===========================
header "ETAPA 1/4: INSTALAÇÃO DE PACOTES"

log "Atualizando repositórios..."
pkg update -y -qq && pkg upgrade -y -qq

info "Instalando pacotes essenciais..."
pkg install -y -qq \
    git curl wget tar unzip \
    nodejs-lts python golang \
    build-essential clang cmake binutils patchelf \
    openjdk-21 \
    zsh eza bat fzf fastfetch micro htop \
    openssh openssl-tool cronie termux-api termux-services \
    android-tools apksigner d8 \
    jadx dex2jar radare2 capstone \
    file findutils grep sed gawk less \
    bzip2 xz-utils p7zip zip unzip \
    proot proot-distro \
    ffmpeg imagemagick \
    python-pip python-lxml \
    dos2unix tree ncdu ripgrep fd \
    neofetch screen tmux

# TUR repo
if ! grep -q "tur.kcubeterm.com" $TERMUX_PREFIX/etc/apt/sources.list.d/* 2>/dev/null; then
    info "Adicionando repositório TUR..."
    pkg install -y tur-repo
    pkg update -y -qq
    pkg install -y -qq apkeditor
else
    pkg install -y -qq apkeditor 2>/dev/null || true
fi

log "Pacotes instalados com sucesso"

# ===========================[ ETAPA 2: ZSH ]===========================
header "ETAPA 2/4: CONFIGURAÇÃO ZSH + POWERLEVEL10K"

if [ ! -d ~/.oh-my-zsh ]; then
    info "Instalando Oh-My-Zsh..."
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

if [ ! -d ~/powerlevel10k ]; then
    info "Instalando Powerlevel10k..."
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ~/powerlevel10k
fi

# ZSH plugins
info "Configurando plugins ZSH..."
ZSH_CUSTOM="${ZSH_CUSTOM:-~/.oh-my-zsh/custom}"

[ ! -d ~/.zsh/zsh-autosuggestions ] && git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions ~/.zsh/zsh-autosuggestions
[ ! -d ~/.zsh/zsh-syntax-highlighting ] && git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting ~/.zsh/zsh-syntax-highlighting
[ ! -d ~/.zsh/zsh-autocomplete ] && git clone --depth=1 https://github.com/marlonrichert/zsh-autocomplete ~/.zsh/zsh-autocomplete
[ ! -d ~/.zsh/fzf-tab ] && git clone --depth=1 https://github.com/Aloxaf/fzf-tab ~/.zsh/fzf-tab

# Config files
cp "$REPO_DIR/config/zshrc" ~/.zshrc
cp "$REPO_DIR/config/p10k.zsh" ~/.p10k.zsh
cp "$REPO_DIR/config/termux.properties" ~/.termux/termux.properties

chsh -s zsh 2>/dev/null || true
log "ZSH configurado com sucesso"

# ===========================[ ETAPA 3: MCP SERVER ]===========================
header "ETAPA 3/4: MCP SERVER + 33 FERRAMENTAS"

MCP_DIR="$TERMUX_HOME/android-mcp"

if [ -d "$MCP_DIR" ]; then
    warn "Diretório android-mcp já existe. Fazendo backup..."
    mv "$MCP_DIR" "$MCP_DIR.bak.$(date +%Y%m%d_%H%M%S)"
fi

mkdir -p "$MCP_DIR/bin"

# Copia server e config
cp "$REPO_DIR/server/package.json" "$MCP_DIR/"
cp "$REPO_DIR/server/server.js" "$MCP_DIR/"

# Baixa jars do baksmali/smali
info "Baixando baksmali/smali..."
JCOMMANDER_URL="https://repo1.maven.org/maven2/com/beust/jcommander/1.64/jcommander-1.64.jar"
[ ! -f "$MCP_DIR/bin/jcommander-1.64.jar" ] && curl -sSL "$JCOMMANDER_URL" -o "$MCP_DIR/bin/jcommander-1.64.jar"

info "Instalando dependências npm..."
cd "$MCP_DIR"
npm install --silent 2>&1 | tail -3

# ===========================[ ETAPA 4: SCRIPTS E FERRAMENTAS ]===========================
header "ETAPA 4/4: SCRIPTS CUSTOM E FERRAMENTAS"

BIN_DIR="$TERMUX_HOME/bin"
mkdir -p "$BIN_DIR"

# MCP control script
cp "$REPO_DIR/scripts/mcp_ctl.sh" "$BIN_DIR/mcp"
chmod +x "$BIN_DIR/mcp"

# APKTool
cp "$REPO_DIR/scripts/apktool_wrapper.sh" "$BIN_DIR/apktool"
chmod +x "$BIN_DIR/apktool"

# Baksmali/Smali
cp "$REPO_DIR/scripts/baksmali_wrapper.sh" "$BIN_DIR/baksmali"
cp "$REPO_DIR/scripts/smali_wrapper.sh" "$BIN_DIR/smali"
chmod +x "$BIN_DIR/baksmali" "$BIN_DIR/smali"

# Blutter
cp "$REPO_DIR/scripts/blutter_wrapper.sh" "$BIN_DIR/blutter"
chmod +x "$BIN_DIR/blutter"

# Rish (Shizuku)
cp "$REPO_DIR/scripts/rish_setup.sh" "$BIN_DIR/rish"
chmod +x "$BIN_DIR/rish"

# Debug keystore
keytool -genkey -v \
    -keystore "$TERMUX_HOME/debug.keystore" \
    -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass android -keypass android \
    -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null || true

log "Keystore de debug criado"

# Permissions
chmod +x "$BIN_DIR"/*

# Atualiza PATH via .zshrc (já incluso na config)
export PATH="$BIN_DIR:$PATH"

# ===========================[ FINALIZAÇÃO ]===========================
header "INSTALAÇÃO CONCLUÍDA"

echo -e "${GREEN}"
cat << "DONE"
╔══════════════════════════════════════════════════════╗
║        TERMUX MCP SETUP - INSTALL COMPLETE! 🚀       ║
╚══════════════════════════════════════════════════════╝
DONE
echo -e "${NC}"

echo -e "${BOLD}PRÓXIMOS PASSOS:${NC}"
echo ""
echo -e "  ${CYAN}1.${NC} Reinicie o Termux ou execute: ${YELLOW}source ~/.zshrc${NC}"
echo -e "  ${CYAN}2.${NC} Inicie o servidor MCP:    ${YELLOW}mcp start${NC}"
echo -e "  ${CYAN}3.${NC} Verifique o status:        ${YELLOW}mcp status${NC}"
echo -e "  ${CYAN}4.${NC} Configure o Git:           ${YELLOW}git config --global user.name SEU_NOME${NC}"
echo -e "                                ${YELLOW}git config --global user.email SEU_EMAIL${NC}"
echo ""
echo -e "${BOLD}FERRAMENTAS DISPONÍVEIS:${NC}"
echo -e "  ${GREEN}mcp${NC}          - Controla servidor MCP (start/stop/restart/status/log)"
echo -e "  ${GREEN}apktool${NC}      - Decompile/compile APKs"
echo -e "  ${GREEN}baksmali${NC}     - Decompile DEX → Smali"
echo -e "  ${GREEN}smali${NC}        - Compile Smali → DEX"
echo -e "  ${GREEN}blutter${NC}      - Flutter reverse engineering"
echo -e "  ${GREEN}rish${NC}         - Shell ADB via Shizuku"
echo -e "  ${GREEN}jadx${NC}          - Decompile APK → Java"
echo -e "  ${GREEN}r2${NC}            - Radare2 binary analysis"
echo ""
echo -e "  ${BLUE}Servidor MCP: http://127.0.0.1:3000/mcp${NC}"
echo -e "  ${BLUE}33 Ferramentas expostas via MCP${NC}"
echo ""

