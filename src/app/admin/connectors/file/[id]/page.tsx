"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { FileInfoTab } from "@/components/admin/file-connector/FileInfoTab";
import { SchemaTab } from "@/components/admin/file-connector/SchemaTab";
import { QueryBuilderTab } from "@/components/admin/file-connector/QueryBuilderTab";
import { PreviewTab } from "@/components/admin/file-connector/PreviewTab";
import { SavedQueriesTab } from "@/components/admin/file-connector/SavedQueriesTab";
import type {
  FileSourceConfig,
  SchemaColumn,
  QueryPipeline,
} from "@/components/admin/file-connector/types";

const TABS = [
  "File Info",
  "Schema",
  "Query Builder",
  "Preview",
  "Saved Queries",
] as const;
type Tab = (typeof TABS)[number];

export default function FileConnectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sourceId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("File Info");
  const [source, setSource] = useState<FileSourceConfig | null>(null);
  const [schema, setSchema] = useState<SchemaColumn[]>([]);
  const [pipeline, setPipeline] = useState<QueryPipeline>({ select: [] });
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    totalSourceRows: number;
    durationMs: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch source details
  useEffect(() => {
    fetch(`/api/admin/file-sources/${sourceId}`)
      .then((r) => r.json())
      .then((data) => {
        setSource(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sourceId]);

  // Fetch schema
  useEffect(() => {
    if (!sourceId) return;
    fetch(`/api/admin/file-sources/${sourceId}/schema`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.schema) setSchema(data.schema);
      })
      .catch(() => {});
  }, [sourceId]);

  const handleRunPreview = useCallback(async () => {
    const res = await fetch(`/api/admin/file-sources/${sourceId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline }),
    });
    const data = await res.json();
    setPreviewData(data);
    setActiveTab("Preview");
  }, [sourceId, pipeline]);

  if (loading) {
    return (
      <>
        <ContextualTopBar title="Loading..." />
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
          Loading file source...
        </div>
      </>
    );
  }

  if (!source) {
    return (
      <>
        <ContextualTopBar title="Not Found" />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
            Source not found
          </div>
          <button
            onClick={() => router.push("/admin/connectors/file")}
            className="text-[13px] text-[var(--brand)] mt-2"
          >
            Back to file sources
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <ContextualTopBar title="Admin">
        <span className="text-[11px] text-[var(--text-muted)]">
          Connectors / CSV-XLSX / {source.name}
        </span>
      </ContextualTopBar>

      {/* Tab bar */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border)] px-4 flex gap-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab
                ? "text-[var(--brand)] border-b-2 border-[var(--brand)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "File Info" && (
          <FileInfoTab
            source={source}
            onUpdate={setSource}
            sourceId={sourceId}
          />
        )}
        {activeTab === "Schema" && (
          <SchemaTab schema={schema} source={source} />
        )}
        {activeTab === "Query Builder" && (
          <QueryBuilderTab
            schema={schema}
            pipeline={pipeline}
            onPipelineChange={setPipeline}
            onRunPreview={handleRunPreview}
          />
        )}
        {activeTab === "Preview" && (
          <PreviewTab data={previewData} pipeline={pipeline} />
        )}
        {activeTab === "Saved Queries" && (
          <SavedQueriesTab
            sourceId={sourceId}
            source={source}
            pipeline={pipeline}
          />
        )}
      </div>
    </>
  );
}
