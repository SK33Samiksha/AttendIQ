-- ============================================================
--  Smart Attendance Management System — MySQL Schema
--  Run this file in MySQL Workbench
-- ============================================================

CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

-- ─────────────────────────────────────────────
--  TABLE: users  (teachers / admins who login)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL,
    email      VARCHAR(150)  NOT NULL UNIQUE,
    password   VARCHAR(255)  NOT NULL,          -- bcrypt hash
    role       ENUM('admin','teacher') DEFAULT 'teacher',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  TABLE: students
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    roll_no    VARCHAR(20)  NOT NULL UNIQUE,
    email      VARCHAR(150),
    class      VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  TABLE: subjects
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  TABLE: attendance
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    date       DATE NOT NULL,
    status     ENUM('Present','Absent') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id)    ON DELETE CASCADE,
    UNIQUE KEY uq_attend (student_id, subject_id, date)   -- prevent duplicates
);

-- ─────────────────────────────────────────────
--  VIEW: attendance_summary  (percentage per student per subject)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW attendance_summary AS
SELECT
    s.id                                              AS student_id,
    s.name                                            AS student_name,
    s.roll_no,
    s.class,
    sub.id                                            AS subject_id,
    sub.name                                          AS subject_name,
    COUNT(a.id)                                       AS total_classes,
    SUM(a.status = 'Present')                         AS present_count,
    SUM(a.status = 'Absent')                          AS absent_count,
    ROUND(SUM(a.status = 'Present') / COUNT(a.id) * 100, 2) AS percentage
FROM students s
JOIN attendance a   ON a.student_id = s.id
JOIN subjects  sub  ON sub.id       = a.subject_id
GROUP BY s.id, sub.id;

-- ─────────────────────────────────────────────
--  SEED DATA
-- ─────────────────────────────────────────────

-- Default admin  (password: admin123)
INSERT INTO users (name, email, password, role) VALUES
('Admin User',   'admin@school.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Prof. Sharma', 'sharma@school.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher'),
('Prof. Mehta',  'mehta@school.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher');

-- Students
INSERT INTO students (name, roll_no, email, class) VALUES
('Rahul Patil',   '101', 'rahul@student.com',  'MCA-1'),
('Priya Desai',   '102', 'priya@student.com',  'MCA-1'),
('Amit Joshi',    '103', 'amit@student.com',   'MCA-1'),
('Sneha Kulkarni','104', 'sneha@student.com',  'MCA-1'),
('Rohan Naik',    '105', 'rohan@student.com',  'MCA-1');

-- Subjects
INSERT INTO subjects (name, code) VALUES
('Java Programming',   'JAVA'),
('Database Systems',   'DBMS'),
('Web Technologies',   'WEB'),
('Data Structures',    'DS'),
('Operating Systems',  'OS');

-- Sample attendance records
INSERT INTO attendance (student_id, subject_id, teacher_id, date, status) VALUES
(1,1,2,'2024-01-15','Present'),(1,1,2,'2024-01-16','Present'),(1,1,2,'2024-01-17','Absent'),
(2,1,2,'2024-01-15','Present'),(2,1,2,'2024-01-16','Absent'), (2,1,2,'2024-01-17','Present'),
(3,1,2,'2024-01-15','Absent'), (3,1,2,'2024-01-16','Present'),(3,1,2,'2024-01-17','Present'),
(4,1,2,'2024-01-15','Present'),(4,1,2,'2024-01-16','Present'),(4,1,2,'2024-01-17','Present'),
(5,1,2,'2024-01-15','Absent'), (5,1,2,'2024-01-16','Absent'), (5,1,2,'2024-01-17','Present'),
(1,2,3,'2024-01-15','Present'),(1,2,3,'2024-01-16','Present'),(1,2,3,'2024-01-17','Present'),
(2,2,3,'2024-01-15','Absent'), (2,2,3,'2024-01-16','Present'),(2,2,3,'2024-01-17','Absent'),
(3,2,3,'2024-01-15','Present'),(3,2,3,'2024-01-16','Absent'), (3,2,3,'2024-01-17','Present');

SELECT 'Database setup complete!' AS Status;
