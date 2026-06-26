"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import { supabase } from "../lib/supabase";

type WeeklyDataItem = {
  date: string;
  count: number;
  isToday: boolean;
};

export default function Home() {
  const [count, setCount] = useState(0);
  const [weeklyData, setWeeklyData] =
    useState<WeeklyDataItem[]>([]);
  const [
    weeklyYAxisMax,
    setWeeklyYAxisMax,
  ] = useState(8);
  const [user, setUser] = useState<any>(null);

  const DEFAULT_WATER_TARGET = 7;

  const [useCustomTarget, setUseCustomTarget] =
    useState(false);

  const [customTarget, setCustomTarget] =
    useState("");

  const target =
    useCustomTarget &&
    Number(customTarget) > 0
      ? Number(customTarget)
      : DEFAULT_WATER_TARGET;

  const displayCount = user
    ? count
    : 0;

  const progress = Math.min(
    (displayCount / target) * 100,
    100
  );
  const loadTodayWaterCount = async () => {
    if (!user) return;
  
    const now = new Date();
  
    const taipeiNow = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
      })
    );
  
    const startOfDayTaipei = new Date(
      taipeiNow.getFullYear(),
      taipeiNow.getMonth(),
      taipeiNow.getDate(),
      0,
      0,
      0
    );
  
    const endOfDayTaipei = new Date(
      taipeiNow.getFullYear(),
      taipeiNow.getMonth(),
      taipeiNow.getDate(),
      23,
      59,
      59
    );
  
    const { data, error } = await supabase
      .from("water_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte(
        "created_at",
        startOfDayTaipei.toISOString()
      )
      .lte(
        "created_at",
        endOfDayTaipei.toISOString()
      );
  
    if (error) {
      console.error(error);
      return;
    }
  
    setCount(data?.length ?? 0);
  };
  const loadWeeklyTrend = async () => {
    if (!user) return;
  
    const { data, error } = await supabase
      .from("water_logs")
      .select("created_at")
      .eq("user_id", user.id);
  
    if (error) {
      console.error(error);
      return;
    }
  
    const result = [];

    let maxCount = 0;
  
    const daysToShow = 8;

    for (let i = daysToShow - 1; i >= 0; i--) {

      const day = new Date();
  
      day.setDate(day.getDate() - i);
  
      const weekNames = [
        "日",
        "一",
        "二",
        "三",
        "四",
        "五",
        "六",
      ];
  
      const dateKey =
        `${day.getMonth() + 1}/${day.getDate()}\n(${weekNames[day.getDay()]})`;
  
      const count =
        data?.filter((item) => {
          const recordDate = new Date(
            item.created_at
          );
  
          return (
            recordDate.toLocaleDateString("zh-TW") ===
            day.toLocaleDateString("zh-TW")
          );
        }).length ?? 0;

      if (count > maxCount) {
        maxCount = count;
      }
  
      result.push({
        date: dateKey,
        count,
        isToday:
          day.toLocaleDateString("zh-TW") ===
          new Date().toLocaleDateString("zh-TW"),
      });
    }
  
    const yMax =
      Math.ceil((maxCount + 1) / 2) * 2;

    setWeeklyData(result);

    setWeeklyYAxisMax(yMax);
  };
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      setUser(user);
  
      if (user) {
        await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            email: user.email,
            display_name:
              user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              "",
          });
      }
    };
  
    getUser();
  
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
  
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setCount(0);
      setWeeklyData([]);
      return;
    }
  
    loadTodayWaterCount();
    loadWeeklyTrend();
    loadUserTarget();
  }, [user]);
  
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };
  
  const loadUserTarget = async () => {
    if (!user) return;
  
    const { data, error } =
      await supabase
        .from("profiles")
        .select(`
          custom_water_target,
          use_custom_target
        `)
        .eq("id", user.id)
        .single();
  
    if (error) {
      console.error(error);
      return;
    }
  
    setUseCustomTarget(
      data?.use_custom_target ?? false
    );
  
    setCustomTarget(
      data?.custom_water_target
        ? String(data.custom_water_target)
        : ""
    );
  };

  const saveUserTarget = async (
    checked: boolean,
    value: string
  ) => {
  
    if (!user) return;
  
    const { error } =
      await supabase
        .from("profiles")
        .update({
          use_custom_target: checked,
  
          custom_water_target:
            checked && value !== ""
              ? Number(value)
              : null,
        })
        .eq("id", user.id);
  
    if (error) {
      console.error(error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  
    setUser(null);
    setCount(0);
    setWeeklyData([]);
  
    window.location.reload();
  };

  const addWater = async () => {
    if (!user) {
      alert("請先登入");
      return;
    }
  
    const { error } = await supabase
      .from("water_logs")
      .insert([
        {
          user_id: user.id,
        },
      ]);
  
    if (error) {
      console.error(error);
      alert("新增失敗");
      return;
    }
  
    await loadTodayWaterCount();
    await loadWeeklyTrend();
    
    alert("喝水紀錄已新增！愛你唷💕");
  };

  return (
    <main className={styles.container}>
      <button
        className={styles.refreshButton}
        onClick={() => window.location.reload()}
        aria-label="重新整理"
      >
        ↻
      </button>
      {user && (
        <div className={styles.userBar}>
          <span>
            🌸{" "}
            {user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email}
          </span>

          <button
            onClick={signOut}
            className={styles.logoutButton}
          >
            登出
          </button>
        </div>
      )}
  <p className={styles.todayLabel}>
  ＼ 今天已經喝了 ／
  </p>

  <div className={styles.countBlock}>
    <span className={styles.bigNumber}>
      {displayCount}
    </span>

    <span className={styles.bigUnit}>
      杯水
    </span>
  </div>

  <button
    onClick={
      user
        ? addWater
        : signInWithGoogle
    }
    className={styles.button}
  >
    {user
      ? "🥤 乖乖喝完一杯水了！"
      : "🔐 登入以記錄及查看"}
  </button>

  <div className={styles.goalCard}>
    <div className={styles.goalBadge}>
      今日目標
    </div>

    <div className={styles.goalNumber}>
      {target}
      <span className={styles.goalUnit}>
        杯水
      </span>
    </div>

    <div className={styles.progressBar}>
      <div
        className={styles.progressFill}
        style={{
          width: `${progress}%`,
        }}
      />
    </div>

    <div className={styles.progressText}>
      <span>
        已喝 {displayCount} 杯
      </span>

      <span>
        目標 {target} 杯
      </span>
    </div>

    <p className={styles.encourage}>
      繼續加油，離目標又更近一步了！
    </p>
  </div>

  <div className={styles.targetSetting}>
    <label className={styles.targetCheckbox}>
      <input
        type="checkbox"
        checked={useCustomTarget}
        onChange={async (e) => {
          const checked = e.target.checked;

          setUseCustomTarget(checked);

          if (!checked) {
            setCustomTarget("");
          }

          await saveUserTarget(
            checked,
            checked ? customTarget : ""
          );
        }}
      />

      我要自訂目標：
    </label>

    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      min={1}
      className={styles.targetInput}
      disabled={!useCustomTarget}
      value={customTarget}
      onChange={(e) =>
        setCustomTarget(
          e.target.value.replace(
            /\D/g,
            ""
          )
        )
      }
      onBlur={async () => {
        await saveUserTarget(
          useCustomTarget,
          customTarget
        );
      }}
    />

    <span className={styles.targetUnit}>
      杯
    </span>
  </div>

  {user && (
  <section className={styles.trendCard}>
  <h2 className={styles.trendTitle}>
     過去 7 天喝水趨勢 
  </h2>

  <div className={styles.chartBox}>
    <div className={styles.chartUnit}>
      單位：杯
    </div>
  <div className={styles.chartScroll}>
    <div className={styles.chartInner}>
    <ResponsiveContainer
    width="100%"
    height={320}
    >
    <BarChart
      data={weeklyData}
      margin={{
        top: 40,
        right: 20,
        left: -10,
        bottom: 45,
      }}
    >
      <defs>
        <linearGradient
          id="waterGradient"
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
          id="todayGradient"
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
        horizontal={true}
        vertical={false}
        stroke="#f6cfd8"
        strokeDasharray="6 6"
      />

      <XAxis
        dataKey="date"
        interval={0}
        tick={({ x, y, payload }) => {
          const lines = String(payload.value).split("\n");

          const current = weeklyData.find(
            (item) => item.date === payload.value
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
              <tspan x={Number(x)} dy="0">
                {lines[0]}
              </tspan>

              <tspan x={Number(x)} dy="16">
                {lines[1]}
              </tspan>
            </text>
          );
        }}
      />

      <YAxis
        domain={[0, weeklyYAxisMax]}
        tickCount={6}
        tick={{
          fontSize: 18,
          fill: "#a58b77",
          fontWeight: 600,
        }}
        width={40}
        allowDecimals={false}
      />

      <Bar
        dataKey="count"
        barSize={52}
        radius={[12, 12, 0, 0]}
      >
        {weeklyData.map((item, index) => (
          <Cell
            key={index}
            fill={
              item.isToday
                ? "url(#todayGradient)"
                : "url(#waterGradient)"
            }
            filter={
              item.isToday
                ? "url(#todayGlow)"
                : undefined
            }
          />
        ))}
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
              fill === "url(#todayGradient)";

            return (
              <text
                x={Number(x) + Number(width) / 2}
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

  <div className={styles.goalLabel}>
    目標{" "}
    <span className={styles.goalHighlight}>
      {target}
    </span>
    杯 / 天
  </div>
  </section>
  )}

  {user && (
    <Link
      href="/history"
      className={styles.historyButton}
    >
      📋 歷史紀錄
    </Link>
  )}
</main>
  );
}