// E2E frontend (login → dashboard → monitoring → broadcast → schedule → SIM → holidays → logout)
// membutuhkan backend + SQL Server + MySQL yang berjalan (atau mock HTTP penuh).
// Di environment ini tidak tersedia → BLOCKED, bukan mengarang hasil.
console.error(
  "[E2E] BLOCKED: test E2E membutuhkan backend + SQL Server + MySQL + WhatsApp Gateway mock yang berjalan.\n" +
    "[E2E] Lihat docs/DEPLOYMENT.md dan docs/FIX_REPORT.md untuk langkah verifikasi staging."
);
process.exit(2);
