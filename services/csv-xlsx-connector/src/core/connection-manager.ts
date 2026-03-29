import { promises as fs } from "fs";
import { paths } from "@/lib/env-config";
import { logger } from "@/lib/logger";
import {
  loadFileData,
  testFile,
  getColumnInfo,
  executePipeline,
} from "./csv-xlsx-connector";
import type {
  FileConnectorConfig,
  FileConnectionStatus,
  FileColumnInfo,
  FileQueryResult,
  QueryPipeline,
} from "./types";

class ConnectionManager {
  private configs = new Map<string, FileConnectorConfig>();
  private loaded = false;

  async loadConfigs(): Promise<void> {
    try {
      const raw = await fs.readFile(paths.connectors.config, "utf-8");
      const list = JSON.parse(raw) as FileConnectorConfig[];
      this.configs.clear();
      for (const c of list) this.configs.set(c.id, c);
    } catch {
      // File doesn't exist yet — start fresh
    }
    this.loaded = true;
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.loadConfigs();
  }

  private async saveConfigs(): Promise<void> {
    await fs.mkdir(paths.connectors.dir, { recursive: true });
    const list = Array.from(this.configs.values());
    await fs.writeFile(
      paths.connectors.config,
      JSON.stringify(list, null, 2),
      "utf-8",
    );
  }

  async listConnectors(): Promise<FileConnectorConfig[]> {
    await this.ensureLoaded();
    return Array.from(this.configs.values());
  }

  async getConfig(id: string): Promise<FileConnectorConfig | undefined> {
    await this.ensureLoaded();
    return this.configs.get(id);
  }

  async setConfig(config: FileConnectorConfig): Promise<void> {
    await this.ensureLoaded();
    this.configs.set(config.id, config);
    await this.saveConfigs();
  }

  async removeConfig(id: string): Promise<void> {
    await this.ensureLoaded();
    this.configs.delete(id);
    await this.saveConfigs();
    logger.info({ connectorId: id }, "File connector removed");
  }

  async testConnection(id: string): Promise<FileConnectionStatus> {
    await this.ensureLoaded();
    const config = this.configs.get(id);
    if (!config) throw new Error(`Connector "${id}" not found`);
    return testFile(config);
  }

  async getColumns(id: string): Promise<FileColumnInfo[]> {
    await this.ensureLoaded();
    const config = this.configs.get(id);
    if (!config) throw new Error(`Connector "${id}" not found`);
    const data = await loadFileData(config);
    return getColumnInfo(data);
  }

  async executeQuery(
    id: string,
    pipeline: QueryPipeline,
  ): Promise<FileQueryResult> {
    await this.ensureLoaded();
    const config = this.configs.get(id);
    if (!config) throw new Error(`Connector "${id}" not found`);
    const data = await loadFileData(config);
    return executePipeline(data, pipeline);
  }

  async shutdown(): Promise<void> {
    logger.info("CSV/XLSX connector manager shut down");
  }
}

export const connectionManager = new ConnectionManager();
