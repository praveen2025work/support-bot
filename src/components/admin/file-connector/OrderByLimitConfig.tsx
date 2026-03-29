"use client";

interface OrderByLimitConfigProps {
  orderBy: Array<{ column: string; dir: "asc" | "desc" }>;
  onOrderByChange: (
    orderBy: Array<{ column: string; dir: "asc" | "desc" }>,
  ) => void;
  limit: number | undefined;
  onLimitChange: (limit: number | undefined) => void;
  availableColumns: string[];
}

export function OrderByLimitConfig({
  orderBy,
  onOrderByChange,
  limit,
  onLimitChange,
  availableColumns,
}: OrderByLimitConfigProps) {
  const handleAddSort = () => {
    const firstAvailable =
      availableColumns.find(
        (col) => !orderBy.some((entry) => entry.column === col),
      ) ?? availableColumns[0];

    if (firstAvailable) {
      onOrderByChange([...orderBy, { column: firstAvailable, dir: "asc" }]);
    }
  };

  const handleRemoveSort = (index: number) => {
    onOrderByChange(orderBy.filter((_, i) => i !== index));
  };

  const handleSortColumnChange = (index: number, column: string) => {
    onOrderByChange(
      orderBy.map((entry, i) => (i === index ? { ...entry, column } : entry)),
    );
  };

  const handleToggleDir = (index: number) => {
    onOrderByChange(
      orderBy.map((entry, i) =>
        i === index
          ? { ...entry, dir: entry.dir === "asc" ? "desc" : "asc" }
          : entry,
      ),
    );
  };

  const handleLimitChange = (value: string) => {
    if (value === "") {
      onLimitChange(undefined);
      return;
    }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onLimitChange(parsed);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ORDER BY section */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5">
          Order By
        </label>

        <div className="flex flex-col gap-2">
          {orderBy.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              {/* Column dropdown */}
              <select
                value={entry.column}
                onChange={(e) => handleSortColumnChange(index, e.target.value)}
                className="flex-1 px-2 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              >
                {availableColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* ASC/DESC toggle */}
              <button
                type="button"
                onClick={() => handleToggleDir(index)}
                className={`shrink-0 px-2.5 py-1.5 text-[11px] font-medium rounded-[var(--radius-md)] border transition-colors ${
                  entry.dir === "asc"
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--brand)]"
                }`}
              >
                {entry.dir === "asc" ? "ASC" : "DESC"}
              </button>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveSort(index)}
                className="shrink-0 w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors text-[14px]"
                aria-label="Remove sort entry"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add sort button */}
        <button
          type="button"
          onClick={handleAddSort}
          disabled={availableColumns.length === 0}
          className="mt-2 px-3 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--brand)] text-[var(--brand)] bg-transparent hover:bg-[var(--brand)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Sort
        </button>
      </div>

      {/* LIMIT section */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5">
          Limit
        </label>
        <input
          type="number"
          min={0}
          value={limit ?? ""}
          placeholder="100"
          onChange={(e) => handleLimitChange(e.target.value)}
          className="w-full max-w-[160px] px-2 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand)]"
        />
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          Set 0 for unlimited
        </p>
      </div>
    </div>
  );
}
