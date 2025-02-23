# Data Clean Room Implementation on BigQuery

## setup dataset in Big Query

```bash
gcloud services enable bigquery.googleapis.com
```

## create dataset

```bash
gcloud alpha bq datasets create dcrdataset
```

## 1. Creating Tables

Create tables to store advertiser and media platform data in BigQuery.

```sql
CREATE TABLE `data-clean-rooms.dcrdataset.advertiser_data` (
  user_id STRING,
  campaign_id STRING,
  engagement_score INTEGER,
  timestamp TIMESTAMP
);

CREATE TABLE `data-clean-rooms.dcrdataset.media_platform_data` (
  user_id STRING,
  content_id STRING,
  view_duration INTEGER,
  timestamp TIMESTAMP
);
```

## 2. Inserting Sample Data

### Insert Data into `advertiser_data`

```sql
INSERT INTO `data-clean-rooms.dcrdataset.advertiser_data` (user_id, campaign_id, engagement_score, timestamp)
VALUES
  (TO_HEX(SHA256("user1@example.com")), "campaign_123", 80, TIMESTAMP("2024-02-22 12:00:00")),
  (TO_HEX(SHA256("user2@example.com")), "campaign_456", 95, TIMESTAMP("2024-02-22 12:05:00")),
  (TO_HEX(SHA256("user3@example.com")), "campaign_123", 60, TIMESTAMP("2024-02-22 12:10:00")),
  (TO_HEX(SHA256("user4@example.com")), "campaign_789", 70, TIMESTAMP("2024-02-22 12:15:00")),
  (TO_HEX(SHA256("user5@example.com")), "campaign_456", 85, TIMESTAMP("2024-02-22 12:20:00"));
```

### Insert Data into `media_platform_data`

```sql
INSERT INTO `data-clean-rooms.dcrdataset.media_platform_data` (user_id, content_id, view_duration, timestamp)
VALUES
  (TO_HEX(SHA256("user1@example.com")), "content_001", 300, TIMESTAMP("2024-02-22 12:02:00")),
  (TO_HEX(SHA256("user2@example.com")), "content_002", 250, TIMESTAMP("2024-02-22 12:06:00")),
  (TO_HEX(SHA256("user3@example.com")), "content_003", 180, TIMESTAMP("2024-02-22 12:12:00")),
  (TO_HEX(SHA256("user4@example.com")), "content_004", 400, TIMESTAMP("2024-02-22 12:18:00")),
  (TO_HEX(SHA256("user5@example.com")), "content_001", 120, TIMESTAMP("2024-02-22 12:22:00"));
```

## 3. Querying the Tables

Verify the data by selecting from the tables.

```sql
SELECT * FROM `data-clean-rooms.dcrdataset.advertiser_data`;
SELECT * FROM `data-clean-rooms.dcrdataset.media_platform_data`;
```

## 4. Creating the Data Clean Room View

Create a BigQuery view that securely aggregates data from both tables.

```sql
CREATE OR REPLACE VIEW `data-clean-rooms.dcrdataset.dcr_view` AS
SELECT
  a.user_id,
  a.engagement_score,
  m.view_duration
FROM `data-clean-rooms.dcrdataset.advertiser_data` AS a
JOIN `data-clean-rooms.dcrdataset.media_platform_data` AS m
USING (user_id);
```

## 5. Running Secure Aggregation Query

Compute privacy-preserving insights from the Data Clean Room.

```sql
SELECT
  COUNT(DISTINCT user_id) AS unique_users,
  AVG(engagement_score) AS avg_engagement,
  AVG(view_duration) AS avg_watch_time
FROM `data-clean-rooms.dcrdataset.dcr_view`;
```

## Summary

This setup enables advertisers and media platforms to share and analyze audience engagement securely using **hashed identifiers** and **privacy-preserving aggregation** in BigQuery.
