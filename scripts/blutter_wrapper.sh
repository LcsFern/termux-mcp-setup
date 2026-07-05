#!/data/data/com.termux/files/usr/bin/python3
"""Blutter wrapper - Flutter reverse engineering tool.
Clone repo: git clone https://github.com/worawit/blutter ~/blutter
"""
import os, sys

BLUTTER_DIR = "/data/data/com.termux/files/home/blutter"
BLUTTER_PY = os.path.join(BLUTTER_DIR, "blutter.py")

if not os.path.exists(BLUTTER_PY):
    print("Blutter não encontrado. Clone o repo primeiro:")
    print("  git clone https://github.com/worawit/blutter ~/blutter")
    sys.exit(1)

os.chdir(BLUTTER_DIR)
os.execv(sys.executable, [sys.executable, BLUTTER_PY] + sys.argv[1:])
