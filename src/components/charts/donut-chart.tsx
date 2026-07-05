"use client";

import dynamic from "next/dynamic";
import type { DonutChart as DonutChartImpl } from "./donut-chart-impl";

// See bar-chart.tsx: recharts is code-split out of the initial page bundle
// and fetched lazily on the client instead of being eagerly bundled.
export const DonutChart = dynamic(() => import("./donut-chart-impl").then((m) => m.DonutChart), {
  ssr: false,
  loading: () => <div className="mx-auto aspect-square w-full max-w-[280px] animate-pulse rounded-full bg-muted" />,
}) as typeof DonutChartImpl;
