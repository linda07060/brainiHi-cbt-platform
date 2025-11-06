UPDATE "user"
SET plan = (
  CASE
    WHEN lower(trim(plan)) LIKE '%tutor%' THEN 'Tutor'
    WHEN lower(trim(plan)) LIKE '%pro%' THEN 'Pro'
    WHEN lower(trim(plan)) IN ('pro','professional','standard','paid') THEN 'Pro'
    WHEN lower(trim(plan)) IN ('tutor','tutorplan','mentor') THEN 'Tutor'
    ELSE 'Free'
  END
)
WHERE plan IS NOT NULL;

UPDATE "user" SET plan = 'Free' WHERE plan IS NULL OR trim(plan) = '';