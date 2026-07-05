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
 * Resolves the current user, auto-provisioning a Prisma User row on first
 * sign-in. When Supabase is not configured (local/demo environments) this
 * upserts and returns a fixed demo admin row so the full dashboard is
 * reviewable without an OAuth setup step, while still being a real DB row
 * other tables can reference by id.
 *
 * Wrapped in React's `cache()` so multiple Server Components rendered within
 * the same request - the dashboard layout and every page's `PageShell` both
 * call this - share one resolved result instead of each re-running the
 * Supabase auth call and the `prisma.user.upsert` write.
 */
export const getCurrentUser = cache(async () => {
  if (!hasSupabase() || DEMO_MODE) {
    return prisma.user.upsert({
      where: { supabaseId: DEMO_SUPABASE_ID },
      update: {},
      create: {
        supabaseId: DEMO_SUPABASE_ID,
        email: "demo.admin@spotify-voc.internal",
        name: "Demo Admin",
        role: UserRole.ADMIN,
      },
    });
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: {
      email: authUser.email ?? "",
      lastLoginAt: new Date(),
    },
    create: {
      supabaseId: authUser.id,
      email: authUser.email ?? "",
      name: (authUser.user_metadata?.full_name as string | undefined) ?? authUser.email ?? "New user",
      avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
      role: UserRole.VIEWER,
    },
  });

  return user;
});
