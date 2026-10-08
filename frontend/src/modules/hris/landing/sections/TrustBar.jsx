import { Reveal } from '../primitives.jsx';

const MODULES = ['People', 'Leave', 'Job Title', 'Department', 'Career Path'];

export default function TrustBar() {
  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-12">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px] font-semibold text-white">
              Dipakai internal oleh departemen Human Capital.
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {MODULES.map((m) => (
                <li key={m} className="text-[13px] font-medium text-white/70">{m}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
