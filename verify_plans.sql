SELECT plan, COUNT(*) AS cnt
FROM "user"
GROUP BY plan
ORDER BY cnt DESC;