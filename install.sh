#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
#  TERMUX MCP SETUP - Instalador Completo (One Command)
#  Repo: https://github.com/LcsFern/termux-mcp-setup
#  Uso: curl -sSL <raw_url>/install.sh | bash
#  ou:  git clone <repo> && cd termux-mcp-setup && bash install.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'

TERMUX_HOME="/data/data/com.termux/files/home"
TERMUX_PREFIX="/data/data/com.termux/files/usr"
REPO_URL="https://github.com/LcsFern/termux-mcp-setup"
REPO_TARBALL_URL="${REPO_URL}/archive/refs/heads/main.tar.gz"

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
║            TERMUX MCP SETUP v1.1                     ║
║     Android Reverse Engineering Environment          ║
║     MCP Server + 33 Ferramentas + ZSH Custom         ║
╚══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

# ===========================[ CHECKS + DETECÇÃO DO REPO ]===========================
header "VERIFICAÇÕES INICIAIS"

if [ ! -d "$TERMUX_PREFIX" ]; then
    err "Este script só funciona no Termux! Saindo."
    exit 1
fi

# Descobre onde estão os arquivos do repositório.
# Quando rodado via `curl | bash`, $0 é "bash" e não há arquivos locais;
# nesse caso baixamos o repositório automaticamente.
SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
REPO_DIR="$(cd "$(dirname "$SCRIPT_PATH")" 2>/dev/null && pwd)"

if [ ! -f "$REPO_DIR/install.sh" ] || [ ! -d "$REPO_DIR/config" ] || [ ! -d "$REPO_DIR/server" ] || [ ! -d "$REPO_DIR/scripts" ]; then
    warn "Executando via pipe (curl|bash). Baixando o repositório..."
    REPO_DIR="$TERMUX_HOME/.termux-mcp-setup"
    TARBALL="/tmp/termux-mcp-setup.tar.gz"
    curl -fsSL "$REPO_TARBALL_URL" -o "$TARBALL"
    rm -rf "$REPO_DIR"
    mkdir -p "$REPO_DIR"
    tar -xzf "$TARBALL" -C "$REPO_DIR" --strip-components=1
    rm -f "$TARBALL"
    log "Repositório extraído em: $REPO_DIR"
fi

# Storage
if [ ! -d "$TERMUX_HOME/storage" ]; then
    info "Solicitando acesso ao storage (aceite o popup do Android)..."
    termux-setup-storage 2>/dev/null || true
fi

log "Termux detectado: $(termux-info 2>/dev/null | grep TERMUX_VERSION | head -1 | cut -d= -f2 || echo 'desconhecido')"

# ===========================[ ETAPA 1: PACOTES ]===========================
header "ETAPA 1/5: INSTALAÇÃO DE PACOTES"

info "Atualizando repositórios (isso pode demorar)..."
pkg update -y || warn "pkg update falhou; continuando mesmo assim..."

PACKAGES=(
    git curl wget tar unzip
    nodejs-lts python golang
    build-essential clang cmake binutils patchelf pkg-config ninja
    openjdk-21
    zsh eza bat fzf fastfetch micro htop
    openssh openssl-tool cronie termux-api termux-services
    android-tools apksigner d8
    jadx dex2jar radare2 capstone
    file findutils grep sed gawk less
    bzip2 xz-utils p7zip zip unzip
    proot proot-distro
    ffmpeg imagemagick
    python-pip python-lxml
    dos2unix tree ncdu ripgrep fd
    neofetch screen tmux
)

info "Instalando pacotes (tentativa em lote)..."
FAILED_PKGS=()
if ! pkg install -y "${PACKAGES[@]}" 2>/tmp/pkg_bulk.err; then
    warn "Instalação em lote falhou. Tentando pacote por pacote..."
    for p in "${PACKAGES[@]}"; do
        if pkg install -y "$p" >/dev/null 2>&1; then
            : # ok
        else
            FAILED_PKGS+=("$p")
        fi
    done
fi

# TUR repo (para apkeditor)
if pkg list-installed 2>/dev/null | grep -q "^tur-repo/" || grep -rqs "tur.kcubeterm.com" "$TERMUX_PREFIX/etc/apt/sources.list.d/" 2>/dev/null; then
    : # já tem o repo
else
    info "Adicionando repositório TUR (apkeditor)..."
    pkg install -y tur-repo >/dev/null 2>&1 || true
    pkg update -y >/dev/null 2>&1 || true
fi
pkg install -y apkeditor >/dev/null 2>&1 || warn "apkeditor não instalado (opcional)"

