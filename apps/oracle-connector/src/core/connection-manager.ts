/**
 * Connection Manager — singleton managing Oracle connector instances.
 */

import { logger } from "@/lib/logger";
import { paths } from "@/lib/env-config";
import type {
  SqlConnectorConfig,
  SqlConnectionStatus,
  IDatabaseConnector,
} from "./types";
import { OracleConnector } from "./oracle-connector";
import { getPassword } from "./credential-store";
import { promises as fs } from "fs";

class ConnectionManager {
  private connectors = new Map<string, IDatabaseConnector>();
  private configs = new Map<string, SqlConnectorConfig>();

  async loadConfigs(): Promise<SqlConnectorConfig[]> {
    try {
      const raw = await fs.readFile(paths.connectors.config, "utf-8");
      const configs = JSON.parse(raw) as SqlConnectorConfig[];
      this.configs.clear();
      for (const c of configs) this.configs.set(c.id, c);
      return configs;
    } catch {
      return [];
    }
  }

  async saveConfigs(): Promise<void> {
    await fs.mkdir(paths.connectors.dir, { recursive: true });
    const configs = Array.from(this.configs.values());
    await fs.writeFile(
      paths.connectors.config,
      JSON.stringify(configs, null, 2),
      "utf-8",
    );
  }

  async getConfig(
    connectorId: string,
  ): Promise<SqlConnectorConfig | undefined> {
    if (this.configs.size === 0) await this.loadConfigs();
    return this.configs.get(connectorId);
  }

  async setConfig(config: SqlConnectorConfig): Promise<void> {
    const existing = this.connectors.get(config.id);
    if (existing) {
      await existing.close();
      this.connectors.delete(config.id);
    }
    this.configs.set(config.id, config);
    await this.saveConfigs();
  }

  async removeConfig(connectorId: string): Promise<void> {
    const existing = this.connectors.get(connectorId);
    if (existing) {
      await existing.close();
      this.connectors.delete(connectorId);
    }
    this.configs.delete(connectorId);
    await this.saveConfigs();
  }

  async getConnector(connectorId: string): Promise<IDatabaseConnector> {
    const existing = this.connectors.get(connectorId);
    if (existing) return existing;

    const config = await this.getConfig(connectorId);
    if (!config) throw new Error(`Oracle connector not found: ${connectorId}`);

    const password = await getPassword(connectorId);
    if (!password && config.authType === "sql_auth") {
      throw new Error(`No credentials found for connector: ${connectorId}`);
    }

    const connector = new OracleConnector(config, password || "");
    this.connectors.set(connectorId, connector);
    return connector;
  }

  async testConnection(connectorId: string): Promise<SqlConnectionStatus> {
    try {
      const connector = await this.getConnector(connectorId);
      return connector.testConnection();
    } catch (err) {
      return {
        connectorId,
        connected: false,
        error: err instanceof Error ? err.message : String(err),
        lastChecked: new Date().toISOString(),
      };
    }
  }

  async listConnectors(): Promise<SqlConnectorConfig[]> {
    const configs = await this.loadConfigs();
    return configs.map((c) => ({ ...c, encryptedPassword: undefined }));
  }

  async shutdown(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [id, connector] of this.connectors) {
      logger.info({ connectorId: id }, "Shutting down Oracle connector");
      promises.push(connector.close());
    }
    await Promise.allSettled(promises);
    this.connectors.clear();
    logger.info("All Oracle connectors shut down");
  }
}

export const connectionManager = new ConnectionManager();
