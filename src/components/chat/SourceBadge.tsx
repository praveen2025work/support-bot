'use client';

interface SourceBadgeProps {
  sourceName: string;
  sourceType?: string;
}

const typeIcons: Record<string, string> = {
  csv: '📊',
  xlsx: '📊',
  api: '🔌',
  document: '📄',
  url: '🌐',
};

const typeColors: Record<string, string> = {
  csv: 'bg-purple-100 text-purple-700 border-purple-200',
  xlsx: 'bg-purple-100 text-purple-700 border-purple-200',
  api: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  document: 'bg-amber-100 text-amber-700 border-amber-200',
  url: 'bg-teal-100 text-teal-700 border-teal-200',
};

export function SourceBadge({ sourceName, sourceType }: SourceBadgeProps) {
  const icon = typeIcons[sourceType || ''] || '📦';
  const color = typeColors[sourceType || ''] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${color}`}>
      <span>{icon}</span>
      {sourceName}
    </span>
  );
}
