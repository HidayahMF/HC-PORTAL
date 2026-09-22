import API from "./api";

// Backend /monitoring/sim bersifat paginated (default 50, maks 100/halaman).
// Helper ini mengambil SEMUA halaman lalu menggabungkannya, sehingga halaman
// frontend bisa memproses dataset lengkap (filter/statistik di client).

const PAGE_SIZE = 100; // cap yang diizinkan backend

function extractRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

export async function fetchAllSimEmployees() {
    const first = await API.get("/monitoring/sim", {
        params: { page: 1, limit: PAGE_SIZE },
    });
    const payload = first?.data;
    let rows = extractRows(payload);

    const totalPages = Math.max(1, parseInt(payload?.totalPages, 10) || 1);

    // Batch paralel kecil agar aman terhadap rate limit global (100 req/menit/IP).
    const BATCH = 5;
    for (let start = 2; start <= totalPages; start += BATCH) {
        const pages = [];
        for (let p = start; p < start + BATCH && p <= totalPages; p++) pages.push(p);
        const results = await Promise.all(
            pages.map((p) =>
                API.get("/monitoring/sim", { params: { page: p, limit: PAGE_SIZE } })
            )
        );
        for (const res of results) rows = rows.concat(extractRows(res?.data));
    }

    return rows;
}
