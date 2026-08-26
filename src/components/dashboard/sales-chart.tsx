"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesChartProps {
  data: {
    date: string;
    vendas: number;
  }[];
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <Line
            type="monotone"
            dataKey="vendas"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          <CartesianGrid stroke="#374151" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dx={-10}
            tickFormatter={(value) => `R$ ${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#f3f4f6",
            }}
            itemStyle={{ color: "#10b981", fontWeight: "bold" }}
            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Faturamento"]}
            labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
