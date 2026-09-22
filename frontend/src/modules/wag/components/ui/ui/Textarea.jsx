import { useId } from "react";

const baseCls =
  "w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-txt placeholder:text-txt-placeholder outline-none transition-all duration-150 focus:border-brand focus:ring-4 focus:ring-brand/10 resize-y disabled:bg-surface-muted disabled:cursor-not-allowed";

export default function Textarea({
  label,
  hint,
  error,
  rows = 4,
  charCount,
  maxLength,
  id,
  className = "",
  ...rest
}) {
  const autoId = useId();
  const textareaId = id || autoId;
  const showCounter = typeof charCount === "number";

  return (
    <div className={className}>
      {label && (
        <label htmlFor={textareaId} className="mb-1.5 block text-[13px] font-medium text-txt-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          id={textareaId}
          rows={rows}
          maxLength={maxLength}
          className={`${baseCls} ${showCounter ? "pb-8" : ""} ${error ? "border-danger focus:border-danger focus:ring-danger/10" : ""}`}
          {...rest}
        />
        {showCounter && (
          <span
            className={`pointer-events-none absolute bottom-2 right-3 font-mono text-[11px] ${
              maxLength && charCount > maxLength ? "text-danger" : "text-txt-placeholder"
            }`}
          >
            {charCount}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-txt-muted">{hint}</p>
      ) : null}
    </div>
  );
}
