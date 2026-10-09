import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const BLANK = {
  mode: '',
  Id_Seq: '',
  Id_Parent: '',
  Id_Jobtitle: '',
  Tahun: '',
  Title_Plan: '',
  Desc_Plan: '',
  StartDate: '',
  EndDate: '',
  Title_Actual: '',
  Desc_Actual: '',
};

export default function StrategicPlanning() {
  const [params] = useSearchParams();
  const initialId = params.get('id') || '';
  const [nip, setNip] = useState(initialId);
  const [target, setTarget] = useState(
    initialId ? `/manpower/strategic?id=${encodeURIComponent(initialId)}` : ''
  );

  const filter = (e) => {
    e.preventDefault();
    if (!nip) return;
    setTarget(`/manpower/strategic/${encodeURIComponent(nip)}`);
  };

  return (
    <Page title="Perencanaan Strategis">
      <Card title="Filter NIP">
        <form className="row" onSubmit={filter}>
          <div>
            <label>NIP</label>
            <input value={nip} onChange={(e) => setNip(e.target.value)} required />
          </div>
          <button>Lihat</button>
        </form>
      </Card>
      {target && <StrategicView key={target} path={target} />}
    </Page>
  );
}

function StrategicView({ path }) {
  const { data, loading, error, reload } = useFetch(path, [path]);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Card><div className="muted">Memuat...</div></Card>;
  if (error) return <Card><p className="err">{error}</p></Card>;
  if (!data) return null;
  if (data.redirect) return <Navigate to="/hris/manpower/resource" replace />;
  if (!data.person_info) return <Card><div className="muted">Data tidak ditemukan.</div></Card>;

  const info = data.person_info;
  const personPlan = data.person_plan || [];
  const downLinePlan = data.downLine_plan || [];
  const downLine = data.person_downLine || [];

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const openPersonal = () => setForm({ ...BLANK, mode: 'personal-plan' });
  const openDownline = (d) =>
    setForm({ ...BLANK, mode: 'downline-plan', Id_Parent: d.Id_Parent, Id_Jobtitle: d.Id_Jobtitle });
  const openEditPlan = (r) =>
    setForm({
      ...BLANK,
      mode: 'edit-plan',
      Id_Seq: r.Id_Seq,
      Tahun: r.Tahun || '',
      Title_Plan: r.Title_Plan || '',
      Desc_Plan: r.Desc_Plan || '',
      StartDate: r.StartDate || '',
      EndDate: r.EndDate || '',
    });
  const openEditActual = (r) =>
    setForm({
      ...BLANK,
      mode: 'edit-actual',
      Id_Seq: r.Id_Seq,
      Title_Actual: r.Title_Actual || '',
      Desc_Actual: r.Desc_Actual || '',
    });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      if (form.mode === 'personal-plan' || form.mode === 'downline-plan') {
        await api.post('/manpower/strategic?action=save', {
          NIP: info.NIP,
          Tahun: form.Tahun,
          Title_Plan: form.Title_Plan,
          Desc_Plan: form.Desc_Plan,
          Id_Parent: form.mode === 'personal-plan' ? info.Id_Parent : form.Id_Parent,
          Id_Jobtitle: form.mode === 'personal-plan' ? info.Id_Jobtitle : form.Id_Jobtitle,
          StartDate: form.StartDate,
          EndDate: form.EndDate,
        });
      } else if (form.mode === 'edit-plan') {
        await api.post('/manpower/strategic?action=update&to=plan', {
          Id_Seq: form.Id_Seq,
          Tahun: form.Tahun,
          Title_Plan: form.Title_Plan,
          Desc_Plan: form.Desc_Plan,
          StartDate: form.StartDate,
          EndDate: form.EndDate,
        });
      } else if (form.mode === 'edit-actual') {
        await api.post('/manpower/strategic?action=update&to=actual', {
          Id_Seq: form.Id_Seq,
          Title_Actual: form.Title_Actual,
          Desc_Actual: form.Desc_Actual,
        });
      }
      setMsg('Tersimpan');
      setForm(null);
      reload();
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (Id_Seq) => {
    if (!confirm('Hapus planning ini?')) return;
    try {
      await api.post(`/manpower/strategic?action=delete&idseq=${Id_Seq}`);
      reload();
    } catch (ex) {
      setErr(errMsg(ex));
    }
  };

  const planCols = [
    { key: 'Tahun', label: 'Tahun' },
    {
      key: 'plan',
      label: 'Strategic Planning',
      render: (r) => (
        <span>
          <label>{r.Title_Plan}</label>
          <br />
          {r.Desc_Plan}
          {r.StartDate ? <small><br />Plan: {r.StartDate} s/d {r.EndDate}</small> : null}
        </span>
      ),
    },
    {
      key: 'actual',
      label: 'Actual',
      render: (r) =>
        r.Title_Actual ? (
          <span>
            <label>{r.Title_Actual}</label>
            <br />
            {r.Desc_Actual}
          </span>
        ) : (
          <span className="muted">-</span>
        ),
    },
    {
      key: 'act',
      label: 'Action',
      render: (r) => (
        <>
          <button className="sec" onClick={() => openEditPlan(r)}>Edit Plan</button>{' '}
          <button className="sec" onClick={() => openEditActual(r)}>
            {r.Title_Actual ? 'Edit Actual' : 'Add Actual'}
          </button>{' '}
          <button className="danger" onClick={() => remove(r.Id_Seq)}>Delete</button>
        </>
      ),
    },
  ];

  const planForm = form && (
    <Card title={form.mode === 'edit-actual' ? 'Actual' : form.mode.startsWith('edit') ? 'Update Planning' : 'Tambah Planning'}>
      <form className="row" onSubmit={submit}>
        {form.mode === 'edit-actual' ? (
          <>
            <div>
              <label>Strategic Actual (Judul)</label>
              <input value={form.Title_Actual} onChange={set('Title_Actual')} maxLength={150} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Deskripsi</label>
              <textarea value={form.Desc_Actual} onChange={set('Desc_Actual')} maxLength={500} rows={3} required />
            </div>
          </>
        ) : (
          <>
            <div>
              <label>Tahun</label>
              <input value={form.Tahun} onChange={set('Tahun')} required />
            </div>
            <div>
              <label>Strategic Planning (Judul)</label>
              <input value={form.Title_Plan} onChange={set('Title_Plan')} maxLength={150} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Deskripsi</label>
              <textarea value={form.Desc_Plan} onChange={set('Desc_Plan')} maxLength={500} rows={3} required />
            </div>
            <div>
              <label>Tanggal Mulai</label>
              <DateField value={form.StartDate} onChange={(v) => setForm({ ...form, StartDate: v })} />
            </div>
            <div>
              <label>Tanggal Akhir</label>
              <DateField value={form.EndDate} onChange={(v) => setForm({ ...form, EndDate: v })} />
            </div>
          </>
        )}
        <button disabled={busy}>Simpan</button>
        <button type="button" className="sec" onClick={() => setForm(null)}>Batal</button>
      </form>
      {err && <p className="err">{err}</p>}
    </Card>
  );

  return (
    <>
      {planForm}
      {msg && <p className="muted">{msg}</p>}

      <Card title="Personal Info">
        <table style={{ fontSize: 13 }}>
          <tbody>
            <tr><td style={{ paddingRight: 12 }}>NIP</td><td><b>{info.NIP}</b></td></tr>
            <tr><td>Nama</td><td><b>{info.Name}</b></td></tr>
            <tr><td>Divisi</td><td><b>{info.DivisionName}</b></td></tr>
            <tr><td>Departemen</td><td><b>{info.DeptName}</b></td></tr>
            <tr><td>Jabatan</td><td><b>{info.Joblevel}</b></td></tr>
          </tbody>
        </table>
      </Card>

      <Card title="Personal Planning">
        <button onClick={openPersonal} style={{ marginBottom: 8 }}>Tambah</button>
        <DataTable columns={planCols} rows={personPlan} />
      </Card>

      <Card title="Assign Planning">
        {downLine.length ? (
          downLine.map((d) => {
            const rows = downLinePlan.filter((r) => r.Id_Jobtitle === d.Id_Jobtitle);
            return (
              <div key={d.Id_Jobtitle} style={{ marginBottom: 16 }}>
                <h4 style={{ lineHeight: 1.5 }}>
                  {d.Name} [{d.Joblevel}: {d.Jobtitle}]
                </h4>
                <button onClick={() => openDownline(d)} style={{ marginBottom: 8 }}>Tambah</button>
                <DataTable columns={planCols} rows={rows} />
              </div>
            );
          })
        ) : (
          <DataTable columns={planCols} rows={downLinePlan} />
        )}
      </Card>

      {err && !form && <p className="err">{err}</p>}
    </>
  );
}
