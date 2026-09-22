import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import BroadcastPage from "./BroadcastPage";
import toast from "react-hot-toast";

const authValue = {
  user: { nama: "Budi", nip: "0001", role: "operator" },
  isAuthenticated: true,
  logout: vi.fn(),
};

function renderBroadcast() {
  return render(
    <AuthContext.Provider value={authValue}>
      <BroadcastPage />
    </AuthContext.Provider>
  );
}

describe("BroadcastPage validasi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tidak menggunakan window.alert untuk validasi pesan kosong", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderBroadcast();
    fireEvent.click(screen.getByRole("button", { name: /Kirim Broadcast/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Pesan tidak boleh kosong."));
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("menampilkan pesan bahwa penerima harus dipilih", async () => {
    renderBroadcast();
    const textarea = screen.getByLabelText("Isi Pesan");
    fireEvent.change(textarea, { target: { value: "Halo semua" } });
    fireEvent.click(screen.getByRole("button", { name: /Kirim Broadcast/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Pilih minimal satu penerima."));
  });

  it("menampilkan mode hanya-lihat untuk role viewer", () => {
    const viewerAuth = { ...authValue, user: { nama: "Budi", nip: "0001", role: "viewer" } };
    render(
      <AuthContext.Provider value={viewerAuth}>
        <BroadcastPage />
      </AuthContext.Provider>
    );
    expect(screen.getByText(/Mode hanya-lihat/)).toBeInTheDocument();
  });
});
