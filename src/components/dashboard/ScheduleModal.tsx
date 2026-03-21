"use client";

import { useState } from "react";
import { X, Clock, Plus, Trash2 } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export interface ScheduleConfig {
  id: string;
  dashboardId: string;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  enabled: boolean;
  recipients: string[];
  lastRunAt?: string;
  createdAt: string;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: ScheduleConfig[];
  dashboardId: string;
  onSave: (schedules: ScheduleConfig[]) => void;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function ScheduleModal({
  isOpen,
  onClose,
  schedules: initialSchedules,
  dashboardId,
  onSave,
}: ScheduleModalProps) {
  const [schedules, setSchedules] =
    useState<ScheduleConfig[]>(initialSchedules);
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const addSchedule = () => {
    setSchedules((prev) => [
      ...prev,
      {
        id: `sched_${Date.now()}`,
        dashboardId,
        frequency: "daily",
        time: "09:00",
        enabled: true,
        recipients: [],
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const updateSchedule = (id: string, partial: Partial<ScheduleConfig>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    );
  };

  const removeSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[520px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Clock size={16} />
            Scheduled Reports
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No schedules configured
            </div>
          ) : (
            schedules.map((sched) => (
              <div
                key={sched.id}
                className={`border rounded-lg p-3 space-y-2 ${
                  sched.enabled
                    ? "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10"
                    : "border-gray-200 dark:border-gray-700 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={sched.enabled}
                        onChange={(e) =>
                          updateSchedule(sched.id, {
                            enabled: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300"
                      />
                      Enabled
                    </label>
                    {sched.lastRunAt && (
                      <span className="text-[10px] text-gray-400">
                        Last run: {new Date(sched.lastRunAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeSchedule(sched.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">
                      Frequency
                    </label>
                    <select
                      value={sched.frequency}
                      onChange={(e) =>
                        updateSchedule(sched.id, {
                          frequency: e.target
                            .value as ScheduleConfig["frequency"],
                        })
                      }
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">
                      Time
                    </label>
                    <input
                      type="time"
                      value={sched.time}
                      onChange={(e) =>
                        updateSchedule(sched.id, { time: e.target.value })
                      }
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    />
                  </div>

                  {sched.frequency === "weekly" && (
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">
                        Day
                      </label>
                      <select
                        value={sched.dayOfWeek ?? 1}
                        onChange={(e) =>
                          updateSchedule(sched.id, {
                            dayOfWeek: Number(e.target.value),
                          })
                        }
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        {DAYS_OF_WEEK.map((day, i) => (
                          <option key={i} value={i}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {sched.frequency === "monthly" && (
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">
                        Day of Month
                      </label>
                      <select
                        value={sched.dayOfMonth ?? 1}
                        onChange={(e) =>
                          updateSchedule(sched.id, {
                            dayOfMonth: Number(e.target.value),
                          })
                        }
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(
                          (d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Email Recipients */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">
                    Email Recipients (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(sched.recipients || []).join(", ")}
                    onChange={(e) =>
                      updateSchedule(sched.id, {
                        recipients: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="user@company.com, team@company.com"
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={addSchedule}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} />
            Add Schedule
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(schedules);
                onClose();
              }}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
