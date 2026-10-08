import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Page, Card, DataTable, LinkButton } from '../../components/ui.jsx';
import EmployeeSearch from '../../components/EmployeeSearch.jsx';
import HierarchyCard from '../../components/HierarchyCard.jsx';
import Select from '../../components/fields/Select.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { IcClose } from '../../app/icons.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { UPLOAD_BASE, errMsg } from '../../api/client.js';

const date = (v) => (v ? String(v).slice(0, 10) : '');
const trim = (s) => String(s ?? '').trim();
const initials = (s = '') => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'HR';
const present = (v) => {
  const s = date(v);
  return !s || s === '1900-01-01' ? 'Present' : s;
};

function Row({ label, value }) {
  return (
    <tr>
      <td>{label}</td>
      <td>:</td>
      <td>{value == null || value === '' ? '-' : value}</td>
    </tr>
  );
}

const EDU_LEVELS = ['SD', 'SMP', 'SMA', 'SMK', 'D3', 'D4', 'S1', 'S2', 'S3'].map((v) => [v, v]);
const RELATIONS = ['Suami', 'Istri', 'Anak', 'Ayah', 'Ibu'].map((v) => [v, v]);
const GENDERS = [['L', 'Laki-laki'], ['P', 'Perempuan']];
const ARCHIVE = [['0', 'Active'], ['1', 'InActive']];
const RECORD_TITLES = { career: 'Add Career', edu: 'Add Edu', tra: 'Add Training', fam: 'Add Family' };

function DateRange({ f, put }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <div className="field" style={{ flex: 1 }}><label>Start Date</label><DateField value={f.StartDate || ''} onChange={put('StartDate')} /></div>
      <div className="field" style={{ flex: 1 }}><label>End Date</label><DateField value={f.EndDate || ''} onChange={put('EndDate')} /></div>
    </div>
  );
}

