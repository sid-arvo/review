"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  valueFormatter?: (v: number) => string;
}

export function HorizontalBarChart({ data, height, valueFormatter }: HorizontalBarChartProps) {
  const config: ChartConfig = { value: { label: "Value" } };
  return (
    <ChartContainer config={config} style={{ height: height ?? Math.max(180, data.length * 34) }} className="w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={150}
          fontSize={12}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : String(value))}
            />
          }
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color ?? "var(--chart-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
