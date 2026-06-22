"use client";

import { useState, useEffect } from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

import styles from "./history.module.css";

export default function HistoryPage() {
  const [showDateFilter, setShowDateFilter] =
  useState(false);

  const today = new Date();

  const defaultEndDate = today
    .toISOString()
    .split("T")[0];

  const defaultStartDate = new Date(
    today.getTime() - 6 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] =
    useState(defaultStartDate);

  const [endDate, setEndDate] =
    useState(defaultEndDate);

  const [waterLogs, setWaterLogs] = useState<any[]>([]);

  const [dailyCounts, setDailyCounts] =
    useState<any[]>([]);

  const loadWaterLogs = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) return;
  
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  
    const { data, error } = await supabase
      .from("water_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });
  
    if (error) {
      console.error(error);
      return;
    }
  
    const logs = data ?? [];

    setWaterLogs(logs);

    buildDailyCounts(logs);
  };

  const buildDailyCounts = (
    logs: any[]
  ) => {
    const counts: Record<
      string,
      number
    > = {};
  
    logs.forEach((log) => {
      const date = new Date(
        log.created_at
      );
  
      const key =
        `${date.getFullYear()}/` +
        `${String(
          date.getMonth() + 1
        ).padStart(2, "0")}/` +
        `${String(
          date.getDate()
        ).padStart(2, "0")}`;
  
      counts[key] =
        (counts[key] || 0) + 1;
    });
  
    const result = [];

    const current = new Date(startDate);
    const end = new Date(endDate);

    const today = new Date();

    const todayKey =
      `${today.getFullYear()}/` +
      `${String(
        today.getMonth() + 1
      ).padStart(2, "0")}/` +
      `${String(
        today.getDate()
      ).padStart(2, "0")}`;

    while (current <= end) {
      const key =
        `${current.getFullYear()}/` +
        `${String(
          current.getMonth() + 1
        ).padStart(2, "0")}/` +
        `${String(
          current.getDate()
        ).padStart(2, "0")}`;

      result.push({
        date: key,
      
        displayDate:
          `${String(
            current.getMonth() + 1
          ).padStart(2, "0")}/` +
          `${String(
            current.getDate()
          ).padStart(2, "0")}`,
      
        count: counts[key] || 0,
      
        isToday: key === todayKey,
      });

      current.setDate(
        current.getDate() + 1
      );
    }

    setDailyCounts(result);

  };  

  useEffect(() => {
    loadWaterLogs();
  }, [startDate, endDate]);

  const maxCount = Math.max(
    ...dailyCounts.map(item => item.count),
    8
  );
  
  const yAxisMax =
    Math.ceil((maxCount + 1) / 2) * 2;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        
        <div className={styles.topBar}>
          <Link
            href="/"
            className={styles.backButton}
          >
            ← 回首頁
          </Link>

          <button
            className={styles.refreshButton}
            onClick={() => window.location.reload()}
            aria-label="重新整理"
          >
            ↻
          </button>
        </div>
  
        <div className={styles.filterCard}>
          <div className={styles.filterTitle}>
            日期篩選
          </div>

          <button
            className={styles.dateSummary}
            onClick={() =>
              setShowDateFilter(
                !showDateFilter
              )
            }
          >
            {startDate.replaceAll("-", "/")}
            {" "}~{" "}
            {endDate.replaceAll("-", "/")}

            <span>
              {showDateFilter
                ? "▲"
                : "▼"}
            </span>
          </button>

          {showDateFilter && (
            <div className={styles.filterRow}>
              <div className={styles.dateGroup}>
                <label
                  className={styles.dateLabel}
                >
                  開始日期
                </label>

                <input
                  type="date"
                  value={startDate}
                  className={styles.dateInput}
                  onChange={(e) =>
                    setStartDate(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className={styles.dateGroup}>
                <label
                  className={styles.dateLabel}
                >
                  結束日期
                </label>

                <input
                  type="date"
                  value={endDate}
                  className={styles.dateInput}
                  onChange={(e) =>
                    setEndDate(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>
  
        <div className={styles.placeholderCard}>
          第一個圖表區塊（喝水時間分布）
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>
            每日喝水杯數
          </h2>

          <div className={styles.chartSubTitle}>
            單位：杯
          </div>

          <div className={styles.chartScroll}>
            <div
              style={{
                width: `${Math.max(
                  dailyCounts.length * 70,
                  650
                )}px`,
                height: "320px",
              }}
            >
              <div className={styles.chartInner}>
                <ResponsiveContainer
                width="100%"
                height={320}
                >
                <BarChart
                  data={dailyCounts}
                  margin={{
                    top: 20,
                    right: 10,
                    left: 0,
                    bottom: -10,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="historyBarGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#b8d9fb"
                      />

                      <stop
                        offset="100%"
                        stopColor="#84b8f0"
                      />
                    </linearGradient>

                    <linearGradient
                      id="historyTodayGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#f19bbb"
                      />

                      <stop
                        offset="100%"
                        stopColor="#e36b9a"
                      />
                    </linearGradient>

                    <filter
                      id="todayGlow"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="6"
                        floodColor="#e36b9a"
                        floodOpacity="0.35"
                      />
                    </filter>
                  </defs>

                  <CartesianGrid
                    stroke="#f6cfd8"
                    strokeDasharray="6 6"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="displayDate"
                    interval={0}
                    height={40}
                    tick={({ x, y, payload }) => {
                      const current =
                        dailyCounts.find(
                          (item) =>
                            item.displayDate === payload.value
                        );

                      return (
                        <text
                          x={Number(x)}
                          y={Number(y) + 10}
                          textAnchor="middle"

                          fill={
                            current?.isToday
                              ? "#e36b9a"
                              : "#a58b77"
                          }

                          fontSize="16"

                          fontWeight={
                            current?.isToday
                              ? "800"
                              : "600"
                          }
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />

                  <YAxis
                    domain={[0, yAxisMax]}
                    tickCount={6}
                    width={25}
                    tick={{
                      fill: "#a58b77",
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  />

                  <Bar
                    dataKey="count"
                    radius={[
                      12,
                      12,
                      0,
                      0,
                    ]}
                  >
                    {dailyCounts.map(
                      (item, index) => (
                        <Cell
                          key={index}
                          fill={
                            item.isToday
                              ? "url(#historyTodayGradient)"
                              : "url(#historyBarGradient)"
                          }
                          filter={
                            item.isToday
                              ? "url(#todayGlow)"
                              : undefined
                          }
                        />
                      )
                    )}

                    <LabelList
                      dataKey="count"
                      content={(props: any) => {
                        const {
                          x,
                          y,
                          width,
                          value,
                          fill,
                        } = props;

                        if (Number(value) === 0) {
                          return null;
                        }

                        const isToday =
                          fill ===
                          "url(#historyTodayGradient)";

                        return (
                          <text
                            x={
                              Number(x) +
                              Number(width) / 2
                            }
                            y={Number(y) - 8}
                            textAnchor="middle"
                            fontSize="18"
                            fontWeight="700"
                            fill={
                              isToday
                                ? "#e36b9a"
                                : "#6da9e8"
                            }
                          >
                            {value}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.tableCard}>
          <h2 className={styles.cardTitle}>
            喝水時間紀錄
          </h2>

          <div className={styles.tableContainer}>
            {waterLogs.length === 0 ? (
              <div className={styles.emptyText}>
                此日期區間無資料
              </div>
            ) : (
              waterLogs.map((log) => (
                <div
                  key={log.id}
                  className={styles.tableRow}
                >
                  <span>
                    {
                      new Intl.DateTimeFormat(
                        "zh-TW",
                        {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }
                      )
                        .format(
                          new Date(log.created_at)
                        )
                        .replaceAll("-", "/")
                    }
                  </span>

                  <span>
                    {new Date(
                      log.created_at
                    ).toLocaleTimeString("zh-TW", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
  
      </div>
    </main>
  );
}