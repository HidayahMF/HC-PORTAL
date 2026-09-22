// E2E tidak dapat dijalankan di environment tanpa DB nyata & Docker.
// Script ini sengaja exit non-zero agar jelas bahwa E2E BELUM tervalidasi.
"use strict";

console.error(
  "[E2E] BLOCKED: test E2E membutuhkan environment dengan SQL Server + MySQL + WhatsApp Gateway mock + Docker.\n" +
    "[E2E] Lihat docs/DEPLOYMENT.md dan docs/FIX_REPORT.md untuk langkah verifikasi manual/staging."
);
process.exit(2);
