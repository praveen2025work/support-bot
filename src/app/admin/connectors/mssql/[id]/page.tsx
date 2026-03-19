import ConnectorDetailPage from "../../components/ConnectorDetailPage";

export default function MssqlConnectorDetailPage() {
  return (
    <ConnectorDetailPage
      connectorType="mssql"
      apiBasePath="/api/admin/mssql-connector"
      queriesApiPath="/api/admin/mssql-connector/queries"
      connectorBaseUrl={
        process.env.MSSQL_CONNECTOR_URL || "http://localhost:4002"
      }
      listPath="/admin/connectors/mssql"
      typeLabel="MS SQL Server"
      defaultSchema="dbo"
      paramSyntax="@param"
    />
  );
}
