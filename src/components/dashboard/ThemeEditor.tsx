"use client";

import { X, Palette, RotateCcw } from "lucide-react";
import type { DashboardTheme } from "@/types/dashboard";

interface ThemeEditorProps {
  theme: DashboardTheme;
  onChange: (theme: DashboardTheme) => void;
  onClose: () => void;
  className?: string;
}

const PRESET_THEMES: DashboardTheme[] = [
  {
    id: "default",
    name: "Default",
    colors: {
      primary: "#3b82f6",
      secondary: "#6366f1",
      accent: "#8b5cf6",
      background: "#ffffff",
      surface: "#f9fafb",
      text: "#111827",
      border: "#d1d5db",
    },
    chartPalette: [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
    ],
    borderRadius: "md",
    fontFamily: "system",
    cardStyle: "shadow",
  },
  {
    id: "dark",
    name: "Dark",
    colors: {
      primary: "#60a5fa",
      secondary: "#818cf8",
      accent: "#a78bfa",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#f1f5f9",
      border: "#334155",
    },
    chartPalette: [
      "#60a5fa",
      "#34d399",
      "#fbbf24",
      "#f87171",
      "#a78bfa",
      "#f472b6",
    ],
    borderRadius: "md",
    fontFamily: "inter",
    cardStyle: "bordered",
  },
  {
    id: "warm",
    name: "Warm",
    colors: {
      primary: "#f59e0b",
      secondary: "#d97706",
      accent: "#f97316",
      background: "#faf5f0",
      surface: "#fef3c7",
      text: "#292524",
      border: "#d6d3d1",
    },
    chartPalette: [
      "#f59e0b",
      "#ef4444",
      "#f97316",
      "#84cc16",
      "#06b6d4",
      "#8b5cf6",
    ],
    borderRadius: "lg",
    fontFamily: "system",
    cardStyle: "shadow",
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: {
      primary: "#06b6d4",
      secondary: "#0891b2",
      accent: "#3b82f6",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#e2e8f0",
      border: "#334155",
    },
    chartPalette: [
      "#06b6d4",
      "#3b82f6",
      "#14b8a6",
      "#a78bfa",
      "#f472b6",
      "#fbbf24",
    ],
    borderRadius: "md",
    fontFamily: "inter",
    cardStyle: "glass",
  },
];

const COLOR_LABELS: Record<keyof DashboardTheme["colors"], string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  background: "Background",
  surface: "Surface",
  text: "Text",
  border: "Border",
};

const BORDER_RADIUS_OPTIONS: DashboardTheme["borderRadius"][] = [
  "none",
  "sm",
  "md",
  "lg",
  "xl",
];
const FONT_FAMILY_OPTIONS: DashboardTheme["fontFamily"][] = [
  "system",
  "inter",
  "mono",
];
const CARD_STYLE_OPTIONS: DashboardTheme["cardStyle"][] = [
  "flat",
  "shadow",
  "bordered",
  "glass",
];

const CARD_STYLE_CLASSES: Record<DashboardTheme["cardStyle"], string> = {
  flat: "bg-gray-100 dark:bg-gray-700",
  shadow: "bg-white dark:bg-gray-800 shadow-md",
  bordered:
    "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600",
  glass:
    "bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20",
};

export function ThemeEditor({
  theme,
  onChange,
  onClose,
  className = "",
}: ThemeEditorProps) {
  const handleColorChange = (
    key: keyof DashboardTheme["colors"],
    value: string,
  ) => {
    onChange({
      ...theme,
      colors: { ...theme.colors, [key]: value },
    });
  };

  const handlePaletteChange = (index: number, value: string) => {
    const updatedPalette = theme.chartPalette.map((c, i) =>
      i === index ? value : c,
    );
    onChange({ ...theme, chartPalette: updatedPalette });
  };

  const handlePresetSelect = (preset: DashboardTheme) => {
    onChange({ ...preset });
  };

  const handleResetToDefault = () => {
    onChange({ ...PRESET_THEMES[0] });
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Theme Editor
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          aria-label="Close theme editor"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Preset Selector */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Presets
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_THEMES.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  theme.id === preset.id
                    ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex gap-1 mb-1.5">
                  {[
                    preset.colors.primary,
                    preset.colors.secondary,
                    preset.colors.accent,
                    preset.colors.background,
                  ].map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Color Pickers */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Colors
          </h3>
          <div className="space-y-2">
            {(
              Object.keys(COLOR_LABELS) as Array<keyof DashboardTheme["colors"]>
            ).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  {COLOR_LABELS[key]}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">
                    {theme.colors[key]}
                  </span>
                  <input
                    type="color"
                    value={theme.colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Chart Palette */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chart Palette
          </h3>
          <div className="flex flex-wrap gap-2">
            {theme.chartPalette.map((color, index) => (
              <label key={index} className="relative cursor-pointer">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handlePaletteChange(index, e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div
                  className="w-9 h-9 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              </label>
            ))}
          </div>
        </section>

        {/* Border Radius */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Border Radius
          </h3>
          <div className="flex gap-2">
            {BORDER_RADIUS_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex-1 text-center py-1.5 px-1 text-xs rounded cursor-pointer border transition-all ${
                  theme.borderRadius === option
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="borderRadius"
                  value={option}
                  checked={theme.borderRadius === option}
                  onChange={() => onChange({ ...theme, borderRadius: option })}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </section>

        {/* Font Family */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Font Family
          </h3>
          <div className="flex gap-2">
            {FONT_FAMILY_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex-1 text-center py-1.5 px-1 text-xs rounded cursor-pointer border transition-all ${
                  theme.fontFamily === option
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="fontFamily"
                  value={option}
                  checked={theme.fontFamily === option}
                  onChange={() => onChange({ ...theme, fontFamily: option })}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </section>

        {/* Card Style */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Card Style
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {CARD_STYLE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => onChange({ ...theme, cardStyle: option })}
                className={`p-3 rounded-lg text-center transition-all ${CARD_STYLE_CLASSES[option]} ${
                  theme.cardStyle === option
                    ? "ring-2 ring-blue-500"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {option}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleResetToDefault}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Default
        </button>
      </div>
    </div>
  );
}
