"use client";

import { useCallback, useState } from "react";

function base64ToUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export interface ChatCitationView {
  id: string;
  source: string;
  publishedAt: string;
  similarity: number;
  snippet: string;
}

export interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitationView[];
}

export function useRagChat(sessionId: string | null, initialMessages: ChatMessageView[] = []) {
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim()) return;

      const userMessage: ChatMessageView = { id: crypto.randomUUID(), role: "user", content: text };
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }]);
      setStatus("streaming");

      try {
        const res = await fetch(`/api/chat/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok || !res.body) throw new Error("Chat request failed");

        const citationsHeader = res.headers.get("X-Citations");
        const citations: ChatCitationView[] = citationsHeader ? JSON.parse(base64ToUtf8(citationsHeader)) : [];

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)));
        }

        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated, citations } : m)));
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "Something went wrong generating a response." } : m))
        );
      } finally {
        setStatus("idle");
      }
    },
    [sessionId]
  );

  return { messages, setMessages, status, sendMessage };
}
