import { connectionManager } from "@/core/connection-manager";
import { storePassword, removePassword } from "@/core/credential-store";
import { validateReadOnly } from "@/core/query-executor";
import { logger } from "@/lib/logger";
import { CONNECTOR_TYPE } from "@/lib/env-config";
import { createSqlConnectorRouter } from "../../../shared/sql-connector/connectors-router";

const router = createSqlConnectorRouter({
  connectionManager,
  storePassword,
  removePassword,
  validateReadOnly,
  logger,
  connectorType: CONNECTOR_TYPE,
  defaultPort: 1433,
  defaultSchema: "dbo",
});

export const connectorsRouter = router;
export default router;
