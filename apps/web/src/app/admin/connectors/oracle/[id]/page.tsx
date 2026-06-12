import ConnectorDetailPage from "../../components/ConnectorDetailPage";

export default function OracleConnectorDetailPage() {
  return (
    <ConnectorDetailPage
      connectorType="oracle"
      apiBasePath="/api/admin/oracle-connector"
      queriesApiPath="/api/admin/oracle-connector/queries"
      connectorBaseUrl={
        process.env.ORACLE_CONNECTOR_URL || "http://localhost:4003"
      }
      listPath="/admin/connectors/oracle"
      typeLabel="Oracle Database"
      defaultSchema="HR"
      paramSyntax=":param"
    />
  );
}
