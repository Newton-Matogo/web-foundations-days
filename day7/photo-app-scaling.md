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

5.  Architecture diagram

                         +-------------------+
                         |       Users       |
                         +---------+---------+
                                   |
                    +--------------+--------------+
                    |                             |
                    v                             v
          +------------------+          +------------------+
          |       CDN        |          |  Load Balancer   |
          | Cached photo     |          | Distributes API  |
          | and thumbnail    |          | requests         |
          | delivery         |          +--------+---------+
          +--------+---------+                   |
                   ^                             v
                   |                   +---------------------+
                   |                   |    App Servers      |
                   |                   | Feed API, upload API|
                   |                   +--+-------+-------+--+
                   |                      |       |       |
                   |                      v       |       v
                   |                +---------+   |  +----------------+
                   |                |  Cache  |   |  | Primary DB     |
                   |                | Feed and|   |  | Users, follows,|
                   |                | metadata|   |  | photo metadata|
                   |                +---------+   |  +-------+--------+
                   |                              |          |
                   |                              |          v
                   |                              |  +----------------+
                   |                              |  | Read Replica   |
                   |                              |  | Read queries   |
                   |                              |  +----------------+
                   |                              |
                   |                              v
                   |                     +-------------------+
                   |                     |   Object Storage  |
                   +---------------------| Original photos   |
                     Image delivery      | and thumbnails    |
                                         +---------+---------+
                                                   ^
                                                   |
                                         +---------+---------+
                                         | Thumbnail Worker  |
                                         | Resizes and saves |
                                         | thumbnails        |
                                         +---------^---------+
                                                   |
                                         +---------+---------+
                                         |       Queue       |
                                         | Thumbnail jobs    |
                                         +-------------------+

The diagram shows the major components and their relationships. In practice, application servers write photo metadata to the primary database, while read queries can use the read replica; object storage is the source of truth for image files.

6. What each component does

CDN: Serves cached photos and thumbnails close to users, reducing image-download latency and origin-server traffic.

Load balancer: Distributes incoming API requests across healthy application servers so that no single server handles all the traffic.

App servers: Handle authentication, upload authorization, feed generation, metadata operations, and communication between the other services.

Cache: Stores frequently requested feed data and metadata in memory to reduce database queries and improve response times.

Primary database: Stores authoritative user, follow, and photo metadata and handles writes.

Database read replica: Serves read queries to reduce the primary database's read workload, with the possibility of replication lag.

Object storage: Stores original photo files and thumbnails durably and scales independently of the relational database.

Queue: Holds thumbnail-generation jobs so that image processing can happen asynchronously rather than delaying the upload response.

Thumbnail worker: Consumes queued jobs, resizes original photos, creates thumbnails, and saves the resulting files in object storage.

7. Step-by-step photo upload flow

User selects a photo: The client prepares the original image and sends an upload request to SnapShare.

Request reaches the application: The load balancer forwards the request to a healthy app server.

Upload is authorized: The app server authenticates the user, checks permissions and applicable file-size or file-type limits, and determines a unique object key.

Original photo is stored: The app server, or a client using a short-lived authorized upload URL, uploads the original photo to object storage.

Metadata is saved: The app server writes the photo metadata and object key to the primary database.

Thumbnail job is queued: The app server places a job containing the photo ID and original object key on the queue.

Upload is acknowledged: Once the original photo is safely stored and the required metadata is committed, the API returns success to the client; thumbnail generation can continue in the background.

Worker processes the job: A thumbnail worker retrieves the queued job, reads the original photo from object storage, resizes it, and creates the 50 KB thumbnail or a suitably optimized image near that target size.

Thumbnail is stored: The worker uploads the thumbnail to object storage and records or updates its object key and processing status in the database.

Photo becomes available in the feed: The feed API returns the photo metadata, and the client loads the thumbnail or original through the CDN. If thumbnail generation is still pending, the application can display a placeholder and retry later.

The queue should support retries and dead-letter handling for failed jobs. Upload operations should also be idempotent where practical, so retries do not accidentally create duplicate records or process the same logical upload multiple times.

8. Trade-offs

Trade-off 1: Cache speed versus data freshness

Caching feed data reduces database load and improves response times, but cached results may become stale after a user uploads a photo, changes who they follow, or deletes content. SnapShare can use short cache expiration times and targeted invalidation to balance freshness against performance, at the cost of additional cache-management complexity.

Trade-off 2: Asynchronous thumbnails versus immediate availability

Generating thumbnails through a queue keeps uploads responsive and isolates CPU-intensive image processing from the request path. However, thumbnails may not be available immediately, and failed or delayed jobs require retries, monitoring, and recovery mechanisms. The application must handle the temporary state in which the original photo exists but its thumbnail is still being generated.

Trade-off 3: Read replicas versus consistency

A read replica increases read capacity and reduces pressure on the primary database, but replication lag can cause a newly uploaded photo or recently updated metadata to be temporarily absent from feed queries. SnapShare can route read-after-write requests to the primary database when immediate consistency is required, at the cost of additional primary-database load.

Trade-off 4: CDN caching versus storage invalidation

A CDN reduces latency and bandwidth costs for frequently viewed photos, but cached content may remain available after an update or deletion until it expires or is invalidated. Shorter cache lifetimes improve freshness but increase requests to the origin; longer lifetimes improve cache efficiency but make content invalidation more important.

9. Conclusion

SnapShare has approximately one million daily active users, 11.57 average photo uploads per second, and 578.70 average feed-page views per second. Peak feed traffic is estimated at 2,893.52 pages per second, and new photos plus thumbnails require approximately 748.25 TB of storage per year.

The recommended design separates image files from relational metadata, uses a CDN and cache to accelerate reads, distributes API traffic through a load balancer, scales reads with a database replica, and generates thumbnails asynchronously through a queue and worker. This architecture addresses the system's read-heavy workload while allowing image storage and processing to scale independently.
