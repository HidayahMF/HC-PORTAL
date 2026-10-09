import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

const columns = [
  { key: 'TrainingSubject', label: 'Subject' },
  { key: 'Institution', label: 'Institution' },
  { key: 'emp', label: 'Employee' },
];

// Padanan hris/trainingBA.php
export default function TrainingSummary() {
  const { data, loading, error } = useFetch('/training/summary');
  return (
    <Page title="Pelatihan">
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={data?.tra || []} />
      </Card>
    </Page>
  );
}
