import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

const IDS = ['55', '54', '53', '52', 'retired', 'history', 'jobseq'];

const HIST_COLS = [
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Nama' },
  { key: 'FirstWorkingDate', label: 'First Working' },
  { key: 'umur', label: 'Umur' },
  { key: 'BirthDate', label: 'Tgl Lahir' },
];

const COLS = [
  { key: 'Name', label: 'Nama' },
  { key: 'Joblevel', label: 'Joblevel' },
  { key: 'Jobtitle', label: 'Jobtitle' },
  { key: 'Division', label: 'Division' },
  { key: 'FirstWorkingDate', label: 'First Working' },
  { key: 'BirthDate', label: 'Tgl Lahir' },
];

// Padanan hris/retired.php
export default function Retired() {
  const [id, setId] = useState('history');
  const [jobs, setJobs] = useState('');
  const [filter, setFilter] = useState({ id: 'history', jobs: '' });

  const { data, loading, error } = useFetch(
    `/statistics/retired?id=${encodeURIComponent(filter.id)}&jobs=${encodeURIComponent(filter.jobs)}`,
    [filter.id, filter.jobs]
  );

  const isHist = filter.id === 'history';
  return (
    <Page title="Karyawan Pensiun">
      <Card title="Filter">
        <form className="row" onSubmit={(e) => { e.preventDefault(); setFilter({ id, jobs }); }}>
          <div>
            <label>Kategori</label>
            <select value={id} onChange={(e) => setId(e.target.value)}>
              {IDS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {id === 'jobseq' && (
            <div>
              <label>Joblevel</label>
              <input value={jobs} onChange={(e) => setJobs(e.target.value)} />
            </div>
          )}
          <button type="submit">Submit</button>
        </form>
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={isHist ? HIST_COLS : COLS} rows={data?.data || []} />
      </Card>
    </Page>
  );
}
