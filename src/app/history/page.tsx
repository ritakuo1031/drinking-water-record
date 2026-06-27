"use client";

import {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
  ComposedChart,
  Scatter,
} from "recharts";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

import styles from "./history.module.css";

const formatAmPm = (date: Date) => {
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");

  const period =
    hour < 12 ? "上午" : "下午";

  const displayHour =
    hour % 12 === 0
      ? 12
      : hour % 12;

  return `${period}${String(displayHour).padStart(2, "0")}:${minute}`;
};

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

  const [cupMl, setCupMl] =
    useState("");
  
  const [showMl, setShowMl] =
    useState(false);

  const [userId, setUserId] = useState("");

  const [selectedGroup, setSelectedGroup] =
    useState<any[] | null>(null);

  const [cardPosition, setCardPosition] =
    useState({
      left: 0,
      top: 0,
    });

  const [cardDirection, setCardDirection] =
    useState<
      "top-right" |
      "top-left" |
      "bottom-right" |
      "bottom-left"
    >("top-right");

  const scatterPointPositionsRef =
    useRef<
      Record<
        string,
        {
          cx: number;
          cy: number;
          payload: any;
        }
      >
    >({});
  
  const CARD_WIDTH = 170;
  const CARD_HEIGHT = 62;
  const OFFSET = 14;

  const cupMlNumber = Number(cupMl || 0);

  const dailyChartData = dailyCounts.map((item) => ({
    ...item,
    value: showMl
      ? item.count * cupMlNumber
      : item.count,
  }));

    const loadWaterLogs = async () => {
      scatterPointPositionsRef.current = {};
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserId(user.id);
    }
  
    if (!user) return;

    const { data: profile } =
      await supabase
        .from("profiles")
        .select(`
          cup_ml,
          show_ml
        `)
        .eq("id", user.id)
        .single();

    if (profile) {
      setCupMl(
        profile.cup_ml
          ? String(profile.cup_ml)
          : ""
      );

      setShowMl(
        profile.show_ml ?? false
      );
    }
  
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

  const formatDisplayTime = (date: Date) => {
    const hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, "0");
  
    const period = hour < 12 ? "上午" : "下午";
  
    const displayHour =
      hour % 12 === 0
        ? 12
        : hour % 12;
  
    return `${period}${String(displayHour).padStart(2, "0")}:${minute}`;
  };

  const calculateCardPosition = (
    cx: number,
    cy: number
  ) => {
    const chartWidth = Math.max(
      ((new Date(endDate).getTime() -
        new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24) +
        1) *
        70,
      450
    );
  
    const chartHeight = 400;
  
    let left = cx + OFFSET;
    let top = cy - CARD_HEIGHT - OFFSET;
  
    let direction:
      | "top-right"
      | "top-left"
      | "bottom-right"
      | "bottom-left" = "top-right";
  
    // 右邊放不下 → 左邊
    if (left + CARD_WIDTH > chartWidth - 8) {
      left = cx - CARD_WIDTH - OFFSET;
      direction = "top-left";
    }
  
    // 上面放不下 → 下面
    if (top < 8) {
      top = cy + OFFSET;
  
      direction =
        direction === "top-left"
          ? "bottom-left"
          : "bottom-right";
    }
  
    // 左邊超出
    if (left < 8) {
      left = 8;
    }
  
    // 下面超出
    if (top + CARD_HEIGHT > chartHeight - 8) {
      top = chartHeight - CARD_HEIGHT - 8;
    }
  
    return {
      left,
      top,
      direction,
    };
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
        id: log.created_at,

        dayIndex,
  
        time:
          date.getHours() +
          date.getMinutes() / 60,
  
        dateLabel,

        displayDate: dateLabel,

        displayTime: formatDisplayTime(date),

        created_at: log.created_at,
  
        isToday:
          dateLabel === todayLabel,
      };
    });
  
    if (points.length === 0) {
      const emptyPoints = [];
    
      const current = new Date(start);
    
      while (current <= new Date(`${endDate}T00:00:00+08:00`)) {
        emptyPoints.push({
          dayIndex: Math.floor(
            (current.getTime() - start.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          time: 0,
          hidden: true,
        });
    
        current.setDate(current.getDate() + 1);
      }
    
      setScatterData(emptyPoints);
    } else {
      setScatterData(points);
    }
  };

  useEffect(() => {
    loadWaterLogs();
  }, [startDate, endDate]);

  const maxValue = Math.max(
    ...dailyChartData.map(item => item.value),
    showMl
      ? cupMlNumber
      : 8
  );
  
  // ===== 智慧刻度 =====
  let step = 2;
  
  if (showMl) {
    if (maxValue <= 300) {
      step = 50;
    } else if (maxValue <= 600) {
      step = 100;
    } else if (maxValue <= 1200) {
      step = 200;
    } else {
      step = 500;
    }
  } else {
    if (maxValue <= 10) {
      step = 2;
    } else if (maxValue <= 20) {
      step = 5;
    } else {
      step = 10;
    }
  }
  
  // 往上取整，留一點空間
  const yAxisMax =
    Math.ceil(maxValue / step) * step;
  
  const yAxisTicks: number[] = [];
  
  for (
    let i = 0;
    i <= yAxisMax;
    i += step
  ) {
    yAxisTicks.push(i);
  }
  
  const maxTimeCount = Math.max(
    ...waterTimeDistribution.map(
      item => item.count
    ),
    1
  );
  
  const timeYAxisMax =
    Math.ceil((maxTimeCount + 1) / 2) * 2;
  
  const timeTicks = [];

  for (
    let i = 0;
    i <= timeYAxisMax;
    i++
  ) {
    timeTicks.push(i);
  }

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

    const emptyScatterData = scatterTicks.map((tick) => ({
      dayIndex: tick,
    }));

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

  const averageDisplay = showMl
  ? Math.round(
      Number(averageCount) * cupMlNumber
    )
  : averageCount;

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
                  max={endDate}
                  className={styles.dateInput}
                  onChange={(e) => {
                    const value = e.target.value;
                  
                    setStartDate(value);
                  
                    if (value > endDate) {
                      setEndDate(value);
                    }
                  }}
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
                  min={startDate}
                  className={styles.dateInput}
                  onChange={(e) => {
                    const value = e.target.value;
                  
                    setEndDate(value);
                  
                    if (value < startDate) {
                      setStartDate(value);
                    }
                  }}
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
              className={styles.chartWrapper}
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
              onClick={() => setSelectedGroup(null)}
            >

              <ResponsiveContainer
                width="100%"
                height={400}
              >
                <ComposedChart
                  data={scatterData}
                  margin={{
                    top: 35,
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
                        stdDeviation="2"
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
                    interval={0}
                    allowDecimals={false}
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
                    interval={0}
                    allowDecimals={false}
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
                  {scatterData.length > 0 ? (
                    <Scatter
                      data={scatterData}
                      isAnimationActive={false}
                      shape={(props: any) => {
                        const {
                          cx,
                          cy,
                          payload,
                        } = props;

                        if (payload.id) {
                          scatterPointPositionsRef.current[
                            payload.id
                          ] = {
                            cx: Number(cx),
                            cy: Number(cy),
                            payload,
                          };
                        }

                        if (payload.hidden) {
                          return null;
                        }

                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
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

                            onClick={(e) => {
                              e.stopPropagation();
                            
                              setSelectedGroup([payload]);
                            
                              const result = calculateCardPosition(
                                Number(cx),
                                Number(cy)
                              );
                            
                              setCardDirection(result.direction);
                            
                              setCardPosition({
                                left: result.left,
                                top: result.top,
                              });
                            
                              console.log(scatterPointPositionsRef.current);
                            }}
                      
                            style={{
                              cursor: "pointer",
                            }}
                          />
                        );
                      }}
                    />
                  ) : (
                    <Scatter
                      data={emptyScatterData}
                      shape={() => null}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>

              {selectedGroup && (
                <div
                  className={styles.pointCard}
                  style={{
                    left: cardPosition.left,
                    top: cardPosition.top,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {selectedGroup.map((item) => (
                    <div
                      key={item.created_at}
                      className={styles.pointTime}
                    >
                      {item.displayDate}
                      {" "}
                      {item.displayTime}
                    </div>
                  ))}
                </div>
              )}
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
                  ticks={timeTicks}
                  allowDecimals={false}
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
          <div className={styles.dailyHeader}>
            <h2 className={styles.cardTitle}>
              每日喝水杯數
            </h2>
          </div>
          
          <div className={styles.unitSetting}>

            <div className={styles.unitTopRow}>

              <div className={styles.mlInputRow}>
                <span>1杯 =</span>

                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={styles.mlInput}
                  value={cupMl}
                  onChange={(e) =>
                    setCupMl(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  onBlur={async () => {
                    if (!userId) return;
                  
                    await supabase
                      .from("profiles")
                      .update({
                        cup_ml:
                          Number(cupMl) || 0,
                      })
                      .eq("id", userId);
                  }}
                />

                <span>ml</span>
              </div>

              <div className={styles.switchGroup}>

                <span
                  className={!showMl
                    ? styles.switchActive
                    : styles.switchText}
                >
                  杯
                </span>

                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={showMl}
                    disabled={!cupMl}
                    onChange={async (e) => {
                      const checked = e.target.checked;

                      setShowMl(checked);

                      if (!userId) return;

                      await supabase
                        .from("profiles")
                        .update({
                          show_ml: checked,
                        })
                        .eq("id", userId);
                    }}
                  />

                  <span className={styles.slider}></span>
                </label>

                <span
                  className={showMl
                    ? styles.switchActive
                    : styles.switchText}
                >
                  ml
                </span>

              </div>

            </div>

          </div>
          
          <div className={styles.chartSubTitle}>
            單位：
            {showMl ? "ml" : "杯"}
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
                  data={dailyChartData}
                  margin={{
                    top: 25,
                    right: 10,
                    left: 25,
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
                    ticks={yAxisTicks}
                    allowDecimals={false}
                    width={40}
                    tick={{
                      fill: "#a58b77",
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  />

                  <Bar
                    dataKey="value"
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
                      dataKey="value"
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
                            {showMl
                              ? Math.round(Number(value))
                              : value}
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
              {averageDisplay}
            </span>

            {showMl
              ? "ml / 天"
              : "杯 / 天"}
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