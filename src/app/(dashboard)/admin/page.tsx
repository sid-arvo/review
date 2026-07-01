import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RoleSelect } from "@/components/dashboard/role-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { Users, Database, Tags, UserCircle2 } from "lucide-react";

export default async function AdminPage() {
  const [users, reviewCount, topicCount, personaCount, sourceBreakdown] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.review.count(),
    prisma.topic.count(),
    prisma.persona.count(),
    prisma.review.groupBy({ by: ["source"], _count: true }),
  ]);

  return (
    <PageShell title="Admin" description="Users, roles, and platform taxonomy">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total reviews" value={reviewCount.toLocaleString()} icon={Database} />
        <KpiCard label="Users" value={String(users.length)} icon={Users} />
        <KpiCard label="Topics" value={String(topicCount)} icon={Tags} />
        <KpiCard label="Personas" value={String(personaCount)} icon={UserCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users & roles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">{(u.name ?? u.email).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.name ?? "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <RoleSelect userId={u.id} role={u.role} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingestion source coverage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {sourceBreakdown.map((s) => (
            <Badge key={s.source} variant="secondary">
              {s.source}: {s._count}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
