-- ═══════════════════════════════════════════════════════
-- Sample Oracle Database — TESTUSER schema
-- Tables: Departments, Employees, Products, Orders, Order_Items
-- Procedures: Get_Employees_By_Dept, Get_Order_Summary
-- ═══════════════════════════════════════════════════════
-- This script runs as APP_USER (testuser) in the XEPDB1 PDB
-- It is called by 00_seed.sh which connects as testuser@XEPDB1

-- ── Departments ──
CREATE TABLE Departments (
    Department_Id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Name VARCHAR2(100) NOT NULL,
    Location VARCHAR2(100),
    Budget NUMBER(15,2),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Departments (Name, Location, Budget) VALUES ('Engineering', 'San Francisco', 2500000.00);
INSERT INTO Departments (Name, Location, Budget) VALUES ('Marketing', 'New York', 1200000.00);
INSERT INTO Departments (Name, Location, Budget) VALUES ('Sales', 'Chicago', 1800000.00);
INSERT INTO Departments (Name, Location, Budget) VALUES ('Human Resources', 'San Francisco', 800000.00);
INSERT INTO Departments (Name, Location, Budget) VALUES ('Finance', 'New York', 950000.00);
INSERT INTO Departments (Name, Location, Budget) VALUES ('Operations', 'Austin', 1100000.00);

-- ── Employees ──
CREATE TABLE Employees (
    Employee_Id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    First_Name VARCHAR2(50) NOT NULL,
    Last_Name VARCHAR2(50) NOT NULL,
    Email VARCHAR2(100) UNIQUE,
    Department_Id NUMBER REFERENCES Departments(Department_Id),
    Title VARCHAR2(100),
    Salary NUMBER(10,2),
    Hire_Date DATE,
    Is_Active NUMBER(1) DEFAULT 1
);

INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Alice', 'Johnson', 'alice.johnson@sample.com', 1, 'Senior Engineer', 145000.00, DATE '2021-03-15');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Bob', 'Smith', 'bob.smith@sample.com', 1, 'Staff Engineer', 175000.00, DATE '2019-07-01');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Carol', 'Williams', 'carol.williams@sample.com', 2, 'Marketing Manager', 120000.00, DATE '2020-01-10');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('David', 'Brown', 'david.brown@sample.com', 3, 'Sales Director', 155000.00, DATE '2018-11-20');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Eva', 'Davis', 'eva.davis@sample.com', 1, 'Junior Engineer', 95000.00, DATE '2023-06-01');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Frank', 'Miller', 'frank.miller@sample.com', 4, 'HR Specialist', 85000.00, DATE '2022-02-14');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Grace', 'Wilson', 'grace.wilson@sample.com', 5, 'Financial Analyst', 110000.00, DATE '2021-09-05');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Henry', 'Moore', 'henry.moore@sample.com', 3, 'Sales Representative', 75000.00, DATE '2023-01-15');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Iris', 'Taylor', 'iris.taylor@sample.com', 2, 'Content Strategist', 95000.00, DATE '2022-08-20');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Jack', 'Anderson', 'jack.anderson@sample.com', 6, 'Operations Manager', 125000.00, DATE '2020-04-01');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Karen', 'Thomas', 'karen.thomas@sample.com', 1, 'DevOps Engineer', 135000.00, DATE '2021-11-10');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Leo', 'Jackson', 'leo.jackson@sample.com', 5, 'Senior Accountant', 105000.00, DATE '2019-05-22');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Mia', 'White', 'mia.white@sample.com', 3, 'Account Executive', 90000.00, DATE '2022-07-01');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Nathan', 'Harris', 'nathan.harris@sample.com', 6, 'Logistics Coordinator', 72000.00, DATE '2023-03-10');
INSERT INTO Employees (First_Name, Last_Name, Email, Department_Id, Title, Salary, Hire_Date) VALUES ('Olivia', 'Martin', 'olivia.martin@sample.com', 4, 'HR Director', 140000.00, DATE '2017-09-15');

-- ── Products ──
CREATE TABLE Products (
    Product_Id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Name VARCHAR2(150) NOT NULL,
    Category VARCHAR2(50),
    Price NUMBER(10,2),
    Stock_Quantity NUMBER DEFAULT 0,
    Is_Available NUMBER(1) DEFAULT 1,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Enterprise License', 'Software', 4999.99, 999);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Professional License', 'Software', 1999.99, 999);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Basic License', 'Software', 499.99, 999);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Premium Support (Annual)', 'Service', 2500.00, 100);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Standard Support (Annual)', 'Service', 1200.00, 200);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Onboarding Package', 'Service', 5000.00, 50);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('API Add-on', 'Software', 799.99, 999);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Analytics Dashboard', 'Software', 1499.99, 999);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Custom Integration', 'Service', 15000.00, 20);
INSERT INTO Products (Name, Category, Price, Stock_Quantity) VALUES ('Training Workshop', 'Service', 3500.00, 30);

