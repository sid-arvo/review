"use client";

import dynamic from "next/dynamic";
import type { TimeSeriesChart as TimeSeriesChartImpl } from "./time-series-chart-impl";

// See bar-chart.tsx: recharts is code-split out of the initial page bundle
// and fetched lazily on the client instead of being eagerly bundled.
export const TimeSeriesChart = dynamic(
  () => import("./time-series-chart-impl").then((m) => m.TimeSeriesChart),
  {
    ssr: false,
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-md bg-muted" />,
  }
) as typeof TimeSeriesChartImpl;
