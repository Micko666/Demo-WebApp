// src/components/TrendChart.tsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AnalyteTrend } from "@/lib/trends";

interface TrendChartProps {
  trend: AnalyteTrend;
}

/**
 * Line chart za jedan analit (vrijednost kroz vrijeme).
 */
const TrendChart: React.FC<TrendChartProps> = ({ trend }) => {
  const data = trend.points
    .filter((p) => typeof p.value === "number" && p.value != null)
    .map((p) => ({
      date: p.date,
      value: p.value,
      refLow: p.refLow,
      refHigh: p.refHigh,
    }));

  if (data.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        Nema numeričkih podataka za ovaj parametar.
      </div>
    );
  }

  const first = data[0];
  const hasRef =
    typeof first.refLow === "number" && typeof first.refHigh === "number";

  return (
    <div className="w-full h-56 rounded-2xl border border-gray-300/60 bg-white/70 backdrop-blur-xl p-3 shadow-sm">
      {/* Naslov grafikona */}
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs font-semibold text-gray-800 truncate">
          {trend.name}
        </p>
        <span className="text-[10px] text-gray-500">
          {trend.unit ? trend.unit : ""}
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 16, bottom: 10, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            width={38}
            allowDecimals
          />
          <Tooltip
            formatter={(val: any) =>
              val != null ? String(val) : "—"
            }
            labelFormatter={(label) => `Datum: ${label}`}
          />
          {hasRef && (
            <ReferenceArea
              y1={first.refLow as number}
              y2={first.refHigh as number}
              fillOpacity={0.08}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
