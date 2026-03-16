export interface UserQueryInteraction {
  userId: string;
  queryName: string;
  timestamp: string;
  hour: number;
  dayOfWeek: number;
}

export interface TimePattern {
  queryName: string;
  hourDistribution: number[];
  dayDistribution: number[];
  totalCount: number;
}

export interface UserCluster {
  clusterId: number;
  userIds: string[];
  topQueries: string[];
}
