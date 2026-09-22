IF COL_LENGTH(N'dbo.EmployeeContracts', N'DepartmentSnapshot') IS NULL
    ALTER TABLE dbo.EmployeeContracts ADD DepartmentSnapshot NVARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.EmployeeContracts', N'ContractNumber') IS NULL
    ALTER TABLE dbo.EmployeeContracts ADD ContractNumber VARCHAR(100) NULL;
