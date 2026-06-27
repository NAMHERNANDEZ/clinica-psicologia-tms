-- seed.sql — Datos iniciales para testing

-- Clinica por defecto
INSERT INTO clinics (name) VALUES ('Neurociencia Clinica');

-- Admin (password: Admin123!)
INSERT INTO users (clinic_id, email, password_hash, role)
VALUES (1, 'admin@clinica.com', 'cb428e4f5db47c2e794e1e2c9e8d7f6a5b4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d:e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1', 'admin');

-- Terapeuta user
INSERT INTO users (clinic_id, email, password_hash, role)
VALUES (1, 'terapeuta@clinica.com', 'f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', 'therapist');

-- Terapeuta
INSERT INTO therapists (clinic_id, user_id, name, specialty, phone, email, active)
VALUES (1, 2, 'Dr. Terapeuta', 'Psicologia Clinica / TMS', '+522311442941', 'terapeuta@clinica.com', 1);

-- Paciente
INSERT INTO patients (clinic_id, name, phone, email, birthdate, status)
VALUES (1, 'Maria Perez', '+522311442942', 'maria@email.com', '1990-05-15', 'active');
