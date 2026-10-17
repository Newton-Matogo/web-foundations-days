# TicketHub: Event Ticketing System Design

## 1. Requirements

### 1.1 Functional Requirements

TicketHub is a web-based event ticketing system that allows users to discover events and purchase tickets online.

The system must allow users to:

1. Register, log in, and manage their accounts.
2. Browse and search for events by name, date, category, and venue.
3. View event details, seating maps, ticket prices, and seat availability.
4. Temporarily hold available seats while completing a purchase.
5. Pay for tickets through a secure payment provider.
6. View their order history and access purchased tickets.
7. Release seats automatically when a reservation hold expires.
8. Receive confirmation after a successful purchase.

Administrators must be able to create and update events, configure seating and prices, and monitor ticket sales.

### 1.2 Non-Functional Requirements

**Performance:** Event listings should load within 300 milliseconds at the 95th percentile under normal load. Seat availability should respond within 500 milliseconds under normal load.

**Reliability and consistency:** A seat must never be sold to two customers. Payment retries and repeated requests must not create duplicate orders or charges.

**Scalability:** The system must support normal daily traffic and handle sudden increases in demand, including 200,000 prospective buyers trying to purchase tickets during a popular sale.

**Security:** Users must authenticate before accessing their accounts or purchasing tickets. Administrative actions must be restricted to authorized administrators. Payment details should be handled by a trusted payment provider rather than stored directly by TicketHub.

**Availability:** Event browsing should remain available during periods of heavy demand. If purchasing traffic becomes excessive, the system should limit or queue purchase requests rather than overload the database.

**Maintainability:** The system should separate responsibilities such as event browsing, seat reservations, payments, and notifications so that components can be tested and maintained independently.

**Fault tolerance:** Payment failures, expired seat holds, service interruptions, and repeated requests must be handled without creating incorrect bookings.

## 2. Traffic Estimates

The following estimates use the figures provided in the assignment. For normal traffic, I assume most visitor activity occurs over 12 active hours per day. I also assume a five-times-average multiplier for the normal peak. These are planning assumptions rather than measured production traffic.

### 2.1 Normal Traffic

- Registered users: 2,000,000.
- Daily visitors: 50,000.
- Pages viewed per visitor: 10.
- Daily page views: 50,000 × 10 = 500,000.
- Active hours assumed: 12 hours = 43,200 seconds.
- Average page views per second: 500,000 ÷ 43,200 ≈ 11.6.
- Estimated normal peak: 11.6 × 5 ≈ 58 page views per second.
- Daily ticket sales: 5,000.

These calculations estimate page-view traffic, not the exact number of backend API requests. A single page may generate multiple API requests, so load testing would be needed to determine actual server capacity.

### 2.2 Big-Sale Traffic

For a popular concert, the assignment states that 200,000 people attempt to buy 20,000 seats within the first 10 minutes.

- Prospective buyers: 200,000.
- Available seats: 20,000.
- Sale window: 10 minutes = 600 seconds.
- Average arrival rate: 200,000 ÷ 600 ≈ 333 people per second.
- Demand-to-seat ratio: 200,000 ÷ 20,000 = 10 prospective buyers per seat.

This means there are approximately ten prospective buyers for every available seat. Demand will probably be uneven, with many people arriving at the beginning of the sale.

As an initial engineering test target, TicketHub could test whether the waiting-room entrance can accept 1,000 arrival attempts per second. This is a proposed test target, not a figure supplied by the assignment or a proven capacity requirement.

### 2.3 Comparison and Implications

Normal traffic is spread across many events and pages, whereas a popular concert sale concentrates requests on a limited number of seats.

TicketHub should cache relatively stable information, such as event descriptions, while using the database as the authoritative source for seat reservations. A waiting room should control how many customers enter the purchase process at once.

Cached seat information must not be used as the final authority for a purchase because it can become outdated. The reservation process must verify availability using a transaction or another concurrency-safe database operation.

## 3. API Design

TicketHub will provide a REST API. Clients communicate with the backend using HTTP requests and receive JSON responses.

### 3.1 Main Endpoints

| Method | Endpoint                                        | Purpose                                      |
| ------ | ----------------------------------------------- | -------------------------------------------- |
| POST   | `/api/v1/auth/register`                         | Create a user account.                       |
| POST   | `/api/v1/auth/login`                            | Authenticate a user and establish a session. |
| GET    | `/api/v1/events`                                | List and search available events.            |
| GET    | `/api/v1/events/{eventId}`                      | Retrieve event details.                      |
| GET    | `/api/v1/events/{eventId}/seats`                | Retrieve seat availability and prices.       |
| POST   | `/api/v1/reservations`                          | Temporarily hold selected seats.             |
| POST   | `/api/v1/reservations/{reservationId}/checkout` | Begin payment for a valid reservation.       |
| GET    | `/api/v1/orders/{orderId}`                      | Retrieve the status of an order.             |
| GET    | `/api/v1/users/me/orders`                       | List the authenticated user's orders.        |

