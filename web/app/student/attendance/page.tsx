"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { attendance } from "@/lib/mockData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#2c2540] px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.3)]">
      <p className="text-white/55 text-xs mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-white/75 text-sm">{p.name}:</span>
            <span className="text-white text-sm font-data font-semibold ml-auto">
              {p.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceRing({
  percentage,
  label,
  color,
}: {
  percentage: number;
  label: string;
  color: string;
}) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl text-primary font-data">{percentage}%</span>
          <span className="text-[14px] text-muted">{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="p-6 lg:p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-3xl md:text-4xl text-primary mb-1">Attendance</h1>
        <p className="text-muted text-base">
          Track your online and offline class attendance
        </p>
      </motion.div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-lg p-4 border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-center gap-6">
            <AttendanceRing
              percentage={attendance.online.percentage}
              label="Online"
              color="#7A6B96"
            />
            <div className="flex-1">
              <h3 className="text-primary text-base mb-4">Online Classes</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Total Classes</span>
                  <span className="text-primary text-base font-data">
                    {attendance.online.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Attended</span>
                  <span className="text-primary text-base font-data">
                    {attendance.online.attended}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Absent</span>
                  <span className="text-primary text-base font-data">
                    {attendance.online.total - attendance.online.attended}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-white rounded-lg p-4 border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-center gap-6">
            <AttendanceRing
              percentage={attendance.offline.percentage}
              label="Offline"
              color="#C99A4B"
            />
            <div className="flex-1">
              <h3 className="text-primary text-base mb-4">Offline Classes</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Total Classes</span>
                  <span className="text-primary text-base font-data">
                    {attendance.offline.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Attended</span>
                  <span className="text-primary text-base font-data">
                    {attendance.offline.attended}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Absent</span>
                  <span className="text-primary text-base font-data">
                    {attendance.offline.total - attendance.offline.attended}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Monthly chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-lg p-4 border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)] mb-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-primary text-base">Monthly Attendance (%)</h2>
          <div className="flex items-center gap-4 text-[14px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-brand" />
              <span className="text-muted">Online</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-[#C99A4B]" />
              <span className="text-muted">Offline</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={attendance.monthlyData}
            barGap={2}
            barSize={16}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 4"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#64748b", fontSize: 12, fontFamily: "Contralto" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[60, 100]}
              tick={{
                fill: "#64748b",
                fontSize: 11,
                fontFamily: "Space Grotesk",
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<BarTooltip />}
              cursor={{ fill: "rgba(100,116,139,0.1)" }}
            />
            <Bar dataKey="online" fill="#7A6B96" name="Online" />
            <Bar dataKey="offline" fill="#C99A4B" name="Offline" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* History toggle */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden"
      >
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-5 hover:bg-accent1/10 transition-colors"
        >
          <h2 className="text-primary text-base">Attendance History</h2>
          <svg
            className={`w-5 h-5 text-muted transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M 5,8 L 10,13 L 15,8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showHistory && (
          <div className="border-t border-[#e2e5ec] divide-y divide-[#F4F1F8]">
            {attendance.history.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <div
                  className={`w-9 h-9 rounded-md flex items-center justify-center ${
                    record.status === "present"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {record.status === "present" ? (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M 6.5,10 L 9,12.5 L 13.5,8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M 7,7 L 13,13 M 13,7 L 7,13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-primary text-[16px]">
                    Arjun Sharma was marked{" "}
                    <span
                      className={
                        record.status === "present"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }
                    >
                      {record.status}
                    </span>{" "}
                    for{" "}
                    <span
                      className="text-muted"
                    >
                      {record.type}
                    </span>{" "}
                    class
                  </p>
                  <p className="text-muted text-[16px] font-data mt-0.5">
                    {record.date} at {record.time}
                  </p>
                </div>
                <span
                  className={`text-[16px] px-2 py-0.5 rounded-xs ${
                    record.type === "online"
                      ? "bg-[#F1EEF5] text-brand"
                      : "bg-amber-50 text-[#C99A4B]"
                  }`}
                >
                  {record.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
