import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";

// DEMO_MODE's getCurrentUser() hits the DB directly (no cookies() call), so
// without this Next.js statically prerenders dashboard pages at build time
// and exhausts the pooler's connection_limit=1 before the build even runs.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar role={user.role} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
