import Modal from "./Modal";
import Button from "./Button";
import Icon from "./Icon";

export default function ConfirmDialog({
  open,
  title = "Konfirmasi",
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm" hideCloseButton>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            tone === "danger" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
          }`}
        >
          <Icon name={tone === "danger" ? "alert-triangle" : "info"} size={20} />
        </div>
        <p className="text-sm leading-relaxed text-txt-secondary">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          loading={loading}
          icon={tone === "danger" ? "trash" : undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
