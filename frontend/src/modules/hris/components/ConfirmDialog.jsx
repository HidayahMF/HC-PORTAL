import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

function WarnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 9.5v5" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}

/** Dialog konfirmasi (pengganti window.confirm). */
export default function ConfirmDialog({
  open,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null);
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-navy/40 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          onMouseDown={(e) => { if (!panelRef.current?.contains(e.target)) onCancel(); }}
        >
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_30px_60px_-30px_rgba(11,31,58,.6)]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fbeaea] text-[#b91c1c]">
                <WarnIcon />
              </span>
              <div className="min-w-0 pt-0.5">
                <h4 className="text-[15px] font-bold text-navy">{title}</h4>
                {message ? <p className="mt-1 text-[13px] leading-relaxed text-mut">{message}</p> : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn sec" onClick={onCancel}>{cancelLabel}</button>
              <button
                type="button"
                className="btn"
                style={{ background: '#b91c1c' }}
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? 'Memproses...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
