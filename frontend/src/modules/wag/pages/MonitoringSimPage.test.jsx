import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MonitoringSimPage from "./MonitoringSimPage";

const page1Rows = [
  { nama: "Andi", divisi: "Produksi", no_hp: "628110000001", simc_sisa: 5, simc_tgl: "01-09-2026", sima_sisa: null, sima_tgl: null },
  { nama: "Budi", divisi: "HRD", no_hp: "628110000002", simc_sisa: -2, simc_tgl: "01-07-2026", sima_sisa: 40, sima_tgl: "01-10-2026" },
  { nama: "Citra", divisi: "Keuangan", no_hp: "628110000003", simc_sisa: 90, simc_tgl: "01-01-2027", sima_sisa: 20, sima_tgl: "01-12-2026" },
];
const page2Rows = [
  { nama: "Dewi", divisi: "Produksi", no_hp: "628110000004", simc_sisa: 12, simc_tgl: "11-09-2026", sima_sisa: null, sima_tgl: null },
  { nama: "Eko", divisi: "Logistik", no_hp: "628110000005", simc_sisa: null, simc_tgl: null, sima_sisa: 200, sima_tgl: "01-03-2027" },
];

function paginatedResponse(rows, page, totalPages) {
  return Promise.resolve({
    data: { data: rows, total: 5, page, limit: 100, totalPages },
  });
}

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn((_path, config) => {
      const page = config?.params?.page || 1;
      return paginatedResponse(page === 1 ? page1Rows : page2Rows, page, 2);
    }),
  },
}));

import API from "../services/api";

describe("MonitoringSimPage - mengambil semua halaman pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    API.get.mockImplementation((_path, config) => {
      const page = config?.params?.page || 1;
      return paginatedResponse(page === 1 ? page1Rows : page2Rows, page, 2);
    });
  });

  it("menggabungkan semua halaman dan menampilkan seluruh karyawan", async () => {
    render(<MonitoringSimPage />);

    expect(await screen.findByText("Eko")).toBeInTheDocument();
    expect(screen.getByText("Andi")).toBeInTheDocument();
    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.getByText("Citra")).toBeInTheDocument();
    expect(screen.getByText("Dewi")).toBeInTheDocument();

    expect(screen.getByText("5 karyawan")).toBeInTheDocument();
    expect(API.get).toHaveBeenCalledTimes(2);
  });

  it("meminta limit maksimum (100) pada tiap halaman", async () => {
    render(<MonitoringSimPage />);
    await screen.findByText("Eko");

    expect(API.get).toHaveBeenCalledWith("/monitoring/sim", {
      params: { page: 1, limit: 100 },
    });
    expect(API.get).toHaveBeenCalledWith("/monitoring/sim", {
      params: { page: 2, limit: 100 },
    });
  });

  it("hanya satu request bila data muat dalam satu halaman", async () => {
    API.get.mockImplementation(() => paginatedResponse(page1Rows, 1, 1));

    render(<MonitoringSimPage />);
    expect(await screen.findByText("Citra")).toBeInTheDocument();

    expect(API.get).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Eko")).not.toBeInTheDocument();
  });
});
