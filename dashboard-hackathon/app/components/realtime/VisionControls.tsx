"use client";

import React, { useEffect, useState } from 'react';

export default function VisionControls() {
  const [status, setStatus] = useState<{ training: boolean; pid?: number; model_exists?: boolean; last_log?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/vision/train');
      const j = await res.json();
      setStatus(j);
    } catch (e) {
      setStatus({ training: false });
    }
  }

  async function startTrain() {
    setLoading(true);
    try {
      const res = await fetch('/api/vision/train', { method: 'POST' });
      const j = await res.json();
      await fetchStatus();
      if (j.started) alert('Treino iniciado (PID ' + j.pid + ') — veja logs em ./logs/train.log');
      else if (j.reason === 'already_running') alert('Treino já está em execução (PID ' + j.pid + ')');
      else if (j.error) alert('Erro: ' + j.error);
    } catch (e) {
      alert('Falha ao iniciar treino: ' + String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="p-3 border rounded bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Visão Computacional (U-Net)</div>
        <div className="text-xs text-slate-400">{status?.training ? 'Treinando' : 'Ocioso'}</div>
      </div>

      <div className="text-xs text-slate-300 mb-2">Modelo salvo: {status?.model_exists ? 'sim' : 'não'}</div>

      <div className="flex gap-2">
        <button className="px-2 py-1 bg-emerald-600 rounded text-xs" onClick={startTrain} disabled={loading || status?.training}>
          {loading ? 'Iniciando...' : 'Iniciar treino (5 épocas)'}
        </button>
        <button
          className="px-2 py-1 bg-slate-600 rounded text-xs"
          onClick={() => {
            if (status?.last_log) {
              // open small window with log
              const w = window.open('', '_blank', 'width=800,height=600');
              if (w) {
                w.document.title = 'train.log';
                w.document.body.style.background = '#0f172a';
                w.document.body.style.color = '#e6eef8';
                const pre = w.document.createElement('pre');
                pre.style.whiteSpace = 'pre-wrap';
                pre.style.fontFamily = 'monospace';
                pre.textContent = status.last_log;
                w.document.body.appendChild(pre);
              }
            } else alert('Nenhum log disponível.');
          }}
        >
          Ver logs
        </button>
      </div>
    </div>
  );
}
