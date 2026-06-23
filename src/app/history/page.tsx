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
  ScatterChart,
  Scatter,
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

  const [
    waterTimeDistribution,
    setWaterTimeDistribution,
  ] = useState<any[]>([]);

  const [scatterData,
    setScatterData] =
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

    buildTimeDistribution(logs);

    buildScatterData(logs);
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

  const buildTimeDistribution = (
    logs: any[]
  ) => {
    const buckets = [
      { time: "00-02", count: 0 },
      { time: "02-04", count: 0 },
      { time: "04-06", count: 0 },
      { time: "06-08", count: 0 },
      { time: "08-10", count: 0 },
      { time: "10-12", count: 0 },
      { time: "12-14", count: 0 },
      { time: "14-16", count: 0 },
      { time: "16-18", count: 0 },
      { time: "18-20", count: 0 },
      { time: "20-22", count: 0 },
      { time: "22-24", count: 0 },
    ];
  
    logs.forEach((log) => {
      const hour = new Date(
        log.created_at
      ).getHours();
  
      const index =
        Math.floor(hour / 2);
  
      buckets[index].count += 1;
    });
  
    setWaterTimeDistribution(
      buckets
    );
  };

  const buildScatterData = (
    logs: any[]
  ) => {
    const start = new Date(
      `${startDate}T00:00:00+08:00`
    );
  
    const today = new Date();
  
    const todayLabel =
      `${String(
        today.getMonth() + 1
      ).padStart(2, "0")}/` +
      `${String(
        today.getDate()
      ).padStart(2, "0")}`;
  
    const points = logs.map((log) => {
      const utcDate = new Date(
        log.created_at
      );
      
      const date = new Date(
        utcDate.toLocaleString(
          "en-US",
          {
            timeZone: "Asia/Taipei",
          }
        )
      );

      const dayIndex = Math.floor(
        (date.getTime() -
          start.getTime()) /
          (1000 * 60 * 60 * 24)
      );
  
      const dateLabel =
        `${String(
          date.getMonth() + 1
        ).padStart(2, "0")}/` +
        `${String(
          date.getDate()
        ).padStart(2, "0")}`;

      return {
        dayIndex,
  
        time:
          date.getHours() +
          date.getMinutes() / 60,
  
        dateLabel,
  
        isToday:
          dateLabel === todayLabel,
      };
    });
  
    setScatterData(points);
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

  const maxTimeCount = Math.max(
    ...waterTimeDistribution.map(
      item => item.count
    ),
    1
  );
  
  const timeYAxisMax =
    Math.ceil((maxTimeCount + 1) / 2) * 2;
  
    const scatterTicks = [];

    const scatterLabels: Record<
      number,
      string
    > = {};
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    const todayLabel =
      `${String(
        today.getMonth() + 1
      ).padStart(2, "0")}/` +
      `${String(
        today.getDate()
      ).padStart(2, "0")}`;

    let index = 0;
    
    while (start <= end) {
      scatterTicks.push(index);
    
      scatterLabels[index] =
        `${String(
          start.getMonth() + 1
        ).padStart(2, "0")}/` +
        `${String(
          start.getDate()
        ).padStart(2, "0")}`;
    
      start.setDate(
        start.getDate() + 1
      );
    
      index++;
    }

  const averageCount =
    dailyCounts.length > 0
      ? (
          dailyCounts.reduce(
            (sum, item) =>
              sum + item.count,
            0
          ) / dailyCounts.length
        ).toFixed(1)
      : "0.0";

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

        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>
            喝水時間點分布
          </h2>

          <div className={styles.chartSubTitle}>
            每個點代表一次喝水紀錄
          </div>

          <div className={styles.chartScroll}>
            <div
              style={{
                width: `${Math.max(
                  ((new Date(endDate).getTime() -
                    new Date(startDate).getTime()) /
                    (1000 * 60 * 60 * 24) +
                    1) *
                    70,
                  450
                )}px`,
                height: "420px",
              }}
            >
            <ResponsiveContainer
              width="100%"
              height={400}
            >
            <ScatterChart
              margin={{
                top: 20,
                right: 20,
                left: -5,
                bottom: 0,
              }}
            >
              <defs>
                <filter
                  id="scatterGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="4"
                    floodColor="#e36b9a"
                    floodOpacity="0.5"
                  />
                </filter>
              </defs>

              <CartesianGrid
                stroke="#f6cfd8"
                strokeDasharray="6 6"
                vertical={false}
              />
            <XAxis
              type="number"
              dataKey="dayIndex"
              domain={[
                -0.5,
                Math.max(
                  scatterTicks.length - 0.5,
                  0.5
                ),
              ]}
              ticks={
                scatterTicks.length > 0
                  ? scatterTicks
                  : [0]
              }
              tick={({ x, y, payload }) => {
                const label =
                  scatterLabels[payload.value] ??
                  "";

                const isToday =
                  label === todayLabel;

                return (
                  <text
                    x={Number(x)}
                    y={Number(y) + 15}
                    textAnchor="middle"
                    fill={
                      isToday
                        ? "#e36b9a"
                        : "#a58b77"
                    }
                    fontSize="14"
                    fontWeight={
                      isToday
                        ? "800"
                        : "600"
                    }
                  >
                    {label}
                  </text>
                );
              }}
            />
            <YAxis
              dataKey="time"
              type="number"
              domain={[0, 24]}
              ticks={[
                0,
                2,
                4,
                6,
                8,
                10,
                12,
                14,
                16,
                18,
                20,
                22,
                24,
              ]}
              tickFormatter={(value) =>
                `${String(value)
                  .padStart(2, "0")}:00`
              }
              tick={{
                fill: "#a58b77",
                fontSize: 14,
                fontWeight: 600,
              }}
            />
            <Scatter
              data={scatterData}
              shape={(props: any) => {
                const {
                  cx,
                  cy,
                  payload,
                } = props;

                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={
                      payload.isToday
                        ? "#e36b9a"
                        : "#84b8f0"
                    }
                    filter={
                      payload.isToday
                        ? "url(#scatterGlow)"
                        : undefined
                    }
                  />
                );
              }}
            />
            </ScatterChart>
            </ResponsiveContainer>
            </div>
            </div>
            </div>
  
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>
            喝水時段分布
          </h2>

          <div className={styles.chartSubTitle}>
            單位：次
          </div>

          <div className={styles.chartScroll}>
            <div
              style={{
                width: "720px",
                height: "320px",
              }}
            >
              <div className={styles.chartInner}>
                <ResponsiveContainer
                  width="100%"
                  height={320}
                >
              <BarChart
                data={waterTimeDistribution}
                margin={{
                  top: 20,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="timeGradient"
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
                </defs>

                <CartesianGrid
                  stroke="#f6cfd8"
                  strokeDasharray="6 6"
                  vertical={false}
                />

                <XAxis
                  dataKey="time"
                  interval={0}
                  tick={{
                    fill: "#a58b77",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                />

                <YAxis
                  domain={[0, timeYAxisMax]}
                  tickCount={6}
                  width={30}
                  tick={{
                    fill: "#a58b77",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                />

                <Bar
                  dataKey="count"
                  fill="url(#timeGradient)"
                  radius={[12,12,0,0]}
                  barSize={28}
                >
                  <LabelList
                    dataKey="count"
                    content={(props: any) => {
                      const {
                        x,
                        y,
                        width,
                        value,
                      } = props;

                      if (Number(value) === 0) {
                        return null;
                      }

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
                          fill="#6da9e8"
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
                  dailyCounts.length * 55,
                  500
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
                    width={30}
                    tick={{
                      fill: "#a58b77",
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  />

                  <Bar
                    dataKey="count"
                    barSize={36}
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

          <div className={styles.averageTag}>
            平均

            <span
              className={styles.averageNumber}
            >
              {averageCount}
            </span>

            杯 / 天
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