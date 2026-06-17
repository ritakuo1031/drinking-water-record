"use client";

import styles from "./history.module.css";
import Link from "next/link";
import { useState } from "react";

export default function HistoryPage() {
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
        </div>
  
        <div className={styles.placeholderCard}>
          第一個圖表區塊（喝水時間分布）
        </div>
  
      </div>
    </main>
  );
}