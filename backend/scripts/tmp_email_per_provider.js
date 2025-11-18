const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasourceUrl: "postgresql://mailuser:mailpass@localhost:5432/mailagent" });
(async () => {
  const rows = await prisma.$queryRawUnsafe('SELECT "providerId", "folder", COUNT(*)::int as cnt FROM "emails" GROUP BY "providerId", "folder" ORDER BY "providerId", cnt DESC');
  console.log(rows);
})()
  .catch((err) => { console.error(err); })
  .finally(() => prisma.$disconnect());
