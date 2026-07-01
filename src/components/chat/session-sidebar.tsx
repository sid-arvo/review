"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Plus, MessageSquare } from "lucide-react";

interface SessionSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export function SessionSidebar({ activeSessionId }: { activeSessionId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSessions() {
    const res = await fetch("/api/chat/sessions");
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSessions();
     
  }, []);

  async function createSession() {
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    const data = await res.json();
    const params = new URLSearchParams(searchParams.toString());
    params.set("session", data.session.id);
    router.push(`/chat?${params.toString()}`);
    loadSessions();
  }

  return (
    <div className="flex w-64 shrink-0 flex-col border-r">
      <div className="p-3">
        <Button size="sm" className="w-full" onClick={createSession}>
          <Plus className="size-4" /> New conversation
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-3">
          {loading && <p className="px-2 text-xs text-muted-foreground">Loading...</p>}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => router.push(`/chat?session=${s.id}`)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                activeSessionId === s.id && "bg-accent"
              )}
            >
              <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{s.title}</span>
            </button>
          ))}
          {!loading && sessions.length === 0 && (
            <p className="px-2 text-xs text-muted-foreground">No conversations yet.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
