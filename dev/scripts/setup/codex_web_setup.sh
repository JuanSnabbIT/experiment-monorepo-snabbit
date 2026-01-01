#!/usr/bin/env bash
# Setup Script para Codex Web – Backend (Django) + Frontend (Node)

set -euo pipefail

echo "[Codex] Instalando dependencias Backend (Django)…"
cd backend

pip install --upgrade pip wheel
pip install -r req.txt

echo "[Codex] Aplicando migraciones…"
python manage.py migrate --noinput || echo "[Codex] WARNING: Migraciones no aplicadas (posible falta de variables)"

cd ..

echo "[Codex] Instalando dependencias Frontend…"
cd frontend

if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

cd ..

echo "[Codex] Setup completado exitosamente."
