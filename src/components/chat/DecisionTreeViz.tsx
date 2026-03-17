'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4',
  '#10b981', '#f59e0b', '#ef4444', '#ec4899',
];

interface TreeNode {
  feature?: string;
  threshold?: number;
  prediction?: string;
  gini: number;
  samples: number;
  left?: TreeNode;
  right?: TreeNode;
}

interface DecisionTreeVizProps {
  tree: TreeNode;
  accuracy: number;
  featureImportance: Record<string, number>;
  targetColumn: string;
}

const MAX_DEPTH = 4;

function TreeNodeView({
  node,
  depth,
  path,
}: {
  node: TreeNode;
  depth: number;
  path: string;
}) {
  const isLeaf = !node.feature || node.prediction !== undefined;
  const isTruncated = !isLeaf && depth >= MAX_DEPTH;

  return (
    <div className="ml-3" style={{ borderLeft: depth > 0 ? '1px solid #e5e7eb' : 'none' }}>
      <div
        className={`flex items-start gap-1 py-0.5 pl-2 text-[10px] ${
          isLeaf ? 'text-green-700' : 'text-gray-700'
        }`}
      >
        <span className="text-gray-300 select-none">{depth > 0 ? (path === 'L' ? '|-T ' : '|-F ') : ''}</span>
        {isLeaf ? (
          <span className="bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
            Predict: <span className="font-medium">{node.prediction ?? '?'}</span>
            <span className="text-gray-400 ml-1">(n={node.samples}, gini={node.gini.toFixed(3)})</span>
          </span>
        ) : isTruncated ? (
          <span className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-400 italic">
            {node.feature} &le; {node.threshold?.toFixed(2)} ... (truncated, n={node.samples})
          </span>
        ) : (
          <span className="bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
            {node.feature} &le; {node.threshold?.toFixed(2)}
            <span className="text-gray-400 ml-1">(n={node.samples}, gini={node.gini.toFixed(3)})</span>
          </span>
        )}
      </div>
      {!isLeaf && !isTruncated && (
        <>
          {node.left && <TreeNodeView node={node.left} depth={depth + 1} path="L" />}
          {node.right && <TreeNodeView node={node.right} depth={depth + 1} path="R" />}
        </>
      )}
    </div>
  );
}

export default function DecisionTreeViz({
  tree,
  accuracy,
  featureImportance,
  targetColumn,
}: DecisionTreeVizProps) {
  const importanceData = useMemo(() => {
    return Object.entries(featureImportance)
      .map(([feature, importance]) => ({ feature, importance: +(importance * 100).toFixed(1) }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);
  }, [featureImportance]);

  const accuracyPercent = (accuracy * 100).toFixed(1);

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">
          Decision Tree: {targetColumn}
        </span>
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            accuracy >= 0.8
              ? 'bg-green-50 text-green-700 border border-green-200'
              : accuracy >= 0.6
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          Accuracy: {accuracyPercent}%
        </span>
      </div>

      {/* Tree structure */}
      <div className="overflow-auto border border-gray-100 rounded p-1 mb-2 bg-gray-50" style={{ maxHeight: 250 }}>
        <div className="text-[10px] text-gray-400 mb-1 px-1">
          T = True (left), F = False (right)
        </div>
        <TreeNodeView node={tree} depth={0} path="" />
      </div>

      {/* Feature importance chart */}
      {importanceData.length > 0 && (
        <>
          <div className="text-[10px] font-medium text-gray-500 mb-1">Feature Importance</div>
          <ResponsiveContainer width="100%" height={Math.max(120, importanceData.length * 24)}>
            <BarChart
              data={importanceData}
              layout="vertical"
              margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
                domain={[0, 'auto']}
                unit="%"
              />
              <YAxis
                type="category"
                dataKey="feature"
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
                width={100}
              />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(value) => [`${value ?? 0}%`, 'Importance']}
              />
              <Bar dataKey="importance" radius={[0, 2, 2, 0]}>
                {importanceData.map((_, i) => {
                  const opacity = 0.4 + 0.6 * (1 - i / Math.max(importanceData.length - 1, 1));
                  return (
                    <Cell key={i} fill={COLORS[0]} fillOpacity={opacity} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
