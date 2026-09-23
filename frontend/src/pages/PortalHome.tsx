import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logobmcwithprecision.png';
import nomorSuratLogo from '../assets/NomorSurat (2).png';
import nomorKontrakLogo from '../assets/NomorKontrak.png';
import waGatewayLogo from '../assets/WaGateway.png';

type PortalCard = {
  name: string;
  description: string;
  route: string;
  logo: string;
};

const cards: PortalCard[] = [
  { name: 'Nomor Surat', description: 'Pengajuan dan monitoring nomor surat.', route: '/nomor-surat/', logo: nomorSuratLogo },
  { name: 'Kontrak Karyawan', description: 'Pengelolaan dan monitoring kontrak karyawan.', route: '/kontrak/', logo: nomorKontrakLogo },
  { name: 'WhatsApp Gateway', description: 'Monitoring SIM, broadcast, dan jadwal pesan.', route: '/wag/', logo: waGatewayLogo },
];

export default function PortalHome() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    AOS.init({ duration: reducedMotion ? 0 : 650, easing: 'ease-out-cubic', once: true, offset: reducedMotion ? 0 : 24, disable: reducedMotion });
    return () => AOS.refreshHard();
  }, []);

  return (
    <div className="portal-shell">
      <header className="portal-header" data-aos="fade-down" data-aos-duration="500">
        <div className="portal-header-inner">
          <Link to="/" className="portal-brand" aria-label="HC Portal dashboard">
            <img src={logo} alt="Braja Mukti Cakra" />
            <span className="portal-brand-divider" aria-hidden="true" />
            <span className="portal-brand-name">HC Portal</span>
          </Link>
        </div>
      </header>

      <main className="portal-main">
        <section className="portal-heading" aria-labelledby="portal-title" data-aos="fade-up" data-aos-delay="100">
          <h1 id="portal-title">Aplikasi</h1>
          <p>Pilih layanan yang ingin Anda gunakan.</p>
        </section>

        <section className="portal-grid" aria-label="Aplikasi HC Portal">
          {cards.map(({ name, description, route, logo: cardLogo }, index) => (
            <Link to={route} className="portal-card group" key={name} data-aos="fade-up" data-aos-delay={150 + index * 100}>
              <span className="portal-card-visual">
                <img src={cardLogo} alt={`${name} illustration`} />
              </span>
              <span className="portal-card-copy">
                <span className="portal-card-name">{name}</span>
                <span className="portal-card-description">{description}</span>
              </span>
              <span className="portal-card-action">Buka aplikasi <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" /></span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
