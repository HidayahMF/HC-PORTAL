import { useState } from 'react';
import { Page, Card } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

function CompetencyList({ title, items, onPick }) {
  return (
    <Card title={title}>
      {items?.length ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {items.map((it) => (
            <li key={it.IdNeed}>
              <a href="#" onClick={(e) => { e.preventDefault(); onPick(it.IdNeed); }}>
                {it.Descriptions_2}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="muted">Tidak ada data</div>
      )}
    </Card>
  );
}

// Padanan hris/employee_competence.php + competence_detail.php
export default function EmployeeCompetence() {
  const { data, loading, error } = useFetch('/competence/employee');
  const [detail, setDetail] = useState(null);
  const [derr, setDerr] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick(idNeed) {
    setDerr(''); setDetail(null); setBusy(true);
    try {
      const res = await api.get('/competence/detail', { params: { idNeed } });
      setDetail(res.data);
    } catch (e) {
      setDerr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Employee Competence">
      {loading && <p className="muted">Memuat...</p>}
      {error && <p className="err">{error}</p>}
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <CompetencyList title="Kompetensi Inti" items={data?.main_competencies} onPick={pick} />
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <CompetencyList title="Kompetensi Manajerial" items={data?.manajerial_competencies} onPick={pick} />
        </div>
      </div>

      {(busy || derr || detail) && (
        <Card title={detail?.title_competence?.[0]?.Descriptions_2 || 'Detail Kompetensi'}>
          {busy && <p className="muted">Memuat...</p>}
          {derr && <p className="err">{derr}</p>}
          {(detail?.detail_competence || []).map((d, i) => <p key={i}>{d.Descriptions_3}</p>)}
          {detail && !detail.detail_competence?.length && <div className="muted">Tidak ada detail</div>}
          {detail && (
            <button type="button" className="sec" onClick={() => setDetail(null)}>Tutup</button>
          )}
        </Card>
      )}
    </Page>
  );
}
