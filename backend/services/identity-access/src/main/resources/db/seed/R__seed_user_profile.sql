-- ==========================================
-- 1. SEED USERS
-- ==========================================

INSERT INTO users (
    user_id,
    username,
    password,
    phone,
    user_type,
    status,
    phone_verified
)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'james.wilson',
    NULL,
    '+12025550101',
    'EMPLOYEE',
    'PENDING_VERIFICATION',
    FALSE
),
(
    '10000000-0000-0000-0000-000000000002',
    'michael.brown',
    NULL,
    '+12025550102',
    'EMPLOYEE',
    'PENDING_VERIFICATION',
    FALSE
),
(
    '10000000-0000-0000-0000-000000000003',
    'sarah.davis',
    NULL,
    '+12025550103',
    'EMPLOYEE',
    'PENDING_VERIFICATION',
    FALSE
),
(
    '10000000-0000-0000-0000-000000000004',
    'daniel.smith',
    NULL,
    '+12025550104',
    'CUSTOMER',
    'PENDING_VERIFICATION',
    FALSE
),
(
    '10000000-0000-0000-0000-000000000005',
    NULL,
    NULL,
    '+12025550105',
    'CUSTOMER',
    'UNREGISTERED',
    FALSE
)
ON CONFLICT (user_id) DO NOTHING;


-- ==========================================
-- 2. SEED CUSTOMERS
-- ==========================================

INSERT INTO customers (
    customer_id,
    user_id,
    first_name,
    last_name
)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    'Daniel',
    'Smith'
),
(
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000005',
    'Emily',
    'Johnson'
)
ON CONFLICT (customer_id) DO NOTHING;


-- ==========================================
-- 3. SEED EMPLOYEE - MANAGER
-- ==========================================

INSERT INTO employees (
    employee_id,
    user_id,
    first_name,
    last_name,
    store_id,
    manager_id,
    hire_date
)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'James',
    'Wilson',
    NULL,
    NULL,
    '2024-01-15'
)
ON CONFLICT (employee_id) DO NOTHING;


-- ==========================================
-- 4. SEED REMAINING EMPLOYEES
-- ==========================================

INSERT INTO employees (
    employee_id,
    user_id,
    first_name,
    last_name,
    store_id,
    manager_id,
    hire_date
)
VALUES
(
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Michael',
    'Brown',
    NULL,
    '30000000-0000-0000-0000-000000000001',
    '2024-06-01'
),
(
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'Sarah',
    'Davis',
    NULL,
    '30000000-0000-0000-0000-000000000001',
    '2025-02-10'
)
ON CONFLICT (employee_id) DO NOTHING;