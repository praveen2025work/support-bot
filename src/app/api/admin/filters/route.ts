import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/logger";

const FILTER_CONFIG_PATH = path.join(
  process.cwd(),
  "src/config/filter-config.json",
);

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSource {
  url: string;
  valuePath?: string;
  valueField?: string;
  labelField?: string;
  lastRefreshed?: string | null;
}

type FilterType =
  | "select"
  | "text"
  | "boolean"
  | "multi_select"
  | "date"
  | "date_range"
  | "number_range"
  | "search";

interface FilterConfig {
  label: string;
  type: FilterType;
  options: FilterOption[];
  placeholder: string | null;
  dateFormat?: string;
  presets?: { value: string; label: string }[];
  numberConfig?: { min?: number; max?: number; step?: number };
  debounceMs?: number;
  source?: FilterSource;
}

interface FilterConfigFile {
  filters: Record<string, FilterConfig>;
}

async function readFilterConfig(): Promise<FilterConfigFile> {
  const raw = await fs.readFile(FILTER_CONFIG_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeFilterConfig(data: FilterConfigFile): Promise<void> {
  await fs.writeFile(
    FILTER_CONFIG_PATH,
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

// GET: Return all filter configs
export async function GET() {
  try {
    const data = await readFilterConfig();
    return NextResponse.json(data);
  } catch (error) {
    logger.error({ error }, "Failed to read filter config");
    return NextResponse.json({ filters: {} }, { status: 500 });
  }
}

// POST: Add or update a filter config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      key,
      label,
      type,
      options,
      placeholder,
      dateFormat,
      source,
      presets,
      numberConfig,
      debounceMs,
    } = body;

    if (!key || !label || !type) {
      return NextResponse.json(
        { error: "key, label, and type are required" },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9_]+$/.test(key)) {
      return NextResponse.json(
        { error: "key must be lowercase alphanumeric with underscores only" },
        { status: 400 },
      );
    }

    const validTypes = [
      "select",
      "text",
      "boolean",
      "multi_select",
      "date",
      "date_range",
      "number_range",
      "search",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    const data = await readFilterConfig();

    const typesWithOptions = ["select", "multi_select", "searchable_select"];
    const typesWithPlaceholder = ["text", "search"];

    const filterEntry: FilterConfig = {
      label,
      type,
      options: typesWithOptions.includes(type) ? options || [] : [],
      placeholder: typesWithPlaceholder.includes(type)
        ? placeholder || `Enter ${key}...`
        : null,
    };
    if (dateFormat) filterEntry.dateFormat = dateFormat;
    if (source) filterEntry.source = source;
    if (presets && Array.isArray(presets) && presets.length > 0)
      filterEntry.presets = presets;
    if (numberConfig && typeof numberConfig === "object")
      filterEntry.numberConfig = numberConfig;
    if (typeof debounceMs === "number") filterEntry.debounceMs = debounceMs;

    data.filters[key] = filterEntry;

    await writeFilterConfig(data);

    return NextResponse.json({ key, ...data.filters[key] });
  } catch (error) {
    logger.error({ error }, "Failed to save filter config");
    return NextResponse.json(
      { error: "Failed to save filter config" },
      { status: 500 },
    );
  }
}

// DELETE: Remove a filter config
export async function DELETE(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json(
        { error: "key query param is required" },
        { status: 400 },
      );
    }

    const data = await readFilterConfig();

    if (!data.filters[key]) {
      return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    }

    delete data.filters[key];
    await writeFilterConfig(data);

    return NextResponse.json({ success: true, deletedKey: key });
  } catch (error) {
    logger.error({ error }, "Failed to delete filter config");
    return NextResponse.json(
      { error: "Failed to delete filter config" },
      { status: 500 },
    );
  }
}
