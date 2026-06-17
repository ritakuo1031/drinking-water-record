"use client";

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
    <main
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "24px",
      }}
    >
      {/* 回首頁 */}

      <Link href="/">
        ← 回首頁
      </Link>

      {/* 日期篩選 */}

      <div
        style={{
          marginTop: "24px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div>開始日期</div>

          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(
                e.target.value
              )
            }
          />
        </div>

        <div>
          <div>結束日期</div>

          <input
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(
                e.target.value
              )
            }
          />
        </div>
      </div>

      {/* 之後放圖表 */}

      <div
        style={{
          marginTop: "40px",
        }}
      >
        歷史資料區
      </div>
    </main>
  );
}