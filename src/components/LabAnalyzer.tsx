import React, { useMemo, useRef, useState } from "react";
import { getCurrentSession, appendReport } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { LabRow } from "@/types";

// @ts-ignore – Vite bundluje worker u URL string
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = pdfWorker as string;

/** ===== Tipovi ===== */
type Row = {
  Analit: string;
  Vrijednost: number | null;
  Jedinica: string;
  Ref_low: number | null;
  Ref_high: number | null;
  Status: string;
  Datum?: string;   // dd.mm.yyyy (auto iz PDF-a)
  Source?: string;
  Linija?: string;
};

const columns: { key: keyof Row; label: string }[] = [
  { key: "Analit", label: "Analit" },
  { key: "Vrijednost", label: "Vrijednost" },
  { key: "Jedinica", label: "Jedinica" },
  { key: "Ref_low", label: "Ref low" },
  { key: "Ref_high", label: "Ref high" },
  { key: "Status", label: "Status" },
  { key: "Datum", label: "Datum" },
  { key: "Source", label: "Izvor" },
];

/** ===== Helpers ===== */
const SUPERS_IN = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUPERS_OUT = "0123456789";
const NUM = String.raw`[-+]?\d+(?:[.,]\d+)?`;
const UNIT = String.raw`(?:10(?:[\*\^]?\d+)\/L|10(?:[\*\^]?\d+)\/(?:µL|uL)|mmol\/L|[µu]mol\/L|g\/L|L\/L|fL|pg|%|s|mm\/h|\/(?:µL|uL))`;
const UNIT_RE = new RegExp(UNIT);

// (a) val-first + prefiks, (b) name-first, (c) val-first bez prefiksa (npr. Gvožđe)
const PAT_VAL_FIRST = new RegExp(
  `^(?<val>${NUM})\\s+(?<un>${UNIT})\\s*(?<low>${NUM})\\s*-\\s*(?<high>${NUM})\\s+(?<an>[A-ZČĆŠĐŽ]-[A-Za-zČĆŠĐŽčćšđž\\.\\-% ]+)$`
);
const PAT_NAME_FIRST = new RegExp(
  `^(?<an>[A-Za-zČĆŠĐŽčćšđž][A-Za-zČĆŠĐŽčćšđž\\.\\-% ]+?)\\s+(?<val>${NUM})\\s+(?<low>${NUM})\\s*-\\s*(?<high>${NUM})\\s+(?<un>${UNIT})$`
);
const PAT_VAL_FIRST_NOPREFIX = new RegExp(
  `^(?<val>${NUM})\\s*(?<un>${UNIT})\\s*(?<low>${NUM})\\s*-\\s*(?<high>${NUM})\\s*(?<an>[A-Za-zČĆŠĐŽčćšđž][A-Za-zČĆŠĐŽčćšđž\\.\\-% ]+)$`
);

const ADMIN_PATTERNS = [
  /napomena:.*/i,
  /izvje[sš]taj\s+kontrolisa[oa]:.*/i,
  /specijalista\s+klini[čc]ke\s+biohemije.*/i,
  /rezultati\s+analiza\s+su\s+kompjuterski\s+[a-z\s]+va[žz]e\s+bez\s+potpisa\s+i\s+pe[čc]ata\.?/i,
  /datum\s+izdavanja\s+nalaza:.*/i, // datum vadimo prije stripovanja
  /poliklinika\s+mojlab.*/i,
  /laboratorija.*moskovska.*/i,
  /tel:\s*[\+\d,\s]+/i,
  /dom\s+zdravlja.*/i,
  /centar\s+za\s+laboratorijsku\s+dijagnostiku.*/i,
  /duplikat\s+kona[nm]og\s+nalaza.*/i,
];
const PAGE_NUM_RE = /^\s*\d+\s*\/\s*\d+\s*$/i;
const EMPTY_ADMIN_LINE = /^\s*(konstituent|rezultat|referentni\s+interval|jedinica|metoda\s+ispitivanja|jm|ref\.?vr|analiza)\s*$/i;

function translateSupers(s: string) {
  let out = "";
  for (const ch of s) {
    const i = SUPERS_IN.indexOf(ch);
    out += i >= 0 ? SUPERS_OUT[i] : ch;
  }
  return out;
}
function normalize(raw: string): string {
  if (!raw) return "";
  let t = translateSupers(raw).replace(/\u00B5/g, "µ");
  t = t.replace(/[–—]/g, "-").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
  return t.trim();
}

