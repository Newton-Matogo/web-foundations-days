SnapShare: Scaling Plan

1. Assumptions

SnapShare is a photo-sharing application where users upload photos and scroll through a feed of photos posted by people they follow.

The scaling estimates use these assumptions:

Registered users: 10,000,000.

Daily active users (DAU): 10% of registered users.

Uploads: Each daily active user uploads one photo per day.

Feed usage: Each daily active user views 50 feed pages per day.

Average original photo size: 2 MB.

Average thumbnail size: 50 KB (0.05 MB).

Seconds per day: 86,400.

Days per year: 365.

Peak traffic: Five times the average traffic.

All uploaded photos and thumbnails are retained for one year.

Storage estimates exclude replication, backups, metadata, compression, and storage overhead.

Traffic is distributed across the day for average-rate calculations; actual traffic varies by time and user activity.

Daily active users

DAU = Registered users × Daily active percentage

DAU = 10,000,000 × 0.10

Daily active users = 1,000,000 (1 million).

2. Traffic and storage estimates

Uploads per second

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1 = 1,000,000 photos/day

Average uploads per second = 1,000,000 ÷ 86,400

Average uploads = approximately 11.57 photos/second.

Peak uploads per second = 11.57 × 5

Estimated peak uploads = approximately 57.87 photos/second.

Feed views per second

Each daily active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50 = 50,000,000 feed pages/day

Average feed views per second = 50,000,000 ÷ 86,400

Average feed views = approximately 578.70 feed pages/second.

Peak feed views per second = 578.70 × 5

Estimated peak feed views = approximately 2,893.52 feed pages/second.

These figures represent feed-page requests, not individual photos displayed or downloaded. A single feed page can contain several photos, so image delivery traffic will be higher than the feed-page request rate.

Photo storage per year

Original photo storage:

Daily original storage = 1,000,000 × 2 MB = 2,000,000 MB/day = 2 TB/day.

Annual original storage = 2 TB × 365 = 730 TB/year.

Thumbnail storage:

Daily thumbnail storage = 1,000,000 × 0.05 MB = 50,000 MB/day = 0.05 TB/day.

Annual thumbnail storage = 0.05 TB × 365 = 18.25 TB/year.

Total annual storage:

730 TB + 18.25 TB = 748.25 TB/year, or approximately 0.75 PB of new photo and thumbnail data.

This is the amount of additional storage required for one year of uploads, assuming no deletions. If all historical photos are retained, storage will continue growing by approximately 748.25 TB for every additional year at the same usage level.

3. Read-heavy or write-heavy?

SnapShare is a read-heavy system.

There are 50 feed-page views for every photo upload, resulting in 50 million feed-page views versus 1 million uploads per day. Feed reads are therefore much more frequent than photo writes.

This means the design should prioritize fast feed responses, high read throughput, and efficient photo delivery. A cache can reduce repeated database queries, a CDN can serve frequently requested images from locations near users, and a database read replica can handle read queries without placing all the load on the primary database. The primary database remains responsible for writes and authoritative data updates.

4. Why photos should not be stored inside the database

Photo files are large binary objects, and storing them directly inside the database would increase database size, backup time, storage costs, and the amount of data that database servers must transfer. It would also make scaling image delivery independently from application data more difficult.

Instead, SnapShare should store original photos and generated thumbnails in object storage, such as Amazon S3 or an equivalent service. The database stores metadata and object keys, including the uploader, upload timestamp, caption, and storage location. A CDN can then deliver photo files efficiently without requiring every image request to pass through an application server or database.

## 5. System Architecture Diagram

