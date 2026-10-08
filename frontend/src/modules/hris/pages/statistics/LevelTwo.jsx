import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

const JENS = ['job', 'edu', 'age', 'period'];

const COLS = {
  job: [
    { key: 'NIP', label: 'NIP' },
    { key: 'Name', label: 'Nama' },
    { key: 'Division', label: 'Divisi' },
    { key: 'Jobtitle', label: 'JobTitle' },
    { key: 'Joblevel', label: 'JobLevel' },
    { key: 'StartDate', label: 'Start Date' },
    { key: 'FirstWorkingDate', label: 'First Working' },
  ],
  edu: [
    { key: 'NIP', label: 'NIP' },
    { key: 'Name', label: 'Nama' },
    { key: 'DeptName', label: 'Departemen' },
    { key: 'EducationLevel', label: 'Pendidikan' },
    { key: 'Institution', label: 'Institusi' },
    { key: 'Major', label: 'Jurusan' },
  ],
  age: [
    { key: 'NIP', label: 'NIP' },
    { key: 'Name', label: 'Nama' },
    { key: 'BirthPlace', label: 'Tempat Lahir' },
    { key: 'BirthDate', label: 'Tgl Lahir' },
    { key: 'Phone', label: 'Tlp' },
    { key: 'MaritalStatus', label: 'Status' },
  ],
  period: [
    { key: 'NIP', label: 'NIP' },
    { key: 'Name', label: 'Nama' },
    { key: 'BirthPlace', label: 'Tempat Lahir' },
    { key: 'BirthDate', label: 'Tgl Lahir' },
    { key: 'Phone', label: 'Tlp' },
    { key: 'MaritalStatus', label: 'Status' },
  ],
};

// Padanan hris/leveldua_*.php
export default function LevelTwo() {
  const [f, setF] = useState({ id: '', gen: '', stat: '', jen: 'job', totpri: '' });
  const [filter, setFilter] = useState(f);

  const qs = new URLSearchParams(filter).toString();
  const { data, loading, error } = useFetch(`/statistics/level-two?${qs}`, [qs]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <Page title="Employee Job Level">
      <Card title="Filter">
        <form className="row" onSubmit={(e) => { e.preventDefault(); setFilter(f); }}>
          <div>
            <label>Jen</label>
            <select value={f.jen} onChange={set('jen')}>
              {JENS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div><label>ID</label><input value={f.id} onChange={set('id')} /></div>
          <div><label>Gen</label><input value={f.gen} onChange={set('gen')} /></div>
          <div><label>Stat</label><input value={f.stat} onChange={set('stat')} /></div>
          <div><label>Totpri</label><input value={f.totpri} onChange={set('totpri')} /></div>
          <button type="submit">Submit</button>
        </form>
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={COLS[filter.jen] || COLS.job} rows={data?.data || []} />
      </Card>
    </Page>
  );
}
