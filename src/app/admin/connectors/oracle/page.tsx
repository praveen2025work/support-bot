import ConnectorListPage from "../components/ConnectorListPage";

export default function OracleConnectorsPage() {
  return (
    <ConnectorListPage
      connectorType="oracle"
      apiBasePath="/api/admin/oracle-connector"
      detailBasePath="/admin/connectors/oracle"
      title="Oracle Database Connections"
      description="Manage Oracle database connections. Each connection can host multiple saved queries that are exposed as REST APIs."
      defaultPort="1521"
      defaultSchema="HR"
      badgeClass="bg-orange-50 text-orange-700"
      badgeLabel="Oracle"
    />
  );
}
