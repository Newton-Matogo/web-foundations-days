# SnapShare Photo App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and scroll through a feed of photos from people they follow.

The capacity estimates use these assumptions:

- Registered users: 10 million.
- Daily active users: 10% of registered users.
- Each active user uploads one photo per day.
- Each active user views 50 feed pages per day.
- Each original photo averages 2 MB.
- Each photo has one thumbnail averaging 50 KB.
- Average traffic is distributed across 24 hours (86,400 seconds).
- Peak traffic is estimated at five times the average rate.
- A year contains 365 days.
- Storage calculations use decimal units: 1 GB = 1,000 MB and 1 TB = 1,000 GB.
- Storage estimates exclude replicas, backups, metadata, and future image versions.

## 2. Capacity Estimates

### Daily active users

Daily active users (DAU) are 10% of 10 million registered users:

10,000,000 × 0.10 = 1,000,000 daily active users.

### Photo uploads per second

Daily uploads:

1,000,000 active users × 1 photo = 1,000,000 uploads/day.

Average uploads per second:

1,000,000 ÷ 86,400 ≈ 11.57 uploads/second.

Estimated peak uploads per second:

11.57 × 5 ≈ 57.87 uploads/second.

### Feed views per second

Daily feed page views:

1,000,000 active users × 50 pages = 50,000,000 page views/day.

Average feed views per second:

50,000,000 ÷ 86,400 ≈ 578.70 page views/second.

Estimated peak feed views per second:

578.70 × 5 ≈ 2,893.52 page views/second.

A feed page view may request multiple photos, so actual image delivery traffic can be much higher than the page-view rate.

### Photo storage per year

Original photos:

1,000,000 photos/day × 2 MB × 365 days = 730,000,000 MB = 730 TB/year.

Thumbnails:

1,000,000 thumbnails/day × 0.05 MB × 365 days = 18,250,000 MB = 18.25 TB/year.

Total new photo storage:

730 TB + 18.25 TB = 748.25 TB/year.

This estimate represents newly stored original photos and thumbnails. It does not include backups, replicas, metadata, or other storage overhead.

## 3. Read-Heavy or Write-Heavy?

SnapShare is read-heavy because it handles 50 million feed page views per day compared with 1 million photo uploads per day. This is a ratio of approximately 50 feed page views per upload.

The architecture should prioritize fast feed delivery using a CDN, caching, and a database read replica. Upload processing should also be reliable, but thumbnail generation can happen asynchronously so that users do not have to wait for the thumbnail before the upload is accepted.

## 4. Why Photos Should Not Be Stored in the Database

Photo files should be stored in object storage rather than directly inside the relational database. Large binary files can increase database size, backups, and restore times, and can make database performance and scaling more difficult. Object storage is designed to store large files durably and cost-effectively, while the database stores photo metadata, ownership, captions, timestamps, and object-storage keys. A CDN can then cache and deliver the image files closer to users.

## 5. Architecture Diagram

```text
                    +----------------------+
                    |        Users         |
                    | Uploads and Feed     |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |         CDN          |
                    | Cache and deliver    |
                    | photos and thumbnails|
                    +----------+-----------+
                               |
                      Cache miss / API
                               |
                               v
                    +----------------------+
                    |    Load Balancer     |
                    +----------+-----------+
                               |
                 +-------------+-------------+
                 |             |             |
                 v             v             v
             +--------+    +--------+    +--------+
             | App 1  |    | App 2  |    | App N  |
             +---+----+    +---+----+    +---+----+
                 |             |             |
                 +-------------+-------------+
                               |
                 +-------------+----------------+
                 |                              |
                 v                              v
        +------------------+          +-------------------+
        | Shared Cache     |          | Primary Database  |
        | Feed data and    |          | Metadata and      |
        | frequently used  |          | relationships     |
        | records          |          +---------+---------+
        +------------------+                    |
                                                | Replication
                                                v
                                      +-------------------+
                                      | Database Read     |
                                      | Replica           |
                                      +-------------------+

       Upload processing:
       +------------------+
       | App Server       |
       +--------+---------+
                |
                v
       +------------------+       +----------------------+
       | Object Storage   |       | Message Queue        |
       | Original Photos  |       | Thumbnail Jobs       |
       +------------------+       +----------+-----------+
                                             |
                                             v
                                  +----------------------+
                                  | Thumbnail Worker     |
                                  +----------+-----------+
                                             |
                                             v
                                  +----------------------+
                                  | Object Storage       |
                                  | Thumbnails           |
                                  +----------------------+
```

