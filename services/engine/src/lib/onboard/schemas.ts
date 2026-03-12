import { z } from 'zod';

const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;

export const GroupInfoRowSchema = z.object({
  group_id: z.string().regex(snakeCaseRegex, 'Group ID must be snake_case'),
  name: z.string().min(1, 'Group name is required'),
  description: z.string().min(1, 'Description is required'),
  sources: z.string().min(1, 'At least one source is required'),
  greeting: z.string().optional().default(''),
  help_text: z.string().optional().default(''),
});

export const QueryRowSchema = z.object({
  name: z.string().regex(snakeCaseRegex, 'Query name must be snake_case'),
  description: z.string().min(1, 'Description is required'),
  source: z.string().min(1, 'Source is required'),
  estimated_duration: z.coerce.number().positive('Must be a positive number'),
  url: z.string().url('Must be a valid URL'),
  filters: z.string().optional().default(''),
});

export const SynonymRowSchema = z.object({
  query_name: z.string().regex(snakeCaseRegex, 'Query name must be snake_case'),
  synonyms: z.string().min(1, 'At least one synonym is required'),
});

export const FaqRowSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  intent: z.string().min(1, 'Intent is required'),
  answer: z.string().min(1, 'Answer is required'),
});

export const OnboardPayloadSchema = z.object({
  groupInfo: GroupInfoRowSchema,
  queries: z.array(QueryRowSchema).min(1, 'At least one query is required'),
  synonyms: z.array(SynonymRowSchema),
  faq: z.array(FaqRowSchema),
});

export type GroupInfoRow = z.infer<typeof GroupInfoRowSchema>;
export type QueryRow = z.infer<typeof QueryRowSchema>;
export type SynonymRow = z.infer<typeof SynonymRowSchema>;
export type FaqRow = z.infer<typeof FaqRowSchema>;
export type OnboardPayload = z.infer<typeof OnboardPayloadSchema>;
