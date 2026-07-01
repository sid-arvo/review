"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function TriggerEtlButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function trigger() {
    setPending(true);
    try {
      const res = await fetch("/api/admin/trigger-etl", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Failed to start ETL run");
        return;
      }
      toast.success("ETL run started - check the Cron page for live progress.");
      router.refresh();
    } catch {
      toast.error("Failed to start ETL run");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={trigger} disabled={pending} variant="secondary" size="sm">
      <RefreshCw className={pending ? "animate-spin" : undefined} />
      {pending ? "Starting..." : "Trigger ETL now"}
    </Button>
  );
}
