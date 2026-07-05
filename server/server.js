// server.js
// MCP básico para uso com RikkaHub/HikkaHub no Termux

import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { z } from "zod";

const execPromise = promisify(exec);

const app = express();
app.use(express.json());

/**
 * Cria e configura uma nova instância do servidor MCP com todas as ferramentas.
 */
function createMcpServer() {
    const server = new McpServer({
        name: "android-mcp",
        version: "1.0.0"
    });

    // --- Ferramentas ---

    // 1. Ping
    server.tool(
        "ping",
        "Teste de comunicação MCP",
        {},
        async () => {
            return {
                content: [{ type: "text", text: "Pong do Termux" }]
            };
        }
    );

    // 2. Status da Bateria (Termux API)
    server.tool(
        "get_battery",
        "Obtém o status da bateria do dispositivo (requer Termux:API)",
        {},
        async () => {
            try {
                const { stdout } = await execPromise("termux-battery-status");
                return {
                    content: [{ type: "text", text: stdout }]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao acessar Termux API: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 3. Listar Diretório
    server.tool(
        "list_directory",
        "Lista os arquivos de um diretório no Termux",
        {
            path: z.string().describe("Caminho absoluto ou relativo do diretório")
        },
        async ({ path }) => {
            try {
                const files = await fs.readdir(path);
                return {
                    content: [{ type: "text", text: files.join("\n") }]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao listar diretório: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 4. Ler Arquivo
    server.tool(
        "read_file",
        "Lê o conteúdo de um arquivo no Termux",
        {
            path: z.string().describe("Caminho do arquivo")
        },
        async ({ path }) => {
            try {
                const content = await fs.readFile(path, "utf-8");
                return {
                    content: [{ type: "text", text: content }]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao ler arquivo: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 5. Executar Comando
    server.tool(
        "execute_command",
        "Executa um comando shell no Termux",
        {
            command: z.string().describe("O comando a ser executado")
        },
        async ({ command }) => {
            try {
                const { stdout, stderr } = await execPromise(command);
                return {
                    content: [
                        { type: "text", text: "STDOUT:\n" + stdout },
                        { type: "text", text: "STDERR:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar comando: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 6. Executar Comando via Shizuku (ADB)
    server.tool(
        "shizuku_execute",
        "Executa um comando shell com privilégios de ADB via Shizuku (rish). Permite interagir com o sistema Android além do sandbox do Termux (ex: pm, am, settings, etc).",
        {
            command: z.string().describe("O comando a ser executado via rish")
        },
        async ({ command }) => {
            try {
                // Tenta localizar o rish na home do usuário
                const rishPath = "/data/data/com.termux/files/home/bin/rish";
                const fullCommand = `${rishPath} -c "${command.replace(/"/g, '\\"')}"`;
                const { stdout, stderr } = await execPromise(fullCommand);
                return {
                    content: [
                        { type: "text", text: "STDOUT:\n" + stdout },
                        { type: "text", text: "STDERR:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar via Shizuku: " + err.message + "\nCertifique-se que o Shizuku está rodando e o Termux está autorizado." }],
                    isError: true
                };
            }
        }
    );

    // 7. Agente de IA (Antigravity CLI)
    server.tool(
        "ai_agent",
        "Invoca o Antigravity CLI (AGY), seu agente de IA especialista em engenharia de software. Use para tarefas complexas de codificação, pesquisa ou automação que exijam raciocínio avançado.",
        {
            prompt: z.string().describe("O pedido/instrução para o Agente de IA"),
            yolo: z.boolean().optional().default(false).describe("Se verdadeiro, o Agente executará ações sem pedir confirmação (use com cuidado!)")
        },
        async ({ prompt, yolo }) => {
            try {
                const yoloFlag = yolo ? " --dangerously-skip-permissions" : "";
                const command = `agy${yoloFlag} -p "${prompt.replace(/"/g, '\\"')}"`;
                const { stdout, stderr } = await execPromise(command);
                return {
                    content: [
                        { type: "text", text: "Resultado do Agente de IA (Antigravity):\n" + stdout },
                        { type: "text", text: "Logs/Erro:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao invocar Agente de IA: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 8. Blutter (Flutter Reverse Engineering)
    server.tool(
        "blutter",
        "Executa o Blutter para engenharia reversa de aplicativos Flutter (Android arm64).",
        {
            indir: z.string().describe("Caminho para o APK ou diretório que contém libapp.so e libflutter.so"),
            outdir: z.string().describe("Diretório de saída para os arquivos resultantes"),
            rebuild: z.boolean().optional().default(false).describe("Forçar a reconstrução do executável do Blutter")
        },
        async ({ indir, outdir, rebuild }) => {
            try {
                const rebuildFlag = rebuild ? " --rebuild" : "";
                const command = `blutter ${indir} ${outdir}${rebuildFlag}`;
                const { stdout, stderr } = await execPromise(command);
                return {
                    content: [
                        { type: "text", text: "Resultado do Blutter:\n" + stdout },
                        { type: "text", text: "Logs/Avisos:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar Blutter: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 9. Radare2 (Reverse Engineering Framework)
    server.tool(
        "radare2",
        "Executa comandos do Radare2 (r2) para análise de binários.",
        {
            file: z.string().describe("Caminho do binário para analisar"),
            commands: z.string().describe("Comandos do r2 para executar (ex: 'aaa; afl; pdf @ main')"),
            isWrite: z.boolean().optional().default(false).describe("Abrir o arquivo em modo de escrita (-w)")
        },
        async ({ file, commands, isWrite }) => {
            try {
                const writeFlag = isWrite ? " -w" : "";
                // Usa -q para rodar os comandos e sair, -c para passar os comandos
                const fullCommand = `r2${writeFlag} -q -c "${commands.replace(/"/g, '\\"')}" "${file}"`;
                const { stdout, stderr } = await execPromise(fullCommand);
                return {
                    content: [
                        { type: "text", text: "Saída do Radare2:\n" + stdout },
                        { type: "text", text: "Avisos/Erros:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar Radare2: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 10. Apktool (Decompile/Build)
    server.tool(
        "apktool",
        "Usa o Apktool para decolonial (decode) ou construir (build) APKs.",
        {
            action: z.enum(["decode", "build"]).describe("Ação a ser executada: decode (d) ou build (b)"),
            input: z.string().describe("Arquivo APK de entrada (para decode) ou diretório (para build)"),
            output: z.string().optional().describe("Diretório/Arquivo de saída"),
            extraArgs: z.string().optional().default("").describe("Argumentos extras para o apktool")
        },
        async ({ action, input, output, extraArgs }) => {
            try {
                const cmdLetter = action === "decode" ? "d" : "b";
                const outFlag = output ? ` -o "${output}"` : "";
                const command = `apktool ${cmdLetter} "${input}"${outFlag} ${extraArgs}`;
                const { stdout, stderr } = await execPromise(command);
                return {
                    content: [
                        { type: "text", text: "Resultado do Apktool:\n" + stdout },
                        { type: "text", text: "Logs:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar Apktool: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 11. JADX (Decompiler)
    server.tool(
        "jadx",
        "Usa o JADX para descompilar APK/DEX/JAR para código Java.",
        {
            input: z.string().describe("Arquivo de entrada (APK, DEX, JAR, etc)"),
            outDir: z.string().describe("Diretório de saída para o código fonte"),
            noRes: z.boolean().optional().default(false).describe("Não descompilar recursos"),
            extraArgs: z.string().optional().default("").describe("Argumentos extras para o jadx")
        },
        async ({ input, outDir, noRes, extraArgs }) => {
            try {
                const resFlag = noRes ? " --no-res" : "";
                const command = `jadx -d "${outDir}"${resFlag} ${extraArgs} "${input}"`;
                const { stdout, stderr } = await execPromise(command);
                return {
                    content: [
                        { type: "text", text: "Resultado do JADX:\n" + stdout },
                        { type: "text", text: "Logs:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar JADX: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 12. Dex2Jar
    server.tool(
        "dex2jar",
        "Converte arquivos DEX/APK para JAR.",
        {
            input: z.string().describe("Arquivo de entrada (.dex ou .apk)"),
            output: z.string().optional().describe("Arquivo JAR de saída")
        },
        async ({ input, output }) => {
            try {
                const outFlag = output ? ` -o "${output}"` : "";
                // O comando pode ser d2j-dex2jar no Termux
                const command = `d2j-dex2jar "${input}"${outFlag}`;
                const { stdout, stderr } = await execPromise(command);
                return {
                    content: [
                        { type: "text", text: "Resultado do Dex2Jar:\n" + stdout },
                        { type: "text", text: "Logs:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar Dex2Jar: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 13. APKEditor
    server.tool(
        "apkeditor",
        "Usa o APKEditor para editar recursos, fazer merge de split APKs ou refatorar.",
        {
            command: z.enum(["decode", "build", "merge", "refactor", "protect", "info"]).describe("Comando do APKEditor"),
            input: z.string().describe("Arquivo ou diretório de entrada"),
            output: z.string().optional().describe("Arquivo ou diretório de saída"),
            extraArgs: z.string().optional().default("").describe("Argumentos extras")
        },
        async ({ command, input, output, extraArgs }) => {
            try {
                const cmdLetter = command.charAt(0);
                const inFlag = command !== "info" ? ` -i "${input}"` : ` "${input}"`;
                const outFlag = output ? ` -o "${output}"` : "";
                const fullCommand = `apkeditor ${cmdLetter}${inFlag}${outFlag} ${extraArgs}`;
                const { stdout, stderr } = await execPromise(fullCommand);
                return {
                    content: [
                        { type: "text", text: `Resultado do APKEditor (${command}):\n` + stdout },
                        { type: "text", text: "Logs:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar APKEditor: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 14. Sign & Align
    server.tool(
        "sign_align_apk",
        "Realiza o Zipalign e assina um APK.",
        {
            input: z.string().describe("APK de entrada (não alinhado/não assinado)"),
            output: z.string().describe("APK de saída (alinhado e assinado)"),
            keystore: z.string().optional().describe("Caminho do keystore (opcional, usa debug se omitido)"),
            ksPass: z.string().optional().default("android").describe("Senha do keystore"),
            alias: z.string().optional().default("androiddebugkey").describe("Alias da chave")
        },
        async ({ input, output, keystore, ksPass, alias }) => {
            try {
                const tmpAligned = output + ".aligned.tmp";
                
                // 1. Zipalign
                const alignCmd = `zipalign -f -v 4 "${input}" "${tmpAligned}"`;
                const alignRes = await execPromise(alignCmd);

                // 2. Sign
                const ksPath = keystore || "/data/data/com.termux/files/home/debug.keystore";
                // Verifica se o keystore existe, se não usa um padrão ou informa erro
                const signCmd = `apksigner sign --ks "${ksPath}" --ks-pass "pass:${ksPass}" --ks-key-alias "${alias}" --out "${output}" "${tmpAligned}"`;
                const signRes = await execPromise(signCmd);

                // Limpa temp
                await fs.unlink(tmpAligned).catch(() => {});

                return {
                    content: [
                        { type: "text", text: "Zipalign:\n" + alignRes.stdout },
                        { type: "text", text: "Signing:\n" + signRes.stdout }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro no processo de sign/align: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 15. Procyon Decompiler
    server.tool(
        "procyon",
        "Usa o Procyon para descompilar arquivos .class ou .jar.",
        {
            input: z.string().describe("Arquivo de entrada (.class ou .jar)"),
            output: z.string().describe("Diretório de saída para o código descompilado")
        },
        async ({ input, output }) => {
            try {
                const command = `procyon-decompiler -o "${output}" "${input}"`;
                const { stdout, stderr } = await execPromise(command);
                return {
                    content: [
                        { type: "text", text: "Resultado do Procyon:\n" + stdout },
                        { type: "text", text: "Logs:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao executar Procyon: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 16. Frida Patcher (No-Root)
    server.tool(
        "patch_frida",
        "Injeta o Frida Gadget em um APK para permitir instrumentação em dispositivos sem root.",
        {
            input: z.string().describe("Caminho do APK original"),
            output: z.string().describe("Caminho para o APK patcheado de saída")
        },
        async ({ input, output }) => {
            try {
                const command = `python3 /data/data/com.termux/files/home/bin/frida_patcher.py "${input}" "${output}"`;
                const { stdout, stderr } = await execPromise(command);
                return {
                    content: [
                        { type: "text", text: "Resultado da Injeção Frida:\n" + stdout },
                        { type: "text", text: "Logs:\n" + stderr }
                    ]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro ao injetar Frida: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 17. Baksmali Decompile (DEX -> Smali)
    server.tool(
        "baksmali_decompile",
        "Decompila um arquivo DEX (extraido do APK) para Smali. Usa baksmali 3.0.9 via jadx. Para uso com o Pipeline Cirurgico Python (Skill 2.7).",
        {
            dex: z.string().describe("Caminho do arquivo .dex a ser decompilado"),
            outDir: z.string().describe("Diretorio de saida para os arquivos .smali"),
            classes: z.string().optional().describe("Filtro opcional: decompilar apenas classes que contenham esta string (ex: 'Lcom/pairip/')")
        },
        async ({ dex, outDir, classes }) => {
            try {
                const cp = [
                    "/data/data/com.termux/files/home/android-mcp/bin/jcommander-1.64.jar",
                    "/data/data/com.termux/files/usr/share/java/jadx-1.5.5-all.jar"
                ].join(":");
                
                let cmd = `java -cp "${cp}" com.android.tools.smali.baksmali.Main d "${dex}" -o "${outDir}"`;
                const { stdout, stderr } = await execPromise(cmd);
                
                // Conta classes geradas
                let count = 0;
                try {
                    const files = await fs.readdir(outDir, { recursive: true });
                    count = files.filter(f => f.endsWith('.smali')).length;
                } catch {}
                
                // Se tem filtro, lista apenas as relevantes
                let filteredInfo = "";
                if (classes) {
                    try {
                        const { stdout: grepOut } = await execPromise(
                            `find "${outDir}" -name "*.smali" | xargs grep -l "${classes}" 2>/dev/null | head -20`
                        );
                        filteredInfo = "\nClasses filtradas (" + classes + "):\n" + grepOut;
                    } catch {}
                }
                
                return {
                    content: [{
                        type: "text",
                        text: `Decompilado: ${dex} -> ${outDir}\nTotal classes: ${count}\n${filteredInfo}\n---\n${stdout}\n${stderr}`
                    }]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro no baksmali: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 19. Smali Compile (Smali -> DEX)
    server.tool(
        "smali_compile",
        "Compila arquivos Smali de volta para um arquivo DEX. Usa smali 3.0.9 via jadx. Para uso com o Pipeline Cirurgico Python (Skill 2.7).",
        {
            smaliDir: z.string().describe("Diretorio contendo os arquivos .smali"),
            outDex: z.string().describe("Caminho de saida para o arquivo .dex compilado"),
            apiLevel: z.number().optional().default(24).describe("API level alvo (default: 24)")
        },
        async ({ smaliDir, outDex, apiLevel }) => {
            try {
                const cp = [
                    "/data/data/com.termux/files/home/android-mcp/bin/jcommander-1.64.jar",
                    "/data/data/com.termux/files/usr/share/java/jadx-1.5.5-all.jar"
                ].join(":");
                
                const cmd = `java -cp "${cp}" com.android.tools.smali.smali.Main a "${smaliDir}" -o "${outDex}" --api ${apiLevel}`;
                const { stdout, stderr } = await execPromise(cmd);
                
                let size = 0;
                try {
                    const stat = await fs.stat(outDex);
                    size = stat.size;
                } catch {}
                
                return {
                    content: [{
                        type: "text",
                        text: `Compilado: ${smaliDir} -> ${outDex}\nTamanho: ${(size/1024).toFixed(1)} KB\n---\n${stdout}\n${stderr}`
                    }]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro no smali: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 20. Smali Patch (String Replace Cirurgico)
    server.tool(
        "smali_patch",
        "Aplica substituicao de string em arquivos .smali de forma cirurgica. Substitui metodos completos (oldMethod -> newMethod) sem regex amplo. Para uso com o Pipeline Cirurgico Python (Skill 2.7).",
        {
            smaliFile: z.string().describe("Caminho do arquivo .smali a ser modificado"),
            oldMethod: z.string().describe("Metodo original COMPLETO (copia exata do .smali)"),
            newMethod: z.string().describe("Metodo modificado COMPLETO (substituto exato)")
        },
        async ({ smaliFile, oldMethod, newMethod }) => {
            try {
                let content = await fs.readFile(smaliFile, "utf-8");
                
                if (!content.includes(oldMethod)) {
                    return {
                        content: [{ type: "text", text: "AVISO: Metodo antigo nao encontrado no arquivo. Verifique se a copia esta exata (espacos, quebras de linha, etc)." }],
                        isError: true
                    };
                }
                
                // Backup automatico
                await fs.writeFile(smaliFile + ".bak", content);
                
                // Substituicao cirurgica
                const newContent = content.replace(oldMethod, newMethod);
                await fs.writeFile(smaliFile, newContent);
                
                return {
                    content: [{
                        type: "text",
                        text: `Patch aplicado com sucesso!\nArquivo: ${smaliFile}\nBackup: ${smaliFile}.baknTamanho original: ${content.length} chars\nTamanho novo: ${newContent.length} chars`
                    }]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro no smali_patch: " + err.message }],
                    isError: true
                };
            }
        }
    );

    // 21. ZIP Repack (Preservando Compressao)
    server.tool(
        "zip_repack",
        "Reempacota um APK preservando a compressao original de cada entrada ZIP. Critico para apps com extractNativeLibs='false' (libs .so devem ser STORE).",
        {
            extractedDir: z.string().describe("Diretorio com o conteudo extraido do APK"),
            originalApk: z.string().describe("Caminho do APK original (para mapear compressao)"),
            outputApk: z.string().describe("Caminho de saida para o APK reempacotado")
        },
        async ({ extractedDir, originalApk, outputApk }) => {
            try {
                // Usa Python para o repack (zipfile nativo)
                const script = `
import zipfile, os, sys

extracted = "${extractedDir}"
original = "${originalApk}"
output = "${outputApk}"

# Mapeia compressao original
compress_map = {}
with zipfile.ZipFile(original, 'r') as z:
    for info in z.infolist():
        compress_map[info.filename] = info.compress_type

with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zout:
    for root, dirs, files in os.walk(extracted):
        for fname in files:
            if fname.endswith('.bak') or 'classes.dex.orig' in fname:
                continue
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, extracted)
            
            compress = compress_map.get(rel, zipfile.ZIP_DEFLATED)
            # Forca STORE para libs nativas e arquivos criticos
            if (rel.startswith('lib/') and rel.endswith('.so')) or \
               rel in ['resources.arsc', 'AndroidManifest.xml']:
                compress = zipfile.ZIP_STORED
            
            zout.write(full, rel, compress_type=compress)

size_mb = os.path.getsize(output) / (1024 * 1024)
print(f'APK built: {output} ({size_mb:.1f} MB)')
print(f'Entries: {len(compress_map)}')
`
                const { stdout, stderr } = await execPromise(`python3 -c "${script.replace(/"/g, '\\"')}"`);
                
                return {
                    content: [{
                        type: "text",
                        text: `Reempacotado com sucesso!\n${stdout}\n${stderr}`
                    }]
                };
            } catch (err) {
                return {
                    content: [{ type: "text", text: "Erro no zip_repack: " + err.message }],
                    isError: true
                };
            }
        }
    );


    // ========== NOVAS FERRAMENTAS CIRURGICAS V6.0 ==========

    // 22. ZIP Entry Extract — Extrai UMA entrada do APK sem extrair tudo
    server.tool(
        "zip_entry_extract",
        "Extrai uma unica entrada de um arquivo ZIP/APK sem extrair o resto. Retorna o caminho do arquivo extraido em /tmp. Use isso ao inves de extrair o APK inteiro quando so precisa de 1 arquivo (ex: classes.dex, lib.so, AndroidManifest.xml).",
        {
            apkPath: z.string().describe("Caminho do APK/ZIP"),
            entryPath: z.string().describe("Caminho da entrada dentro do ZIP (ex: 'classes2.dex', 'lib/arm64-v8a/libfoo.so')"),
            outPath: z.string().optional().describe("Caminho de saida (opcional, default: /tmp/<basename>)")
        },
        async ({ apkPath, entryPath, outPath }) => {
            try {
                const script = `
import zipfile, os, shutil

apk = "${apkPath}"
entry = "${entryPath}"
out = "${outPath}" if "${outPath}" else os.path.join("/data/data/com.termux/files/home/tmp", os.path.basename(entry))

with zipfile.ZipFile(apk, 'r') as z:
    data = z.read(entry)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'wb') as f:
        f.write(data)

print(f"Extraido: {entry} ({len(data)} bytes) -> {out}")
print(f"Tipo: STORE" if z.getinfo(entry).compress_type == 0 else f"Tipo: DEFLATED (ratio {z.getinfo(entry).compress_size}/{z.getinfo(entry).file_size})")
`;
                const { stdout } = await execPromise(`python3 -c "${script.replace(/"/g, '\\"')}"`);
                return { content: [{ type: "text", text: stdout }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no zip_entry_extract: " + err.message }], isError: true };
            }
        }
    );

    // 23. ZIP Entry Replace — Substitui UMA entrada no APK sem reempacotar tudo
    server.tool(
        "zip_entry_replace",
        "Substitui uma unica entrada em um APK/ZIP existente. Preserva TODAS as outras entradas e suas compressoes intactas. Critico para patches cirurgicos onde so 1 arquivo mudou.",
        {
            apkPath: z.string().describe("Caminho do APK/ZIP a ser modificado"),
            entryPath: z.string().describe("Caminho da entrada a substituir (ex: 'classes.dex')"),
            newFilePath: z.string().describe("Caminho do novo arquivo que substituira a entrada"),
            outputApk: z.string().optional().describe("APK de saida (opcional, default: sobrescreve o original)")
        },
        async ({ apkPath, entryPath, newFilePath, outputApk }) => {
            try {
                const outApk = outputApk || apkPath;
                const script = `
import zipfile, os, shutil

apk = "${apkPath}"
entry = "${entryPath}"
new_file = "${newFilePath}"
output = "${outApk}"

# Se output == input, usa arquivo temporario
tmp_out = output + ".tmp.zip" if output == apk else output

with zipfile.ZipFile(apk, 'r') as zin:
    with zipfile.ZipFile(tmp_out, 'w', zipfile.ZIP_DEFLATED) as zout:
        replaced = False
        for item in zin.infolist():
            if item.filename == entry:
                zout.write(new_file, entry, compress_type=item.compress_type)
                replaced = True
            else:
                zout.writestr(item, zin.read(item.filename))
        
        if not replaced:
            print(f"AVISO: Entrada '{entry}' nao encontrada no APK. Adicionando como nova.")
            zout.write(new_file, entry, compress_type=zipfile.ZIP_DEFLATED)

if output == apk:
    os.replace(tmp_out, output)
    print(f"APK atualizado in-place: {output}")
else:
    print(f"APK gerado: {output}")

print(f"Entrada substituida: {entry}")
print(f"Tamanho final: {os.path.getsize(output)} bytes")
`;
                const { stdout } = await execPromise(`python3 -c "${script.replace(/"/g, '\\"')}"`);
                return { content: [{ type: "text", text: stdout }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no zip_entry_replace: " + err.message }], isError: true };
            }
        }
    );

    // 24. DEX Method Extract — Extrai 1 metodo de 1 DEX sem decompilar o DEX inteiro
    server.tool(
        "dex_method_extract",
        "Extrai um unico metodo Smali de um arquivo DEX sem decompilar o DEX inteiro. Muito mais rapido que baksmali_decompile quando voce so precisa de 1 metodo. Retorna o codigo Smali do metodo.",
        {
            dexPath: z.string().describe("Caminho do arquivo .dex"),
            classFilter: z.string().describe("Filtro de classe (ex: 'Lcom/app/PremiumCheck;' ou 'PremiumCheck')"),
            methodFilter: z.string().optional().describe("Filtro opcional de metodo (ex: 'isPremium') para retornar apenas metodos especificos")
        },
        async ({ dexPath, classFilter, methodFilter }) => {
            try {
                const tmpDir = `/data/data/com.termux/files/home/tmp/dex_method_${Date.now()}`;
                
                // Decompila APENAS a classe filtrada
                const cp = [
                    "/data/data/com.termux/files/home/android-mcp/bin/jcommander-1.64.jar",
                    "/data/data/com.termux/files/usr/share/java/jadx-1.5.5-all.jar"
                ].join(":");
                
                // Normaliza o filtro para formato baksmali
                let filter = classFilter;
                if (!filter.startsWith("L")) filter = "L" + filter;
                if (!filter.endsWith(";")) filter += ";";
                
                // Usa o filtro de classe para decompilar APENAS a classe alvo (cirurgico)
                let cmd;
                if (filter.includes(';')) {
                    // Filtro completo: decomplia so a classe
                    cmd = `java -cp "${cp}" com.android.tools.smali.baksmali.Main d "${dexPath}" -o "${tmpDir}" -f "${filter}" 2>&1`;
                } else {
                    // Sem filtro valido: decomplia o DEX inteiro (menos eficiente)
                    cmd = `java -cp "${cp}" com.android.tools.smali.baksmali.Main d "${dexPath}" -o "${tmpDir}" 2>&1 | head -5`;
                }
                await execPromise(cmd);
                
                // Encontra o arquivo smali gerado
                const { stdout: findOut } = await execPromise(`find "${tmpDir}" -name "*.smali" 2>/dev/null | head -5`);
                
                if (!findOut.trim()) {
                    return { content: [{ type: "text", text: `Nenhuma classe encontrada com filtro: ${classFilter}` }] };
                }
                
                // Le o smali e filtra metodos
                let result = "";
                for (const smaliFile of findOut.trim().split('\n')) {
                    if (!smaliFile) continue;
                    const smaliContent = await fs.readFile(smaliFile, "utf-8");
                    
                    if (methodFilter) {
                        // Extrai apenas metodos que contenham o filtro
                        const lines = smaliContent.split('\n');
                        let inMethod = false;
                        let methodBlock = "";
                        let braceCount = 0;
                        
                        for (const line of lines) {
                            if (line.includes('.method ') && line.includes(methodFilter)) {
                                inMethod = true;
                                methodBlock = line + '\n';
                                braceCount = 0;
                            } else if (inMethod) {
                                methodBlock += line + '\n';
                                if (line.trim() === '.end method') {
                                    result += `\n// === ${smaliFile} ===\n${methodBlock}`;
                                    inMethod = false;
                                }
                            }
                        }
                    } else {
                        result += `\n// === ${smaliFile} ===\n${smaliContent}`;
                    }
                }
                
                // Limpa
                await execPromise(`rm -rf "${tmpDir}"`);
                
                return {
                    content: [{
                        type: "text",
                        text: result || "Metodo(s) extraido(s) com sucesso. Consulte o output acima."
                    }]
                };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no dex_method_extract: " + err.message }], isError: true };
            }
        }
    );

    // 25. Hex Patch — Patch binario cirurgico com verificacao e backup
    server.tool(
        "hex_patch",
        "Aplica patch hexadecimal em um arquivo binario com verificacao de seguranca. Verifica se os bytes originais no offset conferem antes de aplicar o patch. Cria backup automatico (.bak).",
        {
            filePath: z.string().describe("Caminho do arquivo binario a ser modificado"),
            offset: z.number().describe("Offset hexadecimal ou decimal onde aplicar o patch (ex: 0x4417c)"),
            expectedHex: z.string().describe("Bytes originais ESPERADOS no offset (ex: 'FF4301D1'). Se nao conferir, o patch NAO sera aplicado."),
            replacementHex: z.string().describe("Bytes de substituicao (ex: '20008052C0035FD6')")
        },
        async ({ filePath, offset, expectedHex, replacementHex }) => {
            try {
                const script = `
import os, shutil

filepath = "${filePath}"
offset = ${offset}
expected = bytes.fromhex("${expectedHex}")
replacement = bytes.fromhex("${replacementHex}")

with open(filepath, 'rb') as f:
    f.seek(offset)
    actual = f.read(len(expected))

if actual != expected:
    print(f"ERRO DE SEGURANCA: Bytes no offset {offset:#x} nao conferem!")
    print(f"  Esperado: {expected.hex().upper()}")
    print(f"  Encontrado: {actual.hex().upper()}")
    print("  Patch NAO aplicado. Verifique o offset.")
    exit(1)

# Backup
bak = filepath + '.bak'
if not os.path.exists(bak):
    shutil.copy2(filepath, bak)
    print(f"Backup criado: {bak}")

# Aplica patch
with open(filepath, 'rb+') as f:
    f.seek(offset)
    f.write(replacement)

print(f"Patch aplicado com sucesso!")
print(f"  Offset: {offset:#x}")
print(f"  {expected.hex().upper()} -> {replacement.hex().upper()}")
print(f"  Tamanho: {len(replacement)} bytes")
`;
                const { stdout } = await execPromise(`python3 -c "${script.replace(/"/g, '\\"')}"`);
                return { content: [{ type: "text", text: stdout }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no hex_patch: " + err.message }], isError: true };
            }
        }
    );

    // 26. Logcat Crash — Captura e analisa o ultimo crash do Android
    server.tool(
        "logcat_crash",
        "Captura o ultimo crash do logcat do Android (via rish/Shizuku) e faz parse da stack trace. Retorna classe, metodo e offset do crash. Essencial para diagnostico rapido de patches.",
        {
            packageName: z.string().describe("Nome do pacote do app para filtrar (ex: 'com.exemplo.app')"),
            secondsBack: z.number().optional().default(30).describe("Quantos segundos para tras buscar no logcat (default: 30)")
        },
        async ({ packageName, secondsBack }) => {
            try {
                const rishPath = "/data/data/com.termux/files/home/bin/rish";
                // Limpa logcat, espera um pouco, captura
                const cmd = `${rishPath} -c "logcat -d -v threadtime -t '${secondsBack}s' AndroidRuntime:E *:F 2>&1 | grep -A 50 'FATAL\|AndroidRuntime'"`;
                const { stdout } = await execPromise(cmd);
                
                if (!stdout.trim()) {
                    return { content: [{ type: "text", text: "Nenhum crash encontrado no periodo. App pode nao ter crashado ou o logcat expirou." }] };
                }
                
                // Parse basico
                const lines = stdout.split('\n');
                let parsed = "=== CRASH DETECTADO ===\n\n";
                
                for (const line of lines) {
                    parsed += line + '\n';
                    // Extrai classe e metodo
                    const match = line.match(/at\s+(\S+)\.(\S+)\(.*:(\d+)\)/);
                    if (match) {
                        parsed += `  -> Classe: ${match[1]}\n`;
                        parsed += `  -> Metodo: ${match[2]}\n`;
                        parsed += `  -> Linha/Offset: ${match[3]}\n`;
                    }
                }
                
                return { content: [{ type: "text", text: parsed }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro ao capturar logcat: " + err.message + "\nVerifique se o Shizuku esta rodando." }], isError: true };
            }
        }
    );

    // 27. Install & Test — Instala, lanca e captura crash em 1 chamada
    server.tool(
        "install_and_test",
        "Instala um APK, lanca o app via monkey, e captura crash em uma unica chamada. Ciclo completo de teste em ~8 segundos.",
        {
            apkPath: z.string().describe("Caminho do APK a ser instalado e testado"),
            packageName: z.string().describe("Nome do pacote do app (ex: 'com.exemplo.app')"),
            uninstallFirst: z.boolean().optional().default(true).describe("Desinstalar versao anterior primeiro (default: true)")
        },
        async ({ apkPath, packageName, uninstallFirst }) => {
            try {
                const rishPath = "/data/data/com.termux/files/home/bin/rish";
                let result = "=== CICLO DE TESTE ===\n\n";
                
                // 1. Uninstall
                if (uninstallFirst) {
                    result += "[1/4] Desinstalando versao anterior...\n";
                    const { stdout: unOut } = await execPromise(`${rishPath} -c "pm uninstall ${packageName} 2>&1"`);
                    result += unOut + '\n';
                }
                
                // 2. Install via pipe (mais confiavel)
                result += "[2/4] Instalando APK...\n";
                const { stdout: instOut, stderr: instErr } = await execPromise(
                    `cat "${apkPath}" | ${rishPath} -c "pm install -S $(wc -c < '${apkPath}') 2>&1"`
                );
                result += (instOut || instErr) + '\n';
                
                if (instOut.includes("Success") || instOut.includes("success")) {
                    result += "  ✅ Instalado com sucesso!\n";
                } else {
                    result += "  ⚠️ Instalacao pode ter falhado. Verifique o output acima.\n";
                }
                
                // 3. Limpar logcat e lancar
                result += "[3/4] Lancando app e aguardando 6s...\n";
                const { stdout: launchOut } = await execPromise(
                    `${rishPath} -c "logcat -c && monkey -p ${packageName} 1 2>&1 && sleep 6 && logcat -d -v threadtime AndroidRuntime:E *:F 2>&1"`
                );
                result += launchOut + '\n';
                
                // 4. Verificar se esta rodando
                result += "[4/4] Verificando se app esta rodando...\n";
                const { stdout: pidOut } = await execPromise(`${rishPath} -c "pidof ${packageName} 2>&1"`);
                
                if (pidOut.trim()) {
                    result += `  ✅ App rodando! PID: ${pidOut.trim()}\n`;
                } else {
                    result += "  ❌ App NAO esta rodando. Possivel crash silencioso.\n";
                }
                
                return { content: [{ type: "text", text: result }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no install_and_test: " + err.message }], isError: true };
            }
        }
    );

    // 28. Native Symbol Find — Encontra offset de simbolo em .so via nm/readelf
    server.tool(
        "native_symbol_find",
        "Encontra o offset de um simbolo (funcao) exportado em uma biblioteca nativa (.so) usando nm ou readelf. Muito mais rapido que carregar o Radare2 completo.",
        {
            soPath: z.string().describe("Caminho da biblioteca .so"),
            symbolFilter: z.string().describe("Filtro para o nome do simbolo (ex: 'isSignatureNormal', 'JNI_OnLoad', 'Java_')"),
            useRegex: z.boolean().optional().default(false).describe("Usar regex no filtro (default: false, busca substring)")
        },
        async ({ soPath, symbolFilter, useRegex }) => {
            try {
                let cmd;
                if (useRegex) {
                    cmd = `nm -D "${soPath}" 2>/dev/null | grep -E "${symbolFilter}" | head -30`;
                } else {
                    cmd = `nm -D "${soPath}" 2>/dev/null | grep -i "${symbolFilter}" | head -30`;
                }
                
                const { stdout: nmOut } = await execPromise(cmd);
                
                if (!nmOut.trim()) {
                    // Tenta com readelf
                    const { stdout: reOut } = await execPromise(
                        `readelf -sW "${soPath}" 2>/dev/null | grep -i "${symbolFilter}" | head -30`
                    );
                    
                    if (!reOut.trim()) {
                        return { content: [{ type: "text", text: `Nenhum simbolo encontrado com filtro: "${symbolFilter}"\nA .so pode estar stripped ou o simbolo eh estatico.\nTente usar radare2 para busca profunda.` }] };
                    }
                    
                    return { content: [{ type: "text", text: `=== SIMBOLOS ENCONTRADOS (readelf) ===\n${reOut}\n\nUse o offset (primeiro campo) para hex_patch.` }] };
                }
                
                return { content: [{ type: "text", text: `=== SIMBOLOS ENCONTRADOS (nm) ===\n${nmOut}\n\nUse o offset (primeiro campo) para hex_patch.` }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no native_symbol_find: " + err.message }], isError: true };
            }
        }
    );

    // 29. APK Diff — Compara APK original vs modificado
    server.tool(
        "apk_diff",
        "Compara dois APKs (original vs modificado) e lista exatamente quais arquivos mudaram, garantindo que o patch foi cirurgico e nao alterou nada alem do esperado.",
        {
            originalApk: z.string().describe("Caminho do APK original"),
            patchedApk: z.string().describe("Caminho do APK modificado/patchado"),
            quickCheck: z.boolean().optional().default(true).describe("Apenas listar arquivos diferentes (default: true). Se false, mostra hash SHA256.")
        },
        async ({ originalApk, patchedApk, quickCheck }) => {
            try {
                const script = `
import zipfile, hashlib

orig = "${originalApk}"
patch = "${patchedApk}"
quick = ${quickCheck ? 'True' : 'False'}

with zipfile.ZipFile(orig, 'r') as z1, zipfile.ZipFile(patch, 'r') as z2:
    entries1 = {i.filename: i for i in z1.infolist()}
    entries2 = {i.filename: i for i in z2.infolist()}
    
    only_orig = set(entries1.keys()) - set(entries2.keys())
    only_patch = set(entries2.keys()) - set(entries1.keys())
    common = set(entries1.keys()) & set(entries2.keys())
    
    changed = []
    unchanged = 0
    for fname in sorted(common):
        if entries1[fname].file_size != entries2[fname].file_size or \
           entries1[fname].CRC != entries2[fname].CRC:
            changed.append(fname)
            if not quick:
                h1 = hashlib.sha256(z1.read(fname)).hexdigest()[:16]
                h2 = hashlib.sha256(z2.read(fname)).hexdigest()[:16]
                print(f"  MODIFICADO: {fname} ({entries1[fname].file_size}->{entries2[fname].file_size} bytes, {h1}->{h2})")
        else:
            unchanged += 1
    
    print(f"=== RESULTADO DA COMPARACAO ===")
    print(f"Total entradas: {len(entries2)} (original: {len(entries1)})")
    print(f"Arquivos identicos: {unchanged}")
    print(f"Arquivos modificados: {len(changed)}")
    print(f"Arquivos removidos: {len(only_orig)}")
    print(f"Arquivos novos: {len(only_patch)}")
    
    if changed:
        print(f"\\n--- ARQUIVOS MODIFICADOS ---")
        for fname in changed:
            if quick:
                print(f"  MODIFICADO: {fname} ({entries1[fname].file_size} -> {entries2[fname].file_size} bytes)")
    
    if only_orig:
        print(f"\\n--- ARQUIVOS REMOVIDOS ---")
        for f in sorted(only_orig):
            print(f"  REMOVIDO: {f}")
    
    if only_patch:
        print(f"\\n--- ARQUIVOS NOVOS ---")
        for f in sorted(only_patch):
            print(f"  NOVO: {f}")
    
    if len(changed) <= 3:
        print(f"\\n✅ Patch CIRURGICO! Apenas {len(changed)} arquivo(s) alterado(s).")
    elif len(changed) <= 10:
        print(f"\\n⚠️ Patch MODERADO: {len(changed)} arquivos alterados.")
    else:
        print(f"\\n❌ Patch PESADO: {len(changed)} arquivos alterados. Considere abordagem mais cirurgica.")
`;
                const { stdout } = await execPromise(`python3 -c "${script.replace(/"/g, '\\"')}"`);
                return { content: [{ type: "text", text: stdout }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no apk_diff: " + err.message }], isError: true };
            }
        }
    );



    // ========== FERRAMENTAS AVANCADAS V6.0 (ADICIONAIS) ==========

    // 30. DEX Info — Informacoes rapidas do header DEX
    server.tool(
        "dex_info",
        "Le o header de um arquivo DEX e retorna informacoes: numero de classes, metodos, strings, campos, checksum, sha1, tamanho. Muito mais rapido que baksmali_decompile quando voce so quer ver a estrutura do DEX.",
        {
            dexPath: z.string().describe("Caminho do arquivo .dex")
        },
        async ({ dexPath }) => {
            try {
                const script = `
import struct, hashlib, os

with open("${dexPath}", "rb") as f:
    data = f.read(112)  # header completo

magic = data[0:8]
checksum = struct.unpack_from("<I", data, 8)[0]
sha1 = data[12:32].hex()
file_size = struct.unpack_from("<I", data, 32)[0]
header_size = struct.unpack_from("<I", data, 36)[0]
endian_tag = struct.unpack_from("<I", data, 40)[0]
link_size = struct.unpack_from("<I", data, 44)[0]
link_off = struct.unpack_from("<I", data, 48)[0]
map_off = struct.unpack_from("<I", data, 52)[0]
string_ids_size = struct.unpack_from("<I", data, 56)[0]
string_ids_off = struct.unpack_from("<I", data, 60)[0]
type_ids_size = struct.unpack_from("<I", data, 64)[0]
type_ids_off = struct.unpack_from("<I", data, 68)[0]
proto_ids_size = struct.unpack_from("<I", data, 72)[0]
proto_ids_off = struct.unpack_from("<I", data, 76)[0]
field_ids_size = struct.unpack_from("<I", data, 80)[0]
field_ids_off = struct.unpack_from("<I", data, 84)[0]
method_ids_size = struct.unpack_from("<I", data, 88)[0]
method_ids_off = struct.unpack_from("<I", data, 92)[0]
class_defs_size = struct.unpack_from("<I", data, 96)[0]
class_defs_off = struct.unpack_from("<I", data, 100)[0]
data_size = struct.unpack_from("<I", data, 104)[0]
data_off = struct.unpack_from("<I", data, 108)[0]

actual_size = os.path.getsize("${dexPath}")

print(f"DEX: ${dexPath}")
print(f"Tamanho real: {actual_size:,} bytes")
print(f"Tamanho declarado: {file_size:,} bytes")
print(f"Magic: {magic.decode('ascii', errors='replace')}")
print(f"Checksum: {checksum:#010x}")
print(f"SHA1: {sha1}")
print(f"Endianness: {'Little' if endian_tag == 0x12345678 else 'Big'}")
print(f"")
print(f"=== SECOES ===")
print(f"Header: {header_size} bytes")
print(f"String IDs: {string_ids_size:,} strings @ offset {string_ids_off:#x}")
print(f"Type IDs:   {type_ids_size:,} types @ offset {type_ids_off:#x}")
print(f"Proto IDs:  {proto_ids_size:,} prototypes @ offset {proto_ids_off:#x}")
print(f"Field IDs:  {field_ids_size:,} fields @ offset {field_ids_off:#x}")
print(f"Method IDs: {method_ids_size:,} methods @ offset {method_ids_off:#x}")
print(f"Class Defs: {class_defs_size:,} classes @ offset {class_defs_off:#x}")
print(f"Data:       {data_size:,} bytes @ offset {data_off:#x}")
print(f"Link:       {link_size} bytes @ offset {link_off:#x}")
`;
                const { stdout } = await execPromise(`python3 -c "${script.replace(/"/g, '\"')}"`);
                return { content: [{ type: "text", text: stdout }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no dex_info: " + err.message }], isError: true };
            }
        }
    );

    // 31. ELF Analyze — Analise rapida de biblioteca nativa (.so)
    server.tool(
        "elf_analyze",
        "Analisa uma biblioteca nativa (.so) e retorna: tipo (static/shared), arquitetura (ARM/ARM64/x86), se esta stripped, se tem symbols, se tem debug info, tamanho das secoes principais. Muito mais rapido que carregar o Radare2 completo.",
        {
            soPath: z.string().describe("Caminho da biblioteca .so a analisar")
        },
        async ({ soPath }) => {
            try {
                const script = `
import os, struct

filepath = "${soPath}"
size = os.path.getsize(filepath)

with open(filepath, "rb") as f:
    header = f.read(64)

# ELF magic
magic = header[0:4]
is_elf = magic == b'\x7fELF'

# Class (32 vs 64 bit)
elf_class = header[4]  # 1=32bit, 2=64bit
bits = 64 if elf_class == 2 else 32

# Endianness
endian = header[5]  # 1=little, 2=big
endian_str = "Little Endian" if endian == 1 else "Big Endian"

# OS/ABI
abi = header[7]

# Type (ET_EXEC=2, ET_DYN=3=shared)
e_type = struct.unpack_from("<H", header, 16)[0] if endian == 1 else struct.unpack_from(">H", header, 16)[0]
type_str = {0: "NONE", 1: "REL", 2: "EXEC", 3: "SHARED (DYN)", 4: "CORE"}.get(e_type, str(e_type))

# Machine
e_machine = struct.unpack_from("<H", header, 18)[0] if endian == 1 else struct.unpack_from(">H", header, 18)[0]
machine_map = {3: "i386", 40: "ARM", 62: "x86_64", 183: "AArch64 (ARM64)", 0xB7: "AArch64 (ARM64)"}
arch = machine_map.get(e_machine, f"Unknown ({e_machine})")

print(f"Arquivo: {filepath}")
print(f"Tamanho: {size:,} bytes ({size/1024:.1f} KB)")
print(f"ELF: {'Sim' if is_elf else 'NAO (corrompido?)'}")
print(f"Arquitetura: {arch} ({bits}-bit, {endian_str})")
print(f"Tipo: {type_str}")
print(f"ABI: {abi} (0=SystemV, 3=Linux)")

# Tentar detectar stripped e mais info via comandos
import subprocess
try:
    nm_out = subprocess.check_output(["nm", "-D", filepath], stderr=subprocess.DEVNULL, timeout=3).decode()
    has_dynsyms = len(nm_out.strip().split('\n')) > 2 if nm_out.strip() else False
    print(f"Dynamic Symbols: {'Sim (' + str(len(nm_out.strip().split(chr(10)))) + ' exportados)' if has_dynsyms else 'Nao (stripped ou sem exports)'}")
except:
    print(f"Dynamic Symbols: Nao foi possivel verificar")

try:
    readelf = subprocess.check_output(["readelf", "-S", filepath], stderr=subprocess.DEVNULL, timeout=3).decode()
    lines = readelf.split('\n')
    text_size = 0
    data_size = 0
    for line in lines:
        if ']' in line and '.text' in line.lower() and '.text.' not in line.lower():
            parts = line.split()
            for i, p in enumerate(parts):
                if p.startswith('0') and i+1 < len(parts):
                    try:
                        text_size = int(parts[i+1], 16) if parts[i+1].startswith('0') else int(parts[i+1])
                    except: pass
        if ']' in line and ('.rodata' in line.lower() or '.data' in line.lower()):
            parts = line.split()
            for i, p in enumerate(parts):
                if p.startswith('0') and i+1 < len(parts):
                    try:
                        data_size += int(parts[i+1], 16) if parts[i+1].startswith('0') else int(parts[i+1])
                    except: pass
    if text_size:
        print(f"Secao .text: {text_size:,} bytes ({text_size/1024:.1f} KB)")
    if data_size:
        print(f"Secoes .data/.rodata: {data_size:,} bytes ({data_size/1024:.1f} KB)")
except:
    pass

# Stripped check
try:
    file_out = subprocess.check_output(["file", filepath], timeout=3).decode()
    stripped = "not stripped" in file_out
    print(f"Debug Symbols: {'Presentes' if stripped else 'Stripped (removidos)'}")
    if "BuildID" in file_out:
        bid = file_out.split("BuildID[sha1]=")[1].split(",")[0].strip()
        print(f"BuildID: {bid}")
except:
    pass
`;
                const { stdout } = await execPromise(`python3 -c "${script.replace(/"/g, '\"')}"`);
                return { content: [{ type: "text", text: stdout }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no elf_analyze: " + err.message }], isError: true };
            }
        }
    );

    // 32. Manifest Edit — Editar AndroidManifest.xml sem apktool completo
    server.tool(
        "manifest_edit",
        "Edita valores no AndroidManifest.xml binario do APK de forma cirurgica, sem usar apktool. Util para mudancas rapidas como: debuggable=true, trocar Application class, mudar extractNativeLibs. Extrai o XML binario, edita, e recoloca no APK.",
        {
            apkPath: z.string().describe("Caminho do APK"),
            editType: z.enum(["set_debuggable", "set_application", "set_extract_native_libs", "raw_replace"]).describe("Tipo de edicao: set_debuggable (android:debuggable=true), set_application (trocar android:name da <application>), set_extract_native_libs (extractNativeLibs=true/false), raw_replace (substituicao binaria exata)"),
            value: z.string().optional().describe("Valor: 'true'/'false' para set_debuggable/set_extract_native_libs, nome completo da classe para set_application, ou par hex (ex: '4F4C44->4E4557') para raw_replace"),
            outputApk: z.string().optional().describe("APK de saida (opcional, default: sobrescreve o original)")
        },
        async ({ apkPath, editType, value, outputApk }) => {
            try {
                const outApk = outputApk || apkPath;
                const script = `
import zipfile, os, shutil, tempfile

apk = "${apkPath}"
edit_type = "${editType}"
val = "${value}"
output = "${outApk}"

# Extrai AndroidManifest.xml
tmpdir = tempfile.mkdtemp()
man_xml = os.path.join(tmpdir, "AndroidManifest.xml")

with zipfile.ZipFile(apk, 'r') as z:
    z.extract("AndroidManifest.xml", tmpdir)

with open(man_xml, 'rb') as f:
    data = bytearray(f.read())

original_len = len(data)
modified = False

if edit_type == "set_debuggable":
    # Procura o atributo debuggable no AXML binario
    # O atributo 'debuggable' aparece como string no AXML, o valor boolean logo apos
    # Busca: "debuggable" em UTF-16LE ou ASCII
    needle = b"debuggable"
    pos = data.find(needle)
    if pos >= 0:
        print(f"Encontrado 'debuggable' no offset {pos:#x}")
        # O valor boolean (0x00 ou 0x01) geralmente esta alguns bytes apos o nome do atributo
        # Tenta encontrar 0x00 proximo e trocar para 0x01 (true)
        # Procuramos por 0x00 0x00 (false em resource) nos proximos 30 bytes
        for i in range(pos, min(pos+50, len(data)-1)):
            if data[i] == 0x00 and data[i+1] in (0x00, 0x01):
                if val == "true":
                    data[i+1] = 0x01  # true
                    modified = True
                    print(f"  Valor alterado no offset {i+1:#x}: {data[i+1-1]:#04x} -> 0x01")
                break
    if not modified:
        # Fallback: busca binaria por padrao de debuggable false
        # Tentativa alternativa: procurar string "debuggable" e depois 0xFFFFFFFF + 0x00000000
        for i in range(len(data) - 20):
            if data[i:i+10] == b"debuggable":
                # Padrao: nome do atributo + resource ID + valor
                for j in range(i+10, min(i+30, len(data)-3)):
                    if data[j:j+4] == b'\xff\xff\xff\xff' or (data[j]==0xff and data[j+1]==0xff):
                        # Encontrou resource ID 0xFFFFFFFF (sem resource), proximo ao valor
                        val_offset = j + 4 + 8  # pula resource ID + tipo
                        if val_offset < len(data) and data[val_offset] in (0x00, 0x01):
                            if val == "true":
                                data[val_offset] = 0x01
                                modified = True
                            else:
                                data[val_offset] = 0x00
                                modified = True
                            print(f"  Valor booleano alterado no offset {val_offset:#x}")
                            break
                break

elif edit_type == "set_application":
    # Troca o nome da classe Application
    # Busca pela string atual e substitui pela nova
    # No AXML, strings sao UTF-16LE com terminador null
    old_name_utf16 = b"".join(c.encode('utf-16-le') for c in val.split('.')[-1]) if '.' not in val else None
    # Estrategia: busca a string no formato UTF-16LE
    search_bytes = val.encode('utf-16-le')
    # A string a ser substituida deve ser encontrada perto de "application" ou "name"
    needle = b"application"
    pos = data.find(needle)
    if pos >= 0:
        print(f"Encontrado 'application' no offset {pos:#x}")
        # Procura "android:name" ou apenas "name"
        name_needle = b"name"
        name_pos = data.find(name_needle, pos, pos+200)
        if name_pos >= 0:
            print(f"  Encontrado 'name' no offset {name_pos:#x}")
            # A string do valor esta logo apos, em UTF-16LE
            # Encontra o inicio da string UTF-16LE (apos o nome do atributo)
            str_start = name_pos + 20  # estimativa
            # Procura pelo inicio de uma string UTF-16LE (2 bytes nao-nulos seguidos)
            for i in range(name_pos, min(name_pos+100, len(data)-2)):
                if data[i] != 0x00 and data[i+1] == 0x00:
                    # Possivel inicio de string UTF-16LE
                    # Le ate encontrar null (2 bytes 0x00)
                    j = i
                    while j < len(data)-1 and not (data[j]==0x00 and data[j+1]==0x00):
                        j += 2
                    old_str = data[i:j].decode('utf-16-le', errors='replace')
                    if old_str and len(old_str) > 2 and '.' in old_str:
                        print(f"  String encontrada: '{old_str}'")
                        new_str_bytes = val.encode('utf-16-le')
                        # Calcula novo tamanho
                        old_len = j - i + 2
                        new_len = len(new_str_bytes) + 2
                        if new_len <= old_len:
                            data[i:i+new_len] = new_str_bytes + b'\x00\x00'
                            # Preenche o resto com null bytes
                            for k in range(i+new_len, i+old_len):
                                data[k] = 0x00
                            modified = True
                            print(f"  Substituido: '{old_str}' -> '{val}'")
                        else:
                            print(f"  ERRO: Novo nome ({len(new_str_bytes)+2} bytes) maior que original ({old_len} bytes)")
                        break
    if not modified:
        print("AVISO: Nao foi possivel encontrar a string do Application name. Tente usar raw_replace com os bytes exatos.")

elif edit_type == "set_extract_native_libs":
    # extractNativeLibs e um atributo booleano
    needle = b"extractNativeLibs"
    pos = data.find(needle)
    if pos >= 0:
        print(f"Encontrado 'extractNativeLibs' no offset {pos:#x}")
        for i in range(pos, min(pos+50, len(data)-1)):
            if data[i] == 0x00 and data[i+1] in (0x00, 0x01):
                if val == "true":
                    data[i+1] = 0x01
                else:
                    data[i+1] = 0x00
                modified = True
                print(f"  Valor alterado no offset {i+1:#x}")
                break

elif edit_type == "raw_replace":
    # Substituicao hex: "OLDBYTES->NEWBYTES"
    parts = val.split("->")
    if len(parts) == 2:
        old_bytes = bytes.fromhex(parts[0].replace(' ', ''))
        new_bytes = bytes.fromhex(parts[1].replace(' ', ''))
        pos = data.find(old_bytes)
        if pos >= 0:
            data[pos:pos+len(new_bytes)] = new_bytes
            modified = True
            print(f"Substituicao raw: offset {pos:#x}, {len(old_bytes)} bytes -> {len(new_bytes)} bytes")
        else:
            print(f"Bytes originais nao encontrados: {parts[0]}")

if modified:
    with open(man_xml, 'wb') as f:
        f.write(data)
    print(f"AndroidManifest.xml editado ({original_len} -> {len(data)} bytes)")
    
    # Substitui no APK
    tmp_out = output + ".tmp.apk" if output == apk else output
    with zipfile.ZipFile(apk, 'r') as zin:
        with zipfile.ZipFile(tmp_out, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "AndroidManifest.xml":
                    zout.write(man_xml, "AndroidManifest.xml", compress_type=item.compress_type)
                else:
                    zout.writestr(item, zin.read(item.filename))
    
    if output == apk:
        os.replace(tmp_out, output)
    print(f"APK atualizado: {output}")
    print("\nATENCAO: O APK precisa ser re-assinado! Use sign_align_apk.")
else:
    print("Nenhuma modificacao foi aplicada. Verifique se o alvo foi encontrado.")

shutil.rmtree(tmpdir)
`;
                const { stdout } = await execPromise(`python3 -c "${script.replace(/"/g, '\"')}"`);
                return { content: [{ type: "text", text: stdout }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no manifest_edit: " + err.message }], isError: true };
            }
        }
    );

    // 33. Resource Value Edit — Editar UM valor no resources.arsc sem apktool
    server.tool(
        "resource_value_edit",
        "Edita um unico valor no resources.arsc (tabela de recursos compilada) de forma cirurgica, sem usar apktool. Util para mudar strings, booleanos ou inteiros. Ex: mudar 'is_premium' de false para true, ou alterar um texto de paywall.",
        {
            apkPath: z.string().describe("Caminho do APK"),
            searchType: z.enum(["boolean", "string", "integer", "raw_bytes"]).describe("Tipo de valor a buscar e substituir"),
            searchValue: z.string().describe("Valor a buscar no ARSC. Para boolean: 'false' ou 'true'. Para string: o texto exato. Para integer: o numero. Para raw_bytes: hex bytes."),
            replacementValue: z.string().describe("Valor de substituicao (mesmo formato que searchValue)"),
            outputApk: z.string().optional().describe("APK de saida (opcional, default: sobrescreve o original)")
        },
        async ({ apkPath, searchType, searchValue, replacementValue, outputApk }) => {
            try {
                const outApk = outputApk || apkPath;
                const script = `
import zipfile, os, shutil, tempfile

apk = "${apkPath}"
search_type = "${searchType}"
search_val = "${searchValue}"
repl_val = "${replacementValue}"
output = "${outApk}"

# Extrai resources.arsc
tmpdir = tempfile.mkdtemp()
arsc_path = os.path.join(tmpdir, "resources.arsc")

with zipfile.ZipFile(apk, 'r') as z:
    z.extract("resources.arsc", tmpdir)

with open(arsc_path, 'rb') as f:
    data = bytearray(f.read())

original_len = len(data)
modified = False

if search_type == "boolean":
    # Boolean no ARSC: 0x00 = false, 0x01+ = true (ou FF FF FF FF = true)
    # Busca pelo valor exato
    search_byte = b'\x00' if search_val.lower() == 'false' else b'\x01'
    repl_byte = b'\x01' if repl_val.lower() == 'true' else b'\x00'
    
    # Estrategia: encontrar todas as ocorrencias e substituir
    count = 0
    i = 0
    while i < len(data) - 1:
        if data[i] == search_byte[0]:
            # Verifica contexto - booleans geralmente tem 0x00 antes/depois
            # (parte do tipo de recurso)
            if i > 0 and data[i-1] in (0x00, 0x08, 0x10):
                data[i] = repl_byte[0]
                count += 1
                modified = True
        i += 1
    print(f"Substituidas {count} ocorrencias de '{search_val}' por '{repl_val}'")

elif search_type == "string":
    # Strings no ARSC sao armazenadas em UTF-16LE com terminador null
    search_utf16 = search_val.encode('utf-16-le')
    repl_utf16 = repl_val.encode('utf-16-le')
    
    if len(repl_utf16) > len(search_utf16):
        print(f"ERRO: String de substituicao ({len(repl_utf16)} bytes) maior que original ({len(search_utf16)} bytes)")
        print("Strings maiores podem corromper o ARSC. Use uma string de mesmo tamanho ou menor.")
        exit(1)
    
    pos = data.find(search_utf16)
    if pos >= 0:
        # Verifica se e uma string completa (terminador null UTF-16LE)
        end_pos = pos + len(search_utf16)
        if end_pos + 1 < len(data) and data[end_pos] == 0x00 and data[end_pos+1] == 0x00:
            data[pos:pos+len(repl_utf16)] = repl_utf16
            # Preenche o resto com null bytes
            for k in range(pos+len(repl_utf16), pos+len(search_utf16)):
                data[k] = 0x00
            modified = True
            print(f"String substituida no offset {pos:#x}")
            print(f"  '{search_val}' -> '{repl_val}'")
        else:
            print(f"String encontrada mas sem terminador null UTF-16LE. Offset: {pos:#x}")
    else:
        # Tenta em ASCII (menos comum mas possivel)
        search_ascii = search_val.encode('ascii')
        pos = data.find(search_ascii)
        if pos >= 0:
            repl_ascii = repl_val.encode('ascii')
            if len(repl_ascii) <= len(search_ascii):
                data[pos:pos+len(repl_ascii)] = repl_ascii
                for k in range(pos+len(repl_ascii), pos+len(search_ascii)):
                    data[k] = 0x00
                modified = True
                print(f"String ASCII substituida no offset {pos:#x}")
            else:
                print("String de substituicao maior que original em ASCII")
        else:
            print(f"String '{search_val}' nao encontrada no ARSC")

elif search_type == "integer":
    # Inteiros no ARSC sao 4 bytes (little-endian normalmente)
    try:
        search_int = int(search_val)
        repl_int = int(repl_val)
        search_bytes = struct.pack('<I', search_int & 0xFFFFFFFF)
        repl_bytes = struct.pack('<I', repl_int & 0xFFFFFFFF)
        
        pos = data.find(search_bytes)
        if pos >= 0:
            data[pos:pos+4] = repl_bytes
            modified = True
            print(f"Inteiro substituido no offset {pos:#x}: {search_int} -> {repl_int}")
        else:
            # Tenta big-endian
            search_bytes_be = struct.pack('>I', search_int & 0xFFFFFFFF)
            pos = data.find(search_bytes_be)
            if pos >= 0:
                data[pos:pos+4] = struct.pack('>I', repl_int & 0xFFFFFFFF)
                modified = True
                print(f"Inteiro (BE) substituido no offset {pos:#x}: {search_int} -> {repl_int}")
            else:
                print(f"Inteiro {search_int} nao encontrado no ARSC")
    except:
        print("Valores de inteiro invalidos")

elif search_type == "raw_bytes":
    # Substituicao hex direta
    search_hex = bytes.fromhex(search_val.replace(' ', ''))
    repl_hex = bytes.fromhex(repl_val.replace(' ', ''))
    if len(repl_hex) > len(search_hex):
        print("Bytes de substituicao maiores que original")
        exit(1)
    pos = data.find(search_hex)
    if pos >= 0:
        data[pos:pos+len(repl_hex)] = repl_hex
        modified = True
        print(f"Bytes substituidos no offset {pos:#x}")
    else:
        print("Bytes nao encontrados")

import struct

if modified:
    with open(arsc_path, 'wb') as f:
        f.write(data)
    print(f"resources.arsc editado ({original_len} -> {len(data)} bytes)")
    
    # Substitui no APK
    tmp_out = output + ".tmp.apk" if output == apk else output
    with zipfile.ZipFile(apk, 'r') as zin:
        with zipfile.ZipFile(tmp_out, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "resources.arsc":
                    zout.write(arsc_path, "resources.arsc", compress_type=item.compress_type)
                else:
                    zout.writestr(item, zin.read(item.filename))
    
    if output == apk:
        os.replace(tmp_out, output)
    print(f"APK atualizado: {output}")
    print("\nATENCAO: O APK precisa ser re-assinado! Use sign_align_apk.")
else:
    print("Nenhuma modificacao foi aplicada.")

shutil.rmtree(tmpdir)
`;
                const { stdout } = await execPromise(`python3 -c "${script.replace(/"/g, '\"')}"`);
                return { content: [{ type: "text", text: stdout }] };
            } catch (err) {
                return { content: [{ type: "text", text: "Erro no resource_value_edit: " + err.message }], isError: true };
            }
        }
    );


    return server;
}

// --- Gerenciamento de Sessões ---

const sessions = new Map(); // sessionId -> { server, transport }

const handleMcpRequest = async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    let session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session) {
        // Criar um novo transporte e servidor para esta nova sessão
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => {
                console.log(`Sessão MCP iniciada: ${id}`);
                sessions.set(id, { server, transport });
            },
            onsessionclosed: (id) => {
                console.log(`Sessão MCP fechada: ${id}`);
                sessions.delete(id);
            }
        });

        const server = createMcpServer();
        await server.connect(transport);
        
        // Temporariamente associamos ao objeto para processar a requisição inicial (initialization)
        session = { server, transport };
    }

    try {
        await session.transport.handleRequest(req, res, req.body);
    } catch (err) {
        console.error("Erro no processamento da requisição:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: String(err) });
        }
    }
};

app.post("/mcp", handleMcpRequest);
app.get("/mcp", handleMcpRequest);
app.delete("/mcp", handleMcpRequest);

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Servidor MCP iniciado!`);
    console.log(`URL do endpoint: http://127.0.0.1:${PORT}/mcp`);
    console.log(`\nUse esta URL no RikkaHub ou outro cliente MCP compatível.`);
});