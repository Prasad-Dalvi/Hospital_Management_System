-- Create database
DROP DATABASE IF EXISTS memory_tracker;
CREATE DATABASE memory_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE memory_tracker;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'doctor', 'caretaker', 'patient') NOT NULL,
    linkedId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- Patients table
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(200) NOT NULL,
    dob DATE NULL,
    age INT NULL,
    gender ENUM('Male', 'Female', 'Other') NULL,
    diagnosisDate DATE NULL,
    stage ENUM('Early', 'Middle', 'Late') NULL,
    contact VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    postal VARCHAR(20) NULL,
    bloodGroup VARCHAR(10) NULL,
    allergies TEXT NULL,
    notes TEXT NULL,
    registration TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    caretakerId INT NULL,
    doctorId INT NULL,
    photo LONGTEXT NULL,
    lastVisit DATE NULL,
    INDEX idx_doctorId (doctorId),
    INDEX idx_caretakerId (caretakerId)
) ENGINE=InnoDB;

-- Caretakers table
CREATE TABLE caretakers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(200) NOT NULL,
    dob DATE NULL,
    age INT NULL,
    gender ENUM('Male', 'Female', 'Other') NULL,
    relation VARCHAR(100) NULL,
    contact VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    postal VARCHAR(100) NULL,
    assignedPatientId INT NULL,
    joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    photo LONGTEXT NULL,
    notes TEXT NULL,
    doctorId INT NULL,
    INDEX idx_assignedPatientId (assignedPatientId),
    INDEX idx_doctorId (doctorId)
) ENGINE=InnoDB;

-- Previous caretakers
CREATE TABLE prev_caretakers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    fullName VARCHAR(200) NOT NULL,
    relation VARCHAR(100) NULL,
    fromDate DATE NULL,
    toDate DATE NULL,
    notes TEXT NULL,
    contact VARCHAR(20) NULL,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Medical history (FIXED - using medical_condition instead of condition)
CREATE TABLE medical_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    medical_condition VARCHAR(200) NOT NULL,
    diagnosisDate DATE NULL,
    treatment TEXT NULL,
    hospital VARCHAR(200) NULL,
    doctor VARCHAR(200) NULL,
    followUp BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    recordDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Medications
CREATE TABLE medications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    medicationName VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NULL,
    frequency VARCHAR(100) NULL,
    startDate DATE NULL,
    endDate DATE NULL,
    prescribedBy VARCHAR(200) NULL,
    sideEffects TEXT NULL,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Appointments
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    doctorName VARCHAR(200) NULL,
    purpose TEXT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    location VARCHAR(200) NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Location tracking
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    description TEXT NULL,
    lat DECIMAL(10, 8) NULL,
    lng DECIMAL(11, 8) NULL,
    recordedBy INT NULL,
    recordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Activities log
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    description TEXT NOT NULL,
    mood ENUM('Happy', 'Neutral', 'Sad', 'Anxious') NULL,
    caretakerId INT NULL,
    duration INT NULL,
    notes TEXT NULL,
    recordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Relatives
CREATE TABLE relatives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    relation VARCHAR(100) NULL,
    photo LONGTEXT NULL,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==================== INSERT USERS WITH CORRECT PASSWORD HASHES ====================
-- Password for all users: admin123
-- bcrypt hash for 'admin123': $2b$10$CwTycUXWue0Thq9StjUM0uJ8eJQm9jY6Z5L5p0Z7FzW8GZf6Fs8.e

INSERT INTO users (username, password, role, linkedId) VALUES
('Prasad', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8eJQm9jY6Z5L5p0Z7FzW8GZf6Fs8.e', 'admin', NULL),
('Suyash', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8eJQm9jY6Z5L5p0Z7FzW8GZf6Fs8.e', 'doctor', NULL),
('Mustansir', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8eJQm9jY6Z5L5p0Z7FzW8GZf6Fs8.e', 'caretaker', 3),
('Aniket', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8eJQm9jY6Z5L5p0Z7FzW8GZf6Fs8.e', 'patient', 1),
('Shubham', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8eJQm9jY6Z5L5p0Z7FzW8GZf6Fs8.e', 'patient', 2);

-- Insert patients (Aniket and Shubham)
INSERT INTO patients (id, fullName, dob, age, gender, diagnosisDate, stage, contact, email, notes, doctorId, lastVisit) VALUES
(1, 'Aniket', '2006-01-01', 19, 'Male', '2023-01-10', 'Early', '1234567890', 'aniket@example.com', 'Responsive to treatment', 2, '2025-11-01'),
(2, 'Shubham', '2006-01-01', 19, 'Male', '2022-06-15', 'Middle', '0987654321', 'shubham@example.com', 'Requires daily assistance', 2, '2025-10-28');

-- Insert caretaker (Mustansir)
INSERT INTO caretakers (id, fullName, dob, relation, contact, assignedPatientId, doctorId) VALUES
(3, 'Mustansir', '2006-01-01', 'Brother', '9876543210', 1, 2);

-- Insert sample medical records (USING medical_condition - FIXED)
INSERT INTO medical_history (patientId, medical_condition, diagnosisDate, treatment, doctor) VALUES
(1, 'Hypertension', '2023-01-15', 'Medication and diet control', 'Dr. Suyash'),
(1, 'Arthritis', '2023-03-20', 'Pain management therapy', 'Dr. Suyash');

-- Insert sample medications
INSERT INTO medications (patientId, medicationName, dosage, frequency, startDate, prescribedBy) VALUES
(1, 'Lisinopril', '10mg', 'Once daily', '2023-01-20', 'Dr. Suyash'),
(1, 'Ibuprofen', '200mg', 'As needed', '2023-03-25', 'Dr. Suyash');

-- Insert sample appointments
INSERT INTO appointments (patientId, date, time, doctorName, purpose, location) VALUES
(1, '2024-12-15', '10:00:00', 'Dr. Suyash', 'Regular checkup', 'Main Hospital'),
(2, '2024-12-20', '14:30:00', 'Dr. Suyash', 'Follow-up visit', 'Clinic A');

-- Insert sample activities
INSERT INTO activities (patientId, date, time, description, mood, caretakerId) VALUES
(1, '2024-11-10', '09:00:00', 'Morning walk in the park', 'Happy', 3),
(1, '2024-11-10', '14:00:00', 'Physical therapy session', 'Neutral', 3);

-- Insert sample locations
INSERT INTO locations (patientId, date, time, description, lat, lng) VALUES
(1, '2024-11-10', '09:30:00', 'Central Park', 40.7829, -73.9654),
(1, '2024-11-10', '14:30:00', 'Therapy Center', 40.7505, -73.9934);

-- Verify setup
SELECT 'Database setup complete!' AS Status;
SELECT COUNT(*) AS UserCount FROM users;
SELECT COUNT(*) AS PatientCount FROM patients;
SELECT COUNT(*) AS CaretakerCount FROM caretakers;
SELECT COUNT(*) AS MedicalHistoryCount FROM medical_history;
SELECT COUNT(*) AS MedicationCount FROM medications;
SELECT COUNT(*) AS AppointmentCount FROM appointments;
SELECT COUNT(*) AS ActivityCount FROM activities;