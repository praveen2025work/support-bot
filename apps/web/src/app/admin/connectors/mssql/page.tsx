import ConnectorListPage from "../components/ConnectorListPage";

export default function MssqlConnectorsPage() {
  return (
    <ConnectorListPage
      connectorType="mssql"
      apiBasePath="/api/admin/mssql-connector"
      detailBasePath="/admin/connectors/mssql"
      title="MS SQL Server Connections"
      description="Manage MS SQL Server database connections. Each connection can host multiple saved queries that are exposed as REST APIs."
      defaultPort="1433"
      defaultSchema="dbo"
      badgeClass="bg-blue-50 text-blue-700"
      badgeLabel="MS SQL"
    />
  );
}
