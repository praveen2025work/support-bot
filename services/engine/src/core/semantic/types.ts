export interface SemanticSearchResult {
  queryName: string;
  description: string;
  score: number;
  matchedTerms: string[];
}
