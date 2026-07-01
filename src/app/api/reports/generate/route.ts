import { NextResponse } from "next/server";
import { generateExecutiveSummary } from "@/lib/ai/executive-summary";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const periodDays = typeof body.periodDays === "number" ? body.periodDays : 30;
  const summary = await generateExecutiveSummary(periodDays);
  return NextResponse.json({ summary });
}
