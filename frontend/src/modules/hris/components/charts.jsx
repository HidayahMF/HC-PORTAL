import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, LabelList,
} from 'recharts';

/** Palet kategorikal (sesuai referensi dashboard). */
export const CAT = ['#0B1F3A', '#22C55E', '#B7F34A', '#F59E0B', '#38BDF8', '#EC4899', '#EF4444', '#8B5CF6'];
export const LIME = '#B7F34A';

const colorAt = (i) => CAT[i % CAT.length];

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-[0_14px_30px_-20px_rgba(11,31,58,.6)]">
      <div className="font-semibold text-navy">{p.payload.label ?? p.name}</div>
      <div className="text-mut">{p.value} karyawan</div>
    </div>
  );
}

export function Donut({ data, height = 210, centerLabel = 'Karyawan' }) {
  const total = data.reduce((a, d) => a + d.total, 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="label"
            innerRadius="66%" outerRadius="96%" paddingAngle={2} stroke="none"
            startAngle={90} endAngle={-270} animationDuration={700}>
            {data.map((d, i) => <Cell key={d.label} fill={colorAt(i)} />)}
          </Pie>
          <Tooltip content={<Tip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[24px] font-extrabold leading-none text-navy">{total}</div>
          <div className="mt-1 text-[11px] text-mut">{centerLabel}</div>
        </div>
      </div>
    </div>
  );
}

/** Bar vertikal dengan label persentase di atas batang (untuk Age's). */
export function VBars({ data, height = 210 }) {
  const total = data.reduce((a, d) => a + d.total, 0) || 1;
  const rows = data.map((d) => ({ ...d, pct: Math.round((d.total / total) * 1000) / 10 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5b6b7f' }} />
        <YAxis hide />
        <Tooltip cursor={{ fill: 'rgba(11,31,58,0.04)' }} content={<Tip />} />
        <Bar dataKey="total" radius={[6, 6, 0, 0]} animationDuration={700}>
          {rows.map((d, i) => <Cell key={d.label} fill={i === 0 ? LIME : CAT[1]} />)}
          <LabelList dataKey="pct" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#0b1f3a' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Bar vertikal kecil untuk KPI (sparkline batang). */
export function MiniBars({ data, color = '#22C55E', height = 40 }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }} aria-hidden="true">
      {data.map((d, i) => (
        <span key={`${d.label}-${i}`} className="w-full rounded-t-[3px]" style={{ height: `${Math.max(10, (d.total / max) * 100)}%`, background: color }} />
      ))}
    </div>
  );
}

/** Legend: dot, label, persentase, jumlah. */
export function Legend({ data, total }) {
  const t = total ?? (data.reduce((a, d) => a + d.total, 0) || 1);
  return (
    <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {data.map((d, i) => (
        <li key={d.label} className="flex items-center gap-2 text-[12px]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorAt(i) }} />
          <span className="flex-1 truncate text-navy">{d.label}</span>
          <span className="tnum text-mut">{((d.total / t) * 100).toFixed(1)}%</span>
          <span className="tnum w-10 text-right font-semibold text-navy">{d.total}</span>
        </li>
      ))}
    </ul>
  );
}

/** Bar tersegmen untuk KPI. */
export function SegmentedBar({ data }) {
  const total = data.reduce((a, d) => a + d.total, 0) || 1;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-soft">
      {data.map((d, i) => (
        <span key={d.label} style={{ width: `${(d.total / total) * 100}%`, background: colorAt(i) }} title={`${d.label}: ${d.total}`} />
      ))}
    </div>
  );
}
