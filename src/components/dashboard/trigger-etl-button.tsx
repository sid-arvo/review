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
        toast.error(data.error ?? "ETL run failed");
        return;
      }
      const { fetched, new: newCount, processed, status } = data.summary;
      toast.success(`ETL run ${status.toLowerCase()}: ${fetched} fetched, ${newCount} new, ${processed} processed`);
      router.refresh();
    } catch {
      toast.error("ETL run failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={trigger} disabled={pending} variant="secondary" size="sm">
      <RefreshCw className={pending ? "animate-spin" : undefined} />
      {pending ? "Running ETL..." : "Trigger ETL now"}
    </Button>
  );
}
