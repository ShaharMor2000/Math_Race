UPDATE teachers
SET
  full_name = 'Eliya Razton',
  password_hash = '$2a$10$s87DvllzqYEt0k7ZqQHWHue3BhUxr5lZW0LwBNvJvg7luwC/2ht0C',
  role = 'TEACHER',
  is_active = true,
  updated_at = NOW()
WHERE email = 'eliyarazton147@gmail.com';

SELECT id, email, LENGTH(password_hash) AS hash_len FROM teachers WHERE email = 'eliyarazton147@gmail.com';
