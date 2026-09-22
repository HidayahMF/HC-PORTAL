// Isi placeholder {{key}} pada template pesan dengan data karyawan.
// Key yang tidak ada di data diganti string kosong (perilaku lama).
function fillTemplate(template, data) {
  if (typeof template !== "string") return "";
  const source = data || {};
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = source[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

module.exports = { fillTemplate };
