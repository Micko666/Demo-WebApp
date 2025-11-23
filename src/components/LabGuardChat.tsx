// src/components/LabGuardChat.tsx
import React, { useState, useRef, useEffect } from "react";
import { askLabGuard } from "@/lib/labguardApi";
import type { LabReport } from "@/types";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
};

interface LabGuardChatProps {
  reports: LabReport[];
}

const LabGuardChat: React.FC<LabGuardChatProps> = ({ reports }) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: nextId.current++,
      role: "user",
      text: q,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");

    try {
      const resp = await askLabGuard(q, reports || []);

      const assistantMsg: ChatMessage = {
        id: nextId.current++,
        role: "assistant",
        text: resp.answer,
        timestamp: resp.timestamp,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setError(
        "Došlo je do greške pri komunikaciji sa LabGuard AI asistentom. Pokušaj ponovo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <section className="mt-10">
      <div className="max-w-4xl mx-auto rounded-2xl border bg-card shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">LabGuard AI asistent</h2>
            <p className="text-xs text-muted-foreground">
              Postavi pitanje o analitu ili nalazu. Odgovori su informativni i ne
              zamjenjuju savjet ljekara.
            </p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
            Beta • edukativni asistent
          </span>
        </div>

        <div
          ref={containerRef}
          className="max-h-80 overflow-y-auto rounded-xl border bg-muted/40 px-3 py-3 space-y-3 text-sm"
        >
          {messages.length === 0 && (
            <div className="text-xs text-muted-foreground">
              Primjeri:
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>„Šta predstavlja gvožđe u krvnom nalazu?“</li>
                <li>„Šta znači sniženi HDL?“</li>
                <li>„Ajde reci mi moje opšte stanje od 1 do 10.“</li>
              </ul>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-background border text-foreground rounded-bl-sm"
                }`}
              >
                <div className="text-xs font-semibold mb-1 opacity-80">
                  {msg.role === "user" ? "Ti" : "LabGuard AI"}
                </div>
                <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[60%] rounded-2xl rounded-bl-sm bg-background border px-3 py-2 text-xs text-muted-foreground flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                <span>Analiziram pitanje…</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Tvoje pitanje</label>
          <textarea
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-y min-h-[70px]"
            placeholder="npr. Šta predstavlja gvožđe u krvnom nalazu?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Enter = pošalji • Shift+Enter = novi red
            </span>
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="inline-flex items-center rounded-xl bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Analiziram..." : "Pošalji pitanje"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-snug">
          LabGuard AI ne postavlja dijagnozu i ne propisuje terapiju. Za
          tumačenje nalaza i odluke o liječenju uvijek se obrati svom ljekaru.
        </p>
      </div>
    </section>
  );
};

export default LabGuardChat;
