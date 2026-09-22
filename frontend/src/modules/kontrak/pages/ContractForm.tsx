import { FormEvent, useEffect, useState } from "react";
import { Check, Save, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Contract, Employee } from "../types";
import { ErrorMessage, Spinner } from "../components/States";

const date = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("id-ID");

export function ContractForm() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [department, setDepartment] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(edit);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Contract>();

  useEffect(() => {
    if (!edit) return;
    api
      .contract(Number(id))
      .then((value) => {
        setEmployee({
          nip: value.nip,
          name: value.employeeName,
          department: value.department,
        });
        setQuery(`${value.employeeName} (${value.nip})`);
        setDepartment(value.department ?? "");
        setContractNumber(value.contractNumber ?? "");
        setStart(value.startDate);
        setEnd(value.endDate);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Kontrak gagal dimuat.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id, edit]);

  useEffect(() => {
    if (edit || !start) {
      if (!edit) setContractNumber("");
      return;
    }
    api
      .nextContractNumber(start)
      .then((value) => setContractNumber(value.contractNumber))
      .catch(() => setContractNumber(""));
  }, [edit, start]);

  useEffect(() => {
    if (!query.trim() || edit) return setResults([]);
    const timer = setTimeout(
      () =>
        api
          .employees(query)
          .then(setResults)
          .catch(() => setResults([])),
      280,
    );
    return () => clearTimeout(timer);
  }, [query, edit]);

  const selectEmployee = (value: Employee) => {
    setEmployee(value);
    setDepartment(value.department ?? "");
    setQuery(`${value.name} (${value.nip})`);
    setResults([]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!employee || !start || !end) {
      setError("Nama karyawan, tanggal awal, dan tanggal akhir wajib diisi.");
      return;
    }
    if (end < start) {
      setError("Tanggal akhir tidak boleh lebih kecil dari tanggal awal.");
      return;
    }
    setSaving(true);
    try {
      const input = { nip: employee.nip, startDate: start, endDate: end };
      const value = edit
        ? await api.update(Number(id), {
            ...input,
            department: department || undefined,
            contractNumber: contractNumber || undefined,
          })
        : await api.create(input);
      if (edit) navigate(`/contracts/${id}`);
      else setCreated(value);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Data kontrak gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (created)
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-green-50 text-bmc-success">
            <Check size={19} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Kontrak Berhasil Disimpan</h1>
            <p className="text-sm text-bmc-muted">
              Data telah tersimpan di sistem.
            </p>
          </div>
        </div>
        <div className="border border-bmc-border bg-white p-6 sm:p-8">
          <dl className="grid gap-5 border-b border-bmc-border pb-6 sm:grid-cols-2">
            <div>
              <dt className="label">Nama</dt>
              <dd>{created.employeeName}</dd>
            </div>
            <div>
              <dt className="label">NIP</dt>
              <dd>{created.nip}</dd>
            </div>
            <div>
              <dt className="label">Departemen</dt>
              <dd>{created.department || "-"}</dd>
            </div>
            <div>
              <dt className="label">Nomor Kontrak</dt>
              <dd>{created.contractNumber || "-"}</dd>
            </div>
            <div>
              <dt className="label">Awal Kontrak</dt>
              <dd>{date(created.startDate)}</dd>
            </div>
            <div>
              <dt className="label">Akhir Kontrak</dt>
              <dd>{date(created.endDate)}</dd>
            </div>
          </dl>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary mt-6"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-bmc-navy">
          Administrasi kontrak
        </p>
        <h1 className="text-2xl font-semibold">
          {edit ? "Edit Kontrak" : "Input Kontrak"}
        </h1>
        <p className="mt-1 text-sm text-bmc-muted">
          Departemen diambil otomatis dari HRIS. Nomor kontrak dibuat otomatis
          oleh sistem.
        </p>
      </div>
      {error && (
        <div className="mb-5">
          <ErrorMessage message={error} />
        </div>
      )}
      <form
        onSubmit={submit}
        className="space-y-5 border border-bmc-border bg-white p-6 sm:p-8"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Nama Karyawan / NIP
          </span>
          <div className="relative">
            <Search
              className="absolute left-3 top-3 text-bmc-muted"
              size={16}
            />
            <input
              value={query}
              disabled={edit}
              onChange={(event) => {
                setQuery(event.target.value);
                setEmployee(null);
              }}
              className="field pl-9"
              placeholder="Cari nama atau NIP..."
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full border border-bmc-border bg-white">
                {results.map((item) => (
                  <button
                    type="button"
                    key={item.nip}
                    onClick={() => selectEmployee(item)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-bmc-surface"
                  >
                    {item.name} ({item.nip})
                    {item.department ? ` - ${item.department}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">NIP</span>
            <input
              value={employee?.nip ?? ""}
              readOnly
              className="field bg-gray-50"
              placeholder="Pilih karyawan"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Departemen (HRIS)
            </span>
            <input
              value={department || "-"}
              readOnly
              className="field bg-gray-50"
              placeholder="Departemen HRIS"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Nomor Kontrak (otomatis)
          </span>
          <input
            value={contractNumber || "Pilih tanggal awal untuk membuat nomor"}
            readOnly
            className="field bg-gray-50"
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Tanggal Awal Kontrak
            </span>
            <input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="field"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Tanggal Akhir Kontrak
            </span>
            <input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="field"
            />
          </label>
        </div>
        <button
          disabled={saving || (!edit && !contractNumber)}
          className="btn-primary"
        >
          <Save size={16} />
          {saving ? "Menyimpan..." : "Simpan Kontrak"}
        </button>
      </form>
    </div>
  );
}
