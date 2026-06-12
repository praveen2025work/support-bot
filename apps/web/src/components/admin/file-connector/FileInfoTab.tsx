"use client";

import { useState, useCallback } from "react";
import type { FileSourceConfig, FileValidation } from "./types";

interface FileInfoTabProps {
  source: FileSourceConfig;
  onUpdate: (source: FileSourceConfig) => void;
  sourceId: string;
}

export function FileInfoTab({ source, sourceId }: FileInfoTabProps) {
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [validating, setValidating] = useState(false);

  const handleValidate = useCallback(async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/admin/file-sources/${sourceId}/validate`, {
        method: "POST",
      });
      const data = await res.json();
      setValidation(data);
    } catch {
      setValidation({
        status: "error",
        message: "Validation request failed",
        rowCount: 0,
        columnCount: 0,
        fileType: "csv",
        lastModified: "",
      });
    } finally {
      setValidating(false);
    }
  }, [sourceId]);

  const statusColors = {
    valid: {
      bg: "bg-[var(--success-subtle)]",
      border: "border-[var(--success)]",
      text: "text-[var(--success)]",
      icon: "\u2713",
    },
    error: {
      bg: "bg-[var(--danger-subtle)]",
      border: "border-[var(--danger)]",
      text: "text-[var(--danger)]",
      icon: "\u2717",
    },
    warning: {
      bg: "bg-[var(--warning-subtle)]",
      border: "border-[var(--warning)]",
      text: "text-[var(--warning)]",
      icon: "!",
    },
  };

  return (
    <div className="p-5 max-w-3xl">
      {/* Validation banner */}
      {validation && (
        <div
          className={`flex items-center gap-3 ${statusColors[validation.status].bg} border ${statusColors[validation.status].border} rounded-[var(--radius-md)] p-3 mb-5`}
        >
          <div
            className={`w-6 h-6 rounded-full ${statusColors[validation.status].text} bg-[var(--bg-primary)] flex items-center justify-center text-[12px] font-bold`}
          >
            {statusColors[validation.status].icon}
          </div>
          <div>
            <div
              className={`text-[13px] font-semibold ${statusColors[validation.status].text}`}
            >
              {validation.status === "valid"
                ? "File validated"
                : validation.status === "error"
                  ? "Validation failed"
                  : "Warning"}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              {validation.message}
            </div>
          </div>
        </div>
      )}

      {/* Source details form */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Field label="Source Name" value={source.name} />
        <Field label="Source Group" value={source.source || "default"} />
        <Field label="Description" value={source.description} span={2} />
        <Field label="File Path" value={source.filePath} span={2} mono />
        <Field label="File Type" value={source.type.toUpperCase()} />
        <Field
          label="Sheet Name"
          value={source.sheetName || "N/A"}
          muted={!source.sheetName}
        />
      </div>

      {/* Column configuration */}
      {source.columnConfig && (
        <div className="mb-6">
          <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
            Column Configuration
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="ID Columns"
              value={source.columnConfig.idColumns?.join(", ") || "--"}
            />
            <Field
              label="Date Columns"
              value={source.columnConfig.dateColumns?.join(", ") || "--"}
            />
            <Field
              label="Label Columns"
              value={source.columnConfig.labelColumns?.join(", ") || "--"}
            />
            <Field
              label="Value Columns"
              value={source.columnConfig.valueColumns?.join(", ") || "--"}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={validating}
          className="bg-[var(--brand)] text-[var(--brand-text)] px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
        >
          {validating ? "Validating..." : "Validate File"}
        </button>
        <button className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-4 py-2 rounded-[var(--radius-md)] text-[13px] border border-[var(--border)]">
          Save Changes
        </button>
        <button className="bg-[var(--bg-primary)] text-[var(--danger)] px-4 py-2 rounded-[var(--radius-md)] text-[13px] border border-[var(--danger-subtle)]">
          Delete Source
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  span,
  mono,
  muted,
}: {
  label: string;
  value: string;
  span?: number;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-[13px] ${mono ? "font-mono bg-[var(--bg-secondary)]" : "bg-[var(--bg-primary)]"} ${muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}
      >
        {value}
      </div>
    </div>
  );
}