### 3.2 Example Request and Response

A customer can request a temporary reservation by sending:

`POST /api/v1/reservations`

Example JSON request:

```json
{
  "eventId": "event-101",
  "seatIds": ["A12", "A13"]
}
```

If both seats are available, the server creates a reservation and returns a reservation identifier and expiration time.

Example successful response:

```json
{
  "reservationId": "res-501",
  "status": "HELD",
  "seatIds": ["A12", "A13"],
  "expiresAt": "2026-10-17T14:10:00Z"
}
```

If a requested seat has already been reserved, the server should reject that reservation attempt with an appropriate conflict response, such as HTTP `409 Conflict`.

### 3.3 API Design Considerations

- Authentication is required for reservation, checkout, and order-history endpoints.
- Requests must be validated on the server, including event IDs, seat IDs, prices, and user permissions.
- Purchase requests should support idempotency keys. Repeating the same checkout request should not create a second order or charge.
- API responses should use suitable HTTP status codes, including `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, and `409 Conflict`.
- Payment status should be confirmed through the trusted payment provider's verified response or webhook, not simply because the browser reports success.

## 4. Data Model

TicketHub will use a relational database because ticket sales require reliable relationships and transaction support.

### 4.1 Main Tables

**Users**

| Column          | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `user_id`       | Primary key identifying the user.                 |
| `name`          | User's display name.                              |
| `email`         | User's email address; should be unique.           |
| `password_hash` | Secure password hash, never a plaintext password. |
| `created_at`    | Account creation timestamp.                       |

**Events**

| Column       | Purpose                                       |
| ------------ | --------------------------------------------- |
| `event_id`   | Primary key identifying the event.            |
| `name`       | Event name.                                   |
| `venue`      | Event location.                               |
| `event_date` | Date and time of the event.                   |
| `status`     | Event status, such as scheduled or cancelled. |

**Seats**

| Column       | Purpose                           |
| ------------ | --------------------------------- |
| `seat_id`    | Primary key identifying a seat.   |
| `event_id`   | Foreign key referencing `Events`. |
| `seat_label` | Seat label, such as A12.          |
| `price`      | Ticket price for the seat.        |

A unique constraint on `(event_id, seat_label)` prevents the same seat label from being defined twice for one event.

**Reservations**

| Column           | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `reservation_id` | Primary key identifying the reservation.               |
| `user_id`        | Foreign key referencing `Users`.                       |
| `status`         | Status such as HELD, CONFIRMED, EXPIRED, or CANCELLED. |
| `expires_at`     | Time at which a temporary hold expires.                |
| `created_at`     | Reservation creation timestamp.                        |

**ReservationSeats**

| Column           | Purpose                                 |
| ---------------- | --------------------------------------- |
| `reservation_id` | Foreign key referencing `Reservations`. |
| `seat_id`        | Foreign key referencing `Seats`.        |

This table connects reservations to one or more seats. The database must enforce the rule that a seat cannot have overlapping active holds or be assigned to multiple confirmed orders. This can be implemented using suitable database constraints and transactional reservation logic.

**Orders**

| Column           | Purpose                                       |
| ---------------- | --------------------------------------------- |
| `order_id`       | Primary key identifying the order.            |
| `user_id`        | Foreign key referencing `Users`.              |
| `reservation_id` | Reference to the reservation being purchased. |
| `status`         | Status such as PENDING, PAID, or FAILED.      |
| `total_amount`   | Total amount charged for the order.           |
| `created_at`     | Order creation timestamp.                     |

**Payments**

| Column               | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `payment_id`         | Primary key identifying the payment record. |
| `order_id`           | Foreign key referencing `Orders`.           |
| `provider_reference` | Reference supplied by the payment provider. |
| `status`             | Payment status.                             |
| `amount`             | Amount requested or confirmed.              |
| `created_at`         | Payment record creation timestamp.          |

### 4.2 Relationships

- One user can create many reservations.
- One user can place many orders.
- One event has many seats.
- One reservation can contain many seats, and a seat can be associated with different reservations over time, provided their holds do not overlap and the seat is not already sold.
- An order references the reservation being purchased.
- An order can have multiple payment attempts, but successful processing must not result in duplicate charges or duplicate ticket sales.

### 4.3 Preventing Double Booking

Preventing two customers from purchasing the same seat is one of the most important requirements.

TicketHub will use a short-lived reservation hold and a concurrency-safe database operation:

1. A customer selects seats and requests a reservation.
2. The server starts a database transaction and checks the current reservation status of each requested seat.
3. The database atomically records the holds only if the seats are still available. A unique constraint, row lock, or equivalent concurrency-safe mechanism prevents competing requests from claiming the same seat.
4. If another customer has already claimed a seat, the transaction fails and the customer receives a conflict response.
5. The reservation expires after a fixed period if the customer does not complete checkout. Expired holds are made available again through safe transactional processing.
6. After payment is verified, the system confirms the order and marks the seats as sold within a consistent transaction.

Payment processing requires additional care because an external payment provider cannot participate directly in the database transaction. TicketHub should use idempotency keys, track payment states, and reconcile uncertain payment outcomes before retrying charges or releasing seats. This reduces the risk of duplicate payments and incorrect bookings.

## 5. System Architecture

### 5.1 Architecture Diagram

```text
             Customers and Administrators
                         |
                         v
                 Web / Mobile Client
                         |
                         v
                 Load Balancer
                         |
                         v
                    API Backend
                   /     |      \
                  /      |       \
                 v       v        v
          Event Service  Reservation Service
                 |       |        |
                 |       |        v
                 |       |   Relational Database
                 |       |
                 v       v
                 Cache  Payment Service
                            |
                            v
                    External Payment Provider

                  Waiting Room / Queue
                           |
                           v
                    API Backend

                 Background Worker
                  /             \
                 v               v
          Expire Old Holds   Send Notifications
