# School Database Design

## 1. Students Table

The `students` table stores information about students.

- `student_id`: Primary key that uniquely identifies each student.
- `name`: Student's full name; required.
- `email`: Student's email address; required and unique.

The unique email constraint prevents two students from registering with the same email address.

## 2. Courses Table

The `courses` table stores information about courses offered by the school.

- `course_id`: Primary key that uniquely identifies each course.
- `course_name`: Name of the course; required.
- `description`: Optional description of the course.

## 3. Enrolments Table

The `enrolments` table records which students take which courses and the grade each student receives.

- `enrolment_id`: Primary key that uniquely identifies each enrolment.
- `student_id`: Foreign key referencing `students(student_id)`.
- `course_id`: Foreign key referencing `courses(course_id)`.
- `grade`: Grade received by the student; required.

The `UNIQUE (student_id, course_id)` constraint prevents a student from enrolling in the same course more than once.

## 4. Relationships

### One-to-many relationships

- **Students to enrolments:** One student can have multiple enrolment records, but each enrolment belongs to one student.
- **Courses to enrolments:** One course can have multiple enrolment records, but each enrolment refers to one course.

### Many-to-many relationship

Students and courses have a many-to-many relationship. A student can take multiple courses, and each course can have multiple students.

The `enrolments` table resolves this relationship by connecting the student and course records. It also stores the grade, which belongs to a student's enrolment in a particular course.

## 5. Index

I would add an index on `enrolments(course_id)` to speed up queries that find all students enrolled in a particular course and queries that count enrolments per course. The unique constraint on `(student_id, course_id)` already creates an index for that column combination, but it does not efficiently replace an index beginning with `course_id`.

Example:

```sql
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);
```

## 6. SQL or NoSQL?

I would choose SQL for this school system because students, courses and enrolments have clear relationships and structured data. A relational database supports primary keys, foreign keys, unique constraints and reliable updates. JOIN queries can retrieve related student and course information, while transactions help maintain consistency. A NoSQL database could be suitable if the system had highly flexible document structures or very different scaling requirements, but a relational SQL database is the better fit for this design.
