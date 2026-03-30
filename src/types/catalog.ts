export interface CatalogColumn {
  key: string;
  label: string;
  type?: string;
}

export interface CatalogEntry {
  name: string;
  description: string;
  tags: string[];
  owner: string;
  type: string;
  columnCount: number;
  columns: CatalogColumn[];
  usageCountTotal: number;
  usageCount7d: number;
  trending: boolean;
  filters: string[];
}

export interface CatalogDetail extends CatalogEntry {
  relatedQueries: string[];
  lastExecutionTime?: string;
}

export interface CatalogListResponse {
  success: boolean;
  data: CatalogEntry[];
  total: number;
}

export interface CatalogDetailResponse {
  success: boolean;
  data: CatalogDetail;
}
