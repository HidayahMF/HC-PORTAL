CREATE TABLE scheduled_messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    recipients NVARCHAR(MAX) NOT NULL,
    cron_expression NVARCHAR(100) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    last_run DATETIME NULL,
    next_run DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
);
