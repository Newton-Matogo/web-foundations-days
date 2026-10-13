# Day 7 Assignment: Scaling SnapShare

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed of photos posted by people they follow.

The following assumptions are used for the estimates:

- Registered users: 10 million.
- Daily active users: 10% of registered users.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each original photo has one thumbnail of 50 KB.
- Average traffic is spread evenly across 24 hours.
- Peak traffic is estimated to be five times the average traffic.
- A year contains 365 days.
- Storage calculations use decimal units: 1 GB = 1,000 MB and 1 TB = 1,000 GB.
- Storage estimates exclude backups, database records, replicas, and other overhead.

## 2. Capacity Estimates

### Daily active users

Daily active users are 10% of the 10 million registered users.

10,000,000 × 0.10 = 1,000,000 daily active users.

### Uploads per second

Each daily active user uploads one photo.

Daily uploads:

1,000,000 × 1 = 1,000,000 photos per day.

Average uploads per second:

1,000,000 ÷ 86,400 = approximately 11.57 uploads per second.

Peak uploads per second:

11.57 × 5 = approximately 57.87 uploads per second.

### Feed views per second

Each daily active user views 50 feed pages per day.

Daily feed views:

1,000,000 × 50 = 50,000,000 feed pages per day.

Average feed views per second:

50,000,000 ÷ 86,400 = approximately 578.70 views per second.

Peak feed views per second:

578.70 × 5 = approximately 2,893.52 views per second.

These figures represent feed page requests, not individual image downloads. A single feed page can display multiple photos.

### Annual photo storage

Original photo storage:

1,000,000 × 2 MB × 365 = 730,000,000 MB = 730 TB per year.

Thumbnail storage:

1,000,000 × 0.05 MB × 365 = 18,250,000 MB = 18.25 TB per year.

Total annual image storage:

730 TB + 18.25 TB = 748.25 TB per year.

This is the amount of new storage added in one year, excluding backups, replicas, and other overhead.

## 3. Read-Heavy or Write-Heavy?

SnapShare is read-heavy because it receives 50 million feed page views per day compared with 1 million photo uploads per day. That is approximately 50 feed views for every upload.

The architecture must prioritize fast reads using a CDN, a shared cache, and a database read replica. The application should also scale horizontally by adding app servers when traffic increases. Uploads should be reliable, while thumbnail generation should happen asynchronously so users do not have to wait for image processing to finish.

## 4. Why Photos Belong in Object Storage

Photos should be stored in object storage rather than directly inside database tables. Large binary files increase database size, complicate backups and restores, and can reduce the efficiency of database operations.

Object storage is designed for large files and can scale independently of the database. The database should store metadata such as the photo owner, caption, upload time, processing status, and object-storage key. The CDN can then cache and deliver image files efficiently to users.

## 5. Architecture Diagram

```text
                         +----------------------+
                         |         Users        |
                         | Upload photos / Feed |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |         CDN          |
                         | Cached photos and    |
                         | thumbnails           |
                         +----------+-----------+
                                    |
                                    | API requests
                                    v
                         +----------------------+
                         |    Load Balancer     |
                         +----------+-----------+
                                    |
                     +--------------+--------------+
                     |              |              |
                     v              v              v
                +---------+    +---------+    +---------+
                | App     |    | App     |    | App     |
                | Server 1|    | Server 2|    | Server N|
                +----+----+    +----+----+    +----+----+
                     |              |              |
                     +--------------+--------------+
                                    |
                         +----------+----------+
                         |                     |
                         v                     v
                +----------------+    +-------------------+
                | Shared Cache   |    | Primary Database  |
                | Feed data and  |    | Users, follows,   |
                | popular records|    | photo metadata    |
                +----------------+    +---------+---------+
                                                |
                                                | Replication
                                                v
                                      +-------------------+
                                      | Database Read    |
                                      | Replica           |
                                      +-------------------+

                    PHOTO UPLOAD AND THUMBNAIL PROCESSING

                +-------------------+
                | App Server        |
                +---------+---------+
                          |
                          v
                +-------------------+
                | Object Storage    |
                | Original Photos   |
                +-------------------+
                          |
                          | Photo metadata saved
                          v
                +-------------------+
                | Primary Database  |
                +-------------------+

                +-------------------+
                | App Server        |
                +---------+---------+
                          |
                          | Publish thumbnail job
                          v
                +-------------------+
                | Message Queue     |
                +---------+---------+
                          |
                          | Worker consumes job
                          v
                +-------------------+
                | Thumbnail Worker  |
                +---------+---------+
                          |
                          | Read original photo
                          v
                +-------------------+
                | Object Storage    |
                | Original Photos   |
                +-------------------+
                          |
                          | Generated thumbnail
                          v
                +-------------------+
                | Object Storage    |
                | Thumbnails        |
                +-------------------+
                          |
                          | Update processing status
                          v
                +-------------------+
                | Primary Database  |
                +-------------------+
```

