'use client';

import { useState } from 'react';

type Stage = 'upload' | 'preview' | 'submitting' | 'success' | 'error';

interface PreviewData {
  groupInfo: {
    group_id: string;
    name: string;
    description: string;
    sources: string;
    greeting: string;
    help_text: string;
  };
  queries: Array<{
    name: string;
    description: string;
    source: string;
    estimated_duration: number;
    url: string;
    filters: string;
  }>;
  synonyms: Array<{ query_name: string; synonyms: string }>;
  faq: Array<{ question: string; intent: string; answer: string }>;
}

export function OnboardForm({
  backUrl,
  successUrl,
}: {
  backUrl: string;
  successUrl?: (groupId: string) => string;
}) {
  const [stage, setStage] = useState<Stage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{
    groupId: string;
    queriesAdded: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrors([]);
      setPreview(null);
      setStage('upload');
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsLoading(true);
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');

      const res = await fetch('/api/onboard', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data.details || [data.error || 'Validation failed']);
        return;
      }

      setPreview(data.data);
      setStage('preview');
    } catch {
      setErrors(['Failed to validate file. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setStage('submitting');
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'submit');

      const res = await fetch('/api/onboard', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data.details || [data.error || 'Onboarding failed']);
        setStage('error');
        return;
      }

      setResult({ groupId: data.groupId, queriesAdded: data.queriesAdded });
      setStage('success');
    } catch {
      setErrors(['Submission failed. Please try again.']);
      setStage('error');
    }
  };

  const handleReset = () => {
    setStage('upload');
    setFile(null);
    setPreview(null);
    setErrors([]);
    setResult(null);
    setIsLoading(false);
  };

  const getSuccessUrl = (groupId: string) =>
    successUrl ? successUrl(groupId) : `/?group=${groupId}`;

  return (
    <div>
      <div className="mb-6">
        <a href={backUrl} className="text-sm text-blue-600 hover:underline">
          &larr; Back
        </a>
      </div>

      <h1 className="text-2xl font-bold mb-2">Onboard a New Group</h1>
      <p className="text-gray-500 text-sm mb-8">
        Download the Excel template, fill in your group details, queries, and
        FAQ, then upload it here to onboard your application.
      </p>

      {/* Step 1: Download Template */}
      <section className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Step 1: Download Template
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Get the Excel template with example data and instructions for each
          sheet.
        </p>
        <a
          href="/api/onboard/template"
          className="inline-block px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-800"
        >
          Download Template (.xlsx)
        </a>
      </section>

      {/* Step 2: Upload */}
      <section className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Step 2: Upload Completed Template
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="text-sm"
          />
          {file && stage === 'upload' && (
            <button
              onClick={handlePreview}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Validating...' : 'Validate & Preview'}
            </button>
          )}
        </div>
        {file && (
          <p className="text-xs text-gray-400 mt-2">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </section>

      {/* Errors */}
      {errors.length > 0 && (
        <section className="mb-8 p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-sm font-semibold text-red-700 mb-2">
            Validation Errors
          </h3>
          <ul className="text-xs text-red-600 space-y-1">
            {errors.map((err, i) => (
              <li key={i}>- {err}</li>
            ))}
          </ul>
          <button
            onClick={handleReset}
            className="mt-3 text-xs text-red-600 underline"
          >
            Start over
          </button>
        </section>
      )}

      {/* Step 3: Preview */}
      {stage === 'preview' && preview && (
        <section className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h2 className="text-sm font-semibold text-blue-700 mb-4">
            Step 3: Review & Confirm
          </h2>

          {/* Group Info */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase">
              Group Info
            </h3>
            <div className="bg-white rounded p-3 text-sm space-y-1">
              <div>
                <span className="font-medium">ID:</span>{' '}
                {preview.groupInfo.group_id}
              </div>
              <div>
                <span className="font-medium">Name:</span>{' '}
                {preview.groupInfo.name}
              </div>
              <div>
                <span className="font-medium">Description:</span>{' '}
                {preview.groupInfo.description}
              </div>
              <div>
                <span className="font-medium">Sources:</span>{' '}
                {preview.groupInfo.sources}
              </div>
              {preview.groupInfo.greeting && (
                <div>
                  <span className="font-medium">Greeting:</span>{' '}
                  {preview.groupInfo.greeting}
                </div>
              )}
              {preview.groupInfo.help_text && (
                <div>
                  <span className="font-medium">Help text:</span>{' '}
                  {preview.groupInfo.help_text}
                </div>
              )}
            </div>
          </div>

          {/* Queries */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase">
              Queries ({preview.queries.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Filters</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.queries.map((q, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2 font-mono">{q.name}</td>
                      <td className="p-2">{q.description}</td>
                      <td className="p-2">{q.source}</td>
                      <td className="p-2">{q.filters || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Synonyms */}
          {preview.synonyms.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase">
                Synonyms ({preview.synonyms.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Query</th>
                      <th className="text-left p-2">Synonyms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.synonyms.map((s, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2 font-mono">{s.query_name}</td>
                        <td className="p-2">{s.synonyms}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FAQ */}
          {preview.faq.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase">
                FAQ ({preview.faq.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Question</th>
                      <th className="text-left p-2">Intent</th>
                      <th className="text-left p-2">Answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.faq.map((f, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">{f.question}</td>
                        <td className="p-2 font-mono">{f.intent}</td>
                        <td className="p-2">{f.answer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Confirm & Onboard
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Submitting */}
      {stage === 'submitting' && (
        <section className="mb-8 p-4 border border-gray-200 rounded-lg text-center">
          <p className="text-sm text-gray-500">
            Onboarding in progress... Generating config, training data, and
            registering queries.
          </p>
        </section>
      )}

      {/* Success */}
      {stage === 'success' && result && (
        <section className="mb-8 p-4 border border-green-200 rounded-lg bg-green-50">
          <h2 className="text-sm font-semibold text-green-700 mb-2">
            Onboarding Complete!
          </h2>
          <p className="text-sm text-green-600 mb-3">
            Group <strong>{result.groupId}</strong> has been onboarded with{' '}
            {result.queriesAdded} queries.
          </p>
          <div className="flex gap-3">
            <a
              href={getSuccessUrl(result.groupId)}
              className="inline-block px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              View group &rarr;
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
            >
              Onboard another
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
