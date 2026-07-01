"use client";

import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { toast } from "sonner";

export function RoleSelect({ userId, role }: { userId: string; role: UserRole }) {
  const router = useRouter();

  async function updateRole(newRole: string) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      toast.error("Failed to update role");
      return;
    }
    toast.success("Role updated");
    router.refresh();
  }

  return (
    <Select defaultValue={role} onValueChange={updateRole}>
      <SelectTrigger size="sm" className="w-[170px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(UserRole).map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
