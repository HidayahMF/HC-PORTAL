import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";
import LoginPage from "./LoginPage";

function renderLogin(loginMock) {
  return render(
    <AuthContext.Provider value={{ login: loginMock, isAuthenticated: false }}>
      <LoginPage />
    </AuthContext.Provider>
  );
}

describe("LoginPage", () => {
  it("menampilkan pesan error saat NIP kosong", () => {
    renderLogin(vi.fn());
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));
    expect(screen.getByText("NIP wajib diisi")).toBeInTheDocument();
  });

  it("menampilkan pesan error saat password kosong", () => {
    renderLogin(vi.fn());
    fireEvent.change(screen.getByLabelText("NIP"), { target: { value: "0001" } });
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));
    expect(screen.getByText("Password wajib diisi")).toBeInTheDocument();
  });

  it("memanggil login dengan NIP & password", async () => {
    const loginMock = vi.fn().mockResolvedValue({});
    renderLogin(loginMock);

    fireEvent.change(screen.getByLabelText("NIP"), { target: { value: " 0001 " } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "08123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));

    expect(loginMock).toHaveBeenCalledWith({ nip: "0001", password: "08123456789" });
  });

  it("tombol tampilkan/sembunyikan password punya aria-label", () => {
    renderLogin(vi.fn());
    expect(screen.getByRole("button", { name: "Tampilkan password" })).toBeInTheDocument();
  });
});
