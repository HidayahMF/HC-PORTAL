import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn((path) => {
      if (path === "/health") {
        return Promise.resolve({
          data: { status: "ok", services: { backend: "ok", sqlServer: "ok", mysql: "ok", whatsappGateway: "not_configured" } },
        });
      }
      if (path === "/monitoring/sim") {
        // Bentuk baru: paginated { data, total, page, limit, totalPages }.
        return Promise.resolve({
          data: {
            data: [
              { nama: "Budi", divisi: "Produksi", no_hp: "0811", simc_sisa: 5, simc_tgl: "2026-08-01", sima_sisa: 60, sima_tgl: "2027-01-01" },
              { nama: "Ani", divisi: "HRD", no_hp: "0812", simc_sisa: -2, simc_tgl: "2026-07-01" },
              { nama: "Citra", divisi: "Keuangan", no_hp: "0813", simc_sisa: 45, simc_tgl: "2027-03-01", sima_sisa: 20, sima_tgl: "2026-09-01" },
            ],
            total: 3,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        });
      }
      if (path === "/scheduled-messages") {
        return Promise.resolve({
          data: [
            { id: 1, name: "Pesan Harian", message: "Halo", recipients: [{ id: "a", nama: "Budi" }], cron_expression: "0 8 * * *", is_active: true, next_run: "2026-08-20T08:00:00" },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    }),
  },
}));

import Dashboard from "./Dashboard";
import API from "../services/api";

const authValue = {
  user: { nama: "Budi", nip: "0001", role: "operator" },
  isAuthenticated: true,
  logout: vi.fn(),
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <Dashboard />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Dashboard overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menampilkan sapaan dengan nama user dan badge role", async () => {
    renderDashboard();
    expect(await screen.findByText(/Selamat datang kembali, Budi/)).toBeInTheDocument();
    expect(screen.getByText("Operator")).toBeInTheDocument();
  });

  it("menampilkan statistik SIM dari data monitoring", async () => {
    renderDashboard();
    // total 3 karyawan, 1 expired, 1 mendesak (5 hari), 1 aman (min 45 & 20 → 20 = perhatian, bukan aman)
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("SIM Expired")).toBeInTheDocument();
  });

  it("menampilkan aksi cepat ke halaman terkait", async () => {
    renderDashboard();
    expect(await screen.findByText("Broadcast")).toBeInTheDocument();
    expect(screen.getByText("Monitoring SIM")).toBeInTheDocument();
    expect(screen.getByText("Buat Jadwal")).toBeInTheDocument();
  });

  it("menampilkan jadwal pesan terbaru", async () => {
    renderDashboard();
    expect(await screen.findByText("Pesan Harian")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });

  it("health 503 dengan detail layanan → tampil Degradasi, bukan 'tidak tersedia'", async () => {
    // Simulasi axios: tanpa validateStatus, status 503 akan reject;
    // dengan validateStatus: () => true (yang dipakai Dashboard), 503 resolve.
    API.get.mockImplementationOnce((_path, config) => {
      const allow = config?.validateStatus || ((s) => s >= 200 && s < 300);
      const body = {
        data: { status: "degraded", services: { backend: "ok", sqlServer: "ok", mysql: "error", whatsappGateway: "ok" } },
      };
      return allow(503) ? Promise.resolve(body) : Promise.reject({ response: body });
    });

    renderDashboard();
    expect(await screen.findByText("Degradasi")).toBeInTheDocument();
    expect(screen.getByText("Bermasalah")).toBeInTheDocument();
    expect(screen.queryByText("Status layanan tidak tersedia.")).not.toBeInTheDocument();
  });
});
