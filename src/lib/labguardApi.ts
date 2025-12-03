import { LabReport } from "@/types";

export interface LabGuardResponse {
  answer: string;
  timestamp: string;
  highlightAnalytes: string[];
}

interface LabRowPayload {
  analit: string;
  value: number | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  status: string | null;
  date: string;
  source: string | null;
}

/**
 * Flatten svih izvještaja u niz redova koje backend može da koristi
 * za trendove / tumačenje.
 */
function flattenReportsToLabRows(reports: LabReport[]): LabRowPayload[] {
  const rows: LabRowPayload[] = [];

  for (const report of reports) {
    const date = report.date;
    const source =
      (report.sourceFiles && report.sourceFiles[0]) || report.id || null;

    for (const row of report.rows || []) {
      const name = row.Analit?.trim();
      if (!name) continue;

      const value =
        row.Vrijednost == null || Number.isNaN(row.Vrijednost)
          ? null
          : row.Vrijednost;

      rows.push({
        analit: name,
        value,
        unit: row.Jedinica?.trim() || null,
        ref_low:
          row.Ref_low == null || Number.isNaN(row.Ref_low) ? null : row.Ref_low,
        ref_high:
          row.Ref_high == null || Number.isNaN(row.Ref_high)
            ? null
            : row.Ref_high,
        status: row.Status ?? null,
        date,
        source,
      });
    }
  }

  return rows;
}

/**
 * Poziv AI-bota.
 * Vraća čist odgovor + listu analita koje treba vizuelno istaknuti.
 */
export async function askLabGuard(
  question: string,
  reports: LabReport[]
): Promise<LabGuardResponse> {
  const lab_rows = flattenReportsToLabRows(reports);

  const res = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      lab_rows,
    }),
  });

  if (!res.ok) {
    throw new Error(`LabGuard API error: ${res.status}`);
  }

  const data: any = await res.json();

  let highlight: string[] =
    data.highlight_analytes || data.highlightAnalytes || [];

  if (!Array.isArray(highlight)) {
    highlight = [];
  }

  // Fallback: ako backend još ne šalje highlight listu,
  // pokušaj lokalno da nađeš analite pomenute u pitanju.
  if (highlight.length === 0 && lab_rows.length > 0) {
    const lowerQ = question.toLowerCase();
    const uniqueNames = Array.from(
      new Set(
        lab_rows
          .map((r) => r.analit)
          .filter((n): n is string => typeof n === "string" && n.trim() !== "")
      )
    );

    const matched = uniqueNames.filter((name) => {
      const lowered = name.toLowerCase();
      const firstWord = lowered.split(/[ ,(/]+/)[0]; // "gvožđe", "hemoglobin"...
      return lowerQ.includes(firstWord);
    });

    highlight = matched.slice(0, 4);
  }

  return {
    answer: typeof data.answer === "string" ? data.answer : "",
    timestamp:
      typeof data.timestamp === "string"
        ? data.timestamp
        : new Date().toISOString(),
    highlightAnalytes: highlight,
  };
}
