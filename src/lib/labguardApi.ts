// src/lib/labguardApi.ts
import type { LabReport, LabRow } from "@/types";

export interface LabGuardChatResponse {
  question?: string;
  answer: string;
  timestamp: string;
}

const API_BASE_URL = "http://localhost:8000";

/**
 * Pretvara sve izvještaje u listu "ravnih" redova koju backend očekuje.
 */
function flattenReportsToRows(reports: LabReport[]): any[] {
  if (!reports || reports.length === 0) return [];

  return reports.flatMap((r) =>
    (r.rows || []).map((row: LabRow) => ({
      analit: row.Analit,
      value: row.Vrijednost,
      unit: row.Jedinica,
      ref_low: row.Ref_low,
      ref_high: row.Ref_high,
      status: row.Status,
      // probamo više tipičnih polja za datum, pa fallback na r.date
      date:
        (r as any).date ??
        (r as any).Date ??
        (r as any).datum ??
        (r as any).Datum ??
        r.date,
    }))
  );
}

export async function askLabGuard(
  question: string,
  reports: LabReport[]
): Promise<LabGuardChatResponse> {
  const rowsPayload = flattenReportsToRows(reports);

  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      lab_rows: rowsPayload,
    }),
  });

  if (!res.ok) {
    throw new Error(`LabGuard API error: ${res.status}`);
  }

  return res.json();
}
