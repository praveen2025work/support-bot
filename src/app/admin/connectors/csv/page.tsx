import ConnectorListPage from "../components/ConnectorListPage";

export default function CsvConnectorsPage() {
  return (
    <ConnectorListPage
      connectorType="csv-xlsx"
      apiBasePath="/api/admin/csv-connector"
      detailBasePath="/admin/connectors/csv"
      title="CSV / XLSX File Connections"
      description="Manage CSV and Excel file-based data connections. Each file source can host multiple saved queries that are exposed as REST APIs — identical to SQL connectors."
      defaultPort=""
      defaultSchema="default"
      badgeClass="bg-emerald-50 text-emerald-700"
      badgeLabel="CSV/XLSX"
    />
  );
}
