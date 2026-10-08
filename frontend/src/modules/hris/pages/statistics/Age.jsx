import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

const OPTIONS = ['18 - 30', '>30 - 45', '>45 - 55', '>55'];

const columns = [
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Nama' },
  { key: 'Gender', label: 'L/P' },
  { key: 'BirthPlace', label: 'Tempat Lahir' },
  { key: 'BirthDate', label: 'Tgl Lahir' },
];

// Padanan hris/age.php
export default function Age() {
  const [id, setId] = useState(OPTIONS[0]);
  const { data, loading, error } = useFetch(`/statistics/age?id=${encodeURIComponent(id)}`, [id]);
  return (
    <Page title={`Karyawan Umur ${data?.id || id}`}>
      <Card title="Filter">
        <label>Rentang Umur</label>{' '}
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={data?.data || []} />
      </Card>
    </Page>
  );
}
