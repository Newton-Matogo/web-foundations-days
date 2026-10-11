# Library Books REST API Design

Base URL: `/api/books`

## 1. List all books

- **Method:** `GET`
- **Path:** `/api/books`
- **Description:** Returns a list of all books in the library.
- **Success status:** `200 OK`
- **Request body:** Not required.

## 2. Get one book

- **Method:** `GET`
- **Path:** `/api/books/{id}`
- **Description:** Returns the details of a book with the specified ID.
- **Success status:** `200 OK`
- **Request body:** Not required.

## 3. Create a book

- **Method:** `POST`
- **Path:** `/api/books`
- **Description:** Creates a new book in the library.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958
  }
  ```

- **Success status:** `201 Created`

## 4. Update a book

- **Method:** `PUT`
- **Path:** `/api/books/{id}`
- **Description:** Updates the details of an existing book.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958
  }
  ```

- **Success status:** `200 OK`

## 5. Delete a book

- **Method:** `DELETE`
- **Path:** `/api/books/{id}`
- **Description:** Deletes the book with the specified ID.
- **Success status:** `204 No Content`
- **Request body:** Not required.

## 6. List books by author

- **Method:** `GET`
- **Path:** `/api/books?author=Chinua%20Achebe`
- **Description:** Returns books written by the author specified in the `author` query parameter.
- **Success status:** `200 OK`
- **Request body:** Not required.

## Error responses

- **400 Bad Request:** The request contains invalid data. For example, creating a book without a required title or author.
- **404 Not Found:** The requested resource does not exist. For example, requesting `GET /api/books/9999` when book ID 9999 is not in the library.
