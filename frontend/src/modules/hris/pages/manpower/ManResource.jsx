import { Page, Card, LinkButton } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

export default function ManResource() {
  const { data, loading, error } = useFetch('/manpower/resource');

  return (
    <Page
      title={data?.title || 'Man Resource'}
      actions={<LinkButton to="/hris/manpower/resource/detail">Detail</LinkButton>}
    >
      <Card>
        {loading && <div className="muted">Memuat...</div>}
        {error && <p className="err">{error}</p>}
        {data && (
          <div style={{ overflowX: 'auto' }}>
            <table className="dtable" style={{ width: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: 150 }} />
              </colgroup>
              <colgroup dangerouslySetInnerHTML={{ __html: data.tableHead_Lv2_col }} />
              <colgroup>
                <col style={{ width: 80 }} />
              </colgroup>
              <thead>
                <tr
                  dangerouslySetInnerHTML={{
                    __html:
                      '<th rowspan="2">No</th><th rowspan="2">Jabatan</th>' +
                      data.tableHead_Lv1 +
                      '<th rowspan="2">TOTAL</th>',
                  }}
                />
                <tr dangerouslySetInnerHTML={{ __html: data.tableHead_Lv2 }} />
              </thead>
              <tbody dangerouslySetInnerHTML={{ __html: data.tableBody }} />
              <tfoot>
                <tr
                  dangerouslySetInnerHTML={{
                    __html: '<th colspan="2">TOTAL</th>' + data.tableFooter,
                  }}
                />
              </tfoot>
            </table>
          </div>
        )}
        <p className="muted">
          Catatan: klik angka pada tabel untuk membuka detail; tautan Detail di kanan atas menuju
          halaman /manpower/resource/detail.
        </p>
      </Card>
    </Page>
  );
}
