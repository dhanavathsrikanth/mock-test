"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function SubjectChart({
  data,
}: {
  data: { name: string; accuracy: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        Complete some tests to see your subject-wise performance
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Accuracy"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--background))",
          }}
        />
        <Bar
          dataKey="accuracy"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
