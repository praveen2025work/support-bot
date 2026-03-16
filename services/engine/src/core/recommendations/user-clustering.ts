import { promises as fs } from 'fs';
import { dirname } from 'path';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';
import type { UserQueryInteraction, UserCluster } from './types';

/**
 * Groups users into clusters based on query usage similarity.
 * Uses cosine similarity on user-query binary vectors.
 */
export class UserClustering {
  private clusters: UserCluster[] = [];
  private userClusterMap = new Map<string, number>();
  private groupId: string;
  private loaded = false;

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  /** Build user clusters from interactions */
  build(interactions: UserQueryInteraction[]): void {
    // Build user → queries map
    const userQueries = new Map<string, Set<string>>();
    const allQueries = new Set<string>();

    for (const i of interactions) {
      if (!userQueries.has(i.userId)) userQueries.set(i.userId, new Set());
      userQueries.get(i.userId)!.add(i.queryName);
      allQueries.add(i.queryName);
    }

    const userIds = Array.from(userQueries.keys());
    if (userIds.length < 2) {
      this.clusters = [];
      this.loaded = true;
      return;
    }

    const queryList = Array.from(allQueries);

    // Build binary vectors
    const vectors = new Map<string, number[]>();
    for (const userId of userIds) {
      const queries = userQueries.get(userId)!;
      vectors.set(userId, queryList.map((q) => queries.has(q) ? 1 : 0));
    }

    // Simple k-means (k = min(5, ceil(sqrt(n/2))))
    const k = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(userIds.length / 2))));
    this.clusters = this.kMeans(userIds, vectors, queryList, k);

    // Build user → cluster map
    this.userClusterMap.clear();
    for (const cluster of this.clusters) {
      for (const uid of cluster.userIds) {
        this.userClusterMap.set(uid, cluster.clusterId);
      }
    }

    this.loaded = true;
    logger.info({ groupId: this.groupId, users: userIds.length, clusters: this.clusters.length }, 'User clustering built');
  }

  /** Get recommended queries for a user based on their cluster */
  getClusterRecommendations(userId: string, topK: number = 5): Array<{ name: string; score: number }> {
    const clusterId = this.userClusterMap.get(userId);
    if (clusterId === undefined) return [];

    const cluster = this.clusters.find((c) => c.clusterId === clusterId);
    if (!cluster) return [];

    return cluster.topQueries.slice(0, topK).map((name, i) => ({
      name,
      score: 1 - (i / cluster.topQueries.length),
    }));
  }

  private kMeans(
    userIds: string[],
    vectors: Map<string, number[]>,
    queryList: string[],
    k: number
  ): UserCluster[] {
    const dim = queryList.length;
    if (dim === 0) return [];

    // Initialize centroids randomly
    const shuffled = [...userIds].sort(() => Math.random() - 0.5);
    let centroids: number[][] = shuffled.slice(0, k).map((uid) => [...vectors.get(uid)!]);

    let assignments = new Array(userIds.length).fill(0);
    const maxIterations = 10;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign users to nearest centroid
      const newAssignments = userIds.map((uid) => {
        const vec = vectors.get(uid)!;
        let bestIdx = 0;
        let bestSim = -1;
        for (let c = 0; c < centroids.length; c++) {
          const sim = this.cosineSimilarity(vec, centroids[c]);
          if (sim > bestSim) {
            bestSim = sim;
            bestIdx = c;
          }
        }
        return bestIdx;
      });

      // Check convergence
      if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) break;
      assignments = newAssignments;

      // Recompute centroids
      centroids = Array.from({ length: k }, () => new Array(dim).fill(0));
      const counts = new Array(k).fill(0);

      for (let i = 0; i < userIds.length; i++) {
        const c = assignments[i];
        counts[c]++;
        const vec = vectors.get(userIds[i])!;
        for (let d = 0; d < dim; d++) {
          centroids[c][d] += vec[d];
        }
      }

      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          for (let d = 0; d < dim; d++) {
            centroids[c][d] /= counts[c];
          }
        }
      }
    }

    // Build cluster objects
    const clusters: UserCluster[] = [];
    for (let c = 0; c < k; c++) {
      const clusterUsers = userIds.filter((_, i) => assignments[i] === c);
      if (clusterUsers.length === 0) continue;

      // Compute top queries by frequency in cluster
      const queryCounts = new Map<string, number>();
      for (const uid of clusterUsers) {
        const vec = vectors.get(uid)!;
        for (let d = 0; d < dim; d++) {
          if (vec[d] > 0) {
            queryCounts.set(queryList[d], (queryCounts.get(queryList[d]) || 0) + 1);
          }
        }
      }

      const topQueries = Array.from(queryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name);

      clusters.push({ clusterId: c, userIds: clusterUsers, topQueries });
    }

    return clusters;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  async save(): Promise<void> {
    const filePath = paths.data.userClusters(this.groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(this.clusters, null, 2), 'utf-8');
  }

  async load(): Promise<boolean> {
    try {
      const raw = await fs.readFile(paths.data.userClusters(this.groupId), 'utf-8');
      this.clusters = JSON.parse(raw);
      this.userClusterMap.clear();
      for (const cluster of this.clusters) {
        for (const uid of cluster.userIds) {
          this.userClusterMap.set(uid, cluster.clusterId);
        }
      }
      this.loaded = true;
      return true;
    } catch {
      return false;
    }
  }

  get isLoaded(): boolean {
    return this.loaded;
  }
}
