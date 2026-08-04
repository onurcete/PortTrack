const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.user
  .findFirst({
    where: { email: "demo@porttrack.app" },
    select: { id: true, email: true, isDemo: true },
  })
  .then((r) => {
    console.log("Demo user:", JSON.stringify(r));
    return p.$disconnect();
  })
  .catch((e) => {
    console.error("Error:", e.message);
    return p.$disconnect();
  });
