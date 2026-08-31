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
import { useEffect, useState } from "react";

interface SalesChartProps {
  data: {
    date: string;
    vendas: number;
  }[];
}

function getCSSVar(name: string) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function SalesChart({ data }: SalesChartProps) {
  const [colors, setColors] = useState({
    border: "#374151",
    mutedFg: "#9ca3af",
    tooltipBg: "#1f2937",
    tooltipBorder: "#374151",
    tooltipText: "#f3f4f6",
  });

  useEffect(() => {
    function read() {
      setColors({
        border: getCSSVar("--border") || "#374151",
        mutedFg: getCSSVar("--muted-fg") || "#9ca3af",
        tooltipBg: getCSSVar("--card") || "#1f2937",
        tooltipBorder: getCSSVar("--card-border") || "#374151",
        tooltipText: getCSSVar("--foreground") || "#f3f4f6",
      });
    }
    read();
    // re-read when theme changes (html class toggled)
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke={colors.mutedFg}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke={colors.mutedFg}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dx={-10}
            tickFormatter={(value) => `R$ ${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: "8px",
              color: colors.tooltipText,
            }}
            itemStyle={{ color: "#10b981", fontWeight: "bold" }}
            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Faturamento"]}
            labelStyle={{ color: colors.mutedFg, marginBottom: "4px" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
