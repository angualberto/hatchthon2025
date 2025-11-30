import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Quando o Next roda, o process.cwd() é o diretório dashboard-hackathon
    const metricsPath = path.join(process.cwd(), "..", "data", "camera_metrics.json");

    if (!fs.existsSync(metricsPath)) {
      return NextResponse.json(
        { error: "Ainda não há dados da câmera. Rode o camera_agent.py." },
        { status: 200 }
      );
    }

    const raw = fs.readFileSync(metricsPath, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Erro ao ler camera_metrics.json:", err);
    return NextResponse.json(
      { error: "Falha ao ler métricas da câmera." },
      { status: 500 }
    );
  }
}
