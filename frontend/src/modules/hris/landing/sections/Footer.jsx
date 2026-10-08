const MODULES = ['Manage People', 'Manage Leave', 'Manage Job Title', 'Manage Department', 'Manage Career Path'];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-soft">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
        <div className="grid12 gap-y-12">
          <div className="col-span-4 md:col-span-8 lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy text-[12px] font-extrabold text-lime">HR</span>
              <span className="text-[15px] font-extrabold text-navy">HRIS</span>
            </div>
            <p className="mt-2 text-[12.5px] font-medium text-navy">Human Resources Management System</p>
            <p className="mt-4 max-w-[38ch] text-[13px] text-mut">
              Portal kerja internal departemen Human Capital. Data bersumber dari sistem HRIS yang sama.
            </p>
          </div>

          <div className="col-span-4 md:col-span-8 lg:col-span-7">
            <div className="grid gap-8 sm:grid-cols-2">
              <nav aria-label="Modul">
                <h3 className="text-[12.5px] font-bold uppercase tracking-wide text-navy">Modul</h3>
                <ul className="mt-4 space-y-2.5">
                  {MODULES.map((m) => (
                    <li key={m} className="text-[13px] text-mut">
                      <a href="#features" className="hover:text-navy">{m}</a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div>
                <h3 className="text-[12.5px] font-bold uppercase tracking-wide text-navy">Dukungan</h3>
                <ul className="mt-4 space-y-2.5 text-[13px] text-mut">
                  <li>Tim Human Capital</li>
                  <li>
                    Kontak internal: <span className="text-mut/80">[isi kontak resmi]</span>
                  </li>
                  <li>Kendala akses akun: hubungi admin HRIS</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[12.5px] text-mut">
          <span>© {new Date().getFullYear()} HRIS. Human Resources Management System.</span>
          <span>Penggunaan internal.</span>
        </div>
      </div>
    </footer>
  );
}
