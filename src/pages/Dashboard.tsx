// src/pages/Dashboard.tsx
import { useMemo, useState } from "react";
import {
  getCurrentSession,
  getCurrentUser,
  deleteReport,
  deleteAllReportsForUser,
  updateRow,
  deleteRow,
} from "@/lib/db";
import { LabReport, LabRow } from "@/types";
import LabGuardChat from "@/components/LabGuardChat";

export default function Dashboard() {
  const session = getCurrentSession();
  const user = getCurrentUser();

  const [selected, setSelected] = useState<LabReport | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  const reports = useMemo(() => {
    if (!user || !user.reports) return [];
    // najnoviji prvi
    return [...user.reports].sort((a, b) => b.date.localeCompare(a.date));
  }, [user, refreshTick]);

  if (!user || !session) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        Niste prijavljeni.
      </div>
    );
  }

  function hardRefresh() {
    setRefreshTick((t) => t + 1);
  }

  function clearIdentityIfNoReportsLeft() {
    const latestUser = getCurrentUser();
    const noReports =
      !latestUser?.reports || latestUser.reports.length === 0;
    if (noReports) {
      localStorage.removeItem(`labguard_identity_${session.userId}`);
    }
  }

  function onDeleteReport(r: LabReport) {
    if (!confirm(`Obrisati izvještaj od ${r.date}?`)) return;
    deleteReport(session.userId, r.id);
    if (selected?.id === r.id) setSelected(null);
    hardRefresh();
    clearIdentityIfNoReportsLeft();
  }

  function onDeleteAll() {
    if (
      !confirm(
        "Obrisati SVE izvještaje ovog naloga? Ova akcija je nepovratna."
      )
    )
      return;
    deleteAllReportsForUser(session.userId);
    setSelected(null);
    hardRefresh();
    localStorage.removeItem(`labguard_identity_${session.userId}`);
  }

  function onRowDelete(report: LabReport, idx: number) {
    if (!confirm(`Obrisati stavku #${idx + 1} iz izvještaja ${report.date}?`))
      return;
    deleteRow(session.userId, report.id, idx);
    const updated =
      getCurrentUser()?.reports.find((r) => r.id === report.id) || null;
    setSelected(updated);
    hardRefresh();
    clearIdentityIfNoReportsLeft();
  }

  function onRowEdit(report: LabReport, idx: number, row: LabRow) {
    const nv = prompt(
      `Nova vrijednost za "${row.Analit}" (trenutno: ${
        row.Vrijednost ?? ""
      })`,
      row.Vrijednost?.toString() || ""
    );
    if (nv === null) return;
    const trimmed = nv.trim();
    const parsed = trimmed === "" ? null : Number(trimmed.replace(",", "."));
    if (trimmed !== "" && Number.isNaN(parsed)) {
      alert("Vrijednost mora biti broj (ili ostavi prazno).");
      return;
    }
    const newRow: LabRow = { ...row, Vrijednost: parsed };

    if (parsed != null && row.Ref_low != null && row.Ref_high != null) {
      newRow.Status =
        parsed < row.Ref_low
          ? "⬇️ below"
          : parsed > row.Ref_high
          ? "⬆️ above"
          : "✅ in-range";
    }

    updateRow(session.userId, report.id, idx, newRow);
    const updated =
      getCurrentUser()?.reports.find((r) => r.id === report.id) || null;
    setSelected(updated);
    hardRefresh();
  }

  function scrollToChat() {
    const el = document.getElementById("labguard-chat");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleAvatarClick() {
    if (!chatOpen) {
      setChatOpen(true);
      setTimeout(scrollToChat, 80);
    } else {
      scrollToChat();
    }
  }

  return (
    <div className="relative max-w-6xl mx-auto px-4 py-8">
      {/* HEADER */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Moji nalazi</h1>
          <p className="text-muted-foreground">
            Pregled sačuvanih laboratorijskih izvještaja za {user.email}.
          </p>
        </div>
        <button
          className="text-sm font-medium
            rounded-2xl 
            px-4 py-2
            bg-[#FF0000]/20
            backdrop-blur-xl
            text-[#B00000]
            border border-[#FF0000]/30
            shadow-xl shadow-[#FF0000]/20
            hover:bg-[#FF0000]/30
            hover:border-[#FF0000]/50
            hover:shadow-[#FF0000]/60
            transition"
          onClick={onDeleteAll}
        >
          Obriši sve podatke
        </button>
      </header>

      {/* GLAVNI LAYOUT: lijevo tabela + detalji, desno avatar */}
      <div className="mt-8 flex items-start gap-8">
        {/* LIJEVA KOLONA */}
        <div className="flex-1 space-y-6">
          {/* Lista izvještaja */}
          <div
            className="
              overflow-x-auto 
              rounded-3xl 
              border border-gray-400/40 
              bg-white/50 
              backdrop-blur-xl 
              shadow-md
            "
          >
            <table className="min-w-full text-sm">
              <thead className="bg-white/40 backdrop-blur-md">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Datum</th>
                  <th className="text-left px-3 py-2 font-semibold">Fajlovi</th>
                  <th className="text-left px-3 py-2 font-semibold">
                    # Parametara
                  </th>
                  <th className="text-left px-3 py-2 font-semibold">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t border-gray-300/40">
                    <td className="px-3 py-2 text-gray-900">{r.date}</td>
                    <td className="px-3 py-2 text-gray-900">
                      {r.sourceFiles?.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-900">
                      {r.rows?.length ?? 0}
                    </td>
                    <td className="px-3 py-2 flex gap-2">
                      <button
                        className="text-sm 
                          rounded-2xl 
                          px-3 py-1 
                          bg-gray-200/70
                          text-gray-800
                          shadow-md shadow-gray-600/20 
                          hover:bg-gray-200/90 
                          transition"
                        onClick={() => setSelected(r)}
                      >
                        Pregled
                      </button>
                      <button
                        className="text-sm 
                          rounded-2xl 
                          px-3 py-1 
                          bg-red-100 
                          text-red-700
                          shadow-md shadow-red-600/20 
                          hover:bg-red-100/80 
                          transition"
                        onClick={() => onDeleteReport(r)}
                      >
                        Obriši izvještaj
                      </button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-4 text-muted-foreground"
                      colSpan={4}
                    >
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
                <h2 className="text-xl font-semibold">
                  Izvještaj: {selected.date}
                </h2>
                <button
                  className="text-sm 
                    rounded-2xl 
                    px-3 py-1 
                    bg-gray-200/70
                    text-gray-800
                    shadow-md shadow-gray-600/20 
                    hover:bg-gray-200/90 
                    transition"
                  onClick={() => setSelected(null)}
                >
                  Zatvori
                </button>
              </div>

              <div className="text-sm text-muted-foreground">
                Fajlovi: {selected.sourceFiles?.join(", ") || "—"}
              </div>

              <div
                className="
                  overflow-x-auto 
                  rounded-3xl 
                  border border-gray-400/40 
                  bg-white/50 
                  backdrop-blur-xl 
                  shadow-md
                "
              >
                <table className="min-w-full text-sm">
                  <thead className="bg-white/40 backdrop-blur-md">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        Analit
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Vrijednost
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Jedinica
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Ref low
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Ref high
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Status
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Akcije
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows?.map((row: LabRow, i: number) => (
                      <tr key={i} className="border-t border-gray-300/40">
                        <td className="px-3 py-2 text-gray-900">
                          {row.Analit}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {row.Vrijednost}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {row.Jedinica}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {row.Ref_low}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {row.Ref_high}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {row.Status}
                        </td>
                        <td className="px-3 py-2 flex gap-2">
                          <button
                            className="text-sm 
                              rounded-2xl 
                              px-3 py-1 
                              bg-gray-200/70
                              text-gray-800
                              shadow-md shadow-gray-600/20 
                              hover:bg-gray-200/90 
                              transition"
                            onClick={() => onRowEdit(selected, i, row)}
                          >
                            Uredi
                          </button>
                          <button
                            className="text-sm 
                              rounded-2xl 
                              px-3 py-1 
                              bg-red-100 
                              text-red-700
                              shadow-md shadow-red-600/20 
                              hover:bg-red-100/80 
                              transition"
                            onClick={() => onRowDelete(selected, i)}
                          >
                            Obriši
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!selected.rows || selected.rows.length === 0) && (
                      <tr>
                        <td
                          className="px-3 py-4 text-muted-foreground"
                          colSpan={7}
                        >
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

        {/* DESNA KOLONA – avatar, samo kad je chat zatvoren */}
        {reports.length > 0 && !chatOpen && (
          <div className="hidden md:flex flex-col items-center justify-start min-w-[220px]">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="cursor-pointer select-none focus:outline-none"
              title="Klikni da otvoriš LabGuard chat"
            >
              <img
                src="/Avatar.png"
                alt="LabGuard avatar"
                className="w-60 h-auto drop-shadow-xl floating-avatar"
              />
            </button>
          </div>
        )}
      </div>

      {/* CHAT – samo kad je otvoren, svi grafovi su unutra */}
      {chatOpen && (
        <div id="labguard-chat" className="mt-10 chat-pop w-full">
          <LabGuardChat
            reports={reports}
            onClose={() => setChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
