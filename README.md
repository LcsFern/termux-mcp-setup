# 🚀 Termux MCP Setup

**One-Command Installer** para transformar seu Termux em uma estação completa de engenharia reversa Android com servidor MCP integrado.

```bash
# Instalação completa (tudo em 1 comando):
curl -sSL https://raw.githubusercontent.com/LcsFern/termux-mcp-setup/main/install.sh | bash
```

---

## 📦 O que está incluído?

### 🖥️ 33 Ferramentas MCP (Model Context Protocol)

| Categoria | Ferramentas |
|-----------|-------------|
| **Termux Core** | `ping`, `get_battery`, `list_directory`, `read_file`, `execute_command` |
| **Shizuku/ADB** | `shizuku_execute`, `logcat_crash`, `install_and_test` |
| **APK Tools** | `apktool`, `apkeditor`, `sign_align_apk`, `apk_diff`, `manifest_edit`, `resource_value_edit` |
| **DEX/Smali** | `baksmali_decompile`, `smali_compile`, `smali_patch`, `dex_method_extract`, `dex_info`, `dex2jar` |
| **Reverse Engineering** | `jadx`, `procyon`, `radare2`, `blutter`, `elf_analyze`, `native_symbol_find` |
| **Binary Patching** | `hex_patch`, `zip_repack`, `zip_entry_extract`, `zip_entry_replace` |
| **Automation** | `patch_frida`, `ai_agent` |

### 🛠️ Ambiente Completo

- **ZSH** + Oh-My-Zsh + Powerlevel10k (tema rainbow)
- **Plugins**: autosuggestions, syntax-highlighting, autocomplete, fzf-tab
- **Aliases** inteligentes para produtividade
- **Ferramentas CLI**: eza, bat, fzf, fastfetch, micro, htop, ripgrep, fd

### 🔧 Ferramentas de Linha de Comando

- `mcp` - Controlador do servidor MCP (start/stop/restart/status/log)
- `apktool` - Decompile/compile APKs
- `baksmali` - DEX → Smali
- `smali` - Smali → DEX
- `blutter` - Flutter reverse engineering
- `rish` - Shell ADB via Shizuku
- `jadx` - APK → Java
- `r2` - Radare2 análise binária
- `d2j-dex2jar` - DEX → JAR

---

## 📋 Pré-requisitos

1. **Termux** instalado via [F-Droid](https://f-droid.org/packages/com.termux/) (não use Play Store!)
2. **~2GB** de espaço livre
3. Conexão com internet para baixar pacotes
4. **Opcional**: [Termux:API](https://f-droid.org/packages/com.termux.api/), [Shizuku](https://shizuku.rikka.app/)

---

## 🚀 Instalação

### Opção 1: Instalação direta (recomendada)

```bash
curl -sSL https://raw.githubusercontent.com/LcsFern/termux-mcp-setup/main/install.sh | bash
```

### Opção 2: Clone + instalação manual

```bash
git clone https://github.com/LcsFern/termux-mcp-setup.git
cd termux-mcp-setup
bash install.sh
```

---

## 🎮 Uso

### Servidor MCP

```bash
mcp start      # Inicia o servidor
mcp status     # Verifica status
mcp stop       # Para o servidor
mcp restart    # Reinicia
mcp log        # Logs em tempo real
```

### Endpoint MCP

```
http://127.0.0.1:3000/mcp
```

Use esta URL no **RikkaHub**, **HikkaHub** ou qualquer cliente MCP compatível.

### Configuração Adicional

```bash
# Git
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# GitHub CLI (opcional)
pkg install gh
gh auth login

# Shizuku (requer app Shizuku instalado)
# 1. Instale o Shizuku pelo Google Play/F-Droid
# 2. Inicie o Shizuku (requer ADB ou root)
# 3. Extraia o rish_shizuku.dex para ~/bin/
```

---

## 📁 Estrutura do Projeto

```
termux-mcp-setup/
├── install.sh              # Instalador principal
├── README.md               # Documentação
├── .gitignore
├── config/
│   ├── zshrc               # Configuração ZSH
│   ├── p10k.zsh            # Tema Powerlevel10k (rainbow)
│   └── termux.properties   # Configurações do Termux
├── scripts/
│   ├── mcp_ctl.sh          # Controlador do servidor MCP
│   ├── apktool_wrapper.sh  # Wrapper APKTool
│   ├── baksmali_wrapper.sh # Wrapper baksmali
│   ├── smali_wrapper.sh    # Wrapper smali
│   ├── blutter_wrapper.sh  # Wrapper Blutter
│   └── rish_setup.sh       # Shizuku shell
└── server/
    ├── package.json        # Dependências Node.js
    └── server.js           # Servidor MCP (33 ferramentas)
```

---

## ⚠️ Notas

- **Android 7+** recomendado
- **Não use a versão da Play Store** do Termux (está desatualizada)
- Após cada patch de APK, **reassine** com `sign_align_apk` ou `apksigner`
- O servidor MCP roda na porta **3000**
- Para acessar storage: `termux-setup-storage`

---

## 📝 Licença

MIT - Veja o arquivo [LICENSE](LICENSE)

---

⭐ **Star este repo** se ele te ajudou!

Feito com 💜 por [@LcsFern](https://github.com/LcsFern)
