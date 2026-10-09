import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

export default function Hierarchy() {
  const { nip } = useParams();
  const { data, loading, error, reload } = useFetch(`/organization/hierarchy/${nip}`, [nip]);
  const [depart, setDepart] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const info = data?.info?.[0];

  useEffect(() => {
    if (info) setDepart(info.DepartID ?? '');
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api.put(`/organization/hierarchy/${nip}`, { DEPARTEMEN: depart });
      reload();
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const topCols = [
    { key: 'NIP', label: 'NIP' },
    { key: 'Name', label: 'Nama' },
    { key: 'dep', label: 'Departemen', render: (r) => `[${r.DepartID}] ${r.NamaDepartemen || ''}` },
    { key: 'IdLevel', label: 'IdLevel', render: (r) => r.Level },
    { key: 'LevelName', label: 'Level' },
  ];

  const downCols = [
    { key: 'NIP', label: 'NIP' },
    { key: 'Name', label: 'Nama' },
    { key: 'dep', label: 'Departemen', render: (r) => `[${r.DepartID}] ${r.DepartName || ''}` },
    { key: 'induk', label: 'Depart Induk', render: (r) => `[${r.DepartemenInduk}] ${r.NamaDepartemen || ''}` },
    { key: 'Level', label: 'Level', render: (r) => `[${r.Level}] ${r.LevelName || ''}` },
  ];

  if (loading) return <Page title="Hierarki"><Card><div className="muted">Memuat...</div></Card></Page>;
  if (error) return <Page title="Hierarki"><Card><p className="err">{error}</p></Card></Page>;

  return (
    <Page title="Hierarki">
      <Card title="Identitas">
        {info ? (
          <table style={{ fontSize: 13 }}>
            <tbody>
              <tr><td style={{ paddingRight: 12 }}>Nama</td><td><b>{info.Name}</b></td></tr>
              <tr><td>Jabatan</td><td><b>{info.Jobtitle}</b></td></tr>
              <tr><td>Level</td><td><b>{info.Joblevel} [{info.JobSeq}]</b></td></tr>
              <tr><td>Department</td><td><b>{info.NamaDepartemen} [{info.DepartID}]</b></td></tr>
              <tr><td>Division</td><td><b>{info.DivisionName}</b></td></tr>
            </tbody>
          </table>
        ) : (
          <div className="muted">Tidak ada data.</div>
        )}

        <form className="row" style={{ marginTop: 12 }} onSubmit={save}>
          <div>
            <label>Change Hirarki (Departemen)</label>
            <select value={depart} onChange={(e) => setDepart(e.target.value)} required>
              <option value="">- pilih -</option>
              {(data?.mascos || []).map((k) => (
                <option key={k.deptid} value={k.deptid}>
                  {k.deptid} - {k.NamaDepartemen}
                </option>
              ))}
            </select>
          </div>
          <button disabled={busy}>Simpan</button>
        </form>
        {err && <p className="err">{err}</p>}
      </Card>

      <Card title="Hirarki Atasan Langsung">
        <DataTable columns={topCols} rows={data?.top} />
      </Card>

      <Card title="Hirarki Bawahan Langsung">
        <DataTable columns={downCols} rows={data?.down} />
      </Card>
    </Page>
  );
}
