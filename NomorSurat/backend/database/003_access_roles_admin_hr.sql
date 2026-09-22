IF OBJECT_ID('dbo.EmployeeAccess', 'U') IS NOT NULL
BEGIN
    UPDATE dbo.EmployeeAccess SET Role = 'HR' WHERE Role = 'SECURITY';
    ALTER TABLE dbo.EmployeeAccess DROP CONSTRAINT IF EXISTS CK_EmployeeAccess_Role;
    ALTER TABLE dbo.EmployeeAccess ADD CONSTRAINT CK_EmployeeAccess_Role CHECK (Role IN ('ADMIN', 'HR'));
END;
