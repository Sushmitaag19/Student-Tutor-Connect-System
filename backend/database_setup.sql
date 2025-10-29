
CREATE DATABASE Student_tutor;

\c Student_tutor

CREATE TABLE users(
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(40) NOT NULL,
    email VARCHAR(40) UNIQUE,
    password VARCHAR(40) NOT NULL,
    role VARCHAR(10) CHECK (role in ('student', 'tutor', 'admin')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students(
    student_id SERIAL NOT NULL,
    user_id INT UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    academic_level VARCHAR(50),
    preferred_mode VARCHAR(10) CHECK(preferred_mode IN ('online', 'offline', 'hybrid')),
    budget NUMERIC(10, 2),
    availability TEXT
);

CREATE TABLE tutors(
    tutor_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    bio TEXT,
    experience TEXT,
    hourly_rate NUMERIC(10, 2),
    preferred_mode VARCHAR(10) CHECK(preferred_mode IN ('online', 'offline', 'hybrid')),
    verified BOOLEAN DEFAULT FALSE,
    availability TEXT
);

ALTER TABLE tutors ADD COLUMN profile_picture VARCHAR(255);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tutors_user_id ON tutors(user_id);
CREATE INDEX idx_students_user_id ON students(user_id);

INSERT INTO users (full_name, email, password, role) VALUES
('Admin User', 'admin@example.com', '$2b$10$example_hashed_password', 'admin');


