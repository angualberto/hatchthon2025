import cv2
import time
import json
import os
from datetime import datetime

import numpy as np


def compute_fake_fouling_metrics(frame):
    """
    Aqui entra SUA IA de biofouling depois (U-Net, etc).
    Por enquanto, é só uma lógica de exemplo para ter algo rodando.
    """

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # "Rugosidade" simples com bordas Canny (proxy de incrustação)
    edges = cv2.Canny(gray, 100, 200)
    edge_density = float(np.mean(edges > 0))  # 0 a 1

    # Brilho médio (só pra enriquecer as features)
    brightness = float(np.mean(gray) / 255.0)  # 0 a 1

    # Fouling index fake (ajuste depois com seu modelo)
    fouling_index = edge_density * (1.0 - brightness)

    # Eficiência hidrodinâmica “fake"
    hydrodynamic_eff = max(0.0, 100.0 - fouling_index * 60.0)

    if fouling_index < 0.15:
        risk_level = "low"
    elif fouling_index < 0.35:
        risk_level = "medium"
    else:
        risk_level = "high"

    return {
        "fouling_index": fouling_index,
        "edge_density": edge_density,
        "brightness": brightness,
        "hydrodynamic_efficiency": hydrodynamic_eff,
        "risk_level": risk_level,
    }


def main():
    # Caminho do arquivo que o Next.js vai ler
    # você está rodando o Next dentro de ./dashboard-hackathon
    # então daqui ele vai enxergar ../data/camera_metrics.json
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(data_dir, exist_ok=True)
    metrics_path = os.path.join(data_dir, "camera_metrics.json")

    cap = cv2.VideoCapture(0)  # /dev/video0

    if not cap.isOpened():
        print("❌ Não foi possível abrir a câmera (/dev/video0).")
        return

    print("🎥 Lendo câmera em tempo quase real. CTRL+C para parar.")

    frame_id = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Falha ao capturar frame.")
                time.sleep(1)
                continue

            frame_id += 1

            metrics = compute_fake_fouling_metrics(frame)

            payload = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "frame_id": frame_id,
                "metrics": metrics,
            }

            # Salva para o dashboard consumir
            with open(metrics_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)

            # Mostra um preview simples da câmera (opcional)
            cv2.imshow("Camera HullGuard (preview local)", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            # Intervalo entre medições (ajuste pra ficar mais "tempo real")
            time.sleep(1.0)

    except KeyboardInterrupt:
        print("\nEncerrando agente de câmera...")

    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
