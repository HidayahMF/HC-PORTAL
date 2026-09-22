import Button from "./Button";
import Icon from "./Icon";

export default function ErrorState({ title = "Gagal memuat data", description = "Terjadi kesalahan saat mengambil data. Silakan coba lagi.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <Icon name="alert-triangle" size={26} />
      </div>
      <h3 className="text-[15px] font-semibold text-txt">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-txt-muted">{description}</p>
      {onRetry && (
        <Button variant="secondary" icon="refresh" className="mt-5" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
