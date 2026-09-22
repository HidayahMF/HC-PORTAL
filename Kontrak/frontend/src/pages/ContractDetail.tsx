import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Edit,
  Hash,
  Trash2,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Contract } from "../types";
import { ConfirmDialog, ErrorMessage, Spinner } from "../components/States";

const date = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const statusStyle = (status: string) => {
  if (status === "Aktif") return "bg-green-50 text-bmc-success";
  if (status === "Segera Berakhir") return "bg-amber-50 text-bmc-warning";
  return "bg-red-50 text-bmc-error";
};

export function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Contract>();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    api
      .contract(Number(id))
      .then(setItem)
      .catch((caught) => setError(caught.message));
  }, [id]);

  if (error) return <ErrorMessage message={error} />;
  if (!item) return <Spinner />;

  const remove = async () => {
    setDeleting(true);
    try {
      await api.remove(item.id);
      navigate("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Kontrak gagal dihapus.",
      );
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const remaining =
    item.remainingDays < 0
      ? "Kontrak telah berakhir"
      : `${item.remainingDays} hari`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/dashboard"
        className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-bmc-muted transition hover:text-bmc-navy"
      >
        <ArrowLeft size={16} />
        Kembali ke Dashboard
      </Link>

      <header className="mb-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-bmc-navy">
          Monitoring kontrak
        </p>
        <h1 className="text-2xl font-semibold text-bmc-dark">
          Detail Kontrak Karyawan
        </h1>
        <p className="mt-1 text-sm text-bmc-muted">
          Informasi lengkap mengenai identitas karyawan dan periode kontrak
          kerja.
        </p>
      </header>

      <section className="border border-bmc-border bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-5 border-b border-bmc-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex px-2.5 py-1 text-xs font-semibold ${statusStyle(item.status)}`}
              >
                {item.status}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-bmc-muted">
                <UserRound size={14} />
                NIP {item.nip}
              </span>
            </div>
            <h2 className="break-words text-xl font-semibold text-bmc-dark sm:text-2xl">
              {item.employeeName}
            </h2>
            <p className="mt-1 text-sm text-bmc-muted">
              {item.department || "-"} <span className="px-1">·</span> Karyawan
              BMC
            </p>
          </div>
          <div className="min-w-0 sm:max-w-[280px] sm:text-right">
            <p className="mb-1 text-xs text-bmc-muted">Nomor Kontrak</p>
            <p className="flex items-start gap-2 break-all text-sm font-semibold text-bmc-navy sm:justify-end">
              <Hash size={16} className="mt-0.5 shrink-0" />
              {item.contractNumber || "-"}
            </p>
          </div>
        </div>

        <div className="pt-6">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays size={18} className="text-bmc-gold" />
            <h3 className="text-base font-semibold text-bmc-dark">
              Informasi Kontrak
            </h3>
          </div>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-bmc-muted">Tanggal Awal Kontrak</dt>
              <dd className="mt-1 text-sm font-medium text-bmc-dark">
                {date(item.startDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-bmc-muted">Tanggal Akhir Kontrak</dt>
              <dd className="mt-1 text-sm font-medium text-bmc-dark">
                {date(item.endDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-bmc-muted">Sisa Kontrak</dt>
              <dd className="mt-1 text-sm font-medium text-bmc-dark">
                {remaining}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-bmc-muted">Diinput Oleh</dt>
              <dd className="mt-1 text-sm font-medium text-bmc-dark">
                {item.createdByName || "-"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={() => setConfirmingDelete(true)}
          disabled={deleting}
          className="btn-secondary justify-center text-sm font-semibold text-bmc-error"
        >
          <Trash2 size={16} />
          {deleting ? "Menghapus..." : "Hapus"}
        </button>
        <Link
          to={`/contracts/${item.id}/edit`}
          className="btn-primary justify-center text-sm font-semibold"
        >
          <Edit size={16} />
          Edit Kontrak
        </Link>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title="Hapus kontrak?"
          message={`Hapus data kontrak ${item.employeeName}? Data yang dihapus tidak dapat dikembalikan.`}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
