"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function GenerateReportButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays: 30 }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      toast.success("New executive summary generated");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={generate} disabled={loading || pending}>
      {loading || pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      Generate report
    </Button>
  );
}
