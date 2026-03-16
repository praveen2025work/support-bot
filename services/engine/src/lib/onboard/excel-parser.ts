import {
  GroupInfoRowSchema,
  QueryRowSchema,
  SynonymRowSchema,
  FaqRowSchema,
  OnboardPayloadSchema,
  type OnboardPayload,
} from './schemas';

interface ParseResult {
  success: boolean;
  data?: OnboardPayload;
  errors?: string[];
}

export function parseOnboardingExcel(buffer: Buffer): ParseResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx');
  const errors: string[] = [];

  const wb = XLSX.read(buffer, { type: 'buffer' });

  // Validate required sheets exist
  const requiredSheets = ['Group Info', 'Queries', 'Synonyms', 'FAQ'];
  for (const sheetName of requiredSheets) {
    if (!wb.SheetNames.includes(sheetName)) {
      errors.push(`Missing required sheet: "${sheetName}"`);
    }
  }
  if (errors.length > 0) return { success: false, errors };

  // Parse Group Info (expect exactly 1 data row)
  const groupInfoRows = XLSX.utils.sheet_to_json(wb.Sheets['Group Info']);
  if (groupInfoRows.length === 0) {
    errors.push('Group Info sheet must have at least one data row');
    return { success: false, errors };
  }
  const groupInfoResult = GroupInfoRowSchema.safeParse(groupInfoRows[0]);
  if (!groupInfoResult.success) {
    errors.push(
      ...groupInfoResult.error.issues.map(
        (i) => `Group Info: ${i.path.join('.')} — ${i.message}`
      )
    );
  }

  // Parse Queries
  const queryRows = XLSX.utils.sheet_to_json(wb.Sheets['Queries']);
  const validatedQueries = [];
  for (let i = 0; i < queryRows.length; i++) {
    const result = QueryRowSchema.safeParse(queryRows[i]);
    if (result.success) {
      validatedQueries.push(result.data);
    } else {
      errors.push(
        ...result.error.issues.map(
          (issue) => `Queries row ${i + 2}: ${issue.path.join('.')} — ${issue.message}`
        )
      );
    }
  }

  // Parse Synonyms
  const synonymRows = XLSX.utils.sheet_to_json(wb.Sheets['Synonyms']);
  const validatedSynonyms = [];
  for (let i = 0; i < synonymRows.length; i++) {
    const result = SynonymRowSchema.safeParse(synonymRows[i]);
    if (result.success) {
      validatedSynonyms.push(result.data);
    } else {
      errors.push(
        ...result.error.issues.map(
          (issue) => `Synonyms row ${i + 2}: ${issue.path.join('.')} — ${issue.message}`
        )
      );
    }
  }

  // Parse FAQ
  const faqRows = XLSX.utils.sheet_to_json(wb.Sheets['FAQ']);
  const validatedFaq = [];
  for (let i = 0; i < faqRows.length; i++) {
    const result = FaqRowSchema.safeParse(faqRows[i]);
    if (result.success) {
      validatedFaq.push(result.data);
    } else {
      errors.push(
        ...result.error.issues.map(
          (issue) => `FAQ row ${i + 2}: ${issue.path.join('.')} — ${issue.message}`
        )
      );
    }
  }

  if (errors.length > 0) return { success: false, errors };

  // Cross-validation: synonym query_names must match defined queries
  const queryNames = new Set(validatedQueries.map((q) => q.name));
  for (const syn of validatedSynonyms) {
    if (!queryNames.has(syn.query_name)) {
      errors.push(
        `Synonyms: query_name "${syn.query_name}" not found in Queries sheet`
      );
    }
  }

  if (errors.length > 0) return { success: false, errors };

  const payload = OnboardPayloadSchema.safeParse({
    groupInfo: groupInfoResult!.data,
    queries: validatedQueries,
    synonyms: validatedSynonyms,
    faq: validatedFaq,
  });

  if (!payload.success) {
    return {
      success: false,
      errors: payload.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }

  return { success: true, data: payload.data };
}
