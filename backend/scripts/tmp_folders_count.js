const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasourceUrl: "postgresql://mailuser:mailpass@localhost:5432/mailagent" });
(async () => {
  const rows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as cnt FROM "folders"');
  console.log(rows);
})()
  .catch((err) => { console.error(err); })
  .finally(() => prisma.$disconnect());
