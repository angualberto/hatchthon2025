"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/Card";
import { Activity, Image as ImageIcon } from "lucide-react";

export interface CameraMetrics {
  igi: number;
  coverage: number;
  confidence: number;
  cracas?: number;
  cracas_per_cm2?: number;
}

interface Props {
  onDataUpdate?: (metrics: CameraMetrics) => void;
}

export default function CameraFeed({ onDataUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [maskMode, setMaskMode] = useState<'overlay' | 'colormap' | 'maskImage'>('overlay');
  const [contours, setContours] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [cracasPoints, setCracasPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [igiHistory, setIgiHistory] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState("Aguardando câmera");
  const [igi, setIgi] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [cracas, setCracas] = useState<number | null>(null);
  const [cracasPerCm2, setCracasPerCm2] = useState<number | null>(null);
  const [coverage, setCoverage] = useState<number | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  // (showOverlay already declared above)
  // const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [showContours, setShowContours] = useState<boolean>(true);

  // Small sparkline component
  const Sparkline: React.FC<{ data: number[]; width?: number; height?: number }> = ({ data, width = 120, height = 28 }) => {
    const d = data.length ? data : [0];
    const min = Math.min(...d);
    const max = Math.max(...d);
    const range = max - min || 1;
    const points = d.map((v, i) => {
      const x = (i / Math.max(1, d.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    });
    const poly = points.join(' ');
    return (
      <svg width={width} height={height} className="inline-block align-middle">
        <polyline fill="none" stroke="#22c55e" strokeWidth={1.5} points={poly} />
      </svg>
    );
  };

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!mounted) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStatus("Câmera ativa");
      } catch (e) {
        console.error(e);
        setStatus("Permita o acesso à câmera");
      }
    }

    function stopCamera() {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setStatus("Câmera parada");
    }

    if (isStreaming) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [isStreaming]);

  useEffect(() => {
    // WebSocket connect + reconnection
    let shouldReconnect = true;
    let reconnectTimer: number | null = null;

    function connect() {
      const ws = new WebSocket("ws://localhost:8501/video");
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        setStatus("Conectado ao servidor IA");
      };
      ws.onmessage = (ev) => {
        try {
          const j = JSON.parse(ev.data);
          if (typeof j.igi === "number") {
            setIgi(j.igi);
            setCoverage(j.coverage ?? null);
            setConfidence(j.confidence ?? null);
            setCracas(j.cracas ?? null);
            setCracasPerCm2(j.cracas_per_cm2 ?? null);
            if (onDataUpdate) onDataUpdate({ igi: j.igi, coverage: j.coverage ?? 0, confidence: j.confidence ?? 0, cracas: j.cracas ?? 0, cracas_per_cm2: j.cracas_per_cm2 ?? 0 } as any);
            // push to history (keep last 60)
            setIgiHistory((h) => {
              const nh = h.concat([j.igi || 0]).slice(-60);
              return nh;
            });
          }
          if (j.mask) {
            // mask is base64 jpeg/png data
            setMaskPreview(j.mask.startsWith("data:") ? j.mask : `data:image/png;base64,${j.mask}`);
          }
          // optional: server may send contours or cracas_points
          if (j.contours) {
            try {
              // expected format: array of polygons, each polygon is array of [x,y] in either absolute px or normalized 0..1
              const parsed = (j.contours as any[]).map((poly) =>
                (poly as any[]).map((p) => ({ x: Number(p[0]), y: Number(p[1]) }))
              );
              setContours(parsed);
            } catch (e) {
              console.warn('Failed parsing contours', e);
            }
          } else {
            setContours([]);
          }
          if (j.cracas_points) {
            try {
              const pts = (j.cracas_points as any[]).map((p) => ({ x: Number(p[0]), y: Number(p[1]) }));
              setCracasPoints(pts);
            } catch (e) {
              console.warn('Failed parsing cracas_points', e);
            }
          } else {
            setCracasPoints([]);
          }
        } catch (e) {
          console.error("Invalid message from ws", e);
        }
      };
      ws.onclose = () => {
        setConnected(false);
        setStatus("Conexão perdida. Reconectando...");
        if (shouldReconnect) {
          reconnectTimer = window.setTimeout(connect, 5000);
        }
      };
      ws.onerror = (ev) => {
        console.warn("WebSocket error", ev);
        ws.close();
      };
    }

    if (isStreaming) connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          /* ignore */
        }
        wsRef.current = null;
      }
    };
  }, [onDataUpdate, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      // cada 400ms captura frame, redimensiona para 256x256 e envia base64 via WS
      const video = videoRef.current;
      if (!video) return;
      if (video.readyState < 2) return; // HAVE_CURRENT_DATA
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // draw scaled video to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // export as jpeg base64
      canvas.toBlob(
        (blob: Blob | null) => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string | ArrayBuffer | null;
            if (!res || typeof res !== 'string') return;
            const base64 = res.split(",")[1];
            // send via ws
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ frame: base64 }));
              setStatus("Processando...");
            }
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.8
      );
    }, 400);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // draw mask overlay on video when maskPreview changes
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    // function to resize overlay to match video display size
    function resize() {
      if (!video || !overlay) return;
      const v = video as HTMLVideoElement;
      const o = overlay as HTMLCanvasElement;
      const rect = v.getBoundingClientRect();
      o.width = Math.max(1, Math.floor(rect.width));
      o.height = Math.max(1, Math.floor(rect.height));
      o.style.width = `${rect.width}px`;
      o.style.height = `${rect.height}px`;
    }

    resize();
    window.addEventListener('resize', resize);

    if (!maskPreview || !showOverlay) {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      return () => window.removeEventListener('resize', resize);
    }

    const img = new Image();
    img.onload = () => {
      // draw mask image fitted to overlay, semi-transparent OR apply colormap
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const iw = img.width;
      const ih = img.height;
      const sx = overlay.width / iw;
      const sy = overlay.height / ih;

      if (maskMode === 'maskImage') {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(img, 0, 0, overlay.width, overlay.height);
        ctx.globalAlpha = 1.0;
      } else if (maskMode === 'colormap') {
        // draw to offscreen, recolor mask to red where mask>0
        const off = document.createElement('canvas');
        off.width = iw;
        off.height = ih;
        const offctx = off.getContext('2d');
        if (offctx) {
          offctx.drawImage(img, 0, 0);
          const id = offctx.getImageData(0, 0, iw, ih);
          const d = id.data;
          // assume grayscale mask: check luminance
          for (let i = 0; i < d.length; i += 4) {
            const lum = d[i];
            if (lum > 10) {
              // set red
              d[i] = 255;
              d[i + 1] = 0;
              d[i + 2] = 0;
              d[i + 3] = 160; // alpha
            } else {
              d[i + 3] = 0; // transparent
            }
          }
          offctx.putImageData(id, 0, 0);
          // draw scaled colored mask
          ctx.drawImage(off, 0, 0, overlay.width, overlay.height);
        }
      } else {
        // default: overlay mode
        ctx.globalAlpha = 0.6;
        ctx.drawImage(img, 0, 0, overlay.width, overlay.height);
        ctx.globalAlpha = 1.0;
      }

      // draw contours and cracas points on top if enabled
      if (showContours) {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00FF88';
        ctx.fillStyle = '#00FF88';
        // map function for points (handles normalized coords)
        const mapPoint = (p: { x: number; y: number }) => {
          let mx = p.x;
          let my = p.y;
          if (mx <= 1 && my <= 1) {
            // normalized
            mx = mx * overlay.width;
            my = my * overlay.height;
          } else {
            // absolute in mask pixels -> scale
            mx = mx * sx;
            my = my * sy;
          }
          return { x: mx, y: my };
        };

        // draw polygons
        contours.forEach((poly) => {
          if (!poly.length) return;
          ctx.beginPath();
          const p0 = mapPoint(poly[0]);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < poly.length; i++) {
            const pp = mapPoint(poly[i]);
            ctx.lineTo(pp.x, pp.y);
          }
          ctx.closePath();
          ctx.stroke();
        });

        // draw points for cracas
        cracasPoints.forEach((pt) => {
          const m = mapPoint(pt);
          ctx.beginPath();
          ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }
    };
    img.onerror = () => {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    };
    img.src = maskPreview.startsWith('data:') ? maskPreview : `data:image/png;base64,${maskPreview}`;

    return () => {
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    };
  }, [maskPreview, showOverlay]);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5" />
            <CardTitle>Câmera — Casco / IA em tempo real</CardTitle>
          </div>
          <div className="text-sm text-slate-400">{status}</div>
          <div className="flex items-center gap-2">
            <button
              className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600"
              onClick={() => {
                // toggle streaming
                const next = !isStreaming;
                setIsStreaming(next);
                if (!next) {
                  // closing: clear metrics and close ws
                  setMaskPreview(null);
                  setIgi(null);
                  setConfidence(null);
                  setCoverage(null);
                  setCracas(null);
                  setCracasPerCm2(null);
                  if (wsRef.current) {
                    try {
                      wsRef.current.close();
                    } catch (e) {
                      /* ignore */
                    }
                    wsRef.current = null;
                  }
                } else {
                  setStatus("Reconectando...");
                }
              }}
            >
              {isStreaming ? "Parar" : "Iniciar"}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="rounded-lg overflow-hidden border border-slate-700 relative">
              <video ref={videoRef} className="w-full h-auto max-h-80 bg-black" playsInline muted />
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{igi !== null ? igi.toFixed(2) : "--"}</div>
                <div className="text-sm text-slate-400">IGI estimado</div>
                <div className="mt-1">
                  <Sparkline data={igiHistory} width={120} height={28} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">{confidence !== null ? `${(confidence * 100).toFixed(0)}%` : "--"}</div>
                <div className="text-sm text-slate-400">Confiança</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{coverage !== null ? `${(coverage * 100).toFixed(1)}%` : "--"}</div>
                <div className="text-sm text-slate-400">Cobertura</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{cracas !== null ? String(cracas) : "--"}</div>
                <div className="text-sm text-slate-400">Cracas detectadas</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{cracasPerCm2 !== null ? (cracasPerCm2).toFixed(3) : "--"}</div>
                <div className="text-sm text-slate-400">Cracas / cm²</div>
              </div>
              <div />
            </div>
          </div>

          <div className="w-56 flex-shrink-0">
            <div className="text-sm text-slate-300 mb-2">Pré‑visualização da máscara</div>
            <div className="rounded-md border border-slate-700 overflow-hidden h-56 w-56 bg-black flex items-center justify-center">
              {maskPreview ? (
                <img src={maskPreview} alt="mask" className="object-cover w-full h-full" />
              ) : (
                <div className="text-xs text-slate-500">Guardando máscaras...</div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Mostrar sobreposição</label>
                <input type="checkbox" checked={showOverlay} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowOverlay(e.target.checked)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Mostrar contornos</label>
                <input type="checkbox" checked={showContours} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowContours(e.target.checked)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Modo da máscara</label>
                <select value={maskMode} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMaskMode(e.target.value as any)} className="w-full mt-1 text-xs bg-slate-800 rounded px-2 py-0.5">
                  <option value="overlay">Sobreposição</option>
                  <option value="maskImage">Imagem</option>
                  <option value="colormap">Colormap (vermelho)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