## 6. Components and the Problems They Solve

- **CDN:** Caches and delivers photos and thumbnails from locations closer to users, reducing latency and origin-server bandwidth.
- **Load balancer:** Distributes incoming application requests across healthy app servers to avoid overloading a single server.
- **App servers:** Handle API requests, authentication, upload coordination, feed generation, and business logic.
- **Shared cache:** Stores frequently requested feed data and metadata to reduce repeated database queries and improve response times.
- **Primary database:** Stores structured information such as user accounts, follow relationships, photo metadata, captions, and storage keys.
- **Database read replica:** Handles eligible read queries so that feed-related database traffic does not all reach the primary database.
- **Object storage:** Stores original photo files and generated thumbnails separately from the relational database.
- **Message queue:** Buffers thumbnail-generation jobs so that uploads can be accepted without waiting for background processing.
- **Thumbnail worker:** Processes queued jobs, creates smaller image versions, and stores the resulting thumbnails in object storage.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits it through the application.
2. The request reaches the load balancer, which forwards it to a healthy app server.
3. The app server authenticates the user and validates the upload, including its file type and size.
4. The original photo is stored in object storage, and the system obtains its storage key.
5. The app server saves the photo metadata and storage key in the primary database.
6. The app server publishes a thumbnail-generation job to the message queue.
7. The application responds to the user that the upload has been accepted; the thumbnail may still be processing.
8. A thumbnail worker retrieves the queued job and downloads or reads the original photo from object storage.
9. The worker generates a thumbnail and saves it in object storage.
10. The worker updates the photo's processing status or metadata in the database if necessary.
11. The CDN can deliver the original photo and thumbnail to users, caching them according to the chosen cache policy.

The queue should support retries for transient failures, and thumbnail jobs should be idempotent so that retrying a job does not create inconsistent results.

## 8. Design Trade-Offs

### Trade-off 1: CDN caching versus freshness

A CDN reduces image delivery latency and bandwidth costs, but cached content can become stale when a photo changes or is removed. SnapShare can use versioned image URLs and cache invalidation for content that must be updated or removed promptly.

### Trade-off 2: Asynchronous thumbnails versus immediate availability

Using a queue and background workers makes uploads faster and allows thumbnail processing to scale independently. However, a thumbnail may not be available immediately, and queue backlogs or worker failures can delay processing. The application should show a processing state and retry failed jobs.

### Trade-off 3: Read replicas versus consistency

A read replica increases read capacity and reduces load on the primary database, but replication lag can cause recently updated data to be temporarily missing from replica queries. The application can send critical read-after-write requests to the primary database and use the replica for less time-sensitive feed reads.

### Trade-off 4: Object storage versus database simplicity

Object storage is well suited to large image files and scales independently from database records, but it introduces a separate system that must be managed. The application must handle storage keys, permissions, failed uploads, and cleanup of files whose database records are deleted.

## 9. Conclusion

SnapShare should use a horizontally scalable application tier, a shared cache, a primary database with a read replica, object storage, a CDN, and a queue-backed thumbnail-processing service. With an estimated 1 million daily active users, 50 million feed page views per day, and approximately 748.25 TB of new image storage per year, the design prioritizes read performance while keeping image processing asynchronous and storage scalable.
