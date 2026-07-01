"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScopeOption } from "@/lib/queries/trends";

export function ScopeSelect({ options, defaultValue }: { options: ScopeOption[]; defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Select
      value={searchParams.get("scope") ?? defaultValue}
      onValueChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("scope", v);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger size="sm" className="w-[220px]">
        <SelectValue placeholder="Scope" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
