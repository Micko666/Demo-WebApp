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
  onClose?: () => void;
}

const LabGuardChat: React.FC<LabGuardChatProps> = ({ reports, onClose }) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextId = useRef(1);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll na dno
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
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

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleHeadClick = () => {
    if (onClose) onClose();
  };

  return (
    // W-FULL -> širi se koliko i parent (max-w-6xl iz Dashboarda)
    <div className="relative w-full rounded-3xl border px-6 py-8 chat-pop 
    bg-gradient-to-b from-gray-50 via-white to-gray-50">

      {/* Glava avatara na sredini gore */}
      <button
        type="button"
        onClick={handleHeadClick}
        className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-full border bg-background shadow-md p-1 hover:shadow-lg transition-transform hover:-translate-y-0.5"
        title="Zatvori chat"
      >
        <img
          src="/Avatar-head.png"
          alt="LabGuard avatar"
          className="w-16 h-16 rounded-full select-none pointer-events-none"
        />
      </button>

      {/* Poruke */}
      <div
        ref={messagesRef}
        className="mt-2 mb-4 max-h-80 overflow-y-auto space-y-3 text-sm"
      >
        {messages.length === 0 && !loading && (
          <div className="text-xs text-muted-foreground">
            Primjer pitanja:
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>Šta znači povišen LDL u mom nalazu?</li>
              <li>Objasni mi ukratko moj poslednji nalaz.</li>
            </ul>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "assistant" ? (
            // LABGUARD poruka – lijevo
            <div key={msg.id} className="flex justify-start">
              <div className="flex items-start gap-3 max-w-[80%]">
                <img
                  src="/Avatar-head.png"
                  alt="LabGuard avatar"
                  className="w-10 h-10 rounded-full border"
                />
                <div className="px-4 py-2 rounded-2xl border bg-background whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            </div>
          ) : (
            // USER poruka – desno
            <div key={msg.id} className="flex justify-end">
              <div className="flex items-start justify-end max-w-[80%]">
                <div className="relative">
                  <div className="px-4 py-2 rounded-2xl border bg-blue-500 text-white whitespace-pre-wrap pr-8">
                    {msg.text}
                  </div>
                  <div className="absolute -right-4 -top-3 w-8 h-8 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold shadow-md">
                    M
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted animate-pulse" />
            LabGuard piše...
          </div>
        )}
      </div>

      {/* Input + dugme */}
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          className="flex-1 rounded-2xl border px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-primary"
          placeholder="Upiši pitanje o nalazu..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm bg-white hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pošalji
        </button>
      </div>

      {error && (
        <p className="mt-3 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default LabGuardChat;
