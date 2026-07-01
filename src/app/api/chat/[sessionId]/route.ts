import { streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { retrieveContext } from "@/lib/rag/retrieve";
import { synthesizeHeuristicAnswer } from "@/lib/rag/heuristic-answer";
import { hasOpenAI, env } from "@/lib/env";
import { CHAT_MODEL } from "@/lib/ai/openai-client";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are the AI analyst inside Spotify's internal Voice-of-Customer Intelligence platform. Product managers, UX researchers, and leadership ask you questions about why users struggle with music discovery and recommendations.
Answer ONLY using the numbered review excerpts provided in the context. Cite sources inline using [n] notation matching the excerpt numbers. If the context doesn't support an answer, say so plainly rather than speculating. Be concise, specific, and actionable - like a sharp product analyst, not a generic chatbot.`;

async function persistCitations(messageId: string, reviewIds: string[]) {
  if (reviewIds.length === 0) return;
  await prisma.chatCitation.createMany({
    data: reviewIds.map((reviewId, idx) => ({ chatMessageId: messageId, reviewId, similarity: 1 - idx * 0.05 })),
    skipDuplicates: true,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const body = await request.json();
  const question: string = body.message ?? extractLatestText(body.messages);

  if (!question) {
    return new Response("Missing message", { status: 400 });
  }

  await prisma.chatMessage.create({ data: { sessionId, role: "user", content: question } });

  const { citations, contextBlock } = await retrieveContext(question, 8);
  const reviewIds = citations.map((c) => c.id);
  const citationHeader = Buffer.from(JSON.stringify(citations.map((c) => ({ id: c.id, source: c.source, publishedAt: c.publishedAt, similarity: c.similarity, snippet: (c.cleanText ?? c.originalText).slice(0, 200) })))).toString("base64");

  if (!hasOpenAI()) {
    const answer = synthesizeHeuristicAnswer(question, citations);
    const assistantMessage = await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content: answer } });
    await persistCitations(assistantMessage.id, reviewIds);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(answer));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Citations": citationHeader },
    });
  }

  const openaiProvider = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  const priorMessages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const modelMessages: ModelMessage[] = priorMessages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  let fullText = "";
  const result = streamText({
    model: openaiProvider(CHAT_MODEL),
    system: `${SYSTEM_PROMPT}\n\nContext:\n${contextBlock}`,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      fullText = text;
      const assistantMessage = await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content: fullText } });
      await persistCitations(assistantMessage.id, reviewIds);
    },
  });

  const textResponse = result.toTextStreamResponse();
  const headers = new Headers(textResponse.headers);
  headers.set("X-Citations", citationHeader);
  return new Response(textResponse.body, { status: textResponse.status, headers });
}

function extractLatestText(messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }>; content?: string }> | undefined): string {
  if (!messages || messages.length === 0) return "";
  const last = messages[messages.length - 1];
  if (last.content) return last.content;
  return last.parts?.filter((p) => p.type === "text").map((p) => p.text).join(" ") ?? "";
}
