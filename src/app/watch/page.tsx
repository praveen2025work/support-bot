"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { WatchRuleList } from "@/components/watch/WatchRuleList";
import { WatchRuleForm } from "@/components/watch/WatchRuleForm";
import { WatchRuleDetailPanel } from "@/components/watch/WatchRuleDetailPanel";
import type { WatchRule } from "@/types/watch";

function WatchPageContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? "default";

  const [showForm, setShowForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState<WatchRule | null>(null);
  const [listKey, setListKey] = useState(0);

  function handleCreated() {
    setShowForm(false);
    setSelectedRule(null);
    setListKey((k) => k + 1);
  }

  function handleEdit(rule: WatchRule) {
    setSelectedRule(rule);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setSelectedRule(null);
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">
          Watch Rules
        </h1>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setSelectedRule(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-white text-[13px] font-medium rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        )}
      </div>

      {/* Detail panel for selected rule (when not editing) */}
      {selectedRule && !showForm && (
        <WatchRuleDetailPanel
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
          onEdit={() => setShowForm(true)}
        />
      )}

      {/* Create / Edit form */}
      {showForm && (
        <WatchRuleForm
          key={selectedRule?.id ?? "new"}
          groupId={groupId}
          editingRule={selectedRule}
          onCreated={handleCreated}
          onCancel={handleCancel}
        />
      )}

      {/* Rule list */}
      <WatchRuleList key={listKey} groupId={groupId} onEdit={handleEdit} />
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-[13px] text-[var(--text-muted)]">Loading…</div>
      }
    >
      <WatchPageContent />
    </Suspense>
  );
}
