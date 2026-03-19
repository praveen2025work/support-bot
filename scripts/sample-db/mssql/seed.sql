-- ═══════════════════════════════════════════════════════
-- Sample MSSQL Database — SampleDB
-- Tables: Employees, Departments, Products, Orders, OrderItems
-- Stored Procedure: GetEmployeesByDepartment, GetOrderSummary
-- ═══════════════════════════════════════════════════════

-- Create database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SampleDB')
BEGIN
    CREATE DATABASE SampleDB;
END
GO

USE SampleDB;
GO

-- ── Departments ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Departments' AND xtype='U')
BEGIN
    CREATE TABLE Departments (
        DepartmentId INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(100) NOT NULL,
        Location NVARCHAR(100),
        Budget DECIMAL(15,2),
        CreatedAt DATETIME2 DEFAULT GETDATE()
    );

    INSERT INTO Departments (Name, Location, Budget) VALUES
        ('Engineering', 'San Francisco', 2500000.00),
        ('Marketing', 'New York', 1200000.00),
        ('Sales', 'Chicago', 1800000.00),
        ('Human Resources', 'San Francisco', 800000.00),
        ('Finance', 'New York', 950000.00),
        ('Operations', 'Austin', 1100000.00);
END
GO

-- ── Employees ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Employees' AND xtype='U')
BEGIN
    CREATE TABLE Employees (
        EmployeeId INT PRIMARY KEY IDENTITY(1,1),
        FirstName NVARCHAR(50) NOT NULL,
        LastName NVARCHAR(50) NOT NULL,
        Email NVARCHAR(100) UNIQUE,
        DepartmentId INT FOREIGN KEY REFERENCES Departments(DepartmentId),
        Title NVARCHAR(100),
        Salary DECIMAL(10,2),
        HireDate DATE,
        IsActive BIT DEFAULT 1
    );

    INSERT INTO Employees (FirstName, LastName, Email, DepartmentId, Title, Salary, HireDate) VALUES
        ('Alice', 'Johnson', 'alice.johnson@sample.com', 1, 'Senior Engineer', 145000.00, '2021-03-15'),
        ('Bob', 'Smith', 'bob.smith@sample.com', 1, 'Staff Engineer', 175000.00, '2019-07-01'),
        ('Carol', 'Williams', 'carol.williams@sample.com', 2, 'Marketing Manager', 120000.00, '2020-01-10'),
        ('David', 'Brown', 'david.brown@sample.com', 3, 'Sales Director', 155000.00, '2018-11-20'),
        ('Eva', 'Davis', 'eva.davis@sample.com', 1, 'Junior Engineer', 95000.00, '2023-06-01'),
        ('Frank', 'Miller', 'frank.miller@sample.com', 4, 'HR Specialist', 85000.00, '2022-02-14'),
        ('Grace', 'Wilson', 'grace.wilson@sample.com', 5, 'Financial Analyst', 110000.00, '2021-09-05'),
        ('Henry', 'Moore', 'henry.moore@sample.com', 3, 'Sales Representative', 75000.00, '2023-01-15'),
        ('Iris', 'Taylor', 'iris.taylor@sample.com', 2, 'Content Strategist', 95000.00, '2022-08-20'),
        ('Jack', 'Anderson', 'jack.anderson@sample.com', 6, 'Operations Manager', 125000.00, '2020-04-01'),
        ('Karen', 'Thomas', 'karen.thomas@sample.com', 1, 'DevOps Engineer', 135000.00, '2021-11-10'),
        ('Leo', 'Jackson', 'leo.jackson@sample.com', 5, 'Senior Accountant', 105000.00, '2019-05-22'),
        ('Mia', 'White', 'mia.white@sample.com', 3, 'Account Executive', 90000.00, '2022-07-01'),
        ('Nathan', 'Harris', 'nathan.harris@sample.com', 6, 'Logistics Coordinator', 72000.00, '2023-03-10'),
        ('Olivia', 'Martin', 'olivia.martin@sample.com', 4, 'HR Director', 140000.00, '2017-09-15');
END
GO

-- ── Products ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Products' AND xtype='U')
BEGIN
    CREATE TABLE Products (
        ProductId INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(150) NOT NULL,
        Category NVARCHAR(50),
        Price DECIMAL(10,2),
        StockQuantity INT DEFAULT 0,
        IsAvailable BIT DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT GETDATE()
    );

    INSERT INTO Products (Name, Category, Price, StockQuantity) VALUES
        ('Enterprise License', 'Software', 4999.99, 999),
        ('Professional License', 'Software', 1999.99, 999),
        ('Basic License', 'Software', 499.99, 999),
        ('Premium Support (Annual)', 'Service', 2500.00, 100),
        ('Standard Support (Annual)', 'Service', 1200.00, 200),
        ('Onboarding Package', 'Service', 5000.00, 50),
        ('API Add-on', 'Software', 799.99, 999),
        ('Analytics Dashboard', 'Software', 1499.99, 999),
        ('Custom Integration', 'Service', 15000.00, 20),
        ('Training Workshop', 'Service', 3500.00, 30);
