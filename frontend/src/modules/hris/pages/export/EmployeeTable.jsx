import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

const columns = [
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Name' },
  { key: 'DivisionName', label: 'DivisionName' },
  { key: 'Departemen', label: 'Departemen' },
  { key: 'SubDept', label: 'SubDept' },
  { key: 'Jobtitle', label: 'Jobtitle' },
  { key: 'CategoryName', label: 'CategoryName' },
  { key: 'Status', label: 'Status' },
  { key: 'WorkingDate', label: 'WorkingDate' },
  { key: 'NIK', label: 'NIK' },
  { key: 'NPWP', label: 'NPWP' },
  { key: 'BirthDate', label: 'BirthDate' },
  { key: 'EducationArchive', label: 'EducationArchive' },
  { key: 'Address', label: 'Address' },
  { key: 'Phone', label: 'Phone' },
  { key: 'StatusPajak', label: 'StatusPajak' },
];

export default function EmployeeTable() {
  const { data, loading, error } = useFetch('/export/employees', []);
  const rows = data?.data || [];

  return (
    <Page title="Tabel Karyawan">
      <Card title="Data Employee Active">
        {error && <p className="err">{error}</p>}
        {loading ? <p className="muted">Memuat...</p> : <DataTable columns={columns} rows={rows} />}
      </Card>
    </Page>
  );
}
