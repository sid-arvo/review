"use client";

import dynamic from "next/dynamic";
import type { HorizontalBarChart as HorizontalBarChartImpl } from "./bar-chart-impl";

// recharts is a large dependency; every dashboard page that renders a chart
// was eagerly bundling it into that page's client JS. Loading it via
// next/dynamic (no SSR, since these charts are purely client-rendered anyway)
// splits recharts into its own chunk that's fetched after initial hydration
// instead of blocking it.
export const HorizontalBarChart = dynamic(
  () => import("./bar-chart-impl").then((m) => m.HorizontalBarChart),
  {
    ssr: false,
    loading: () => <div className="h-[220px] w-full animate-pulse rounded-md bg-muted" />,
  }
) as typeof HorizontalBarChartImpl;
