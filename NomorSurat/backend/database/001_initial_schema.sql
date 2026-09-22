CREATE TABLE LetterNumbers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    LetterNumber NVARCHAR(300) NOT NULL,
    SequenceNumber INT NOT NULL,
    DepartmentName NVARCHAR(150) NOT NULL,
    LetterType VARCHAR(10) NOT NULL,
    Subject NVARCHAR(500) NOT NULL,
    LetterDate DATE NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LetterNumbers_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_LetterNumbers_LetterNumber UNIQUE (LetterNumber),
    CONSTRAINT CK_LetterNumbers_LetterType CHECK (LetterType IN ('INTERNAL', 'EXTERNAL')),
    CONSTRAINT UQ_LetterNumbers_SequenceNumber UNIQUE (SequenceNumber)
);
CREATE INDEX IX_LetterNumbers_LetterDate ON LetterNumbers(LetterDate);
CREATE INDEX IX_LetterNumbers_DepartmentName ON LetterNumbers(DepartmentName);
CREATE INDEX IX_LetterNumbers_LetterType ON LetterNumbers(LetterType);
