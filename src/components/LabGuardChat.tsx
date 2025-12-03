// src/components/LabGuardChat.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  KeyboardEvent,
} from "react";
import { askLabGuard } from "@/lib/labguardApi";
import type { LabReport } from "@/types";
import {
  buildTrendsFromReports,
  getTrendInsight,
  type AnalyteTrend,
} from "@/lib/trends";
import TrendChart from "./TrendChart";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
};

interface Props {
  reports: LabReport[];
  onClose?: () => void;
}

/**
 * Da li analit ima bar 2 nalaza sa različitim datumima?
 */
function trendHasHistory(trend: AnalyteTrend): boolean {
  if (!trend.points || trend.points.length < 2) return false;
  const pointsWithValue = trend.points.filter(
    (p) => typeof p.value === "number" && p.value != null
  );
  if (pointsWithValue.length < 2) return false;
  const uniqueDates = new Set(pointsWithValue.map((p) => p.date));
  return uniqueDates.size >= 2;
}

/**
 * Grubo mapiranje: na osnovu pitanja probaj da pogodiš
 * koji analiti iz trendova su relevantni.
 */
function matchAnalytesInQuestion(
  question: string,
  analyteNames: string[]
): string[] {
  const q = question.toLowerCase();

  const matches: string[] = [];

  for (const rawName of analyteNames) {
    const name = rawName.toLowerCase();

    // prva riječ iz "Hemoglobin (Hb)" -> "hemoglobin"
    const firstWord = name.split(/[ ,(/]+/)[0];

    if (!firstWord) continue;

    if (q.includes(firstWord) || q.includes(name)) {
      matches.push(rawName);
    }
  }

  // ukloni duplikate, zadrži redoslijed
  return Array.from(new Set(matches));
}

const LabGuardChat: React.FC<Props> = ({ reports, onClose }) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analiti koje je “pametan sloj” označio kao bitne za trenutno pitanje
  const [highlightAnalytes, setHighlightAnalytes] = useState<string[]>([]);
  // Analiti koji su minimizovani u tabove
  const [collapsedAnalytes, setCollapsedAnalytes] = useState<string[]>([]);

  const msgRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);

  // Trendovi za sve parametre iz nalaza
  const trendsMap = useMemo(
    () => buildTrendsFromReports(reports),
    [reports]
  );

  // Trendovi koji se trenutno vide kao grafici (ne minimizovani)
  const visibleTrends: AnalyteTrend[] = useMemo(() => {
    if (!highlightAnalytes || highlightAnalytes.length === 0) return [];

    return highlightAnalytes
      .map((name) => trendsMap[name])
      .filter((t): t is AnalyteTrend => Boolean(t))
      .filter((t) => trendHasHistory(t))
      .filter((t) => !collapsedAnalytes.includes(t.name));
  }, [highlightAnalytes, collapsedAnalytes, trendsMap]);

  // Imena koja su minimizovana (pokazuju se kao “tabovi”)
  const minimizedNames: string[] = useMemo(
    () =>
      highlightAnalytes.filter((name) =>
        collapsedAnalytes.includes(name)
      ),
    [highlightAnalytes, collapsedAnalytes]
  );

  // auto-scroll na dno
  useEffect(() => {
    if (msgRef.current) {
      msgRef.current.scrollTop = msgRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);

    const now = new Date().toISOString();

    const userMsg: ChatMessage = {
      id: nextId.current++,
      role: "user",
      text: q,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");

    try {
      // poziv ka AI-botu
      const response = await askLabGuard(q, reports);

      // iz pitanja detektuj koje analite treba gledati
      const allAnalyteNames = Object.keys(trendsMap);
      const matchedNames = matchAnalytesInQuestion(
        q,
        allAnalyteNames
      );

      // od njih zadrži samo one koji imaju smislen trend
      const withHistory = matchedNames.filter((name) => {
        const t = trendsMap[name];
        return t && trendHasHistory(t);
      });

      // grafovi se uvijek odnose SAMO na ovo pitanje
      setHighlightAnalytes(withHistory);
      setCollapsedAnalytes([]); // novi prompt = čisto stanje

      // automatski tekstualni sažetak trendova
      const trendSummaries: string[] = [];
      for (const name of withHistory) {
        const t = trendsMap[name];
        if (!t) continue;
        const insight = getTrendInsight(t);

        if (
          insight.firstValue == null ||
          insight.latestValue == null ||
          !insight.firstDate ||
          !insight.latestDate
        ) {
          continue;
        }

        let dirText = "";
        if (insight.trendDirection === "up") {
          dirText = "vrijednost je u porastu";
        } else if (insight.trendDirection === "down") {
          dirText = "vrijednost je u blagom padu";
        } else if (insight.trendDirection === "flat") {
          dirText = "vrijednost je uglavnom stabilna";
        }

        let rangeText = "";
        if (
          insight.latestValue != null &&
          insight.refLow != null &&
          insight.refHigh != null
        ) {
          if (insight.latestValue < insight.refLow) {
            rangeText =
              "poslednji nalaz je ispod referentnog opsega.";
          } else if (insight.latestValue > insight.refHigh) {
            rangeText =
              "poslednji nalaz je iznad referentnog opsega.";
          } else {
            rangeText =
              "poslednji nalaz je unutar referentnog opsega.";
          }
        }

        const unit = insight.unit ? ` ${insight.unit}` : "";
        const baseLine = `${insight.name}: ${insight.firstValue}${unit} (${insight.firstDate}) → ${insight.latestValue}${unit} (${insight.latestDate})`;

        const extraParts = [dirText, rangeText].filter(Boolean);
        const extra =
          extraParts.length > 0 ? ` – ${extraParts.join(", ")}` : "";

        trendSummaries.push(baseLine + extra);
      }

      let finalAnswer = response.answer || "";

      if (trendSummaries.length > 0) {
        finalAnswer +=
          "\n\nTrend kroz vrijeme (na osnovu sačuvanih nalaza):\n" +
          trendSummaries.join("\n");
      }

      const botMsg: ChatMessage = {
        id: nextId.current++,
        role: "assistant",
        text: finalAnswer,
        timestamp: response.timestamp || now,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setError("Došlo je do greške. Pokušaj ponovo.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  function collapseTrend(name: string) {
    setCollapsedAnalytes((prev) =>
      prev.includes(name) ? prev : [...prev, name]
    );
  }

  function restoreTrend(name: string) {
    setCollapsedAnalytes((prev) =>
      prev.filter((n) => n !== name)
    );
  }

  return (
    <div
      className="
        relative w-full rounded-3xl 
        border border-gray-400/40
        bg-white/60
        backdrop-blur-xl
        px-6 py-7 
        chat-pop 
        shadow-xl shadow-black/10
      "
    >
      {/* CLOSE / AVATAR */}
      <button
        onClick={() => onClose && onClose()}
        className="
          absolute -top-10 left-1/2 -translate-x-1/2 
          rounded-full border border-gray-300/60 
          bg-white/50 
          backdrop-blur-xl 
          shadow-lg shadow-black/10 
          p-1 
          hover:scale-105 
          hover:bg-white/70 
          transition
        "
        title="Zatvori chat"
      >
        <img
          src="/Avatar-head.png"
          alt="LabGuard"
          className="w-14 h-14 rounded-full"
        />
      </button>

      {/* BLOK SA GRAFOVIMA – samo za trenutno pitanje */}
      {highlightAnalytes.length > 0 && (
        <div
          className="
            mb-4 
            rounded-3xl 
            border border-gray-300/60 
            bg-gray-100/70 
            backdrop-blur-xl 
            px-3 py-3 
            shadow-inner
          "
        >
          {/* minimizovani tabovi */}
          {minimizedNames.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {minimizedNames.map((name) => (
                <button
                  key={name}
                  onClick={() => restoreTrend(name)}
                  className="
                    text-[10px] px-3 py-1 
                    rounded-full 
                    border border-gray-400/60
                    bg-white/80
                    hover:bg-white 
                    transition
                  "
                  title="Vrati prikaz grafikona"
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* grafovi – centriraj ako je samo jedan */}
          {visibleTrends.length === 1 ? (
            <div className="flex justify-center">
              <div className="w-full md:w-3/4 lg:w-2/3 relative">
                <button
                  onClick={() =>
                    collapseTrend(visibleTrends[0].name)
                  }
                  className="
                    absolute top-2 right-2 
                    text-[10px] px-2 py-1 
                    rounded-full 
                    border border-gray-400/60 
                    bg-white/80 
                    hover:bg-white
                    transition
                  "
                  title="Minimizuj ovaj grafikon"
                >
                  ▾
                </button>
                <TrendChart trend={visibleTrends[0]} />
              </div>
            </div>
                    ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTrends.map((trend) => (
                <div key={trend.name} className="relative">
                  <button
                    onClick={() => collapseTrend(trend.name)}
                    className="
                      absolute top-2 right-2 
                      text-[10px] px-2 py-1 
                      rounded-full 
                      border border-gray-400/60 
                      bg-white/80 
                      hover:bg-white
                      transition
                    "
                    title="Minimizuj ovaj grafikon"
                  >
                    ▾
                  </button>
                  <TrendChart trend={trend} />
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* HISTORY */}
      <div
        ref={msgRef}
        className="
          max-h-[260px]
          overflow-y-auto 
          pr-2 
          space-y-4 
          scrollbar-hide
        "
      >
        {messages.length === 0 && !loading && (
          <div className="text-xs text-gray-700">
            Počni razgovor sa LabGuardom:
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>
                Šta vidiš iz trenda mojih nalaza do sada?
              </li>
              <li>
                Kako se mijenjao hemoglobin kroz vrijeme u mojim
                nalazima?
              </li>
              <li>
                Objasni mi ukratko nalaze, bez dijagnoze.
              </li>
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "assistant" ? (
            // BOT
            <div
              key={m.id}
              className="flex items-start gap-3 max-w-[90%]"
            >
              <img
                src="/Avatar-head.png"
                className="
                  w-9 h-9 rounded-full 
                  border border-gray-300/50 
                  bg-white/60 
                  backdrop-blur-md
                "
              />
              <div
                className="
                  px-4 py-3 
                  rounded-2xl 
                  border border-gray-300/70 
                  bg-gray-200/60
                  backdrop-blur-md 
                  shadow-sm shadow-black/10
                  text-sm text-gray-800
                  whitespace-pre-wrap
                "
              >
                {m.text}
              </div>
            </div>
          ) : (
            // USER
            <div
              key={m.id}
              className="flex justify-end w-full"
            >
              <div
                className="
                  max-w-[80%] 
                  px-4 py-3 
                  rounded-2xl 
                  border border-gray-500/40
                  bg-gray-700/60 
                  backdrop-blur-md 
                  shadow-md shadow-black/20
                  text-sm text-white 
                  whitespace-pre-wrap
                "
              >
                {m.text}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="text-xs text-gray-600 mt-2">
            LabGuard piše…
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="flex mt-4 gap-2">
        <input
          className="
            flex-1 
            rounded-2xl 
            border border-gray-400/40 
            bg-white/60 
            backdrop-blur-md 
            px-3 py-2 
            text-sm text-gray-900 
            placeholder-gray-600
            outline-none 
            focus:ring-1 focus:ring-gray-400
          "
          placeholder="Upiši pitanje o nalazima kroz vrijeme..."
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          value={question}
          disabled={loading}
        />

        <button
          onClick={send}
          disabled={loading || !question.trim()}
          className="
            px-4 py-2 
            rounded-2xl
            backdrop-blur-xl
            bg-white/60 
            border border-gray-500/40
            shadow-md shadow-black/10
            text-sm font-medium text-gray-900
            hover:bg-white/80 hover:border-gray-600
            disabled:opacity-40 disabled:cursor-not-allowed
            transition
          "
        >
          Pošalji
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default LabGuardChat;
