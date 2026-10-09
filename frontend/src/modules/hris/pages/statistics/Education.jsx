import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

const count = (a) => (Array.isArray(a) ? a.length : 0);

const columns = [
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Nama' },
  { key: 'DeptName', label: 'Department' },
  { key: 'Institution', label: 'Sekolah/Univ' },
  { key: 'EducationLevel', label: 'Pendidikan Terakhir' },
  { key: 'Major', label: 'Jurusan' },
  { key: 'BirthDate', label: 'Tgl Lahir' },
];

// Padanan hris/education.php
export default function Education() {
  const [id, setId] = useState('');
  const [desc, setDesc] = useState('');
  const [filter, setFilter] = useState({ id: '', desc: '' });

  const { data, loading, error } = useFetch(
    `/statistics/education?id=${encodeURIComponent(filter.id)}&desc=${encodeURIComponent(filter.desc)}`,
    [filter.id, filter.desc]
  );

  const cards = [
    { label: 'Kontrak L', value: count(data?.konL) },
    { label: 'Kontrak P', value: count(data?.konP) },
    { label: 'Tetap L', value: count(data?.tetL) },
    { label: 'Tetap P', value: count(data?.tetP) },
  ];

  return (
    <Page title="Pendidikan">
      <Card title="Filter">
        <form className="row" onSubmit={(e) => { e.preventDefault(); setFilter({ id, desc }); }}>
          <div><label>EndEdu (id)</label><input value={id} onChange={(e) => setId(e.target.value)} /></div>
          <div><label>Keterangan</label><input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <button type="submit">Submit</button>
        </form>
      </Card>
      <Card>
        <div className="row">
          {cards.map((c) => (
            <div key={c.label} style={{ minWidth: 120 }}>
              <div className="muted">{c.label}</div>
              <h3 style={{ margin: 0 }}>{c.value}</h3>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={data?.data || []} />
      </Card>
    </Page>
  );
}
