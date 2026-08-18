#!/data/data/com.termux/files/usr/bin/python3
"""
frida_patcher.py - Injeta o Frida Gadget em um APK.

Fluxo:
  1. Detecta a ABI do APK (lib/arm64-v8a, etc.)
  2. Baixa o frida-gadget (libfrida-gadget.so)
  3. Decodifica o APK com apktool
  4. Injeta a lib no APK e um `System.loadLibrary("gadget")` na Activity principal
  5. Recompila e assina com o keystore de debug

Uso:
  python3 frida_patcher.py <entrada.apk> <saida.apk> [versao_do_frida]
"""

import json
import lzma
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

DEFAULT_FRIDA_VERSION = "16.6.6"
FRIDA_VERSION = os.environ.get("FRIDA_VERSION", "")

ANDROID_NS = "{http://schemas.android.com/apk/res/android}"

ABI_TO_GADGET = {
    "arm64-v8a": "arm64",
    "armeabi-v7a": "arm",
    "x86_64": "x86_64",
    "x86": "x86",
}

HOME = "/data/data/com.termux/files/home"


def log(msg):
    print(f"[frida-patcher] {msg}", flush=True)


def run(cmd, cwd=None):
    log(f"$ {cmd}")
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Comando falhou ({r.returncode}): {cmd}\n--- stdout ---\n{r.stdout}\n--- stderr ---\n{r.stderr}")
    return r.stdout


def detect_abi(apk_path):
    with zipfile.ZipFile(apk_path) as z:
        names = z.namelist()
    for abi in ("arm64-v8a", "armeabi-v7a", "x86_64", "x86"):
        if any(n.startswith("lib/" + abi + "/") for n in names):
            return abi
    return "arm64-v8a"


def get_latest_version():
    try:
        req = urllib.request.Request(
            "https://api.github.com/repos/frida/frida/releases/latest",
            headers={"User-Agent": "frida-patcher"},
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)["tag_name"]
    except Exception:
        return None


