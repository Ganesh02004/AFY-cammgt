import { Device, ClientCompany, Project, User, Worker } from '../types';

interface ExportContext {
  clients: ClientCompany[];
  projects: Project[];
  users: User[];
  workers: Worker[];
}

export const getDeviceCustodianDisplay = (
  dev: Device, 
  users: User[], 
  workers: Worker[], 
  clients: ClientCompany[]
): string => {
  if (dev.current_custodian_type === 'STORAGE') return 'Company Storage (Warehouse)';
  if (dev.current_custodian_type === 'USER' && dev.current_custodian_user_id) {
    const u = users.find(x => x.id === dev.current_custodian_user_id);
    return u ? `Staff: ${u.first_name} ${u.last_name} (@${u.username})` : 'Field Staff';
  }
  if (dev.current_custodian_type === 'WORKER' && dev.current_custodian_worker_id) {
    const w = workers.find(x => x.id === dev.current_custodian_worker_id);
    return w ? `Worker: ${w.name} (${w.worker_id})` : 'Assigned Worker';
  }
  if (dev.current_custodian_type === 'CLIENT') {
    const c = clients.find(x => x.id === dev.source_client_id);
    return c ? `Client: ${c.name}` : 'Source Client';
  }
  return 'Unassigned';
};

const escapeCSVValue = (val: any): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Double quotes inside string and wrap in quotes
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Robust CSV Exporter using UTF-8 BOM and Blob API (prevents URI truncation & encoding failures)
 */
export const exportDevicesToCSV = (
  devices: Device[], 
  context: ExportContext,
  customFilename?: string
): { success: boolean; count: number; error?: string } => {
  try {
    if (!devices || devices.length === 0) {
      return { success: false, count: 0, error: "No device records available to export." };
    }

    const headers = [
      "Asset ID",
      "Brand & Model",
      "Device Type",
      "IMEI / Serial Number",
      "Client Company",
      "Associated Project",
      "Current Status",
      "Current Custodian",
      "Custodian Type",
      "Condition",
      "Accessories",
      "Received Date",
      "Last Updated",
      "QR Token Identifier",
      "Notes"
    ];

    const rows = devices.map(dev => {
      const client = context.clients.find(c => c.id === dev.source_client_id);
      const project = dev.project_id ? context.projects.find(p => p.id === dev.project_id) : undefined;
      const custodianName = getDeviceCustodianDisplay(dev, context.users, context.workers, context.clients);

      return [
        escapeCSVValue(dev.asset_id),
        escapeCSVValue(dev.brand_and_model),
        escapeCSVValue(dev.device_type),
        escapeCSVValue(dev.imei_or_serial || 'N/A'),
        escapeCSVValue(client?.name || 'N/A'),
        escapeCSVValue(project ? `${project.name} (${project.sequence_id})` : 'Unlinked Project'),
        escapeCSVValue(dev.current_status),
        escapeCSVValue(custodianName),
        escapeCSVValue(dev.current_custodian_type),
        escapeCSVValue(dev.condition),
        escapeCSVValue(dev.accessories || 'None'),
        escapeCSVValue(dev.received_date ? new Date(dev.received_date).toLocaleString() : 'N/A'),
        escapeCSVValue(dev.updated_at ? new Date(dev.updated_at).toLocaleString() : 'N/A'),
        escapeCSVValue(dev.qr_token),
        escapeCSVValue(dev.notes || '')
      ].join(',');
    });

    // Prepend UTF-8 BOM (\uFEFF) to guarantee Excel opens unicode/Indian names correctly
    const csvContent = '\uFEFF' + headers.join(',') + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const filename = customFilename || `camguard_device_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: devices.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || "Failed to generate CSV export." };
  }
};

/**
 * Excel XML Spreadsheet Exporter (Opens natively in Microsoft Excel, LibreOffice, and Google Sheets)
 */
export const exportDevicesToExcel = (
  devices: Device[], 
  context: ExportContext,
  customFilename?: string
): { success: boolean; count: number; error?: string } => {
  try {
    if (!devices || devices.length === 0) {
      return { success: false, count: 0, error: "No device records available to export." };
    }

    const xmlEscape = (str: any) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const headers = [
      "Asset ID",
      "Brand & Model",
      "Device Type",
      "IMEI / Serial Number",
      "Client Company",
      "Associated Project",
      "Current Status",
      "Current Custodian",
      "Condition",
      "Accessories",
      "Received Date",
      "QR Token"
    ];

    const headerCells = headers.map(h => 
      `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`
    ).join('');

    const rowsXml = devices.map(dev => {
      const client = context.clients.find(c => c.id === dev.source_client_id);
      const project = dev.project_id ? context.projects.find(p => p.id === dev.project_id) : undefined;
      const custodianName = getDeviceCustodianDisplay(dev, context.users, context.workers, context.clients);

      return `<Row>
        <Cell><Data ss:Type="String">${xmlEscape(dev.asset_id)}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(dev.brand_and_model)}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(dev.device_type)}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(dev.imei_or_serial || 'N/A')}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(client?.name || 'N/A')}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(project ? `${project.name} (${project.sequence_id})` : 'Unlinked')}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(dev.current_status)}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(custodianName)}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(dev.condition)}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(dev.accessories || 'None')}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(dev.received_date ? new Date(dev.received_date).toLocaleDateString() : 'N/A')}</Data></Cell>
        <Cell><Data ss:Type="String">${xmlEscape(dev.qr_token)}</Data></Cell>
      </Row>`;
    }).join('\n');

    const excelXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4338CA" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Master Inventory">
  <Table>
   <Row ss:StyleID="Header">
    ${headerCells}
   </Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = customFilename || `camguard_inventory_report_${new Date().toISOString().slice(0, 10)}.xls`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: devices.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || "Failed to generate Excel export." };
  }
};