```text
                         +----------------------+
                         |         Users        |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |         CDN          |
                         | Cached photos/thumbs |
                         +----------+-----------+
                                    |
                              Cache miss
                                    v
                         +----------------------+
                         |    Load Balancer     |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |     App Servers      |
                         +--+-------+--------+--+
                            |       |        |
                Feed reads  |       |        | Upload original
                            v       v        v
                     +------+--+ +--+-----+ +------------------+
                     |  Cache  | | Primary| |  Object Storage  |
                     +---------+ |   DB   | | Original photos  |
                          |      +---+----+ | and thumbnails   |
                          |          |      +--------+---------+
                          |          v               ^
                          |    +-----------+         |
                          +--->| Read      |         |
                               | Replica   |         |
                               +-----------+         |
                                                     |
                     +----------------+              |
                     | Message Queue  |              |
                     | Thumbnail jobs |              |
                     +-------+--------+              |
                             |                       |
                             v                       |
                     +----------------+              |
                     | Thumbnail      |--------------+
                     | Worker         |
                     +----------------+
                     Reads original, creates thumbnail,
                     and stores the thumbnail in object storage.
```

The app servers also write photo metadata to the primary database and enqueue thumbnail jobs; the primary database replicates its data to the read replica. The CDN retrieves images from object storage when they are not already cached.

## 6. Component Breakdown

- **CDN:** Caches and delivers photos and thumbnails from locations near users, reducing latency and load on the application.
- **Load balancer:** Distributes incoming requests across healthy app servers to prevent any one server from becoming overloaded.
- **App servers:** Handle authentication, upload requests, feed APIs, photo metadata, and communication with the other services.
- **Cache:** Stores frequently accessed feed data and metadata to reduce repeated database queries.
- **Primary database:** Stores durable photo metadata, user information, object keys, and upload-processing status.
- **Read replica:** Serves feed and other read queries to reduce load on the primary database, while accepting that replication may introduce some delay.
- **Object storage:** Stores original photos and generated thumbnails as files, keeping large binary data out of relational database tables.
- **Message queue:** Holds thumbnail-processing jobs so uploads can be acknowledged without waiting for image processing to finish.
- **Thumbnail worker:** Consumes queued jobs, retrieves original photos, generates resized thumbnails, and saves the results to object storage.

## 7. Photo Upload Workflow

1. A user selects a photo in the SnapShare app and submits the upload request.
2. The load balancer routes the request to a healthy app server.
3. The app server authenticates the user and validates the file type, file size, and upload permissions.
4. The app server uploads the original photo to object storage and obtains its object key.
5. The app server saves the photo's metadata and object key in the primary database.
6. The app server adds a thumbnail-generation job to the message queue, including the photo ID and original object key.
7. Once the original is stored and the metadata and job have been safely recorded, the server returns an upload-success response without waiting for the thumbnail to finish.
8. A background thumbnail worker consumes the job and retrieves the original photo from object storage.
9. The worker resizes the image, generates a thumbnail, and saves it back to object storage.
10. The worker updates the photo's processing status in the database. When another attempt is needed after a failure, the job can be retried; repeatedly failing jobs should be sent to a dead-letter queue for investigation.
11. When the photo appears in a feed, the app serves its image through the CDN. If the thumbnail is not ready yet, it can show a placeholder or temporarily use another suitable image version.

This asynchronous design keeps image resizing out of the main upload request, helping the app handle traffic spikes without tying up application servers on expensive image-processing tasks.

## 8. Architecture Trade-offs

**Trade-off 1: Faster reads versus fresh data**

Caching feed data and using a read replica improve response times and reduce primary database load. However, cached results can become stale, and database replication lag can cause a newly uploaded photo or updated metadata to appear late. SnapShare can mitigate this with cache expiration or invalidation and by reading from the primary database when immediate consistency is required.

**Trade-off 2: Faster uploads versus immediate thumbnail availability**

A message queue and background worker allow the app to acknowledge uploads before thumbnails are generated, improving upload responsiveness and absorbing processing bursts. The disadvantage is that thumbnails are not always available immediately, and jobs can fail or be delayed. SnapShare should use retry policies, idempotent processing, monitoring, and a dead-letter queue to handle failures.

**Trade-off 3: Lower delivery latency versus storage and invalidation complexity**

A CDN serves popular photos quickly and reduces repeated requests to object storage. However, cached images can remain outdated after a replacement or deletion, and CDN usage introduces additional cost and cache-invalidation complexity. Using versioned object keys and appropriate cache-control settings helps manage this trade-off.
