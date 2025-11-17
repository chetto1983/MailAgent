const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasourceUrl: "postgresql://mailuser:mailpass@localhost:5432/mailagent" });
(async () => {
  const rows = await prisma.$queryRawUnsafe("SELECT \"folder\", COUNT(*)::int as cnt FROM \"emails\" WHERE \"providerId\" = 'cmi3ms10j0001yheg5tc06tic' GROUP BY \"folder\" ORDER BY cnt DESC");
  console.log(rows);
})()
  .catch((err) => { console.error(err); })
  .finally(() => prisma.$disconnect());
