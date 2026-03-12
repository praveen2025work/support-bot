import { z } from 'zod';

export type FilterBindingType = 'body' | 'query_param' | 'path';

export interface FilterBinding {
  key: string;
  binding: FilterBindingType;
}

const FilterBindingSchema = z.object({
  key: z.string(),
  binding: z.enum(['body', 'query_param', 'path']),
});

// Accept both old string[] and new FilterBinding[] formats
const FiltersField = z
  .array(z.union([z.string(), FilterBindingSchema]))
  .optional()
  .transform((arr) => {
    if (!arr) return undefined;
    return arr.map((item) =>
      typeof item === 'string' ? { key: item, binding: 'body' as const } : item
    );
  });

export type QueryType = 'api' | 'url' | 'document' | 'csv';

export const QuerySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  estimatedDuration: z.number().optional(),
  url: z.string().optional(),
  source: z.string().optional(),
  filters: FiltersField,
  type: z
    .enum(['api', 'url', 'file', 'document', 'csv'])
    .default('api')
    .transform((val) => (val === 'file' ? 'document' : val) as QueryType),
  filePath: z.string().optional(),
  endpoint: z.string().optional(),
});

export const QueryResultSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  rowCount: z.number(),
  executionTime: z.number(),
});

export const BatchResultSchema = z.object({
  results: z.array(
    z.object({
      queryId: z.string(),
      queryName: z.string(),
      data: z.array(z.record(z.string(), z.unknown())),
      rowCount: z.number(),
      executionTime: z.number(),
    })
  ),
  totalExecutionTime: z.number(),
});

export type Query = z.infer<typeof QuerySchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export type BatchResult = z.infer<typeof BatchResultSchema>;
export type QueryFilters = Record<string, string>;
