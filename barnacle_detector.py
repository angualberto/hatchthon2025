"""Detector simples de cracas usando morfologia + contornos.

Funções principais:
- process_frame(frame, cm2_per_pixel=..., area_px_min=20, area_px_max=2000)
- compute_cm2_per_pixel(fov_deg, distance_cm, w_px, h_px)

Retorna frame anotado e KPIs (cracas, fouling_percent, cracas_por_cm2, fouling_cm2) e máscara.
"""
from __future__ import annotations

import math
import numpy as np
import cv2


def compute_cm2_per_pixel(fov_deg: float, distance_cm: float, w_px: int, h_px: int) -> float:
    """Calcula cm^2 por pixel a partir de FOV horizontal (graus), distância em cm e resolução.

    Fórmula:
      width_m = 2 * distance_m * tan(fov/2)
      height_m = width_m * (h_px / w_px)
      area_m2 = width_m * height_m
      cm2_per_pixel = (area_m2 * 10000) / (w_px * h_px)
    """
    distance_m = float(distance_cm) / 100.0
    fov_rad = math.radians(float(fov_deg))
    width_m = 2.0 * distance_m * math.tan(fov_rad / 2.0)
    height_m = width_m * (h_px / w_px)
    area_m2 = width_m * height_m
    cm2_per_pixel = (area_m2 * 10000.0) / (w_px * h_px)
    return float(cm2_per_pixel)


def process_frame(frame: np.ndarray, cm2_per_pixel: float = 0.0025, area_px_min: int = 20, area_px_max: int = 2000):
    """Processa um frame e detecta cracas por morfologia e contornos.

    Retorna: annotated_frame, cracas, fouling_percent, cracas_por_cm2, fouling_cm2, mask
    """
    try:
        h, w = frame.shape[:2]

        # Conversão e pré-processamento
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (7, 7), 0)

        # Detecção de regiões escuras/irregulares = cracas
        _, mask = cv2.threshold(blur, 100, 255, cv2.THRESH_BINARY_INV)

        # Remover ruído
        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)

        # Encontrar contornos
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        cracas = 0
        total_area = h * w
        fouling_area = 0.0

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area_px_min < area < area_px_max:
                cracas += 1
                fouling_area += area
                (x, y, rw, rh) = cv2.boundingRect(cnt)
                cv2.rectangle(frame, (x, y), (x + rw, y + rh), (0, 0, 255), 1)

        fouling_cm2 = fouling_area * cm2_per_pixel

        fouling_percent = (fouling_area / float(total_area)) * 100.0 if total_area > 0 else 0.0
        cracas_por_cm2 = cracas / max(fouling_cm2, 1e-9)

        # gerar mapa de calor simples a partir da máscara (normalizado)
        heat = cv2.normalize(mask, None, 0, 255, cv2.NORM_MINMAX)
        heatmap = cv2.applyColorMap(heat.astype(np.uint8), cv2.COLORMAP_JET)

        # Anotações de texto
        cv2.putText(frame, f"Cracas: {cracas}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.putText(frame, f"Sujeira: {fouling_percent:.1f}%", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
        cv2.putText(frame, f"Cracas/cm^2: {cracas_por_cm2:.3f}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 255), 2)

        return frame, cracas, fouling_percent, cracas_por_cm2, fouling_cm2, mask, heatmap

    except Exception as e:
        # em caso de erro, retornar valores neutros
        try:
            import logging
            logging.error(f"Erro no processamento do frame: {e}")
        except Exception:
            pass
        return frame, 0, 0.0, 0.0, 0.0, np.zeros(frame.shape[:2], dtype=np.uint8), np.zeros_like(frame)


def count_cracas_from_mask(mask: np.ndarray, cm2_per_pixel: float = 0.0025, area_px_min: int = 20, area_px_max: int = 2000):
    """Conta cracas e área de fouling a partir de uma máscara binária (0/255 ou 0/1).

    Retorna (cracas_count, fouling_area_px, fouling_area_cm2)
    """
    if mask is None:
        return 0, 0.0, 0.0
    # ensure binary 0/255
    m = mask.copy()
    if m.dtype != np.uint8:
        m = (m > 0).astype(np.uint8) * 255
    else:
        m = (m > 0).astype(np.uint8) * 255

    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cracas = 0
    fouling_area = 0.0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area_px_min < area < area_px_max:
            cracas += 1
            fouling_area += area

    fouling_cm2 = fouling_area * float(cm2_per_pixel)
    return int(cracas), float(fouling_area), float(fouling_cm2)


if __name__ == "__main__":
    print("Módulo barnacle_detector carregado. Use process_frame() a partir do seu agente.")
