const { config } = require('../config/index.js');

/**
 * Padanan pemanggilan WA gateway di controller lama
 * (file_get_contents(".../api/send.php?token=..&no=..&text=..")).
 * Fire-and-forget: kegagalan notif tidak menggagalkan request utama.
 */
function sendWa(no, text) {
  const url =
    `${config.wa.baseUrl}?token=${encodeURIComponent(config.wa.token)}` +
    `&no=${encodeURIComponent(no)}&text=${encodeURIComponent(text)}`;

  return fetch(url)
    .then((r) => r.text())
    .catch((e) => {
      console.warn('[wa] gagal kirim ke', no, e.message);
      return null;
    });
}

module.exports = { sendWa };
