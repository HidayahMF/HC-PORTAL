import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { AuthUser, Page, Summary } from "../types";
import { ConfirmDialog, ErrorMessage, Spinner } from "../components/States";

const date = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID");

export function Dashboard() {
  const [summary, setSummary] = useState<Summary>();
  const [data, setData] = useState<Page>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [contractNumbers, setContractNumbers] = useState<string[]>([]);
  const [contractNumber, setContractNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser>();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    name: string;
  }>();
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (department) params.set("department", department);
      if (contractNumber) params.set("contractNumber", contractNumber);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const [nextSummary, nextData] = await Promise.all([
        api.summary(),
        api.contracts(params),
      ]);
      setSummary(nextSummary);
      setData(nextData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    api.me().then(({ user: current }) => setUser(current));
    api.contractNumbers().then((values) => {
      setContractNumbers(values);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Gagal memuat nomor kontrak."));
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 280);
    return () => clearTimeout(timer);
  }, [page, search, status, department, contractNumber, startDate, endDate]);
  const remove = async (id: number, name: string) => {
    setPendingDelete({ id, name });
  };
  const confirmRemove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.remove(pendingDelete.id);
      setPendingDelete(undefined);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Kontrak gagal dihapus.",
      );
    } finally {
      setDeleting(false);
    }
  };
  const exportFile = async () => {
    setExporting(true);
    try {
      const blob = await api.exportExcel();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "laporan-kontrak.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Export Excel gagal.",
      );
    } finally {
      setExporting(false);
    }
  };
  const reset = () => {
    setSearch("");
    setStatus("");
    setDepartment("");
    setContractNumber("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };
  const badge = (value: string) =>
    value === "Aktif"
      ? "bg-green-50 text-bmc-success"
      : value === "Segera Berakhir"
        ? "bg-amber-50 text-bmc-warning"
        : value === "Berakhir"
          ? "bg-red-50 text-bmc-error"
          : "bg-gray-100 text-bmc-muted";
  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-bmc-navy">
            Monitoring internal
          </p>
          <h1 className="text-2xl font-semibold">Dashboard Kontrak Karyawan</h1>
          <p className="mt-1 text-sm text-bmc-muted">
            Monitoring periode kontrak karyawan BMC
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportFile} className="btn-secondary">
            <Download size={16} />
            {exporting ? "Mengekspor..." : "Export Excel"}
          </button>
          <Link to="/contracts/new" className="btn-primary">
            <Plus size={16} />
            Input Kontrak
          </Link>
        </div>
      </div>
      {error && (
        <div className="mb-5">
          <ErrorMessage message={error} />
        </div>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Total Kontrak", summary?.total ?? 0],
          ["Aktif", summary?.active ?? 0],
          ["Segera Berakhir", summary?.expiring ?? 0],
          ["Berakhir", summary?.expired ?? 0],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="border border-bmc-border bg-white p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-bmc-muted">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-bmc-navy">{value}</p>
          </div>
        ))}
      </div>
      <section className="mb-6 border border-bmc-border bg-white p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_150px_150px_auto]">
          <label className="relative">
            <Search
              className="absolute left-3 top-3 text-bmc-muted"
              size={16}
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="field pl-9"
              placeholder="Cari nama atau NIP..."
            />
          </label>
          <select
            value={contractNumber}
            onChange={(e) => {
              setContractNumber(e.target.value);
              setPage(1);
            }}
            className="field"
          >
            <option value="">Semua Nomor Kontrak</option>
            {contractNumbers.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="field"
          >
            <option value="">Semua status</option>
            <option>Belum Dimulai</option>
            <option>Aktif</option>
            <option>Segera Berakhir</option>
            <option>Berakhir</option>
            <option>Data belum lengkap</option>
          </select>
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="field"
          >
            <option value="">Semua Departemen</option>
            <option>Produksi</option>
            <option>Maintenance</option>
            <option>Procurement</option>
            <option>Quality</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="field"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="field"
          />
          <button onClick={reset} className="btn-secondary">
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </section>
      {pendingDelete && (
        <ConfirmDialog
          title="Hapus kontrak?"
          message={`Hapus kontrak ${pendingDelete.name}? Data yang dihapus tidak dapat dikembalikan.`}
          onConfirm={confirmRemove}
          onCancel={() => setPendingDelete(undefined)}
          loading={deleting}
        />
      )}
      <section className="border border-bmc-border bg-white">
        {loading ? (
          <div className="p-8">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-bmc-muted">
                <tr>
                  <th className="px-5 py-3">Nama Karyawan</th>
                  <th className="px-5 py-3">NIP</th>
                  <th className="px-5 py-3">Departemen</th>
                  <th className="px-5 py-3">Nomor Kontrak</th>
                  <th className="px-5 py-3">Awal Kontrak</th>
                  <th className="px-5 py-3">Akhir Kontrak</th>
                  <th className="px-5 py-3">Sisa Kontrak</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Diinput Oleh</th>
                  <th className="px-5 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bmc-border">
                {data?.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-medium">
                      {item.employeeName}
                    </td>
                    <td className="px-5 py-4">{item.nip}</td>
                    <td className="px-5 py-4">{item.department || "-"}</td>
                    <td className="px-5 py-4">{item.contractNumber || "-"}</td>
                    <td className="px-5 py-4">{date(item.startDate)}</td>
                    <td className="px-5 py-4">{date(item.endDate)}</td>
                    <td className="px-5 py-4">
                      {item.remainingDays < 0
                        ? `${Math.abs(item.remainingDays)} hari lalu`
                        : `${item.remainingDays} hari`}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold ${badge(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">{item.createdByName}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/contracts/${item.id}`}
                          className="btn-secondary"
                        >
                          <Eye size={15} />
                          Detail
                        </Link>
                        {user?.role === "ADMIN" && (
                          <button
                            onClick={() => remove(item.id, item.employeeName)}
                            className="btn-secondary text-red-700"
                          >
                            <Trash2 size={15} />
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="flex items-center justify-between border-t border-bmc-border px-5 py-3 text-sm text-bmc-muted">
            <span>
              Halaman {data.page} dari {data.totalPages || 1} ({data.total}{" "}
              data)
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="btn-secondary"
              >
                <ChevronLeft size={16} />
                Sebelumnya
              </button>
              <button
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="btn-secondary"
              >
                Berikutnya
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
