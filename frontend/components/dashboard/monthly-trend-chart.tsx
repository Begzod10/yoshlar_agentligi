"use client";

import { useMemo } from "react";
import { useStatsTrends } from "@/lib/api/hooks/use-stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Helpers ───────────────────────────────────────────────────────────────────

const UZ_MONTHS: Record<string, string> = {
  "01": "Yan", "02": "Fev", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Iyn", "07": "Iyl", "08": "Avg",
  "09": "Sen", "10": "Okt", "11": "Noy", "12": "Dek",
};

/** "2024-03" → "Mar" */
function periodLabel(period: string): string {
  const month = period.split("-")[1];
  return UZ_MONTHS[month] ?? period;
}

/** Returns ISO date strings for the start of `n` months ago and today */
function lastNMonthsRange(n: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - n + 1, 1);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// Fallback data shown while API is loading or returns nothing
const FALLBACK_DATA = [
  { month: "Yan", yoshlar: 45, rejalar: 32, uchrashuvlar: 78 },
  { month: "Fev", yoshlar: 52, rejalar: 38, uchrashuvlar: 92 },
  { month: "Mar", yoshlar: 61, rejalar: 45, uchrashuvlar: 105 },
  { month: "Apr", yoshlar: 58, rejalar: 42, uchrashuvlar: 98 },
  { month: "May", yoshlar: 72, rejalar: 56, uchrashuvlar: 124 },
  { month: "Iyn", yoshlar: 68, rejalar: 52, uchrashuvlar: 118 },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** Override date range. Defaults to last 6 months. */
  from?: string;
  to?: string;
  className?: string;
}

export function MonthlyTrendChart({ from, to, className }: Props) {
  const defaultRange = useMemo(() => lastNMonthsRange(6), []);
  const dateFrom = from ?? defaultRange.from;
  const dateTo   = to   ?? defaultRange.to;

  const baseParams = { from: dateFrom, to: dateTo, granularity: "month" as const };

  const youthQuery   = useStatsTrends({ ...baseParams, metric: "youthCount" });
  const planQuery    = useStatsTrends({ ...baseParams, metric: "planCompletion" });
  const meetingQuery = useStatsTrends({ ...baseParams, metric: "meetingAttendance" });

  const chartData = useMemo(() => {
    const youthData   = youthQuery.data   ?? [];
    const planData    = planQuery.data    ?? [];
    const meetingData = meetingQuery.data ?? [];

    // Merge by period
    const periods = Array.from(
      new Set([
        ...youthData.map((d) => d.period),
        ...planData.map((d) => d.period),
        ...meetingData.map((d) => d.period),
      ])
    ).sort();

    if (periods.length === 0) return FALLBACK_DATA;

    const yMap = new Map(youthData.map((d)   => [d.period, d.value]));
    const pMap = new Map(planData.map((d)    => [d.period, d.value]));
    const mMap = new Map(meetingData.map((d) => [d.period, d.value]));

    return periods.map((period) => ({
      month:        periodLabel(period),
      yoshlar:      yMap.get(period)  ?? 0,
      rejalar:      pMap.get(period)  ?? 0,
      uchrashuvlar: mMap.get(period)  ?? 0,
    }));
  }, [youthQuery.data, planQuery.data, meetingQuery.data]);

  const isLoading =
    youthQuery.isLoading || planQuery.isLoading || meetingQuery.isLoading;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Oylik dinamika
        </CardTitle>
        <CardDescription>Yoshlar, rejalar va uchrashuvlar soni</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
            Ma'lumotlar yuklanmoqda…
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="yoshlar"
                  name="Yoshlar"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="rejalar"
                  name="Rejalar"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="uchrashuvlar"
                  name="Uchrashuvlar"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
