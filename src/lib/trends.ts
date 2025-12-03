// src/lib/trends.ts
import type { LabReport, LabRow } from "@/types";

export interface TrendPoint {
  date: string;
  value: number | null;
  refLow: number | null;
  refHigh: number | null;
  status?: string | null;
}

export interface AnalyteTrend {
  name: string;
  unit: string | null;
  points: TrendPoint[];
}

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export interface TrendInsight {
  name: string;
  unit: string | null;
  firstValue: number | null;
  firstDate: string | null;
  latestValue: number | null;
  latestDate: string | null;
  trendDirection: TrendDirection;
  delta: number | null;
  refLow: number | null;
  refHigh: number | null;
}

/**
 * Iz svih izvještaja gradi trendove po nazivu analita.
 */
export function buildTrendsFromReports(
  reports: LabReport[]
): Record<string, AnalyteTrend> {
  const map: Record<string, AnalyteTrend> = {};

  if (!reports || reports.length === 0) return map;

  const sortedReports = [...reports].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  for (const report of sortedReports) {
    const date = report.date;
    for (const row of report.rows || []) {
      const name = (row.Analit || "").trim();
      if (!name) continue;

      const rawValue = row.Vrijednost;
      const value =
        rawValue == null || Number.isNaN(rawValue) ? null : rawValue;

      const unit = row.Jedinica ? row.Jedinica.trim() : null;
      const refLow =
        row.Ref_low == null || Number.isNaN(row.Ref_low)
          ? null
          : row.Ref_low;
      const refHigh =
        row.Ref_high == null || Number.isNaN(row.Ref_high)
          ? null
          : row.Ref_high;

      if (!map[name]) {
        map[name] = {
          name,
          unit,
          points: [],
        };
      } else if (!map[name].unit && unit) {
        map[name].unit = unit;
      }

      map[name].points.push({
        date,
        value,
        refLow,
        refHigh,
        status: row.Status ?? null,
      });
    }
  }

  // sort po datumu
  for (const trend of Object.values(map)) {
    trend.points.sort((a, b) => a.date.localeCompare(b.date));
  }

  return map;
}

/**
 * Trend za jedan analit.
 */
export function getTrendForAnalyte(
  reports: LabReport[],
  analyteName: string
): AnalyteTrend | null {
  const all = buildTrendsFromReports(reports);
  return all[analyteName] ?? null;
}

/**
 * Sažetak trenda za tekstualni prikaz.
 */
export function getTrendInsight(trend: AnalyteTrend): TrendInsight {
  if (!trend.points.length) {
    return {
      name: trend.name,
      unit: trend.unit,
      firstValue: null,
      firstDate: null,
      latestValue: null,
      latestDate: null,
      trendDirection: "unknown",
      delta: null,
      refLow: null,
      refHigh: null,
    };
  }

  const pts = trend.points.filter(
    (p) => typeof p.value === "number" && !Number.isNaN(p.value)
  );

  if (!pts.length) {
    const last = trend.points[trend.points.length - 1];
    return {
      name: trend.name,
      unit: trend.unit,
      firstValue: null,
      firstDate: null,
      latestValue: last.value,
      latestDate: last.date,
      trendDirection: "unknown",
      delta: null,
      refLow: last.refLow ?? null,
      refHigh: last.refHigh ?? null,
    };
  }

  const first = pts[0];
  const last = pts[pts.length - 1];

  const firstValue = first.value ?? null;
  const firstDate = first.date ?? null;
  const latestValue = last.value ?? null;
  const latestDate = last.date ?? null;

  let direction: TrendDirection = "unknown";
  let delta: number | null = null;

  if (
    typeof first.value === "number" &&
    typeof last.value === "number"
  ) {
    delta = last.value - first.value;
    const absDelta = Math.abs(delta);
    const baseline = Math.abs(first.value) || 1;
    const relChange = absDelta / baseline;

    if (relChange < 0.03) {
      direction = "flat";
    } else if (delta > 0) {
      direction = "up";
    } else if (delta < 0) {
      direction = "down";
    } else {
      direction = "flat";
    }
  }

  return {
    name: trend.name,
    unit: trend.unit,
    firstValue,
    firstDate,
    latestValue,
    latestDate,
    trendDirection: direction,
    delta,
    refLow: last.refLow ?? null,
    refHigh: last.refHigh ?? null,
  };
}
