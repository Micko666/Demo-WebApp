import React, { useMemo, useRef, useState } from "react";
import { getCurrentSession, appendReport, getCurrentUser } from "@/lib/db";
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
  Datum?: string; // dd.mm.yyyy (auto iz PDF-a)
  Source?: string;
  Linija?: string;
};

type PersonIdentity = {
  name: string | null;
  dateOfBirth: string | null; // dd.mm.yyyy
  sex: string | null; // M / Ž / Z / F...
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
const EMPTY_ADMIN_LINE =
  /^\s*(konstituent|rezultat|referentni\s+interval|jedinica|metoda\s+ispitivanja|jm|ref\.?vr|analiza)\s*$/i;

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
  const m1 =
    /datum\s+izdavanja\s+nalaza:\s*(\d{2}\.\d{2}\.\d{4}\.)/i.exec(text);
  if (m1) return m1[1].replace(/\.$/, "");
  const m2 = /\b(\d{2}\.\d{2}\.\d{4})\b/.exec(text);
  if (m2) return m2[1];
  return undefined;
}

// Ime i prezime, datum rođenja, pol iz headera nalaza (MojLab-friendly)
function extractIdentity(text: string): PersonIdentity {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let name: string | null = null;
  let dob: string | null = null;
  let sex: string | null = null;

  const MAX_LOOKAHEAD = 5;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- IME I PREZIME ---
    if (!name && /ime\s+i\s+prezime/i.test(line)) {
      const mSame =
        /ime\s+i\s+prezime:\s*([^0-9\n]+?)(?:\s+lab\s+broj|$)/i.exec(line);
      if (mSame && mSame[1].trim()) {
        name = mSame[1].trim();
      } else {
        for (
          let j = i + 1;
          j < Math.min(i + 1 + MAX_LOOKAHEAD, lines.length);
          j++
        ) {
          const cand = lines[j].trim();
          if (
            !cand ||
            /lab\s+broj/i.test(cand) ||
            /datum\s+ro[đd]enja/i.test(cand) ||
            /^pol:/i.test(cand) ||
            /laboratorijski\s+nalaz/i.test(cand)
          ) {
            continue;
          }
          if (!/\d/.test(cand) && !cand.includes(":")) {
            name = cand;
            break;
          }
        }
      }
    }

    // --- DATUM ROĐENJA ---
    if (!dob && /datum\s+ro[đd]enja/i.test(line)) {
      const mSame =
        /datum\s+ro[đd]enja:\s*(\d{2}\.\d{2}\.\d{4}\.?)/i.exec(line);
      if (mSame) {
        dob = mSame[1].replace(/\.$/, "").trim();
      } else {
        for (
          let j = i + 1;
          j < Math.min(i + 1 + MAX_LOOKAHEAD, lines.length);
          j++
        ) {
          const cand = lines[j].trim();
          const mNext = /(\d{2}\.\d{2}\.\d{4})/.exec(cand);
          if (mNext) {
            dob = mNext[1];
            break;
          }
        }
      }
    }

    // --- POL ---
    if (!sex && /pol:/i.test(line)) {
      const mSame = /pol:\s*([mMžŽzZfF])\b/.exec(line);
      if (mSame) {
        sex = mSame[1].toUpperCase();
      } else {
        for (
          let j = i + 1;
          j < Math.min(i + 1 + MAX_LOOKAHEAD, lines.length);
          j++
        ) {
          const cand = lines[j].trim();
          const mNext = /^([mMžŽzZfF])\b/.exec(cand);
          if (mNext) {
            sex = mNext[1].toUpperCase();
            break;
          }
        }
      }
    }
  }

  return { name, dateOfBirth: dob, sex };
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
function statusOf(
  v: number | null,
  lo: number | null,
  hi: number | null
): string {
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

    const m =
      PAT_VAL_FIRST.exec(s) ||
      PAT_NAME_FIRST.exec(s) ||
      PAT_VAL_FIRST_NOPREFIX.exec(s);
    if (!m || !m.groups) continue;

    const g = m.groups as Record<string, string>;
    const name = cleanName(g["an"]);
    const val = toFloat(g["val"]);
    const low = toFloat(g["low"]);
    const high = toFloat(g["high"]);
    const unit = (g["un"] || "").replace("^", "*").replace("umol", "µmol");
    const status = statusOf(val, low, high);

    rows.push({
      Analit: name,
      Vrijednost: val,
      Jedinica: unit,
      Ref_low: low,
      Ref_high: high,
      Status: status,
      Datum: datum,
      Linija: line,
      Source: source,
    });
  }
  const by = new Map<string, Row>();
  rows
    .sort((a, b) =>
      (a.Analit + (a.Ref_low ?? "")).localeCompare(
        b.Analit + (b.Ref_low ?? "")
      )
    )
    .forEach((r) => {
      if (!by.has(r.Analit)) by.set(r.Analit, r);
    });
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
    for (const it of content.items as any[]) {
      const s = (it?.str as string) || "";
      const hasEOL = Boolean((it as any)?.hasEOL);
      pageText += s + (hasEOL ? "\n" : " ");
    }
    out += pageText + "\n";
  }
  return out;
}

