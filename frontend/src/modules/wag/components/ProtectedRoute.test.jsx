import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

function renderWithAuth(isAuthenticated, children) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthContext.Provider value={{ isAuthenticated, user: null, logout: () => {} }}>
        <Routes>
          <Route path="/" element={<ProtectedRoute>{children}</ProtectedRoute>} />
          <Route path="/wag/login" element={<div>Halaman Login</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
    it("redirect ke /wag/login saat tidak terautentikasi", () => {
    renderWithAuth(false, <div>Konten Terproteksi</div>);
    expect(screen.getByText("Halaman Login")).toBeInTheDocument();
    expect(screen.queryByText("Konten Terproteksi")).not.toBeInTheDocument();
  });

  it("menampilkan konten saat terautentikasi", () => {
    renderWithAuth(true, <div>Konten Terproteksi</div>);
    expect(screen.getByText("Konten Terproteksi")).toBeInTheDocument();
  });
});