```

### 5.2 Component Responsibilities

**Web or mobile client:** Displays events, seating information, reservations, and orders. It sends requests to the backend but cannot decide on its own whether a seat is available or a payment has succeeded.

**Load balancer:** Distributes incoming requests across available backend instances to prevent one server from receiving all traffic.

**API backend:** Validates requests, authenticates users, checks permissions, and directs requests to the appropriate application logic.

**Event service:** Handles event details and event searches. Frequently requested event information can be cached to reduce database load.

**Reservation service:** Controls temporary seat holds and coordinates concurrency-safe database operations. It is responsible for ensuring that two customers cannot claim the same seat simultaneously.

**Relational database:** Stores users, events, seats, reservations, orders, and payment records. It provides durable storage and transactional guarantees for critical booking operations.

**Cache:** Stores suitable frequently requested data, such as event descriptions. The cache improves read performance but is not the final authority for seat availability or successful purchases.

**Waiting room or queue:** Controls how many users enter a high-demand sale at once. It reduces the chance that a sudden traffic spike overwhelms the reservation and payment systems.

**Payment service:** Communicates with an external payment provider, tracks payment attempts, verifies results, and handles retries safely.

**Background worker:** Processes tasks such as expiring abandoned holds and sending order-confirmation notifications. Expiration must be coordinated with the reservation database so a seat is not released while a valid purchase is being finalized.

### 5.3 High-Demand Sale Flow

During a popular sale, users first enter a waiting room. The system admits users to the purchasing process at a controlled rate. The event page can use cached information, but seat selection and reservation are checked against authoritative database state.

Once a seat is held, the customer has a limited period to complete payment. The system confirms the order only after verifying payment success. If the hold expires without a completed purchase, the system releases it safely.

Monitoring should track request rates, queue length, reservation conflicts, database load, payment failures, and response times. These metrics help the team identify bottlenecks and adjust capacity.

## 6. Design Trade-Offs

### 6.1 Consistency Versus Availability

TicketHub prioritizes consistency for seat reservations and purchases. If the system cannot reliably verify whether a seat is available, it should temporarily reject or delay the purchase rather than risk selling that seat twice.

The disadvantage is that some customers may experience delays or temporary errors during high demand. The benefit is that the system protects customers from incorrect bookings. Less critical information, such as event descriptions, can remain available through caching.

### 6.2 Caching Versus Freshness

Caching event information improves performance and reduces database load. However, cached information can become outdated, particularly when ticket availability changes quickly.

TicketHub will cache relatively stable event details but verify seat availability through the reservation service and database before creating a hold. This approach improves browsing performance without trusting stale data for purchases.

### 6.3 Waiting Room Versus Immediate Access

A waiting room controls the rate at which users reach the purchasing system. This helps protect the database and payment service during a major sale.

The disadvantage is that customers may have to wait, and queue management adds complexity. However, controlled access is preferable to allowing all 200,000 prospective buyers to send purchase requests simultaneously and risking system failure.

### 6.4 Short Holds Versus Customer Convenience

Short reservation holds prevent customers from blocking seats indefinitely while deciding whether to pay. However, customers with slow connections or payment delays may lose their holds.

TicketHub should choose a reasonable hold duration, clearly display the expiration time, and make hold expiration and checkout transitions concurrency-safe.

## Conclusion

TicketHub requires a design that balances performance, scalability, security, and data consistency. Caching and load balancing support normal browsing, while a waiting room controls demand during popular sales. Most importantly, concurrency-safe database transactions, temporary seat holds, and idempotent payment processing help prevent double bookings and duplicate charges. Load testing and monitoring would be needed to validate the design before deploying it to real customers.