def download_gadget(version, abi, dest_dir):
    gadget_abi = ABI_TO_GADGET.get(abi, "arm64")
    url = f"https://github.com/frida/frida/releases/download/{version}/frida-gadget-{version}-android-{gadget_abi}.so.xz"
    xz_path = os.path.join(dest_dir, "gadget.so.xz")
    so_path = os.path.join(dest_dir, "libgadget.so")
    log(f"Baixando {url}")
    urllib.request.urlretrieve(url, xz_path)
    with lzma.open(xz_path) as f_in, open(so_path, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    return so_path


def find_apktool():
    if shutil.which("apktool"):
        return "apktool"
    wrapper = os.path.join(HOME, "bin", "apktool")
    if os.path.isfile(wrapper):
        return wrapper
    raise RuntimeError("apktool não encontrado. Instale com: pkg install apktool")


def parse_manifest(manifest_path):
    with open(manifest_path, encoding="utf-8", errors="replace") as f:
        xml = f.read()
    package = None
    try:
        root = ET.fromstring(xml)
        package = root.get("package")
    except Exception:
        m = re.search(r'<manifest\b[^>]*package="([^"]+)"', xml)
        if m:
            package = m.group(1)
    return xml, package


def _has_launcher(elt):
    has_main = has_launcher = False
    for iff in elt.iter("intent-filter"):
        actions = [a.get(ANDROID_NS + "name") for a in iff.findall("action")]
        cats = [c.get(ANDROID_NS + "name") for c in iff.findall("category")]
        if "android.intent.action.MAIN" in actions:
            has_main = True
        if "android.intent.category.LAUNCHER" in cats:
            has_launcher = True
    return has_main and has_launcher


def find_launcher_activity(xml):
    root = ET.fromstring(xml)
    for activity in root.iter("activity"):
        if _has_launcher(activity):
            name = activity.get(ANDROID_NS + "name")
            if name:
                return name
    for alias in root.iter("activity-alias"):
        if _has_launcher(alias):
            name = alias.get(ANDROID_NS + "targetActivity")
            if name:
                return name
    return None


def class_to_smali_rel(name, package):
    if name.startswith("."):
        name = package + name
    if name.startswith("L") and name.endswith(";"):
        cls = name
    else:
        cls = "L" + name.replace(".", "/") + ";"
    return cls[1:-1] + ".smali"


def find_smali_file(decoded, rel):
    for root, dirs, files in os.walk(decoded):
        for d in list(dirs):
            if d.startswith("smali"):
                cand = os.path.join(root, d, rel)
                if os.path.isfile(cand):
                    return cand
    return None


def inject_loadlibrary(smali_path):
    with open(smali_path, encoding="utf-8", errors="replace") as f:
        content = f.read()
    lines = content.splitlines(keepends=True)

    injection = [
        '    const-string v0, "gadget"\n',
        "    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V\n",
    ]
    oncreate_re = re.compile(r"\.method\s+.*\sonCreate\(Landroid/os/Bundle;\)V")
    start = None
    for i, line in enumerate(lines):
        if oncreate_re.search(line):
            start = i
            break

    if start is not None:
        inserted = False
        for j in range(start + 1, min(start + 30, len(lines))):
            if ".locals" in lines[j]:
                n = int(re.search(r"\.locals\s+(\d+)", lines[j]).group(1))
                if n < 1:
                    lines[j] = re.sub(r"\.locals\s+\d+", ".locals 1", lines[j])
                lines[j + 1:j + 1] = injection
                inserted = True
                break
            if ".registers" in lines[j]:
                n = int(re.search(r"\.registers\s+(\d+)", lines[j]).group(1))
                if n < 3:
                    lines[j] = re.sub(r"\.registers\s+\d+", ".registers 3", lines[j])
                lines[j + 1:j + 1] = injection
                inserted = True
                break
        if not inserted:
            lines[start + 1:start + 1] = ["    .locals 1\n"] + injection
    else:
        m = re.search(r"\.super\s+(\S+)", content)
        supercls = m.group(1) if m else "Landroid/app/Activity;"
        method = [
            "\n.method protected onCreate(Landroid/os/Bundle;)V\n",
            "    .locals 1\n",
            '    const-string v0, "gadget"\n',
            "    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V\n",
            f"    invoke-super {{p0, p1}}, {supercls}->onCreate(Landroid/os/Bundle;)V\n",
            "    return-void\n",
            ".end method\n",
        ]
        insert_at = len(lines)
        for i, line in enumerate(lines):
            if line.strip() == "# virtual methods":
                insert_at = i
                break
        if insert_at == len(lines):
            for i, line in enumerate(lines):
                if line.strip().startswith(".method"):
                    insert_at = i
                    break
        lines[insert_at:insert_at] = method

    with open(smali_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    log(f"Injetado loadLibrary em {smali_path}")


def main():
    if len(sys.argv) < 3:
        print("Uso: frida_patcher.py <entrada.apk> <saida.apk> [versao_do_frida]")
        sys.exit(1)

    apk_in = os.path.abspath(sys.argv[1])
    apk_out = os.path.abspath(sys.argv[2])
    version = sys.argv[3] if len(sys.argv) > 3 else FRIDA_VERSION or DEFAULT_FRIDA_VERSION

    if not os.path.isfile(apk_in):
        print(f"Erro: {apk_in} não existe")
        sys.exit(1)

    apktool = find_apktool()

    with tempfile.TemporaryDirectory() as tmp:
        abi = detect_abi(apk_in)
        log(f"ABI detectada: {abi}")

        if len(sys.argv) <= 3 and not FRIDA_VERSION:
            latest = get_latest_version()
            if latest:
                version = latest
        log(f"Frida version: {version}")

        gadget_so = download_gadget(version, abi, tmp)

        decoded = os.path.join(tmp, "decoded")
        run(f'{apktool} d -f -o "{decoded}" "{apk_in}"')

        lib_dir = os.path.join(decoded, "lib", abi)
        os.makedirs(lib_dir, exist_ok=True)
        shutil.copy(gadget_so, os.path.join(lib_dir, "libgadget.so"))
        log(f"libgadget.so copiado para lib/{abi}/")

        xml, package = parse_manifest(os.path.join(decoded, "AndroidManifest.xml"))
        activity = find_launcher_activity(xml)
        if not activity:
            raise RuntimeError("Não foi possível encontrar a Activity launcher no AndroidManifest.xml")
        log(f"Activity launcher: {activity}")

        rel = class_to_smali_rel(activity, package)
        smali_path = find_smali_file(decoded, rel)
        if not smali_path:
            raise RuntimeError(f"Smali não encontrado para {rel}")
        inject_loadlibrary(smali_path)

        built = os.path.join(tmp, "built.apk")
        run(f'{apktool} b "{decoded}" -o "{built}"')

        signed = os.path.join(tmp, "signed.apk")
        ks = os.path.join(HOME, "debug.keystore")
        if not os.path.isfile(ks):
            raise RuntimeError("debug.keystore não encontrado. Rode o install.sh ou crie um keystore.")
        run(f'apksigner sign --ks "{ks}" --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out "{signed}" "{built}"')

        shutil.copyfile(signed, apk_out)
        log(f"APK patcheado e assinado: {apk_out}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[frida-patcher] ERRO: {e}", file=sys.stderr)
        sys.exit(1)
