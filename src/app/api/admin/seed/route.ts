import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { seedDatabase } from "@/lib/etl/seed-database";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${env.CRON_SECRET}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === env.CRON_SECRET;
}

/**
 * One-off seeding endpoint for freshly-provisioned deployments. Exists
 * because remote database seeding can only happen from a runtime that can
 * actually reach the database - some sandboxed dev environments (including
 * the one this app was built in) can only make outbound HTTPS calls, not
 * raw Postgres connections, so `prisma db seed` isn't always runnable
 * against a hosted database from wherever the code was written.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.review.count();
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  if (existing > 0 && !force) {
    return NextResponse.json({ ok: false, message: `Database already has ${existing} reviews. Pass ?force=true to seed anyway.` });
  }

  const scale = Number(url.searchParams.get("scale") ?? "0.45");

  try {
    const result = await seedDatabase({ volumeScale: scale, enrichConcurrency: 10 });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[admin/seed] failed:", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
