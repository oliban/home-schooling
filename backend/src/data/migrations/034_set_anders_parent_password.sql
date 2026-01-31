-- Migration: Set password for Anders Magnusson's account
-- Generated: 2026-01-31
-- Password: magnusson26 (bcrypt hashed)

UPDATE parents
SET password_hash = '$2a$10$wG77M/tw8oJB8eMTUdvGw.pYKDyLvwrBZkzEPWCzaX9st65LguyiG'
WHERE email = 'anderspeomagnusson@yahoo.com';
