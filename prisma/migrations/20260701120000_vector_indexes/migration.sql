-- HNSW indexes for fast approximate nearest-neighbor search on embeddings.
-- HNSW chosen over IVFFlat: no training/list-count tuning needed and performs
-- well on incrementally-growing review volumes.
CREATE INDEX IF NOT EXISTS "Review_embedding_hnsw_idx"
  ON "Review" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "Cluster_centroid_hnsw_idx"
  ON "Cluster" USING hnsw ("centroid" vector_cosine_ops);

-- Trigram index to support fuzzy text search in the Review Explorer.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Review_cleanText_trgm_idx"
  ON "Review" USING gin ("cleanText" gin_trgm_ops);
