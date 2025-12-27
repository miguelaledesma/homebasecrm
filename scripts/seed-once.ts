import { PrismaClient, UserRole } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Prevent seeding in production
  const isProduction = process.env.NODE_ENV === "production" || 
                       process.env.RAILWAY_ENVIRONMENT === "production" ||
                       process.env.VERCEL_ENV === "production"
  
  if (isProduction) {
    console.log("⚠️  Skipping seed in production environment")
    return
  }

  console.log("Checking if database needs seeding...")

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@homebasecrm.com" },
  })

  if (existingAdmin) {
    console.log("✅ Database already seeded. Admin user exists.")
    console.log("Skipping seed process.")
    return
  }

  console.log("Database not seeded yet. Starting seed process...")

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

  console.log("✅ Created admin user:", admin.email)

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

  console.log("✅ Created sales rep user:", salesRep.email)
  console.log("🎉 Seeding completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    console.error("⚠️  Continuing anyway - dev server will start...")
    // Don't exit - allow dev server to start even if seeding fails
    return Promise.resolve() // Ensure promise resolves
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

