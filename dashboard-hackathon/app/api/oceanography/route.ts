export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

const ERDDAP_BASE_URL = "https://www.ncei.noaa.gov/erddap";

// Types
export interface ERDDAPDataset {
  datasetID: string;
  title: string;
  summary: string;
  institution: string;
  infoUrl: string;
}

export interface ERDDAPDataPoint {
  time: string;
  latitude: number;
  longitude: number;
  [key: string]: number | string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const action = searchParams.get("action") || "search";
    const query = searchParams.get("query") || "";
    const datasetId = searchParams.get("datasetId");

    const minLat = searchParams.get("minLat");
    const maxLat = searchParams.get("maxLat");
    const minLon = searchParams.get("minLon");
    const maxLon = searchParams.get("maxLon");
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    const requestedVariables = searchParams.get("variables");

    // ------------------------------------------------------------
    // 🔍 ACTION: SEARCH — Dataset Search
    // ------------------------------------------------------------
    if (action === "search") {
      const searchUrl = `${ERDDAP_BASE_URL}/search/index.csv?page=1&itemsPerPage=200&searchFor=${encodeURIComponent(
        query
      )}`;

      // Timeout de 20 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch(searchUrl, {
          headers: { Accept: "text/csv" },
          cache: "no-store",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Se for erro 502/503/504, retornar erro mais amigável
          if (response.status >= 502 && response.status <= 504) {
            return NextResponse.json(
              { 
                error: "Servidor ERDDAP temporariamente indisponível. Tente novamente em alguns instantes.",
                errorCode: "ERDDAP_UNAVAILABLE",
                datasets: [] 
              },
              { status: 503 }
            );
          }
          throw new Error(
            `ERDDAP search failed: ${response.status} ${response.statusText}`
          );
        }

      const csvText = await response.text();

      // Parse CSV safely
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
      });

        const datasets: ERDDAPDataset[] = records.map((row: any) => ({
          datasetID: row["Dataset ID"] || row["datasetID"] || "",
          title: row["Title"] || "",
          summary: row["Summary"] || "",
          institution: row["Institution"] || "",
          infoUrl: row["Info"] || "",
        }));

        return NextResponse.json({ datasets });
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          return NextResponse.json(
            { 
              error: "Timeout ao buscar dados do ERDDAP. O servidor pode estar lento ou indisponível.",
              errorCode: "ERDDAP_TIMEOUT",
              datasets: [] 
            },
            { status: 504 }
          );
        }
        throw error;
      }
    }

    // ------------------------------------------------------------
    // 📄 ACTION: INFO — Extract variable names from ERDDAP info page
    // ------------------------------------------------------------
    if (action === "info" && datasetId) {
      const infoUrl = `${ERDDAP_BASE_URL}/info/${datasetId}/index.html`;

      const response = await fetch(infoUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch dataset info");

      const html = await response.text();

      const extractedVariables: string[] = [];
      const matches = html.match(/<td class="variableName">([^<]+)<\/td>/g);

      if (matches) {
        matches.forEach((m) => {
          const v = m.replace(/<[^>]+>/g, "").trim();
          if (!["time", "latitude", "longitude"].includes(v)) {
            extractedVariables.push(v);
          }
        });
      }

      return NextResponse.json({
        datasetId,
        variables: extractedVariables,
        infoUrl,
      });
    }

    // ------------------------------------------------------------
    // 📊 ACTION: DATA — Fetch actual dataset values
    // ------------------------------------------------------------
    if (action === "data" && datasetId) {
      let dataUrl = `${ERDDAP_BASE_URL}/tabledap/${datasetId}.csv?`;

      const varList = requestedVariables
        ? requestedVariables.split(",")
        : ["time", "latitude", "longitude"];

      dataUrl += varList.map((v) => encodeURIComponent(v)).join(",");

      const constraints: string[] = [];

      if (minLat && maxLat)
        constraints.push(`latitude>=${minLat}&latitude<=${maxLat}`);

      if (minLon && maxLon)
        constraints.push(`longitude>=${minLon}&longitude<=${maxLon}`);

      if (timeMin) constraints.push(`time>=${encodeURIComponent(timeMin)}`);
      if (timeMax) constraints.push(`time<=${encodeURIComponent(timeMax)}`);

      if (constraints.length > 0) {
        dataUrl += "&" + constraints.join("&");
      }

      dataUrl += '&orderBy("time")';

      const response = await fetch(dataUrl, {
        headers: { Accept: "text/csv" },
        cache: "no-store",
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(
          `ERDDAP data fetch failed: ${response.statusText} — ${err.slice(
            0,
            200
          )}`
        );
      }

      const csvText = await response.text();

      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
      });

      const data: ERDDAPDataPoint[] = records.map((r: any) => {
        const obj: ERDDAPDataPoint = {
          time: r.time || "",
          latitude: parseFloat(r.latitude) || 0,
          longitude: parseFloat(r.longitude) || 0,
        };

        for (const k of Object.keys(r)) {
          if (!["time", "latitude", "longitude"].includes(k)) {
            const n = Number(r[k]);
            obj[k] = isNaN(n) ? r[k] : n;
          }
        }

        return obj;
      });

      return NextResponse.json({
        headers: Object.keys(records[0] || {}),
        count: data.length,
        data,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("ERDDAP API ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Unknown API error" },
      { status: 500 }
    );
  }
}
