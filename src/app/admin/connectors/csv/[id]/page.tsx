import ConnectorDetailPage from "../../components/ConnectorDetailPage";

export default function CsvConnectorDetailPage() {
  return (
    <ConnectorDetailPage
      connectorType="csv-xlsx"
      apiBasePath="/api/admin/csv-connector"
      queriesApiPath="/api/admin/csv-connector/queries"
      connectorBaseUrl={
        process.env.CSV_XLSX_CONNECTOR_URL || "http://localhost:4004"
      }
      listPath="/admin/connectors/csv"
      typeLabel="CSV / XLSX"
      defaultSchema="default"
      paramSyntax=""
    />
  );
}
