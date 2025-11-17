const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasourceUrl: "postgresql://mailuser:mailpass@localhost:5432/mailagent" });
(async () => {
  const folders = await prisma.folder.findMany({
    select: { id: true, name: true, path: true, providerId: true, totalCount: true, unreadCount: true },
  });
  console.log(folders);
})()
  .catch((err) => { console.error(err); })
  .finally(() => prisma.$disconnect());
