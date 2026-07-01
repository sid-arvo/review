"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  height?: number;
}

export function DonutChart({ data, height = 240 }: DonutChartProps) {
  const config: ChartConfig = Object.fromEntries(data.map((d) => [d.label, { label: d.label, color: d.color }]));
  return (
    <ChartContainer config={config} style={{ height }} className="mx-auto aspect-square w-full max-w-[280px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90} strokeWidth={2}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="label" />} />
      </PieChart>
    </ChartContainer>
  );
}
