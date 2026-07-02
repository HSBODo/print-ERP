INSERT INTO batch_watermark (mart_name, last_loaded_at, updated_at)
VALUES (:name, :date, CURRENT_TIMESTAMP)
ON CONFLICT (mart_name) DO UPDATE
   SET last_loaded_at = EXCLUDED.last_loaded_at,
       updated_at     = CURRENT_TIMESTAMP