## 6. Components and the Problems They Solve

- **CDN:** Caches and serves photos and thumbnails close to users, reducing latency, origin traffic, and bandwidth costs.
- **Load balancer:** Distributes incoming requests across healthy app servers so that no single server becomes a bottleneck.
- **App servers:** Handle authentication, API requests, upload validation, feed generation, and application business logic.
- **Shared cache:** Stores frequently requested feed data and metadata to reduce repeated database queries.
- **Primary database:** Stores structured data such as users, follow relationships, photo metadata, captions, storage keys, and processing status.
- **Database read replica:** Handles eligible read queries to reduce the primary database's workload and improve read capacity.
- **Object storage:** Stores original image files and generated thumbnails without filling database tables with large binary files.
- **Message queue:** Buffers thumbnail-generation jobs and separates upload handling from slower background processing.
- **Thumbnail worker:** Consumes queued jobs, creates smaller image versions, stores the thumbnails in object storage, and updates processing status in the primary database.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits an upload request to SnapShare.
2. The load balancer forwards the request to a healthy app server.
3. The app server authenticates the user and validates the file type, size, and upload permissions.
4. The app server stores the original photo in object storage and obtains its object key.
5. The app server creates a photo metadata record in the primary database, including the owner, caption, object key, upload time, and processing status.
6. The app server publishes a thumbnail-generation job to the message queue.
7. The application confirms that the upload has been accepted. The thumbnail can still be processing in the background.
8. A thumbnail worker retrieves the job from the queue.
9. The worker reads the original photo from object storage and generates a smaller thumbnail.
10. The worker saves the thumbnail in object storage.
11. The worker updates the photo's processing status in the primary database so the application knows the thumbnail is ready.
12. The CDN serves the original photo and thumbnail to users, caching them according to the configured cache policy.

The worker should retry temporary failures, and thumbnail jobs should be idempotent so that retrying a job does not create inconsistent results. If thumbnail processing fails permanently, the system should record the failure and allow the job to be retried or investigated.

## 8. Architectural Trade-Offs

### Trade-Off 1: Eventual Consistency Versus Real-Time Feed Updates

Using a queue to update feeds and process thumbnails improves scalability because the upload request does not have to wait for every downstream task. However, a newly uploaded photo may not immediately appear in every follower's feed, and its thumbnail may take time to become available.

SnapShare can accept eventual consistency for ordinary feed updates while showing the uploading user a clear processing state. For actions that require immediate confirmation, such as displaying the newly uploaded photo on the owner's profile, the application can read from the primary database and show the original image while the thumbnail is being generated.

### Trade-Off 2: CDN Caching Versus Freshness

CDN caching makes popular photos faster to load and reduces bandwidth costs. However, a cached image may remain visible after its source has changed or been deleted.

SnapShare can use versioned image URLs, appropriate cache lifetimes, and CDN invalidation when content is changed or removed. Private photos should also use suitable access controls so that public caching does not expose restricted content.

### Trade-Off 3: Read Replicas Versus Strong Consistency

A database read replica distributes read traffic and helps protect the primary database from heavy feed queries. However, replication lag can mean that a recently uploaded photo or updated profile does not appear immediately in replica-based queries.

SnapShare can direct critical read-after-write operations to the primary database while sending less time-sensitive feed and browsing queries to the read replica.

### Trade-Off 4: Asynchronous Processing Versus Immediate Thumbnail Availability

Background thumbnail generation allows uploads to be accepted quickly and lets thumbnail workers scale independently. However, thumbnails may be delayed when the queue becomes large or workers fail.

SnapShare should monitor queue length, scale workers based on demand, retry temporary failures, and display a processing indicator until the thumbnail is ready.

## 9. Conclusion

SnapShare has an estimated one million daily active users, approximately 11.57 average uploads per second, 578.70 average feed views per second, and 748.25 TB of new image storage per year.

Because the workload is read-heavy, the system should prioritize CDN delivery, caching, horizontally scalable app servers, and database read replicas. Original photos and thumbnails belong in object storage, while a message queue and background workers handle thumbnail generation reliably without slowing down uploads.
