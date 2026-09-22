export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-bmc-error">
      {message}
    </div>
  );
}
export function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bmc-dark/40 p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md border border-bmc-border bg-white p-6">
        <h2 className="text-lg font-semibold text-bmc-dark">{title}</h2>
        <p className="mt-2 text-sm text-bmc-muted">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary justify-center"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-secondary justify-center text-sm font-semibold text-bmc-error"
          >
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
