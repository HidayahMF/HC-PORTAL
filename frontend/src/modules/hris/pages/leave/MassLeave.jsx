import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { useFetch } from '../../api/useFetch.js';

const today = () => new Date().toISOString().slice(0, 10);

const columns = [
  { key: 'DATE', label: 'Tanggal' },
  { key: 'LeaveRemark', label: 'Remark' },
];

// Padanan hris/log_massal.php (massal_datatable)
export default function MassLeave() {
  const [DateStart, setDateStart] = useState(today());
  const [DateEnd, setDateEnd] = useState(today());

  const { data, loading, error } = useFetch(
    `/leave/massal?DateStart=${DateStart}&DateEnd=${DateEnd}`,
    [DateStart, DateEnd]
  );

  return (
    <Page title="Tanggal Cuti Besar">
      <Card title="Search">
        <div className="row">
          <div>
            <label>Start</label>
            <DateField value={DateStart} onChange={setDateStart} />
          </div>
          <div>
            <label>End</label>
            <DateField value={DateEnd} onChange={setDateEnd} />
          </div>
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
