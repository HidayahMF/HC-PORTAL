"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { mockModule, clearModule } = require("../helpers/mockModule");
const { scriptedDb } = require("../helpers/fakeDb");

const DB_PATH = path.join(__dirname, "../../config/db.js");

function inputValue(inputs, name) {
  const found = inputs.find((i) => i.name === name);
  return found ? found.value : undefined;
}

function makeJobRow(inputs, overrides = {}) {
  return {
    id: 1,
    type: inputValue(inputs, "type"),
    status: inputValue(inputs, "status"),
    message: inputValue(inputs, "message"),
    recipients: inputValue(inputs, "recipients"),
    file_path: inputValue(inputs, "file_path"),
    file_mimetype: inputValue(inputs, "file_mimetype"),
    total_count: inputValue(inputs, "total_count"),
    created_by_nip: inputValue(inputs, "created_by_nip"),
    schedule_id: inputValue(inputs, "schedule_id"),
    idempotency_key: inputValue(inputs, "idempotency_key"),
    error_message: null,
    created_at: new Date(),
    started_at: null,
    finished_at: null,
    success_count: 0,
    failed_count: 0,
    ...overrides,
  };
}

// State shared stub — diubah per test; modul jobQueueService hanya di-require sekali.
const state = { dupJob: null, calls: null };

function freshCalls() {
  return { jobInserts: 0, deliveries: [], dupChecks: 0, lastJobInputs: null };
}

const db = scriptedDb([
  {
    match: /INSERT INTO message_jobs/,
    result: (inputs) => {
      state.calls.jobInserts++;
      state.calls.lastJobInputs = inputs;
      return { recordset: [makeJobRow(inputs)] };
    },
  },
  {
    match: /INSERT INTO message_deliveries/,
    result: (inputs) => {
      state.calls.deliveries.push(inputs);
      return { recordset: [] };
    },
  },
  {
    match: /FROM message_jobs[\s\S]*idempotency_key/,
    result: () => {
      state.calls.dupChecks++;
      return state.dupJob ? { recordset: [state.dupJob] } : { recordset: [] };
    },
  },
]);

before(() => {
  mockModule(DB_PATH, db);
  state.calls = freshCalls();
});

after(() => {
  clearModule(DB_PATH);
});

let createJob;

before(() => {
  ({ createJob } = require("../../services/jobQueueService"));
});

const BASE_RECIPIENTS = [
  { id: "a", nama: "Andi", no_hp: "08123456789" },
  { id: "b", nama: "Budi", no_hp: "62812345678" },
];

test("createJob: broadcast membuat job + delivery untuk tiap penerima unik", async () => {
  state.calls = freshCalls();
  const job = await createJob({
    type: "broadcast",
    message: "Pesan uji",
    recipients: BASE_RECIPIENTS,
    createdByNip: "0001",
  });

  assert.strictEqual(job.id, 1);
  assert.strictEqual(job.total_count, 2);
  assert.strictEqual(state.calls.jobInserts, 1);
  assert.strictEqual(state.calls.deliveries.length, 2);
});

test("createJob: penerima duplikat (nomor sama) dikirim satu kali saja", async () => {
  state.calls = freshCalls();
  const job = await createJob({
    type: "broadcast",
    message: "Pesan uji",
    recipients: [
      { nama: "A", no_hp: "08123456789" },
      { nama: "B", no_hp: "628123456789" }, // nomor yang sama, format beda
    ],
    createdByNip: "0001",
  });

  assert.strictEqual(job.total_count, 1);
  assert.strictEqual(state.calls.deliveries.length, 1);
  assert.strictEqual(inputValue(state.calls.deliveries[0], "phone"), "628123456789");
});

test("createJob: semua no_hp kosong → error, tidak ada job dibuat", async () => {
  state.calls = freshCalls();
  await assert.rejects(
    () => createJob({ type: "broadcast", message: "x", recipients: [{ no_hp: "" }, { no_hp: null }] }),
    /Tidak ada nomor HP valid/
  );
  assert.strictEqual(state.calls.jobInserts, 0);
});

test("createJob: nomor invalid non-kosong tetap dicatat sebagai delivery (untuk history gagal)", async () => {
  state.calls = freshCalls();
  const job = await createJob({
    type: "broadcast",
    message: "x",
    recipients: [{ nama: "A", no_hp: "08123456789" }, { nama: "B", no_hp: "12" }],
  });

  assert.strictEqual(job.total_count, 2);
  assert.strictEqual(state.calls.deliveries.length, 2);
});

test("createJob: message kosong → error", async () => {
  state.calls = freshCalls();
  await assert.rejects(
    () => createJob({ type: "broadcast", message: "  ", recipients: BASE_RECIPIENTS }),
    /message wajib/
  );
});

test("createJob: idempotency key jadwal dipakai apa adanya", async () => {
  state.calls = freshCalls();
  await createJob({
    type: "scheduled",
    message: "Pesan jadwal",
    recipients: BASE_RECIPIENTS,
    scheduleId: 5,
    idempotencyKey: "scheduled-5-2026-08-18",
  });

  assert.strictEqual(inputValue(state.calls.lastJobInputs, "idempotency_key"), "scheduled-5-2026-08-18");
  assert.strictEqual(inputValue(state.calls.lastJobInputs, "schedule_id"), 5);
  // Job jadwal TIDAK lewat deteksi duplikat broadcast.
  assert.strictEqual(state.calls.dupChecks, 0);
});

test("createJob: broadcast duplikat dalam jendela waktu → job lama dikembalikan, tanpa INSERT baru", async () => {
  state.calls = freshCalls();
  state.dupJob = { id: 99, type: "broadcast", status: "running", total_count: 2 };

  const job = await createJob({
    type: "broadcast",
    message: "Pesan duplikat",
    recipients: BASE_RECIPIENTS,
    createdByNip: "0001",
  });

  assert.strictEqual(job.id, 99);
  assert.strictEqual(state.calls.jobInserts, 0);
  assert.strictEqual(state.calls.dupChecks, 1);
});
