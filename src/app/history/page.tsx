"use client";

import { useState, useEffect } from "react";

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
  
    setWaterLogs(data ?? []);
  };

  useEffect(() => {
    loadWaterLogs();
  }, [startDate, endDate]);

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
            ～
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
                    {new Date(
                      log.created_at
                    ).toLocaleDateString("zh-TW")}
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