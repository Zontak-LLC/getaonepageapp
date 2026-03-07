/**
 * Prisma seed script — ensures the default admin user exists.
 *
 * Run: npx tsx prisma/seed.ts
 *
 * If dzontak@gmail.com already exists, promotes to admin.
 * If not, creates the user with a temporary password (change after first login).
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "dzontak@gmail.com";
const ADMIN_NAME = "Denis Zontak";
// Temporary password — change immediately after first login
const TEMP_PASSWORD = "Admin123!";

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    if (existing.role !== "admin") {
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { role: "admin" },
      });
      console.log(`Promoted ${ADMIN_EMAIL} to admin.`);
    } else {
      console.log(`${ADMIN_EMAIL} is already an admin.`);
    }
  } else {
    const passwordHash = await hash(TEMP_PASSWORD, 12);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: "admin",
      },
    });
    console.log(`Created admin user: ${ADMIN_EMAIL} (password: ${TEMP_PASSWORD})`);
    console.log("IMPORTANT: Change the password after first login!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
