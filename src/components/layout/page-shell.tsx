import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentUser } from "@/lib/auth/current-user";

interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export async function PageShell({ title, description, actions, children }: PageShellProps) {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader
        title={title}
        description={description}
        actions={actions}
        user={{ name: user?.name ?? null, email: user?.email ?? "", role: user?.role ?? "VIEWER" }}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
    </>
  );
}
