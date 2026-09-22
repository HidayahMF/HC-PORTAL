import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "./Modal";
import Button from "./Button";

describe("Modal", () => {
  it("tidak merender apa pun saat tertutup", () => {
    render(<Modal open={false} title="Tes" onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("merender dialog dengan aria-modal dan judul", () => {
    render(<Modal open title="Konfirmasi Hapus" onClose={() => {}}>Isi modal</Modal>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Konfirmasi Hapus")).toBeInTheDocument();
    expect(screen.getByText("Isi modal")).toBeInTheDocument();
  });

  it("menutup saat tombol ESC ditekan", () => {
    const onClose = vi.fn();
    render(<Modal open title="Tes" onClose={onClose}>Isi</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("tombol tutup memiliki aria-label", () => {
    render(<Modal open title="Tes" onClose={() => {}}>Isi</Modal>);
    expect(screen.getByRole("button", { name: "Tutup" })).toBeInTheDocument();
  });

  it("menutup saat overlay diklik (default)", () => {
    const onClose = vi.fn();
    render(<Modal open title="Tes" onClose={onClose}>Isi</Modal>);
    // Overlay adalah elemen pertama dengan kelas absolute inset-0.
    const overlay = document.querySelector(".fixed.inset-0.z-50 > div");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("footer menerima tombol aksi", () => {
    const onConfirm = vi.fn();
    render(
      <Modal open title="Tes" onClose={() => {}} footer={<Button onClick={onConfirm}>Simpan</Button>}>
        Isi
      </Modal>
    );
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