// Izvuci datum (prefer: "Datum izdavanja nalaza:", fallback: prva dd.mm.yyyy)
function extractDate(text: string): string | undefined {
  const m1 = /datum\s+izdavanja\s+nalaza:\s*(\d{2}\.\d{2}\.\d{4}\.)/i.exec(text);
  if (m1) return m1[1].replace(/\.$/, "");
  const m2 = /\b(\d{2}\.\d{2}\.\d{4})\b/.exec(text);
  if (m2) return m2[1];
  return undefined;
}
function stripAdminBlocks(t: string): string {
  let text = t;
  for (const pat of ADMIN_PATTERNS) text = text.replace(pat, " ");
  const cleaned: string[] = [];
  for (const ln of text.split("\n")) {
    const s = ln.trim();
    if (!s) continue;
    if (PAGE_NUM_RE.test(s)) continue;
    if (EMPTY_ADMIN_LINE.test(s)) continue;
    cleaned.push(ln);
  }
  return cleaned.join("\n").replace(/[ \t]+/g, " ").trim();
}
function toFloat(x: any): number | null {
  if (x == null) return null;
  const n = parseFloat(String(x).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}
function statusOf(v: number | null, lo: number | null, hi: number | null): string {
  if (v == null || lo == null || hi == null) return "";
  if (v < lo) return "⬇️ below";
  if (v > hi) return "⬆️ above";
  return "✅ in-range";
}
function cleanName(an: string): string {
  let name = (an || "").replace(/^[A-ZČĆŠĐŽ]-\s*/i, "").trim();
  name = name.replace(new RegExp(UNIT + String.raw`\s*$`), "");
  return name.replace(/\s+/g, " ").trim();
}

// dd.mm.yyyy -> yyyy-mm-dd
function dmyToISO(dmy?: string): string | null {
  if (!dmy) return null;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dmy.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseTextToRows(text: string, source: string, datum?: string): Row[] {
  const rows: Row[] = [];
  for (const line of text.split("\n")) {
    const s = line.split(" ").filter(Boolean).join(" ").trim();
    if (!s || !/\d/.test(s) || (!UNIT_RE.test(s) && !s.includes("%"))) continue;

    const m = PAT_VAL_FIRST.exec(s) || PAT_NAME_FIRST.exec(s) || PAT_VAL_FIRST_NOPREFIX.exec(s);
    if (!m || !m.groups) continue;

    const g = m.groups as Record<string, string>;
    const name = cleanName(g["an"]);
    const val = toFloat(g["val"]);
    const low = toFloat(g["low"]);
    const high = toFloat(g["high"]);
    const unit = (g["un"] || "").replace("^", "*").replace("umol", "µmol");
    const status = statusOf(val, low, high);

    rows.push({ Analit: name, Vrijednost: val, Jedinica: unit, Ref_low: low, Ref_high: high, Status: status, Datum: datum, Linija: line, Source: source });
  }
  const by = new Map<string, Row>();
  rows
    .sort((a, b) => (a.Analit + (a.Ref_low ?? "")).localeCompare(b.Analit + (b.Ref_low ?? "")))
    .forEach((r) => { if (!by.has(r.Analit)) by.set(r.Analit, r); });
  return Array.from(by.values());
}

/** ===== PDF -> tekst ===== */
async function pdfFileToText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let pageText = "";
    for (const it of (content.items as any[])) {
      const s = (it?.str as string) || "";
      const hasEOL = Boolean((it as any)?.hasEOL);
      pageText += s + (hasEOL ? "\n" : " ");
    }
    out += pageText + "\n";
  }
  return out;
}

/** ===== React komponenta ===== */
export default function LabAnalyzer() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [onlyOut, setOnlyOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => (onlyOut ? rows.filter((r) => /⬆️|⬇️/.test(r.Status)) : rows), [rows, onlyOut]);

  // upis u “bazu” (localStorage) ako je korisnik prijavljen
  function saveReportForCurrentUser(parsedRows: Row[], fileNames: string[]) {
    const session = getCurrentSession();
    if (!session || parsedRows.length === 0) return;

    // uzmi prvi nađeni datum (dd.mm.yyyy) i pretvori u ISO; fallback: današnji datum
    const firstDmy = parsedRows.find(r => r.Datum)?.Datum;
    const iso = dmyToISO(firstDmy || "") || new Date().toISOString().slice(0, 10);

    appendReport(session.userId, {
      id: uuid(),
      date: iso,
      sourceFiles: fileNames,
      rows: parsedRows as LabRow[],
    });
  }

  async function handleParse() {
    setError(null);
    setRows([]);
    if (!files || files.length === 0) { setError("Dodaj bar jedan PDF fajl."); return; }
    setLoading(true);
    try {
      const all: Row[] = [];
      for (const f of Array.from(files)) {
        const raw = await pdfFileToText(f);
        const norm = normalize(raw);
        const datum = extractDate(norm);                  // AUTO datum iz PDF-a
        const cleaned = stripAdminBlocks(norm);
        const rowsOne = parseTextToRows(cleaned, f.name, datum);
        all.push(...rowsOne);
      }
      if (all.length === 0) {
        setError("Nije pronađen čitljiv tekst (možda je PDF sken/slika bez OCR-a).");
      }
      setRows(all);

      // snimi u korisnikov nalog (ako je prijavljen)
      if (all.length > 0 && files) {
        saveReportForCurrentUser(all, Array.from(files).map(f => f.name));
      }
    } catch (e: any) {
      setError(e?.message || "Nešto je pošlo po zlu.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    const header = columns.map((c) => c.label).join(",");
    const body = filtered.map((r) =>
      [r.Analit ?? "", r.Vrijednost ?? "", r.Jedinica ?? "", r.Ref_low ?? "", r.Ref_high ?? "", r.Status ?? "", r.Datum ?? "", r.Source ?? ""]
        .map((v) => String(v).replace(/"/g, '""'))
        .map((v) => (v.includes(",") ? `"${v}"` : v))
        .join(",")
    ).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rezultati_lab.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function clearAll() {
    setFiles(null); setRows([]); setError(null); setOnlyOut(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch mb-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="w-full border rounded-md px-3 py-2"
        />
        <button
          onClick={handleParse}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Čitanje…" : "Učitaj i analiziraj PDF"}
        </button>
        <button onClick={clearAll} className="px-4 py-2 rounded-md border">Reset</button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOut} onChange={(e) => setOnlyOut(e.target.checked)} />
        Samo van opsega (⬆️/⬇️)
        </label>
        <button onClick={downloadCSV} disabled={filtered.length === 0} className="px-3 py-2 rounded-md border text-sm disabled:opacity-50">
          Preuzmi CSV
        </button>
      </div>

      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}

      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {columns.map((c) => (
                  <th key={String(c.key)} className="text-left px-3 py-2 font-semibold">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-t">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-3 py-2 align-top">{(r as any)[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
