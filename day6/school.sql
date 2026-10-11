-- =========================================
-- DAY 6: SCHOOL DATABASE
-- =========================================

PRAGMA foreign_keys = ON;

-- Drop existing tables so the script can be rerun.
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- 1. Create the students table.
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- 2. Create the courses table.
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    description TEXT
);

-- 3. Create the enrolments table.
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT NOT NULL,
    FOREIGN KEY (student_id)
        REFERENCES students(student_id),
    FOREIGN KEY (course_id)
        REFERENCES courses(course_id),
    UNIQUE (student_id, course_id)
);

-- =========================================
-- INSERT SAMPLE STUDENTS
-- =========================================

INSERT INTO students (student_id, name, email)
VALUES
    (1, 'Alice Mwangi', 'alice@example.com'),
    (2, 'Brian Otieno', 'brian@example.com'),
    (3, 'Carol Wanjiku', 'carol@example.com'),
    (4, 'David Kimani', 'david@example.com');

-- =========================================
-- INSERT SAMPLE COURSES
-- =========================================

INSERT INTO courses (course_id, course_name, description)
VALUES
    (1, 'Database Design', 'Relational databases and SQL'),
    (2, 'Web Development', 'HTML, CSS and JavaScript'),
    (3, 'Computer Networks', 'Networking fundamentals');

-- =========================================
-- INSERT SAMPLE ENROLMENTS
-- =========================================

INSERT INTO enrolments
    (enrolment_id, student_id, course_id, grade)
VALUES
    (1, 1, 1, 'A'),
    (2, 1, 2, 'B'),
    (3, 2, 1, 'B'),
    (4, 2, 3, 'A'),
    (5, 3, 2, 'A'),
    (6, 3, 3, 'B');

-- =========================================
-- QUERY 1: ALL COURSES FOR ONE STUDENT
-- Example student: Alice Mwangi
-- =========================================

SELECT
    students.name AS student_name,
    courses.course_name,
    enrolments.grade
FROM enrolments
JOIN students
    ON enrolments.student_id = students.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE students.name = 'Alice Mwangi';

-- =========================================
-- QUERY 2: ALL STUDENTS ON ONE COURSE
-- Example course: Database Design
-- =========================================

SELECT
    courses.course_name,
    students.name AS student_name,
    enrolments.grade
FROM enrolments
JOIN students
    ON enrolments.student_id = students.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE courses.course_name = 'Database Design';

-- =========================================
-- QUERY 3: NUMBER OF STUDENTS PER COURSE
-- Include courses with zero enrolments.
-- =========================================

SELECT
    courses.course_name,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
    ON courses.course_id = enrolments.course_id
GROUP BY
    courses.course_id,
    courses.course_name
ORDER BY courses.course_id;

-- =========================================
-- QUERY 4: STUDENTS WITH NO ENROLMENTS
-- =========================================

SELECT
    students.student_id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.student_id = enrolments.student_id
WHERE enrolments.student_id IS NULL;

-- =========================================
-- QUERY 5: UPDATE ONE ENROLMENT'S GRADE
-- Change Alice's Database Design grade to A+.
-- =========================================

UPDATE enrolments
SET grade = 'A+'
WHERE student_id = 1
  AND course_id = 1;

-- Check the updated grade.
SELECT
    students.name AS student_name,
    courses.course_name,
    enrolments.grade
FROM enrolments
JOIN students
    ON enrolments.student_id = students.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE enrolments.student_id = 1
  AND enrolments.course_id = 1;