END
GO

-- ── Orders ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Orders' AND xtype='U')
BEGIN
    CREATE TABLE Orders (
        OrderId INT PRIMARY KEY IDENTITY(1,1),
        CustomerName NVARCHAR(100) NOT NULL,
        CustomerEmail NVARCHAR(100),
        OrderDate DATETIME2 DEFAULT GETDATE(),
        Status NVARCHAR(20) DEFAULT 'Pending',
        TotalAmount DECIMAL(12,2)
    );

    INSERT INTO Orders (CustomerName, CustomerEmail, OrderDate, Status, TotalAmount) VALUES
        ('Acme Corp', 'purchasing@acme.com', '2025-01-15', 'Completed', 7499.98),
        ('TechStart Inc', 'admin@techstart.io', '2025-02-20', 'Completed', 3199.98),
        ('Global Finance', 'ops@globalfin.com', '2025-03-01', 'Processing', 22499.99),
        ('HealthPlus', 'it@healthplus.org', '2025-03-10', 'Pending', 6499.99),
        ('EduLearn', 'tech@edulearn.com', '2025-03-15', 'Completed', 1699.98),
        ('RetailMax', 'systems@retailmax.com', '2025-02-28', 'Shipped', 9999.98),
        ('CloudOps Ltd', 'devops@cloudops.io', '2025-03-05', 'Completed', 4799.98),
        ('DataDriven Co', 'cto@datadriven.co', '2025-03-12', 'Processing', 20499.99);
END
GO

-- ── Order Items ──
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OrderItems' AND xtype='U')
BEGIN
    CREATE TABLE OrderItems (
        OrderItemId INT PRIMARY KEY IDENTITY(1,1),
        OrderId INT FOREIGN KEY REFERENCES Orders(OrderId),
        ProductId INT FOREIGN KEY REFERENCES Products(ProductId),
        Quantity INT DEFAULT 1,
        UnitPrice DECIMAL(10,2),
        Subtotal AS (Quantity * UnitPrice)
    );

    INSERT INTO OrderItems (OrderId, ProductId, Quantity, UnitPrice) VALUES
        (1, 1, 1, 4999.99),    -- Acme: Enterprise License
        (1, 5, 1, 1200.00),    -- Acme: Standard Support
        (2, 2, 1, 1999.99),    -- TechStart: Professional License
        (2, 5, 1, 1200.00),    -- TechStart: Standard Support
        (3, 1, 3, 4999.99),    -- Global Finance: 3x Enterprise
        (3, 4, 3, 2500.00),    -- Global Finance: 3x Premium Support
        (4, 1, 1, 4999.99),    -- HealthPlus: Enterprise
        (4, 7, 1, 799.99),     -- HealthPlus: API Add-on
        (5, 3, 2, 499.99),     -- EduLearn: 2x Basic
        (5, 8, 1, 1499.99),    -- EduLearn: Analytics (discounted scenario)
        (6, 2, 2, 1999.99),    -- RetailMax: 2x Professional
        (6, 6, 1, 5000.00),    -- RetailMax: Onboarding
        (7, 2, 1, 1999.99),    -- CloudOps: Professional
        (7, 4, 1, 2500.00),    -- CloudOps: Premium Support
        (8, 1, 2, 4999.99),    -- DataDriven: 2x Enterprise
        (8, 9, 1, 15000.00);   -- DataDriven: Custom Integration
END
GO

-- ── Stored Procedures ──

-- Get employees by department
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'GetEmployeesByDepartment')
    DROP PROCEDURE GetEmployeesByDepartment;
GO

CREATE PROCEDURE GetEmployeesByDepartment
    @DepartmentName NVARCHAR(100)
AS
BEGIN
    SELECT
        e.EmployeeId,
        e.FirstName,
        e.LastName,
        e.Email,
        e.Title,
        e.Salary,
        e.HireDate,
        d.Name AS Department,
        d.Location
    FROM Employees e
    JOIN Departments d ON e.DepartmentId = d.DepartmentId
    WHERE d.Name = @DepartmentName AND e.IsActive = 1
    ORDER BY e.LastName;
END
GO

-- Get order summary with totals
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'GetOrderSummary')
    DROP PROCEDURE GetOrderSummary;
GO

CREATE PROCEDURE GetOrderSummary
    @Status NVARCHAR(20) = NULL
AS
BEGIN
    SELECT
        o.OrderId,
        o.CustomerName,
        o.OrderDate,
        o.Status,
        o.TotalAmount,
        COUNT(oi.OrderItemId) AS ItemCount,
        SUM(oi.Quantity) AS TotalUnits
    FROM Orders o
    LEFT JOIN OrderItems oi ON o.OrderId = oi.OrderId
    WHERE (@Status IS NULL OR o.Status = @Status)
    GROUP BY o.OrderId, o.CustomerName, o.OrderDate, o.Status, o.TotalAmount
    ORDER BY o.OrderDate DESC;
END
GO

PRINT '✅ SampleDB seeded successfully';
GO
