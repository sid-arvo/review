import { PageShell } from "@/components/layout/page-shell";
import { SessionSidebar } from "@/components/chat/session-sidebar";
import { ChatPanel } from "@/components/chat/chat-panel";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/filters";
import type { ChatMessageView } from "@/hooks/use-rag-chat";

export default async function ChatPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const sessionId = (Array.isArray(params.session) ? params.session[0] : params.session) ?? null;

  let initialMessages: ChatMessageView[] = [];
  if (sessionId) {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      include: { citations: { include: { review: true } } },
    });
    initialMessages = messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      citations: m.citations.map((c) => ({
        id: c.review.id,
        source: c.review.source,
        publishedAt: c.review.publishedAt.toISOString(),
        similarity: c.similarity,
        snippet: (c.review.cleanText ?? c.review.originalText).slice(0, 200),
      })),
    }));
  }

  return (
    <PageShell title="AI Chat" description="Ask natural-language questions grounded in customer feedback">
      <div className="-m-4 flex h-[calc(100vh-8.5rem)] overflow-hidden rounded-lg border md:-m-6">
        <SessionSidebar activeSessionId={sessionId} />
        {sessionId ? (
          <ChatPanel key={sessionId} sessionId={sessionId} initialMessages={initialMessages} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation or start a new one.
          </div>
        )}
      </div>
    </PageShell>
  );
}
