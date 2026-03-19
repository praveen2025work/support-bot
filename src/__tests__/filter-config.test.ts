import {
  getFallbackConfig,
  getFilterConfig,
  fetchFilterConfigs,
  invalidateFilterConfigCache,
} from "@/lib/filter-config";
import type { FilterInputConfig } from "@/components/shared/FilterInput";

// ── getFallbackConfig ───────────────────────────────────────────────

describe("getFallbackConfig", () => {
  it("converts snake_case to Title Case label", () => {
    const config = getFallbackConfig("business_date");
    expect(config.label).toBe("Business Date");
  });

  it("returns text type by default", () => {
    const config = getFallbackConfig("region");
    expect(config.type).toBe("text");
  });

  it("generates placeholder from key", () => {
    const config = getFallbackConfig("env_name");
    expect(config.placeholder).toBe("Enter env_name...");
  });

  it("handles single-word keys", () => {
    const config = getFallbackConfig("status");
    expect(config.label).toBe("Status");
  });
});

// ── getFilterConfig ─────────────────────────────────────────────────

describe("getFilterConfig", () => {
  const configs: Record<string, FilterInputConfig> = {
    region: {
      label: "Region",
      type: "select",
      options: [{ value: "us", label: "US" }],
    },
    date_range: { label: "Date Range", type: "date" },
  };

  it("returns exact match", () => {
    expect(getFilterConfig(configs, "region").label).toBe("Region");
  });

  it("falls back to lowercase match", () => {
    const withLower = { ...configs, region: configs.region };
    expect(getFilterConfig(withLower, "Region").label).toBe("Region");
  });

  it("returns fallback when key not found", () => {
    const config = getFilterConfig(configs, "unknown_key");
    expect(config.label).toBe("Unknown Key");
    expect(config.type).toBe("text");
  });
});

// ── fetchFilterConfigs ──────────────────────────────────────────────

describe("fetchFilterConfigs", () => {
  beforeEach(() => {
    invalidateFilterConfigCache();
    jest.restoreAllMocks();
  });

  it("fetches and parses filter configs from API", async () => {
    const mockResponse = {
      filters: {
        region: {
          label: "Region",
          type: "select",
          options: [{ value: "us", label: "United States" }],
        },
        date_range: {
          label: "Date Range",
          type: "date",
          dateFormat: "YYYY-MM-DD",
          presets: [{ value: "last_7d", label: "Last 7 days" }],
        },
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const configs = await fetchFilterConfigs();
    expect(configs.region).toBeDefined();
    expect(configs.region.label).toBe("Region");
    expect(configs.region.type).toBe("select");
    expect(configs.date_range.dateFormat).toBe("YYYY-MM-DD");
  });

  it("returns empty object on network failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    const configs = await fetchFilterConfigs();
    expect(configs).toEqual({});
  });

  it("returns empty object on non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    invalidateFilterConfigCache();
    const configs = await fetchFilterConfigs();
    expect(configs).toEqual({});
  });

  it("caches results across calls", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ filters: { a: { label: "A", type: "text" } } }),
    });

    await fetchFilterConfigs();
    await fetchFilterConfigs();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("stores both original and lowercase keys", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          filters: { Region: { label: "Region", type: "text" } },
        }),
    });

    const configs = await fetchFilterConfigs();
    expect(configs["Region"]).toBeDefined();
    expect(configs["region"]).toBeDefined();
    expect(configs["Region"]).toBe(configs["region"]);
  });
});

// ── invalidateFilterConfigCache ─────────────────────────────────────

describe("invalidateFilterConfigCache", () => {
  it("forces re-fetch after invalidation", async () => {
    invalidateFilterConfigCache();
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            filters: { a: { label: `Call ${callCount}`, type: "text" } },
          }),
      });
    });

    const first = await fetchFilterConfigs();
    expect(first.a.label).toBe("Call 1");

    invalidateFilterConfigCache();
    const second = await fetchFilterConfigs();
    expect(second.a.label).toBe("Call 2");
    expect(callCount).toBe(2);
  });
});