-- ── Orders ──
CREATE TABLE Orders (
    Order_Id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Customer_Name VARCHAR2(100) NOT NULL,
    Customer_Email VARCHAR2(100),
    Order_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR2(20) DEFAULT 'Pending',
    Total_Amount NUMBER(12,2)
);

INSERT INTO Orders (Customer_Name, Customer_Email, Order_Date, Status, Total_Amount) VALUES ('Acme Corp', 'purchasing@acme.com', TIMESTAMP '2025-01-15 10:00:00', 'Completed', 7499.98);
INSERT INTO Orders (Customer_Name, Customer_Email, Order_Date, Status, Total_Amount) VALUES ('TechStart Inc', 'admin@techstart.io', TIMESTAMP '2025-02-20 14:30:00', 'Completed', 3199.98);
INSERT INTO Orders (Customer_Name, Customer_Email, Order_Date, Status, Total_Amount) VALUES ('Global Finance', 'ops@globalfin.com', TIMESTAMP '2025-03-01 09:00:00', 'Processing', 22499.99);
INSERT INTO Orders (Customer_Name, Customer_Email, Order_Date, Status, Total_Amount) VALUES ('HealthPlus', 'it@healthplus.org', TIMESTAMP '2025-03-10 11:15:00', 'Pending', 6499.99);
INSERT INTO Orders (Customer_Name, Customer_Email, Order_Date, Status, Total_Amount) VALUES ('EduLearn', 'tech@edulearn.com', TIMESTAMP '2025-03-15 16:00:00', 'Completed', 1699.98);
INSERT INTO Orders (Customer_Name, Customer_Email, Order_Date, Status, Total_Amount) VALUES ('RetailMax', 'systems@retailmax.com', TIMESTAMP '2025-02-28 08:45:00', 'Shipped', 9999.98);
INSERT INTO Orders (Customer_Name, Customer_Email, Order_Date, Status, Total_Amount) VALUES ('CloudOps Ltd', 'devops@cloudops.io', TIMESTAMP '2025-03-05 13:20:00', 'Completed', 4799.98);
INSERT INTO Orders (Customer_Name, Customer_Email, Order_Date, Status, Total_Amount) VALUES ('DataDriven Co', 'cto@datadriven.co', TIMESTAMP '2025-03-12 10:30:00', 'Processing', 20499.99);

-- ── Order Items ──
CREATE TABLE Order_Items (
    Order_Item_Id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Order_Id NUMBER REFERENCES Orders(Order_Id),
    Product_Id NUMBER REFERENCES Products(Product_Id),
    Quantity NUMBER DEFAULT 1,
    Unit_Price NUMBER(10,2)
);

INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (1, 1, 1, 4999.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (1, 5, 1, 1200.00);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (2, 2, 1, 1999.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (2, 5, 1, 1200.00);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (3, 1, 3, 4999.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (3, 4, 3, 2500.00);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (4, 1, 1, 4999.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (4, 7, 1, 799.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (5, 3, 2, 499.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (5, 8, 1, 1499.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (6, 2, 2, 1999.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (6, 6, 1, 5000.00);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (7, 2, 1, 1999.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (7, 4, 1, 2500.00);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (8, 1, 2, 4999.99);
INSERT INTO Order_Items (Order_Id, Product_Id, Quantity, Unit_Price) VALUES (8, 9, 1, 15000.00);

COMMIT;

-- ── Stored Procedures ──

-- Get employees by department
CREATE OR REPLACE PROCEDURE Get_Employees_By_Dept (
    p_department_name IN VARCHAR2,
    p_cursor OUT SYS_REFCURSOR
)
AS
BEGIN
    OPEN p_cursor FOR
        SELECT
            e.Employee_Id,
            e.First_Name,
            e.Last_Name,
            e.Email,
            e.Title,
            e.Salary,
            e.Hire_Date,
            d.Name AS Department,
            d.Location
        FROM Employees e
        JOIN Departments d ON e.Department_Id = d.Department_Id
        WHERE d.Name = p_department_name AND e.Is_Active = 1
        ORDER BY e.Last_Name;
END;
/

-- Get order summary
CREATE OR REPLACE PROCEDURE Get_Order_Summary (
    p_status IN VARCHAR2 DEFAULT NULL,
    p_cursor OUT SYS_REFCURSOR
)
AS
BEGIN
    OPEN p_cursor FOR
        SELECT
            o.Order_Id,
            o.Customer_Name,
            o.Order_Date,
            o.Status,
            o.Total_Amount,
            COUNT(oi.Order_Item_Id) AS Item_Count,
            SUM(oi.Quantity) AS Total_Units
        FROM Orders o
        LEFT JOIN Order_Items oi ON o.Order_Id = oi.Order_Id
        WHERE (p_status IS NULL OR o.Status = p_status)
        GROUP BY o.Order_Id, o.Customer_Name, o.Order_Date, o.Status, o.Total_Amount
        ORDER BY o.Order_Date DESC;
END;
/
