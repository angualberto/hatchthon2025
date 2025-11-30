# Hatchthon2025 — Dashboard Hackathon Transpetro

Resumo rápido do repositório e instruções para rodar os componentes principais.

## Estrutura principal

- `dashboard-hackathon/` — aplicação Next.js (app router) com UI do dashboard e componentes realtime.
	- `app/components/realtime/CameraFeed.tsx` — componente que captura câmera no navegador e envia frames por WebSocket.
	- `app/api/vision/train/route.ts` — rota API para iniciar treinamento (scripts Python).

- `src/` — código auxiliar e servidor WebSocket para inferência realtime (ex.: `src/dashboard/hullguard_realtime_server.py`).
- `train_unet.py`, `realtime_infer.py`, `vision_utils.py`, `barnacle_detector.py`, `coco_to_mask.py` — scripts Python para treinar/inferir máscaras e detectar cracas.
- `camera_agent.py` — agente Python que gera métricas fake e grava em `data/camera_metrics.json`.
- `models/` — checkpoints de modelos (ex.: `models/unet_best.pth`).
- `data/` — arquivos de entrada/saída (ex.: outputs, csvs).
- `logs/` — logs gerados durante execução (train/next/etc.).

## Como rodar (rápido)

1. Ative o ambiente Python e instale dependências:

```bash
cd /home/angualberto/Documentos/dashboard_hackathon_transpetro-master
source .venv/bin/activate
pip install -r requirements.txt
```

2. Inicie o servidor WebSocket de IA (aceita frames em `ws://localhost:8501/video`):

```bash
python3 src/dashboard/hullguard_realtime_server.py --host 0.0.0.0 --port 8501
```

3. Inicie o frontend Next.js:

```bash
cd dashboard-hackathon
npm install   # só se necessário
npm run dev
# abra http://localhost:3000/realtime
```

4. Para treinar o U‑Net (exemplo):

```bash
cd /home/angualberto/Documentos/dashboard_hackathon_transpetro-master
python3 train_unet.py --epochs 5
```

## Notas e recomendações

- Ajuste `camera_agent.py` ou o servidor WebSocket para calibração (cm²/pixel) para obter `cracas / cm²` corretos.
- Se o push Git falhar por autenticação, crie um GitHub Personal Access Token e use-o como senha ao fazer push HTTPS, ou configure SSH.

---
Gerado automaticamente pelo assistente para facilitar testes locais e documentação inicial.