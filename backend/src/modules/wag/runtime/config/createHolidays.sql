CREATE TABLE holidays (
    id INT IDENTITY(1,1) PRIMARY KEY,
    holiday_date DATE NOT NULL,
    description NVARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE UNIQUE INDEX UQ_holidays_date ON holidays(holiday_date);
