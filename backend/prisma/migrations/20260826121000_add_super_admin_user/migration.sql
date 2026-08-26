INSERT INTO "User" (
  "id",
  "email",
  "name",
  "password",
  "role",
  "createdAt",
  "updatedAt"
)
VALUES (
  'super-admin-danielftrodrigues444',
  'danielftrodrigues444@gmail.com',
  'Daniel Rodrigues',
  '$2b$10$Y.EPSdyLPH7LFziIZSyhXOekwig8ySBnDMlBY/jh671NCaUBfn2tG',
  'admin',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "password" = EXCLUDED."password",
  "role" = 'admin',
  "updatedAt" = CURRENT_TIMESTAMP;
