"use client";

import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface TimeSeriesChartProps {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string; color: string }>;
  xKey?: string;
  variant?: "line" | "area";
  height?: number;
}

export function TimeSeriesChart({ data, series, xKey = "date", variant = "area", height = 260 }: TimeSeriesChartProps) {
  const config: ChartConfig = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }]));

  const Chart = variant === "line" ? LineChart : AreaChart;

  return (
    <ChartContainer config={config} style={{ height }} className="w-full">
      <Chart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        {series.map((s) =>
          variant === "line" ? (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
          ) : (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          )
        )}
      </Chart>
    </ChartContainer>
  );
}
