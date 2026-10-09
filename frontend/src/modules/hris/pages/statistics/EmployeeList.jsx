import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

const columns = [
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Nama' },
  { key: 'Address', label: 'Alamat' },
  { key: 'Phone', label: 'Tlp' },
  { key: 'Religion', label: 'Agama' },
  { key: 'BirthDate', label: 'Tgl Lahir' },
  { key: 'WorkingDate', label: 'Tgl Masuk' },
  { key: 'umur', label: 'Usia' },
];

// Padanan hris/employee.php
export default function EmployeeList() {
  const [id, setId] = useState('');
  const { data, loading, error } = useFetch(`/statistics/employees?id=${encodeURIComponent(id)}`, [id]);
  return (
    <Page title="Daftar Karyawan">
      <Card title="Filter">
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Semua</option>
          <option value="L">Laki-Laki</option>
          <option value="P">Perempuan</option>
        </select>
        {' '}Pria: {data?.pria?.length ?? 0} | Wanita: {data?.wanita?.length ?? 0}
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={data?.data || []} />
      </Card>
    </Page>
  );
}
