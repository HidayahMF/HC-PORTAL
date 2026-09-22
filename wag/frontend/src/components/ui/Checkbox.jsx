import { useId } from "react";
import Icon from "./Icon";

export default function Checkbox({ checked, onChange, label, disabled, className = "", ...rest }) {
  const autoId = useId();
  const checkboxId = autoId;

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-center gap-2.5 select-none ${disabled ? "opacity-50" : "cursor-pointer"} ${className}`}
    >
      <span className="relative inline-flex">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked, e)}
          disabled={disabled}
          className="peer h-[18px] w-[18px] appearance-none rounded-[5px] border-2 border-slate-300 bg-white transition-colors duration-150 checked:border-brand checked:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
          {...rest}
        />
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center peer-checked:flex">
          <Icon name="check" size={12} strokeWidth={3} className="text-white" />
        </span>
      </span>
      {label && <span className="text-sm text-txt">{label}</span>}
    </label>
  );
}
