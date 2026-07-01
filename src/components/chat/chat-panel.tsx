"use client";

import { useEffect, useRef, useState } from "react";
import { useRagChat, type ChatMessageView } from "@/hooks/use-rag-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/domain/spotify";
import { cn } from "@/lib/utils";

const STARTER_QUESTIONS = [
  "Why do users struggle to discover new music?",
  "Why are recommendations becoming repetitive?",
  "Which recommendation surfaces get the most negative feedback?",
  "What should Spotify prioritize next?",
];

export function ChatPanel({ sessionId, initialMessages }: { sessionId: string; initialMessages: ChatMessageView[] }) {
  const { messages, status, sendMessage } = useRagChat(sessionId, initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit() {
    if (!input.trim() || status === "streaming") return;
    sendMessage(input);
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col">
      <ScrollArea className="flex-1 px-6">
        <div className="mx-auto max-w-3xl space-y-6 py-6">
          {messages.length === 0 && (
            <div className="mt-12 text-center">
              <Sparkles className="mx-auto mb-3 size-8 text-primary" />
              <h2 className="text-lg font-semibold">Ask about the discovery experience</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Answers are grounded in retrieved reviews with citations - ask anything.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-lg border p-3 text-left text-sm hover:border-primary/50 hover:bg-accent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {status === "streaming" && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Retrieving grounded evidence...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask about discovery, recommendations, personas, feature requests..."
            className="min-h-[44px] resize-none"
            rows={1}
          />
          <Button size="icon" onClick={submit} disabled={status === "streaming" || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessageView }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className={cn("text-[10px]", !isUser && "bg-primary/15 text-primary")}>
          {isUser ? "You" : "AI"}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[85%] space-y-2", isUser && "items-end")}>
        <div className={cn("rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
          {message.content || " "}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c, idx) => (
              <Badge key={c.id} variant="outline" className="cursor-default text-[10px]" title={c.snippet}>
                [{idx + 1}] {SOURCE_LABELS[c.source] ?? c.source}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
