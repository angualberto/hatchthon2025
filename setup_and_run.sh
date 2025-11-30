{
  "igi_now": 0.26,
  "igi_mean_fleet": 0.26,
  "price_LSHFO": 3500,
  "per_vessel": [
    {
      "id": "V001",
      "name": "RAFAEL SANTOS",
      "class": "Suezmax",
      "igi": 0.32,
      "status": "Alerta",
      "action": "Monitorar a cada inspeção",
      "consumo_base_tpd": 20.5,
      "delta_fuel_percent": 0.128, 
      "extra_cost_R$": 128000,
      "extra_co2_t": 42
    }
  ],
  "forecast_7d": [0.27, 0.28, 0.29, 0.30, 0.30, 0.29, 0.29],
  "updated_at": "2025-11-30T12:34:56Z"
}#!/usr/bin/env bash
set -euo pipefail

# setup_and_run.sh
# Script auxiliar para criar/ativar venv, instalar dependências e iniciar serviços localmente.
# Uso:
#  ./setup_and_run.sh --install       # cria .venv e instala dependências Python + npm install
#  ./setup_and_run.sh --start-agent   # inicia realtime_infer.py (usa .venv/python)
#  ./setup_and_run.sh --start-camera  # inicia camera_agent.py
#  ./setup_and_run.sh --start-next    # inicia Next dev server (dashboard-hackathon)
#  ./setup_and_run.sh --all           # instala tudo e inicia agente + next (em background)

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="$ROOT/.venv"
PY="$VENV/bin/python"
PIP="$VENV/bin/pip"
LOGDIR="$ROOT/logs"
mkdir -p "$LOGDIR"

function ensure_venv() {
  if [ ! -d "$VENV" ]; then
    echo "Criando venv em $VENV..."
    python3 -m venv "$VENV"
  fi
  # upgrade pip
  "$PIP" install --upgrade pip setuptools wheel
}

function install_python_deps() {
  if [ ! -f "$ROOT/requirements.txt" ]; then
    echo "Arquivo requirements.txt nao encontrado em $ROOT"
    return 1
  fi
  echo "Instalando dependências Python..."
  "$PIP" install -r "$ROOT/requirements.txt"
}

function install_node_deps() {
  if [ -f "$ROOT/dashboard-hackathon/package.json" ]; then
    echo "Instalando dependências Node (dashboard-hackathon)..."
    (cd "$ROOT/dashboard-hackathon" && npm install)
  else
    echo "Pasta dashboard-hackathon/package.json nao encontrada, pulando npm install"
  fi
}

function start_realtime_infer() {
  echo "Iniciando realtime_infer.py (logs em $LOGDIR/agent.log)"
  # se existir modelo, usa-o automaticamente
  MODEL="$ROOT/models/unet_best.pth"
  ARGS=(--use_barnacle)
  if [ -f "$MODEL" ]; then
    echo "Modelo encontrado: $MODEL (o script realtime_infer detecta automaticamente)"
    ARGS=(${ARGS[@]} --model "$MODEL")
  fi
  nohup "$PY" "$ROOT/realtime_infer.py" "${ARGS[@]}" > "$LOGDIR/agent.log" 2>&1 &
  echo $! > "$LOGDIR/agent.pid"
  echo "PID agente: $(cat $LOGDIR/agent.pid)"
}

function start_camera_agent() {
  echo "Iniciando camera_agent.py (logs em $LOGDIR/camera.log)"
  nohup "$PY" "$ROOT/camera_agent.py" > "$LOGDIR/camera.log" 2>&1 &
  echo $! > "$LOGDIR/camera.pid"
  echo "PID camera: $(cat $LOGDIR/camera.pid)"
}

function start_next() {
  if [ -f "$ROOT/dashboard-hackathon/package.json" ]; then
    echo "Iniciando Next dev (dashboard-hackathon) — logs em $LOGDIR/next.log"
    nohup bash -c "cd '$ROOT/dashboard-hackathon' && npm run dev" > "$LOGDIR/next.log" 2>&1 &
    echo $! > "$LOGDIR/next.pid"
    echo "PID next: $(cat $LOGDIR/next.pid)"
  else
    echo "dashboard-hackathon nao encontrado. Rode manualmente: cd dashboard-hackathon && npm run dev"
  fi
}

function usage() {
  cat <<EOF
Usage: $0 [--install] [--start-agent] [--start-camera] [--start-next] [--all]

--install        Create venv and install Python (+ npm) dependencies
--start-agent    Start realtime_infer.py (background)
--start-camera   Start camera_agent.py (background)
--start-next     Start Next dev server (dashboard-hackathon) in background
--all            install + start-agent + start-next
--help           show this help
EOF
}

if [ "$#" -eq 0 ]; then
  usage
  exit 0
fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    --install)
      ensure_venv
      install_python_deps
      install_node_deps
      shift
      ;;
    --start-agent)
      ensure_venv
      start_realtime_infer
      shift
      ;;
    --start-camera)
      ensure_venv
      start_camera_agent
      shift
      ;;
    --start-next)
      install_node_deps
      start_next
      shift
      ;;
    --all)
      ensure_venv
      install_python_deps
      install_node_deps
      start_realtime_infer
      start_next
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done
