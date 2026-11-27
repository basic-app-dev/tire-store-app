-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(30),

    user_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,

    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_user_type CHECK (
        user_type IN (
            'CUSTOMER',
            'EMPLOYEE'
        )
    ),

    CONSTRAINT chk_user_status CHECK (
        status IN (
            'UNREGISTERED',
            'PENDING_VERIFICATION',
            'ACTIVE',
            'SUSPENDED',
            'DEACTIVATED'
        )
    )
);


-- ==========================================
-- CUSTOMERS
-- ==========================================

CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    customer_since TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_customer_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- ==========================================
-- EMPLOYEES
-- ==========================================

CREATE TABLE employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    store_id UUID,
    manager_id UUID,

    hire_date DATE NOT NULL,

    CONSTRAINT fk_employee_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_employee_manager
        FOREIGN KEY (manager_id)
        REFERENCES employees(employee_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_employee_manager CHECK (
        manager_id IS NULL
        OR manager_id <> employee_id
    )
);


-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_employees_store_id
    ON employees(store_id);

CREATE INDEX idx_employees_manager_id
    ON employees(manager_id);