function AddRecordModal({ type, nip, onClose, onSaved }) {
  const { data: jts } = useFetch('/jobtitles');
  const [f, setF] = useState(
    type === 'career' ? { is_Archive: '0' }
      : type === 'fam' ? { Gender: 'L', FamilyRelation: 'Suami' }
        : {}
  );
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const panelRef = useRef(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const put = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const jtOptions = (jts || []).map((j) => [`${j.Id_Jobtitle}|${j.Jobtitle}`, j.Jobtitle]);
  const jtRow = (jts || []).find((j) => `${j.Id_Jobtitle}|${j.Jobtitle}` === f.Id_Jobtitle);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const payload = { id: type, nip, ...f };
      if (type === 'career') payload.CategoryName = jtRow?.CategoryName || '';
      await api.post('/employees/records', payload);
      onSaved();
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-navy/40 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      onMouseDown={(e) => { if (!panelRef.current?.contains(e.target)) onClose(); }}
    >
      <div className="flex min-h-full items-center justify-center">
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-[0_30px_60px_-30px_rgba(11,31,58,.6)]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="text-[15px] font-bold text-navy">{RECORD_TITLES[type]}</h4>
            <button type="button" onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-transparent text-mut transition-colors hover:bg-soft hover:text-navy"><IcClose width={16} height={16} /></button>
          </div>
          {err ? <p className="err mb-3">{err}</p> : null}
          <form onSubmit={save}>
            {type === 'career' && (
              <>
                <div className="field"><label>Jobtitle</label>
                  <Select searchable value={f.Id_Jobtitle || ''} options={jtOptions} placeholder="-- Choose One --" onChange={put('Id_Jobtitle')} />
                </div>
                <DateRange f={f} put={put} />
                <div className="field"><label>Jobtitle Status</label>
                  <Select value={f.is_Archive} options={ARCHIVE} onChange={put('is_Archive')} />
                </div>
              </>
            )}
            {type === 'edu' && (
              <>
                <div className="field"><label>Education</label>
                  <Select value={f.EducationLevel || ''} options={EDU_LEVELS} placeholder="-- Choose One --" onChange={put('EducationLevel')} />
                </div>
                <div className="field"><label>Institution</label><input value={f.Institution || ''} onChange={set('Institution')} /></div>
                <div className="field"><label>Major</label><input value={f.Major || ''} onChange={set('Major')} /></div>
                <DateRange f={f} put={put} />
              </>
            )}
            {type === 'tra' && (
              <>
                <div className="field"><label>Training Subject</label><input value={f.TrainingSubject || ''} onChange={set('TrainingSubject')} /></div>
                <div className="field"><label>Institution</label><input value={f.Institution || ''} onChange={set('Institution')} /></div>
                <DateRange f={f} put={put} />
                <div className="field"><label>Duration (Days)</label><input value={f.Duration || ''} onChange={set('Duration')} /></div>
              </>
            )}
            {type === 'fam' && (
              <>
                <div className="field"><label>NIK</label><input value={f.NIK || ''} onChange={set('NIK')} /></div>
                <div className="field"><label>Name</label><input value={f.Name || ''} onChange={set('Name')} /></div>
                <div className="field"><label>Gender</label><Select value={f.Gender} options={GENDERS} placeholder="-- Choose One --" onChange={put('Gender')} /></div>
                <div className="field"><label>Birth Place</label><input value={f.BirthPlace || ''} onChange={set('BirthPlace')} /></div>
                <div className="field"><label>Birth Date</label><DateField value={f.BirthDate || ''} onChange={put('BirthDate')} /></div>
                <div className="field"><label>Family Relation</label><Select value={f.FamilyRelation} options={RELATIONS} placeholder="-- Choose One --" onChange={put('FamilyRelation')} /></div>
                <div className="field"><label>Education Level</label><Select value={f.EducationLevel || ''} options={EDU_LEVELS} placeholder="-- Choose One --" onChange={put('EducationLevel')} /></div>
                <div className="field"><label>Major</label><input value={f.Major || ''} onChange={set('Major')} /></div>
              </>
            )}
            <div className="row mt-4" style={{ gap: 8 }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              <button className="btn sec" type="button" onClick={onClose}>Batal</button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function EmployeeProfile() {
  const { nip } = useParams();
  const { data, loading, error, reload } = useFetch(nip ? '/employees/' + nip : '/employees');

  const empNip = data?.emp?.[0]?.NIP;
  const [photoOk, setPhotoOk] = useState(true);
  const [modal, setModal] = useState(null);
  useEffect(() => { setPhotoOk(true); }, [empNip]);

  if (loading) return (
    <Page title="Employee Information">
      <div className="mb-4"><EmployeeSearch /></div>
      <Card><p className="muted">Memuat...</p></Card>
    </Page>
  );
  if (error) return (
    <Page title="Employee Information">
      <div className="mb-4"><EmployeeSearch /></div>
      <Card><p className="err">{error}</p></Card>
    </Page>
  );

  const emp = data?.emp?.[0] || {};
  const car = data?.car || [];
  const edu = data?.edu || [];
  const fam = data?.fam || [];
  const tra = data?.tra || [];
  const exp = data?.exp || [];
  const abs = data?.abs || [];
  const photo = `${UPLOAD_BASE}/hris/Foto/${String(emp.NIP || '').slice(-4)}.jpg`;

  const actions = (
    <>
      <LinkButton to="/hris/employees/new">Tambah Karyawan</LinkButton>
      {emp.NIP ? <LinkButton to={'/hris/employees/' + emp.NIP + '/edit'}>Edit</LinkButton> : null}
    </>
  );
  const add = (type) => (emp.NIP ? (
    <span style={{ alignSelf: 'center' }}>
      <button type="button" className="btn sec sm" onClick={() => setModal(type)}>+ Add</button>
    </span>
  ) : null);

  return (
    <Page title="Employee Information" actions={actions}>
      <div className="mb-4"><EmployeeSearch autoFocus /></div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
      <Card title="Identitas">
        <div className="mb-5 flex flex-col items-center text-center">
          {photoOk && emp.NIP ? (
            <img
              src={photo}
              alt={trim(emp.Name) || 'Foto'}
              onError={() => setPhotoOk(false)}
              className="h-28 w-28 rounded-full object-cover ring-4 ring-soft"
            />
          ) : (
            <span className="grid h-28 w-28 place-items-center rounded-full bg-soft text-[30px] font-extrabold text-navy">
              {initials(emp.Name)}
            </span>
          )}
          <div className="mt-3 text-[17px] font-extrabold text-navy">{trim(emp.Name) || '-'}</div>
          <div className="text-[12.5px] text-mut">{trim(emp.NamaDepartemen) || '-'}</div>
        </div>
        <table className="table">
          <tbody>
            <Row label="NIP" value={emp.NIP} />
            <Row label="NIK" value={emp.NIK} />
            <Row label="Phone" value={emp.Phone} />
            <Row label="Email" value={emp.Email} />
            <Row label="Birth Place" value={emp.BirthPlace} />
            <Row label="Birth Date" value={date(emp.BirthDate)} />
            <Row label="Gender" value={emp.gen || emp.Gender} />
            <Row label="Marital Status" value={emp.marit || emp.MaritalStatus} />
            <Row label="Child" value={emp.Child} />
            <Row label="Religion" value={emp.Religion} />
            <Row label="Status" value={emp.stt || emp.EmployeeStatus} />
            <Row label="NPWP" value={emp.NPWP} />
            <Row label="NRIC" value={emp.NRIC} />
            <Row label="BPJSTK" value={emp.BPJSTK} />
            <Row label="BPJSKS" value={emp.BPJSKS} />
            <Row label="First Working Date" value={date(emp.FirstWorkingDate)} />
            <Row label="Working Date" value={date(emp.WorkingDate)} />
            <Row label="Departemen" value={trim(emp.NamaDepartemen)} />
            <Row label="isActive" value={emp.isActive} />
          </tbody>
        </table>
      </Card>
        </div>
        <div className="lg:col-span-7">
          {emp.NIP ? <HierarchyCard nip={emp.NIP} /> : null}
        </div>
      </div>

      <Card title="Alamat Domisili">
        <table className="table"><tbody>
          <Row label="Address" value={emp.Addressdomisili} />
          <Row label="Kelurahan" value={emp.Keldomisili} />
          <Row label="Kecamatan" value={emp.Kecdomisili} />
          <Row label="Kabupaten/Kota" value={emp.KabKotadomisili} />
          <Row label="Province" value={emp.Provincedomisili} />
        </tbody></table>
      </Card>

      <Card title="Alamat Identitas">
        <table className="table"><tbody>
          <Row label="Address" value={emp.Address} />
          <Row label="Kelurahan" value={emp.Kelurahan} />
          <Row label="Kecamatan" value={emp.Kecamatan} />
          <Row label="Kabupaten/Kota" value={emp.KabupatenKota} />
          <Row label="Postal Code" value={emp.PostalCode} />
          <Row label="Province" value={emp.Province} />
        </tbody></table>
      </Card>

      <Card title="Internal Career" actions={add('career')}>
        <DataTable
          rows={car}
          columns={[
            { key: 'Jobtitle', label: 'Jobtitle' },
            { key: 'Joblevel', label: 'Level' },
            { key: 'StartDate', label: 'Start', render: (r) => date(r.StartDate) },
            { key: 'EndDate', label: 'End', render: (r) => present(r.EndDate) },
            { key: 'CategoryName', label: 'Category' },
            { key: 'stat', label: 'Status' },
          ]}
        />
      </Card>

      <Card title="Education" actions={add('edu')}>
        <DataTable
          rows={edu}
          columns={[
            { key: 'EducationLevel', label: 'Level' },
            { key: 'Institution', label: 'Institution' },
            { key: 'Major', label: 'Major' },
            { key: 'StartDate', label: 'Start', render: (r) => date(r.StartDate) },
            { key: 'EndDate', label: 'End', render: (r) => date(r.EndDate) },
          ]}
        />
      </Card>

      <Card title="Family & Dependant" actions={add('fam')}>
        <DataTable
          rows={fam}
          columns={[
            { key: 'Name', label: 'Name' },
            { key: 'NIK', label: 'NIK' },
            { key: 'Gender', label: 'Gender' },
            { key: 'BirthPlace', label: 'Birth Place' },
            { key: 'BirthDate', label: 'Birth Date', render: (r) => date(r.BirthDate) },
            { key: 'FamilyRelation', label: 'Relation' },
            { key: 'edu', label: 'Education', render: (r) => r.educationLevel || r.EducationLevel },
            { key: 'Major', label: 'Major' },
          ]}
        />
      </Card>

      <Card title="Training" actions={add('tra')}>
        <DataTable
          rows={tra}
          columns={[
            { key: 'Id_EmpTraining', label: 'Id' },
            { key: 'TrainingSubject', label: 'Subject' },
            { key: 'Institution', label: 'Institution' },
            { key: 'StartDate', label: 'Start', render: (r) => date(r.StartDate) },
            { key: 'EndDate', label: 'End', render: (r) => date(r.EndDate) },
            { key: 'Duration', label: 'Duration' },
          ]}
        />
      </Card>

      <Card title="Work Experience">
        <DataTable
          rows={exp}
          columns={[
            { key: 'Company', label: 'Company' },
            { key: 'Jobtitle', label: 'Jabatan' },
            { key: 'Address', label: 'Address' },
            { key: 'Phone', label: 'Phone' },
            { key: 'StartDate', label: 'Start', render: (r) => date(r.StartDate) },
            { key: 'EndDate', label: 'End', render: (r) => date(r.EndDate) },
          ]}
        />
      </Card>

      <Card title="Attendance">
        <DataTable
          rows={abs}
          columns={[
            { key: 'DATETIME', label: 'Date', render: (r) => date(r.DATETIME) },
            { key: 'time', label: 'Time', render: (r) => String(r.DATETIME || '').slice(11, 19) },
            { key: 'SHIFT', label: 'Shift' },
            { key: 'stt', label: 'Status' },
            { key: 'ADDRESS', label: 'Address' },
            { key: 'ACTIVITY', label: 'Activity' },
            { key: 'wf', label: 'WFH/WFO' },
          ]}
        />
      </Card>

      <AnimatePresence>
        {modal ? <AddRecordModal key={modal} type={modal} nip={emp.NIP} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} /> : null}
      </AnimatePresence>
    </Page>
  );
}