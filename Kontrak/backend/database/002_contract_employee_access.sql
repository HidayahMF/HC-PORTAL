IF OBJECT_ID(N'dbo.ContractEmployeeAccess', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ContractEmployeeAccess (
        NIP VARCHAR(50) NOT NULL PRIMARY KEY,
        Role VARCHAR(30) NOT NULL CONSTRAINT DF_ContractEmployeeAccess_Role DEFAULT 'HC',
        IsActive BIT NOT NULL CONSTRAINT DF_ContractEmployeeAccess_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ContractEmployeeAccess_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ContractEmployeeAccess_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT CK_ContractEmployeeAccess_Role CHECK (Role IN ('ADMIN', 'HC'))
    );
END;
GO

IF EXISTS (SELECT 1 FROM dbo.hris_Employee WHERE NIP = '3490' AND is_Active IN ('1', 'Y', 'TRUE'))
BEGIN
    MERGE dbo.ContractEmployeeAccess AS target
    USING (SELECT '3490' AS NIP, 'ADMIN' AS Role) AS source
    ON target.NIP = source.NIP
    WHEN MATCHED THEN
        UPDATE SET Role = source.Role, IsActive = 1, UpdatedAt = SYSDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (NIP, Role, IsActive) VALUES (source.NIP, source.Role, 1);
END;
GO
