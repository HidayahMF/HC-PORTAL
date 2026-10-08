import { useEffect } from 'react';
import Navbar from './sections/Navbar.jsx';
import Hero from './sections/Hero.jsx';
import TrustBar from './sections/TrustBar.jsx';
import PeopleSection from './sections/PeopleSection.jsx';
import ProductOverview from './sections/ProductOverview.jsx';
import FeatureShowcase from './sections/FeatureShowcase.jsx';
import HumanSection from './sections/HumanSection.jsx';
import AnalyticsSection from './sections/AnalyticsSection.jsx';
import CTA from './sections/CTA.jsx';
import Footer from './sections/Footer.jsx';

export default function LandingPage() {
  // smooth scroll hanya selama landing terbuka; app tetap default
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'smooth';
    return () => { html.style.scrollBehavior = prev; };
  }, []);

  return (
    <div className="lp min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <PeopleSection />
        <ProductOverview />
        <FeatureShowcase />
        <HumanSection />
        <AnalyticsSection />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
