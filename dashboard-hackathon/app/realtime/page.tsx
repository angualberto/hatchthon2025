"use client";

import { useEffect, useState } from "react";
import { KPICard } from "../components/ui/KPICard";
import dynamic from 'next/dynamic';

const VisionControls = dynamic(() => import('../components/realtime/VisionControls'), { ssr: false });
import { Activity, AlertTriangle, Layers, Image as ImageIcon } from 'lucide-react';

type CameraMetrics = {
  timestamp: string;
  frame_id: number;
  metrics: Record<string, any>;
};

export default function RealtimePage() {
  const [data, setData] = useState<CameraMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/realtime-camera", { cache: "no-store" });
        const json = await res.json();
        if (json.error) {
          setError(json.error);
          setData(null);
        } else {
          setError(null);
          setData(json);
        }
      } catch (e) {
        setError("Erro ao buscar dados da câmera.");
        setData(null);
      }
    }

    // Busca inicial
    fetchMetrics();

    // Atualiza a cada 2 segundos
    const id = setInterval(fetchMetrics, 2000);

    return () => clearInterval(id);
  }, []);

  const riskColor =
    data?.metrics.risk_level === "high"
      ? "text-red-500"
      : data?.metrics.risk_level === "medium"
      ? "text-yellow-500"
      : "text-emerald-500";

  // tenta parar qualquer vídeo ativo (client-side)
  if (typeof window !== 'undefined') {
    const v = document.querySelector('video') as HTMLVideoElement | null;
    if (v && v.srcObject) {
      const ms = v.srcObject as MediaStream;
      ms.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <h1 className="text-2xl font-bold mb-4">
        HullGuard – Monitoramento em tempo real (câmera local)
      </h1>

      {error && (
        <div className="mb-4 rounded-md border border-yellow-500 bg-yellow-950/40 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Método"
          value={data ? (data.metrics.method ?? "—") : "--"}
          icon={Activity}
          trend={data ? 'neutral' : undefined}
          changeLabel={data ? `Frame #${data.frame_id}` : "aguardando dados"}
        />

        <KPICard
          title="Índice de bioincrustação"
          value={
            data && data.metrics.fouling_index !== undefined
              ? Number(data.metrics.fouling_index).toFixed(3)
              : "--"
          }
          icon={AlertTriangle}
          trend={'neutral'}
          changeLabel={"0 = limpo | 1 = muito sujo"}
        />

        <KPICard
          title="Cracas detectadas"
          value={data && data.metrics.cracas !== undefined ? String(data.metrics.cracas) : "--"}
          icon={Layers}
          trend={'neutral'}
          changeLabel={data && data.metrics.cracas_per_cm2 ? `${Number(data.metrics.cracas_per_cm2).toFixed(4)} /cm²` : ""}
        />

        <KPICard
          title="Área de fouling (cm²)"
          value={data && data.metrics.fouling_cm2 !== undefined ? `${Number(data.metrics.fouling_cm2).toFixed(2)} cm²` : "--"}
          icon={ImageIcon}
          trend={'neutral'}
          changeLabel={data && data.metrics.mask_area_fraction ? `cover ${Number(data.metrics.mask_area_fraction * 100).toFixed(2)}%` : ""}
        />
      </div>

      <div className="mt-6 mb-6">
        <VisionControls />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold mb-2">Detalhes técnicos</h2>
        <p className="text-sm text-slate-300 mb-2">
          Última atualização: {" "}
          {data?.timestamp
            ? new Date(data.timestamp).toLocaleString()
            : "—"}
        </p>

        {data && (
          <pre className="text-xs bg-slate-950/70 p-3 rounded-md overflow-auto max-h-80">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}

        {!data && !error && (
          <p className="text-sm text-slate-400">
            Aguardando primeiros dados do agente da câmera...
          </p>
        )}
      </div>
    </main>
  );
}
