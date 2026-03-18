'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboardSubscriptions } from '@/hooks/useDashboardSubscriptions';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const CRON_PRESETS = [
  { label: 'Daily at 9am', value: '0 9 * * *' },
  { label: 'Weekdays at 8am', value: '0 8 * * 1-5' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
];

interface SubscribeModalProps {
  open: boolean;
  dashboardId: string;
  dashboardName: string;
  userId: string;
  onClose: () => void;
}

export function SubscribeModal({ open, dashboardId, dashboardName, userId, onClose }: SubscribeModalProps) {
  const { subscriptions, loading, emailConfigured, fetchSubscriptions, subscribe, unsubscribe, sendNow } = useDashboardSubscriptions(userId);
  const [email, setEmail] = useState('');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [customCron, setCustomCron] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchSubscriptions(dashboardId);
  }, [open, dashboardId, fetchSubscriptions]);

  const handleSubscribe = useCallback(async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await subscribe(dashboardId, email.trim(), cronExpression);
      setEmail('');
    } catch (err) {
      setError('Failed to subscribe');
    } finally {
      setSubmitting(false);
    }
  }, [email, cronExpression, dashboardId, subscribe]);

  const handleSendNow = useCallback(async (subId: string) => {
    setSendingId(subId);
    try {
      await sendNow(dashboardId, subId);
    } catch { /* silent */ }
    finally { setSendingId(null); }
  }, [dashboardId, sendNow]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await unsubscribe(dashboardId, deleteTarget);
    } catch { /* silent */ }
    setDeleteTarget(null);
  }, [deleteTarget, dashboardId, unsubscribe]);

  const describeCron = (cron: string): string => {
    const preset = CRON_PRESETS.find((p) => p.value === cron);
    if (preset) return preset.label;
    return cron;
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Email Subscription</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{dashboardName}</p>
              </div>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {!emailConfigured && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
                SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables to enable email delivery.
              </div>
            )}

            {/* New subscription form */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Subscription</h3>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recipient@company.com"
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Schedule</label>
                {!customCron ? (
                  <div className="space-y-1.5">
                    {CRON_PRESETS.map((preset) => (
                      <label key={preset.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cronPreset"
                          value={preset.value}
                          checked={cronExpression === preset.value}
                          onChange={(e) => setCronExpression(e.target.value)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{preset.label}</span>
                      </label>
                    ))}
                    <button onClick={() => setCustomCron(true)} className="text-xs text-blue-600 hover:underline mt-1">
                      Custom cron expression...
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      placeholder="0 9 * * *"
                      className="w-full text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-gray-400">Format: minute hour dayOfMonth month dayOfWeek</p>
                    <button onClick={() => setCustomCron(false)} className="text-xs text-blue-600 hover:underline">
                      Use preset...
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                onClick={handleSubscribe}
                disabled={submitting || !email.trim()}
                className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>

            {/* Existing subscriptions */}
            {subscriptions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Subscriptions</h3>
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-750 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-gray-700">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{sub.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{describeCron(sub.cronExpression)}</p>
                      {sub.lastSentAt && (
                        <p className="text-[10px] text-gray-400">Last sent: {new Date(sub.lastSentAt).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleSendNow(sub.id)}
                        disabled={sendingId === sub.id}
                        className="px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                        title="Send now"
                      >
                        {sendingId === sub.id ? 'Sending...' : 'Send Now'}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(sub.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                        title="Unsubscribe"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Unsubscribe"
        message="Are you sure you want to remove this email subscription?"
        confirmLabel="Unsubscribe"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
