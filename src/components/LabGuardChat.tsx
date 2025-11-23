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

interface Props {
  reports: LabReport[];
  onClose?: () => void;
}

const LabGuardChat: React.FC<Props> = ({ reports, onClose }) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const msgRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);

  // auto-scroll
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

    const userMsg: ChatMessage = {
      id: nextId.current++,
      role: "user",
      text: q,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");

    try {
      const response = await askLabGuard(q, reports);
      const botMsg: ChatMessage = {
        id: nextId.current++,
        role: "assistant",
        text: response.answer,
        timestamp: response.timestamp,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setError("Došlo je do greške. Pokušaj ponovo.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className="
        relative w-full rounded-3xl 
        border border-gray-400/40
        bg-white/50
        backdrop-blur-xl
        px-6 py-8 
        chat-pop 
        shadow-xl shadow-black/10
      "
    >
      {/* CLOSE HEAD */}
      <button
        onClick={() => onClose && onClose()}
        className="
          absolute -top-10 left-1/2 -translate-x-1/2 
          rounded-full border border-gray-300/60 
          bg-white/40 
          backdrop-blur-xl 
          shadow-lg shadow-black/10 
          p-1 
          hover:scale-105 
          hover:bg-white/60 
          transition
        "
        title="Zatvori chat"
      >
        <img
          src="/Avatar-head.png"
          alt="LabGuard"
          className="w-16 h-16 rounded-full"
        />
      </button>

      {/* HISTORY */}
      <div
        ref={msgRef}
        className="
          max-h-[340px]
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
              <li>Šta znači povišen LDL?</li>
              <li>Za šta služi gvožđe?</li>
              <li>Objasni moj nalaz ukratko.</li>
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "assistant" ? (
            // BOT – svijetli gel balon
            <div key={m.id} className="flex items-start gap-3 max-w-[90%]">
              <img
                src="/Avatar-head.png"
                className="
                  w-10 h-10 rounded-full 
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
            // USER – tamniji gel balon
            <div key={m.id} className="flex justify-end w-full">
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
          <div className="text-xs text-gray-600">LabGuard piše…</div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="flex mt-4 gap-2">
        <input
          className="
            flex-1 
            rounded-2xl 
            border border-gray-400/40 
            bg-white/50 
            backdrop-blur-md 
            px-3 py-2 
            text-sm text-gray-900 
            placeholder-gray-600
            outline-none 
            focus:ring-1 focus:ring-gray-400
          "
          placeholder="Upiši pitanje o nalazu..."
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
            bg-white/50 
            border border-gray-500/40
            shadow-md shadow-black/10
            text-sm font-medium text-gray-900
            hover:bg-white/60 hover:border-gray-600
            disabled:opacity-40 disabled:cursor-not-allowed
            transition
          "
        >
          Pošalji
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default LabGuardChat;
