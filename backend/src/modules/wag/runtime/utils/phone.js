// Utilitas nomor HP tunggal untuk seluruh codebase.
// Mempertahankan perilaku lama (62xx): nomor lokal 08... / 8... dinormalisasi ke 62...

// Normalisasi: buang semua non-digit, lalu konversi awalan 0/8 menjadi 62.
// Mengembalikan string digit atau "" jika input kosong/tidak bisa dinormalisasi.
function normalizePhone(phone) {
  if (phone === undefined || phone === null) return "";
  let cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  else if (cleaned.startsWith("8")) cleaned = "62" + cleaned;
  return cleaned;
}

// Validasi nomor yang sudah (atau belum) dinormalisasi.
// Aturan lama: minimal 10 digit, maksimal 15 digit — disarankan format internasional 62xx.
function validatePhone(phone) {
  const cleaned = normalizePhone(phone);
  if (!cleaned) return { valid: false, reason: "empty" };
  if (cleaned.length < 10) return { valid: false, reason: "too_short" };
  if (cleaned.length > 15) return { valid: false, reason: "too_long" };
  if (!cleaned.startsWith("62")) return { valid: false, reason: "not_international" };
  return { valid: true, phone: cleaned };
}

module.exports = { normalizePhone, validatePhone };
