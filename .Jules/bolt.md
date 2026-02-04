# BOLT'S JOURNAL

## 2023-10-27 - Optimized Drive API Payload **Learning:** Drive API `fields: "*"` causes massive over-fetching of metadata (exportLinks, etc.) which increases latency and parsing time. **Action:** Always specify exact fields needed in `Drive.Revisions.list` (e.g., `items(id,modifiedDate,...)`).
