IF OBJECT_ID('dbo.LetterNumbers', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.LetterNumbers', 'LetterYear') IS NULL
        ALTER TABLE dbo.LetterNumbers ADD LetterYear AS (DATEPART(YEAR, LetterDate)) PERSISTED;

    ALTER TABLE dbo.LetterNumbers DROP CONSTRAINT IF EXISTS UQ_LetterNumbers_SequenceNumber;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_LetterNumbers_SequenceYear' AND object_id = OBJECT_ID('dbo.LetterNumbers'))
        ALTER TABLE dbo.LetterNumbers ADD CONSTRAINT UQ_LetterNumbers_SequenceYear UNIQUE (SequenceNumber, LetterYear);
END;
