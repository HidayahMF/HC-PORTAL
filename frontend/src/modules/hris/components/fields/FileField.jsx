import { useEffect, useRef, useState } from 'react';
import { IcUser } from '../../app/icons.jsx';

/** File picker custom: dropzone + preview, bukan <input type="file"> klasik. */
export default function FileField({ file, onChange, accept = 'image/jpeg', hint = 'JPG, maks 2MB.' }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onChange(f); }}
      className={`flex items-center gap-4 rounded-xl border border-dashed break-normal p-3 transition-colors ${drag ? 'border-lime-600 bg-lime-soft/40' : 'border-line bg-soft/50'}`}
    >
      {preview
        ? <img src={preview} alt="Preview foto" className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-line" />
        : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white text-mut ring-1 ring-line"><IcUser width={22} height={22} /></span>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-navy">{file ? file.name : 'Belum ada foto dipilih'}</div>
        <div className="text-[11.5px] text-mut">{hint} Drag &amp; drop atau pilih file.</div>
      </div>
      <div className="flex shrink-0 gap-2">
        {file && <button type="button" className="btn ghost sm" onClick={() => onChange(null)}>Hapus</button>}
        <button type="button" className="btn sec sm" onClick={() => inputRef.current?.click()}>Pilih Foto</button>
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
    </div>
  );
}
