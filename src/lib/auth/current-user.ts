import "server-only";
import { cache } from "react";
import { UserRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasSupabase } from "@/lib/env";

const DEMO_SUPABASE_ID = "demo-admin";

/**
 * DEMO_MODE bypasses the Supabase login requirement even when Supabase is
 * fully configured, so a deployment can be shared publicly before Google/
 * GitHub OAuth apps are set up in the Supabase dashboard (that setup happens
 * outside this codebase and can't be automated). Unset it once real sign-in
 * should be enforced - no code changes needed, just remove the env var.
 */
const DEMO_MODE = process.env.DEMO_MODE === "true";

/**
 * The demo admin row never changes, so once a warm server instance has
 * resolved it there's no need to hit the DB again on every navigation - a
 * per-request `cache()` doesn't help here since each page load is a new
 * request. This module-scope cache persists for the lifetime of the server
 * process and is what actually cuts the repeated upsert-write.
 */
let demoUserPromise: ReturnType<typeof prisma.user.upsert> | null = null;

function getDemoUser() {
  if (!demoUserPromise) {
    demoUserPromise = prisma.user.upsert({
      where: { supabaseId: DEMO_SUPABASE_ID },
      update: {},
      create: {
        supabaseId: DEMO_SUPABASE_ID,
        email: "demo.admin@spotify-voc.internal",
        name: "Demo Admin",
        role: UserRole.ADMIN,
      },
    });
    demoUserPromise.catch(() => {
      demoUserPromise = null;
    });
  }
  return demoUserPromise;
}

const LAST_LOGIN_STALE_MS = 5 * 60 * 1000;

/**
 * Resolves the current user, auto-provisioning a Prisma User row on first
 * sign-in. When Supabase is not configured (local/demo environments) this
 * returns a fixed demo admin row so the full dashboard is reviewable
 * without an OAuth setup step, while still being a real DB row other
 * tables can reference by id.
 *
 * Wrapped in React's `cache()` so multiple Server Components rendered within
 * the same request - the dashboard layout and every page's `PageShell` both
 * call this - share one resolved result instead of each re-running the
 * lookup below.
 */
export const getCurrentUser = cache(async () => {
  if (!hasSupabase() || DEMO_MODE) {
    return getDemoUser();
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  // Most requests are an already-provisioned user whose profile hasn't
  // changed since the last visit - a single indexed read instead of an
  // upsert-write avoids hitting the DB's write path (WAL + index update)
  // on every page navigation. Only fall through to a write when this is a
  // first sign-in, the email changed, or lastLoginAt is stale enough to be
  // worth refreshing.
  const existing = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  const email = authUser.email ?? "";
  const isStale = !existing?.lastLoginAt || Date.now() - existing.lastLoginAt.getTime() > LAST_LOGIN_STALE_MS;

  if (existing && existing.email === email && !isStale) {
    return existing;
  }

  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: {
      email,
      lastLoginAt: new Date(),
    },
    create: {
      supabaseId: authUser.id,
      email,
      name: (authUser.user_metadata?.full_name as string | undefined) ?? email ?? "New user",
      avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
      role: UserRole.VIEWER,
    },
  });

  return user;
});
