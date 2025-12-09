import { PrismaClient, UserRole } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create an admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@homebasecrm.com" },
    update: {},
    create: {
      email: "admin@homebasecrm.com",
      name: "Admin User",
      role: UserRole.ADMIN,
    },
  })

  console.log("Created admin user:", admin)

  // Create a sales rep user
  const salesRep = await prisma.user.upsert({
    where: { email: "sales@homebasecrm.com" },
    update: {},
    create: {
      email: "sales@homebasecrm.com",
      name: "Sales Rep",
      role: UserRole.SALES_REP,
    },
  })

  console.log("Created sales rep user:", salesRep)

  console.log("Seeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

