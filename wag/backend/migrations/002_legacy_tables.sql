-- 002: tabel legacy yang sebelumnya dibuat/diubah di request path.
-- Semua statement idempotent (IF NOT EXISTS) agar aman dijalankan ulang.
-- TIDAK menghapus atau mengubah data existing.

-- holidays (sebelumnya dibuat runtime di utils/workingDay.js)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'holidays')
BEGIN
    CREATE TABLE holidays (
        id INT IDENTITY(1,1) PRIMARY KEY,
        holiday_date DATE NOT NULL,
        description NVARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE UNIQUE INDEX UQ_holidays_date ON holidays(holiday_date);
END

-- scheduled_messages.only_working_days (sebelumnya ALTER runtime di request path)
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'scheduled_messages')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'scheduled_messages' AND COLUMN_NAME = 'only_working_days')
    BEGIN
        ALTER TABLE scheduled_messages ADD only_working_days BIT DEFAULT 0;
    END
END

-- simc_config (sebelumnya dibuat + di-seed runtime di simcController.ensureTable)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'simc_config')
BEGIN
    CREATE TABLE simc_config (
        id INT PRIMARY KEY IDENTITY(1,1),
        days_before INT DEFAULT 15,
        send_hour INT DEFAULT 8,
        send_minute INT DEFAULT 0,
        message_template NVARCHAR(MAX),
        is_active BIT DEFAULT 1,
        only_working_days BIT DEFAULT 0,
        last_run DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END

-- Seed default hanya jika tabel kosong (perilaku lama ensureTable).
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'simc_config')
   AND NOT EXISTS (SELECT 1 FROM simc_config)
BEGIN
    INSERT INTO simc_config (days_before, send_hour, send_minute, message_template, is_active, only_working_days)
    VALUES (15, 8, 0, N'Yth. Bapak/Ibu {{nama}},

Kami informasikan bahwa Surat Izin Mengemudi (SIM C) Anda akan habis masa berlakunya pada {{tanggal}}.

Mohon untuk segera memperpanjang SIM C Anda agar tetap dapat berkendara dengan legal.

Terima kasih.', 1, 0);
END

-- sima_config
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'sima_config')
BEGIN
    CREATE TABLE sima_config (
        id INT PRIMARY KEY IDENTITY(1,1),
        days_before INT DEFAULT 15,
        send_hour INT DEFAULT 8,
        send_minute INT DEFAULT 0,
        message_template NVARCHAR(MAX),
        is_active BIT DEFAULT 1,
        only_working_days BIT DEFAULT 0,
        last_run DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'sima_config')
   AND NOT EXISTS (SELECT 1 FROM sima_config)
BEGIN
    INSERT INTO sima_config (days_before, send_hour, send_minute, message_template, is_active, only_working_days)
    VALUES (15, 8, 0, N'Yth. Bapak/Ibu {{nama}},

Kami informasikan bahwa Surat Izin Mengemudi (SIM A) Anda akan habis masa berlakunya pada {{tanggal}}.

Mohon untuk segera memperpanjang SIM A Anda agar tetap dapat berkendara dengan legal.

Terima kasih.', 1, 0);
END

-- pastikan kolom only_working_days ada di tabel config yang sudah ada (environment lama)
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'simc_config')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'simc_config' AND COLUMN_NAME = 'only_working_days')
    BEGIN
        ALTER TABLE simc_config ADD only_working_days BIT DEFAULT 0;
    END
END

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'sima_config')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sima_config' AND COLUMN_NAME = 'only_working_days')
    BEGIN
        ALTER TABLE sima_config ADD only_working_days BIT DEFAULT 0;
    END
END
