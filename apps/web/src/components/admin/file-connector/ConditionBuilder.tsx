"use client";

import type { FilterCondition } from "./types";

interface ConditionBuilderProps {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  columns: string[];
}

type OperatorKey = FilterCondition["operator"];

const OPERATOR_LABELS: Record<OperatorKey, string> = {
  eq: "equals",
  neq: "not equals",
  contains: "contains",
  starts_with: "starts with",
  ends_with: "ends with",
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
  between: "between",
  in: "in",
  is_null: "is null",
  is_not_null: "is not null",
};

const OPERATORS = Object.keys(OPERATOR_LABELS) as OperatorKey[];

const NO_VALUE_OPERATORS = new Set<OperatorKey>(["is_null", "is_not_null"]);

function makeEmptyCondition(columns: string[]): FilterCondition {
  return {
    column: columns[0] ?? "",
    operator: "eq",
    value: "",
    logic: "and",
  };
}

function updateCondition(
  conditions: readonly FilterCondition[],
  index: number,
  patch: Partial<FilterCondition>,
): FilterCondition[] {
  return conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
}

function removeCondition(
  conditions: readonly FilterCondition[],
  index: number,
): FilterCondition[] {
  return conditions.filter((_, i) => i !== index);
}

const selectClasses =
  "px-2 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]";

const inputClasses =
  "px-2 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand)]";

function ValueInput({
  condition,
  onValueChange,
}: {
  condition: FilterCondition;
  onValueChange: (value: string | string[]) => void;
}) {
  const { operator, value } = condition;

  if (NO_VALUE_OPERATORS.has(operator)) {
    return null;
  }

  if (operator === "between") {
    const parts = Array.isArray(value) ? value : [String(value), ""];
    const low = parts[0] ?? "";
    const high = parts[1] ?? "";

    return (
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          type="text"
          value={low}
          onChange={(e) => onValueChange([e.target.value, high])}
          placeholder="from"
          className={`${inputClasses} w-0 flex-1 min-w-[60px]`}
        />
        <span className="text-[11px] text-[var(--text-muted)] shrink-0">
          and
        </span>
        <input
          type="text"
          value={high}
          onChange={(e) => onValueChange([low, e.target.value])}
          placeholder="to"
          className={`${inputClasses} w-0 flex-1 min-w-[60px]`}
        />
      </div>
    );
  }

  if (operator === "in") {
    const display = Array.isArray(value) ? value.join(", ") : String(value);

    return (
      <input
        type="text"
        value={display}
        onChange={(e) =>
          onValueChange(e.target.value.split(",").map((s) => s.trim()))
        }
        placeholder="comma-separated values"
        className={`${inputClasses} flex-1 min-w-[120px]`}
      />
    );
  }

  return (
    <input
      type="text"
      value={Array.isArray(value) ? value.join(", ") : String(value)}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder="value"
      className={`${inputClasses} flex-1 min-w-[80px]`}
    />
  );
}

function LogicToggle({
  logic,
  onToggle,
}: {
  logic: "and" | "or";
  onToggle: () => void;
}) {
  return (
    <div className="flex justify-center py-1">
      <button
        type="button"
        onClick={onToggle}
        className="px-2 py-0.5 text-[11px] font-medium rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--brand)] transition-colors cursor-pointer"
      >
        {logic.toUpperCase()}
      </button>
    </div>
  );
}

export function ConditionBuilder({
  conditions,
  onChange,
  columns,
}: ConditionBuilderProps) {
  const handleAdd = () => {
    onChange([...conditions, makeEmptyCondition(columns)]);
  };

  const handleRemove = (index: number) => {
    onChange(removeCondition(conditions, index));
  };

  const handleUpdate = (index: number, patch: Partial<FilterCondition>) => {
    onChange(updateCondition(conditions, index, patch));
  };

  const handleOperatorChange = (index: number, operator: OperatorKey) => {
    const patch: Partial<FilterCondition> = { operator };
    if (NO_VALUE_OPERATORS.has(operator)) {
      patch.value = "";
    } else if (operator === "between") {
      patch.value = ["", ""];
    } else if (operator === "in") {
      patch.value = [];
    } else {
      const current = conditions[index]?.value;
      if (Array.isArray(current)) {
        patch.value = "";
      }
    }
    handleUpdate(index, patch);
  };

  const toggleLogic = (index: number) => {
    const current = conditions[index]?.logic ?? "and";
    handleUpdate(index, { logic: current === "and" ? "or" : "and" });
  };

  return (
    <div className="flex flex-col gap-0">
      {conditions.map((condition, index) => (
        <div key={index}>
          {/* Logic toggle between conditions */}
          {index > 0 && (
            <LogicToggle
              logic={condition.logic ?? "and"}
              onToggle={() => toggleLogic(index)}
            />
          )}

          {/* Condition row */}
          <div className="flex items-center gap-2">
            {/* Column dropdown */}
            <select
              value={condition.column}
              onChange={(e) => handleUpdate(index, { column: e.target.value })}
              className={`${selectClasses} w-[140px] shrink-0`}
            >
              {columns.length === 0 && <option value="">No columns</option>}
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>

            {/* Operator dropdown */}
            <select
              value={condition.operator}
              onChange={(e) =>
                handleOperatorChange(index, e.target.value as OperatorKey)
              }
              className={`${selectClasses} w-[120px] shrink-0`}
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </option>
              ))}
            </select>

            {/* Value input */}
            <ValueInput
              condition={condition}
              onValueChange={(value) => handleUpdate(index, { value })}
            />

            {/* Remove button */}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              aria-label="Remove condition"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {/* Add condition button */}
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 self-start px-3 py-1.5 text-[12px] text-[var(--brand)] hover:bg-[var(--bg-secondary)] rounded-[var(--radius-md)] border border-dashed border-[var(--border)] transition-colors cursor-pointer"
      >
        + Add Condition
      </button>
    </div>
  );
}
