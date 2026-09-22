-- 001: tabel job pengiriman, riwayat delivery, audit log, dan kolom next_run.
-- Semua statement idempotent (IF NOT EXISTS) agar aman dijalankan ulang.

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'message_jobs')
BEGIN
    CREATE TABLE message_jobs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        type NVARCHAR(50) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'queued',
        message NVARCHAR(MAX) NULL,
        recipients NVARCHAR(MAX) NULL,
        file_path NVARCHAR(500) NULL,
        file_mimetype NVARCHAR(100) NULL,
        total_count INT NOT NULL DEFAULT 0,
        success_count INT NOT NULL DEFAULT 0,
        failed_count INT NOT NULL DEFAULT 0,
        created_by_nip NVARCHAR(50) NULL,
        schedule_id INT NULL,
        idempotency_key NVARCHAR(200) NULL,
        error_message NVARCHAR(MAX) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        started_at DATETIME NULL,
        finished_at DATETIME NULL
    );
    CREATE INDEX IX_message_jobs_status ON message_jobs(status);
    CREATE INDEX IX_message_jobs_created_at ON message_jobs(created_at);
END

-- Idempotency key unik (hanya untuk jadwal: mencegah pengiriman ganda per hari).
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_message_jobs_idempotency' AND object_id = OBJECT_ID('message_jobs'))
BEGIN
    CREATE UNIQUE INDEX UQ_message_jobs_idempotency ON message_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'message_deliveries')
BEGIN
    CREATE TABLE message_deliveries (
        id INT IDENTITY(1,1) PRIMARY KEY,
        job_id INT NOT NULL,
        recipient_name NVARCHAR(255) NULL,
        phone NVARCHAR(20) NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'queued',
        attempt INT NOT NULL DEFAULT 1,
        error_code NVARCHAR(50) NULL,
        error_message NVARCHAR(500) NULL,
        queued_at DATETIME NOT NULL DEFAULT GETDATE(),
        started_at DATETIME NULL,
        sent_at DATETIME NULL,
        failed_at DATETIME NULL
    );
    CREATE INDEX IX_message_deliveries_job_id ON message_deliveries(job_id);
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'audit_logs')
BEGIN
    CREATE TABLE audit_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nip NVARCHAR(50) NULL,
        action NVARCHAR(100) NOT NULL,
        target NVARCHAR(255) NULL,
        meta NVARCHAR(MAX) NULL,
        success BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_audit_logs_created_at ON audit_logs(created_at);
END

-- next_run untuk jadwal (kolom sudah ada di beberapa environment; tambah jika belum).
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'scheduled_messages' AND COLUMN_NAME = 'next_run')
BEGIN
    ALTER TABLE scheduled_messages ADD next_run DATETIME NULL;
END