/** ===== Identity helpers ===== */

function identityKey(userId: string) {
  return `labguard_identity_${userId}`;
}
function loadStoredIdentity(userId: string): PersonIdentity | null {
  try {
    const raw = localStorage.getItem(identityKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveStoredIdentity(userId: string, id: PersonIdentity) {
  localStorage.setItem(identityKey(userId), JSON.stringify(id));
}
function identitiesMatch(a: PersonIdentity, b: PersonIdentity): boolean {
  const norm = (s: string | null) =>
    (s || "").trim().toLowerCase().replace(/\s+/g, " ");

  // ključ: ime + datum rođenja
  const sameName =
    !a.name || !b.name || norm(a.name) === norm(b.name);
  const sameDob =
    !a.dateOfBirth || !b.dateOfBirth || a.dateOfBirth === b.dateOfBirth;

  return sameName && sameDob;
}

/** ===== React komponenta ===== */
export default function LabAnalyzer() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [onlyOut, setOnlyOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(
    () =>
      onlyOut ? rows.filter((r) => /⬆️|⬇️/.test(r.Status)) : rows,
    [rows, onlyOut]
  );

  const outOfRangeCount = useMemo(
    () => rows.filter((r) => /⬆️|⬇️/.test(r.Status)).length,
    [rows]
  );

  function saveReportForCurrentUser(
    parsedRows: Row[],
    fileNames: string[],
    identityFromPdf: PersonIdentity | null
  ) {
    const session = getCurrentSession();
    if (!session || parsedRows.length === 0) return;

    // 1) provjera identiteta
    if (
      identityFromPdf &&
      (identityFromPdf.name ||
        identityFromPdf.dateOfBirth ||
        identityFromPdf.sex)
    ) {
      const existing = loadStoredIdentity(session.userId);

      if (!existing) {
        // prvi nalaz -> veži osobu za nalog
        saveStoredIdentity(session.userId, identityFromPdf);
      } else if (!identitiesMatch(existing, identityFromPdf)) {
        setError(
          "Izgleda da ovaj nalaz pripada drugoj osobi (drugo ime ili datum rođenja) od one koja je već vezana za ovaj nalog. " +
            "Radi sigurnosti, nalaz nije dodat. Ako želiš da pratiš nalaze druge osobe, koristi poseban nalog."
        );
        return;
      }
    }

    // 2) datum nalaza (prvi pronađeni, dd.mm.yyyy -> ISO)
    const firstDmy = parsedRows.find((r) => r.Datum)?.Datum;
    const iso =
      dmyToISO(firstDmy || "") || new Date().toISOString().slice(0, 10);

    // 3) zaštita od duplikata: isti datum ILI isti fajl
    const user = getCurrentUser();
    const existingReports = user?.reports || [];
    const incomingNames = fileNames.map((n) => n.trim().toLowerCase());

    const hasSameDate = existingReports.some((r) => r.date === iso);
    const hasSameFile = existingReports.some((r) =>
      (r.sourceFiles || []).some((fn) =>
        incomingNames.includes(fn.trim().toLowerCase())
      )
    );

    if (hasSameDate || hasSameFile) {
      setError(
        "Već postoji sačuvan nalaz sa ovim datumom ili ovim imenom fajla. " +
          "LabGuard trenutno dozvoljava najviše jedan izvještaj po danu za jedan nalog. " +
          "Ako želiš da ga zamijeniš, prvo obriši postojeći nalaz u 'Moji nalazi'."
      );
      return;
    }

    // 4) upis u “bazu”
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
    if (!files || files.length === 0) {
      setError("Dodaj bar jedan PDF fajl.");
      return;
    }
    setLoading(true);
    try {
      const all: Row[] = [];
      let mergedIdentity: PersonIdentity | null = null;

      for (const f of Array.from(files)) {
        const raw = await pdfFileToText(f);
        const norm = normalize(raw);

        const idFromPdf = extractIdentity(norm);
        const hasSomeId =
          idFromPdf.name || idFromPdf.dateOfBirth || idFromPdf.sex;

        if (hasSomeId) {
          if (!mergedIdentity) {
            mergedIdentity = idFromPdf;
          } else if (!identitiesMatch(mergedIdentity, idFromPdf)) {
            setError(
              "PDF fajlovi koje si dodao djeluju da pripadaju različitim osobama (različito ime/datum rođenja/pol). " +
                "Radi sigurnosti, prekidam obradu. Učitaj nalaze jedne osobe u isto vrijeme."
            );
            setLoading(false);
            return;
          }
        }

        const datum = extractDate(norm);
        const cleaned = stripAdminBlocks(norm);
        const rowsOne = parseTextToRows(cleaned, f.name, datum);
        all.push(...rowsOne);
      }

      if (all.length === 0) {
        setError(
          "Nije pronađen čitljiv tekst (možda je PDF sken/slika bez OCR-a)."
        );
      }
      setRows(all);

      if (all.length > 0 && files) {
        saveReportForCurrentUser(
          all,
          Array.from(files).map((f) => f.name),
          mergedIdentity
        );
      }
    } catch (e: any) {
      setError(e?.message || "Nešto je pošlo po zlu.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    const header = columns.map((c) => c.label).join(",");
    const body = filtered
      .map((r) =>
        [
          r.Analit ?? "",
          r.Vrijednost ?? "",
          r.Jedinica ?? "",
          r.Ref_low ?? "",
          r.Ref_high ?? "",
          r.Status ?? "",
          r.Datum ?? "",
          r.Source ?? "",
        ]
          .map((v) => String(v).replace(/"/g, '""'))
          .map((v) => (v.includes(",") ? `"${v}"` : v))
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rezultati_lab.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setFiles(null);
    setRows([]);
    setError(null);
    setOnlyOut(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      className="
        rounded-3xl 
        border border-gray-300/50 
        bg-white/70 
        backdrop-blur-xl 
        shadow-md 
        p-4 sm:p-6 lg:p-7
        space-y-4
      "
    >
      {/* Učitavanje fajlova + akcije */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              PDF laboratorijskog nalaza
            </label>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="
                w-full 
                rounded-2xl 
                border border-gray-300/70 
                bg-white/80 
                px-3 py-2 
                text-sm
                shadow-sm
                focus:outline-none 
                focus:ring-2 
                focus:ring-blue-300/60
              "
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Možeš dodati više PDF fajlova odjednom (npr. više nalaza iz iste
              laboratorije).
            </p>
          </div>

          <div className="flex flex-row sm:flex-col gap-2 sm:w-[220px]">
            <button
              onClick={handleParse}
              disabled={loading}
              className="
                flex-1
                rounded-full
                px-4 py-2 
                text-sm font-medium
                bg-gray-900 
                text-white
                shadow-md shadow-black/30 
                hover:bg-gray-900/90
                disabled:opacity-60
                disabled:cursor-not-allowed
                transition
              "
            >
              {loading ? "Čitanje PDF-a…" : "Učitaj i analiziraj PDF"}
            </button>
            <button
              onClick={clearAll}
              className="
                flex-1
                rounded-full
                px-4 py-2 
                text-sm font-medium
                bg-white/70 
                border border-gray-300/70
                text-gray-800
                shadow-sm
                hover:bg-gray-50/90 
                transition
              "
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label
            className="
              inline-flex items-center gap-2 
              text-xs sm:text-sm
              rounded-full
              bg-white/80
              border border-gray-200/80
              px-3 py-1.5
            "
          >
            <input
              type="checkbox"
              checked={onlyOut}
              onChange={(e) => setOnlyOut(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Samo vrijednosti van referentnog opsega (⬆️ / ⬇️)</span>
          </label>

          <div className="flex items-center gap-3">
            {rows.length > 0 && (
              <div
                className="
                  px-3 py-1.5 
                  rounded-full 
                  bg-gray-100/90 
                  text-[11px] sm:text-xs 
                  text-gray-800
                  border border-gray-200/80
                "
              >
                Parametara: {rows.length}
                {outOfRangeCount > 0 && (
                  <span className="ml-2">
                    • Van opsega: {outOfRangeCount}
                  </span>
                )}
              </div>
            )}

            <button
              onClick={downloadCSV}
              disabled={filtered.length === 0}
              className="
                rounded-full
                px-4 py-2 
                text-xs sm:text-sm font-medium
                border border-gray-300/80 
                bg-white/80
                text-gray-800
                shadow-sm
                hover:bg-gray-50/90
                disabled:opacity-50
                disabled:cursor-not-allowed
                transition
              "
            >
              Preuzmi CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="
            rounded-2xl 
            border border-red-200/80 
            bg-red-50/90 
            px-3 py-2
            text-xs sm:text-sm 
            text-red-800 
            whitespace-pre-line
          "
        >
          {error}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-white/60 backdrop-blur-md">
              <tr>
                {columns.map((c) => (
                  <th
                    key={String(c.key)}
                    className="
                      text-left 
                      px-3 py-2 
                      font-semibold 
                      text-gray-900
                      whitespace-nowrap
                    "
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={i}
                  className="
                    border-t border-gray-200/70 
                    hover:bg-gray-50/80 
                    transition-colors
                  "
                >
                  {columns.map((c) => (
                    <td
                      key={String(c.key)}
                      className="
                        px-3 py-2 
                        align-top 
                        whitespace-nowrap 
                        text-gray-900
                      "
                    >
                      {(r as any)[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && !loading && !error && (
        rows.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Učitaj laboratorijske nalaze u PDF formatu da bi se ovdje prikazale
            vrijednosti.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Za učitane nalaze trenutno nema parametara van referentnog opsega.
            Poništi filter ili učitaj nove nalaze.
          </p>
        )
      )}
    </div>
  );
}
