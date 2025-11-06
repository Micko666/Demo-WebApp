import { useMemo, useState } from "react";
import { getCurrentSession, getCurrentUser, deleteReport, deleteAllReportsForUser, updateRow, deleteRow } from "@/lib/db";
import { LabReport, LabRow } from "@/types";

export default function Dashboard() {
  const session = getCurrentSession();
  const user = getCurrentUser();
  const [selected, setSelected] = useState<LabReport | null>(null);
  const [refreshTick, setRefreshTick] = useState(0); // jednostavan refresh

  const reports = useMemo(() => {
    if (!user || !user.reports) return [];
    return [...user.reports].sort((a, b) => b.date.localeCompare(a.date));
  }, [user, refreshTick]);

  if (!user || !session) {
    return <div className="max-w-5xl mx-auto px-4 py-8">Niste prijavljeni.</div>;
  }

  function hardRefresh() {
    setRefreshTick(t => t + 1);
    // re-učitavanje kroz getCurrentUser se dešava preko useMemo jer čita localStorage iz lib/db
  }

  function onDeleteReport(r: LabReport) {
    if (!confirm(`Obrisati izvještaj od ${r.date}?`)) return;
    deleteReport(session.userId, r.id);
    if (selected?.id === r.id) setSelected(null);
    hardRefresh();
  }

  function onDeleteAll() {
    if (!confirm("Obrisati SVE izvještaje ovog naloga? Ova akcija je nepovratna.")) return;
    deleteAllReportsForUser(session.userId);
    setSelected(null);
    hardRefresh();
  }

  function onRowDelete(report: LabReport, idx: number) {
    if (!confirm(`Obrisati stavku #${idx + 1} iz izvještaja ${report.date}?`)) return;
    deleteRow(session.userId, report.id, idx);
    // osvježi selektovani objekat u memoriji (re-čitanje)
    const updated = getCurrentUser()?.reports.find(r => r.id === report.id) || null;
    setSelected(updated);
    hardRefresh();
  }

  function onRowEdit(report: LabReport, idx: number, row: LabRow) {
    // ultra-jednostavan editor preko prompt-a (MVP)
    const nv = prompt(`Nova vrijednost za "${row.Analit}" (trenutno: ${row.Vrijednost ?? ""})`, row.Vrijednost?.toString() || "");
    if (nv === null) return;
    const parsed = nv.trim() === "" ? null : Number(nv.replace(",", "."));
    if (nv.trim() !== "" && Number.isNaN(parsed)) {
      alert("Vrijednost mora biti broj (ili ostavi prazno).");
      return;
    }
    const newRow: LabRow = { ...row, Vrijednost: parsed };

    // opcioni apdejt statusa u odnosu na ref
    if (parsed != null && row.Ref_low != null && row.Ref_high != null) {
      newRow.Status = parsed < row.Ref_low ? "⬇️ below" : parsed > row.Ref_high ? "⬆️ above" : "✅ in-range";
    }

    updateRow(session.userId, report.id, idx, newRow);
    const updated = getCurrentUser()?.reports.find(r => r.id === report.id) || null;
    setSelected(updated);
    hardRefresh();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Moji nalazi</h1>
          <p className="text-muted-foreground">Pregled sačuvanih laboratorijskih izvještaja za {user.email}.</p>
        </div>
        <button
          className="text-sm border rounded px-3 py-2 hover:bg-muted"
          onClick={onDeleteAll}
        >
          Obriši sve podatke
        </button>
      </header>

      {/* Lista izvještaja */}
      <div className="overflow-x-auto rounded border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Datum</th>
              <th className="text-left px-3 py-2 font-semibold">Fajlovi</th>
              <th className="text-left px-3 py-2 font-semibold"># Parametara</th>
              <th className="text-left px-3 py-2 font-semibold">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.sourceFiles?.join(", ") || "—"}</td>
                <td className="px-3 py-2">{r.rows?.length ?? 0}</td>
                <td className="px-3 py-2 flex gap-2">
                  <button
                    className="text-sm border rounded px-2 py-1 hover:bg-muted transition"
                    onClick={() => setSelected(r)}
                  >
                    Pregled
                  </button>
                  <button
                    className="text-sm border rounded px-2 py-1 hover:bg-red-50 text-red-600 border-red-300 transition"
                    onClick={() => onDeleteReport(r)}
                  >
                    Obriši izvještaj
                  </button>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                  Još nema sačuvanih nalaza. Učitaj PDF u Analizi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detalji odabranog izvještaja */}
      {selected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Izvještaj: {selected.date}</h2>
            <button
              className="text-sm border rounded px-2 py-1 hover:bg-muted transition"
              onClick={() => setSelected(null)}
            >
              Zatvori
            </button>
          </div>

          <div className="text-sm text-muted-foreground">
            Fajlovi: {selected.sourceFiles?.join(", ") || "—"}
          </div>

          <div className="overflow-x-auto rounded border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Analit</th>
                  <th className="text-left px-3 py-2 font-semibold">Vrijednost</th>
                  <th className="text-left px-3 py-2 font-semibold">Jedinica</th>
                  <th className="text-left px-3 py-2 font-semibold">Ref low</th>
                  <th className="text-left px-3 py-2 font-semibold">Ref high</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {selected.rows?.map((row: LabRow, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{row.Analit}</td>
                    <td className="px-3 py-2">{row.Vrijednost}</td>
                    <td className="px-3 py-2">{row.Jedinica}</td>
                    <td className="px-3 py-2">{row.Ref_low}</td>
                    <td className="px-3 py-2">{row.Ref_high}</td>
                    <td className="px-3 py-2">{row.Status}</td>
                    <td className="px-3 py-2 flex gap-2">
                      <button
                        className="text-xs border rounded px-2 py-1 hover:bg-muted"
                        onClick={() => onRowEdit(selected, i, row)}
                      >
                        Uredi
                      </button>
                      <button
                        className="text-xs border rounded px-2 py-1 hover:bg-red-50 text-red-600 border-red-300"
                        onClick={() => onRowDelete(selected, i)}
                      >
                        Obriši
                      </button>
                    </td>
                  </tr>
                ))}
                {(!selected.rows || selected.rows.length === 0) && (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                      Nema unosa za prikaz.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