if [ ${#FAILED_PKGS[@]} -gt 0 ]; then
    warn "Pacotes NÃO instalados (não crítico): ${FAILED_PKGS[*]}"
fi
log "Etapa de pacotes concluída"

# ===========================[ ETAPA 2: ZSH ]===========================
header "ETAPA 2/5: CONFIGURAÇÃO ZSH + POWERLEVEL10K"

if [ ! -d "$TERMUX_HOME/.oh-my-zsh" ]; then
    info "Instalando Oh-My-Zsh..."
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended || warn "Falha ao instalar Oh-My-Zsh"
fi

ZSH_CUSTOM="${ZSH_CUSTOM:-$TERMUX_HOME/.oh-my-zsh/custom}"

# Powerlevel10k DEVE ficar em $ZSH_CUSTOM/themes para o ZSH_THEME funcionar
if [ ! -d "$ZSH_CUSTOM/themes/powerlevel10k" ]; then
    info "Instalando Powerlevel10k..."
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$ZSH_CUSTOM/themes/powerlevel10k" || warn "Falha ao clonar powerlevel10k"
fi

# ZSH plugins
info "Configurando plugins ZSH..."
[ -d "$TERMUX_HOME/.zsh/zsh-autosuggestions" ]     || git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions "$TERMUX_HOME/.zsh/zsh-autosuggestions" || true
[ -d "$TERMUX_HOME/.zsh/zsh-syntax-highlighting" ] || git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting "$TERMUX_HOME/.zsh/zsh-syntax-highlighting" || true
[ -d "$TERMUX_HOME/.zsh/zsh-autocomplete" ]        || git clone --depth=1 https://github.com/marlonrichert/zsh-autocomplete "$TERMUX_HOME/.zsh/zsh-autocomplete" || true
[ -d "$TERMUX_HOME/.zsh/fzf-tab" ]                 || git clone --depth=1 https://github.com/Aloxaf/fzf-tab "$TERMUX_HOME/.zsh/fzf-tab" || true

# Config files
mkdir -p "$TERMUX_HOME/.termux"
cp "$REPO_DIR/config/zshrc" "$TERMUX_HOME/.zshrc"
cp "$REPO_DIR/config/p10k.zsh" "$TERMUX_HOME/.p10k.zsh"
cp "$REPO_DIR/config/termux.properties" "$TERMUX_HOME/.termux/termux.properties"
termux-reload-settings 2>/dev/null || true

chsh -s zsh 2>/dev/null || warn "Não foi possível definir zsh como padrão (normal no Termux)"
log "ZSH configurado com sucesso"

# ===========================[ ETAPA 3: MCP SERVER ]===========================
header "ETAPA 3/5: MCP SERVER + 33 FERRAMENTAS"

MCP_DIR="$TERMUX_HOME/android-mcp"

if [ -d "$MCP_DIR" ]; then
    warn "Diretório android-mcp já existe. Fazendo backup..."
    mv "$MCP_DIR" "$MCP_DIR.bak.$(date +%Y%m%d_%H%M%S)"
fi

mkdir -p "$MCP_DIR/bin"

cp "$REPO_DIR/server/package.json" "$MCP_DIR/"
cp "$REPO_DIR/server/server.js" "$MCP_DIR/"

info "Baixando jcommander (baksmali/smali)..."
[ -f "$MCP_DIR/bin/jcommander-1.64.jar" ] || curl -sSL "https://repo1.maven.org/maven2/com/beust/jcommander/1.64/jcommander-1.64.jar" -o "$MCP_DIR/bin/jcommander-1.64.jar" || warn "Falha ao baixar jcommander"

info "Instalando dependências npm..."
cd "$MCP_DIR"
npm install --no-audit --no-fund || warn "Falha ao instalar dependências npm (verifique a conexão)"

# ===========================[ ETAPA 4: SCRIPTS E FERRAMENTAS ]===========================
header "ETAPA 4/5: SCRIPTS CUSTOM E FERRAMENTAS"

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

# Frida patcher (usado pela ferramenta MCP patch_frida)
cp "$REPO_DIR/scripts/frida_patcher.py" "$BIN_DIR/frida_patcher.py"
chmod +x "$BIN_DIR/frida_patcher.py"

# Rish (Shizuku)
cp "$REPO_DIR/scripts/rish_setup.sh" "$BIN_DIR/rish"
chmod +x "$BIN_DIR/rish"

# Blutter (clone + dependências)
if [ ! -d "$TERMUX_HOME/blutter" ]; then
    info "Clonando Blutter (pode demorar)..."
    git clone --depth=1 https://github.com/worawit/blutter "$TERMUX_HOME/blutter" || warn "Falha ao clonar blutter"
fi

PIP_BIN="$(command -v pip || command -v pip3 || true)"
if [ -n "$PIP_BIN" ]; then
    info "Instalando dependências Python do Blutter..."
    "$PIP_BIN" install --no-input pyelftools requests capstone 2>/dev/null || warn "Falha ao instalar deps do blutter (opcional)"
fi

# Debug keystore
if command -v keytool >/dev/null 2>&1; then
    keytool -genkey -v \
        -keystore "$TERMUX_HOME/debug.keystore" \
        -alias androiddebugkey \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass android -keypass android \
        -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null || true
    log "Keystore de debug criado"
else
    warn "keytool não encontrado (openjdk-21 não instalado?). Keystore não gerado."
fi

chmod +x "$BIN_DIR"/* 2>/dev/null || true

log "Scripts e ferramentas instalados"

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

