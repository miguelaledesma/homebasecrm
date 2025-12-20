import {
  PrismaClient,
  UserRole,
  SourceType,
  LeadType,
  LeadStatus,
  AppointmentStatus,
} from "@prisma/client"

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

  // Create sample customers (check if they exist first)
  let customer1 = await prisma.customer.findFirst({
    where: { email: "john.smith@example.com" },
  })
  if (!customer1) {
    customer1 = await prisma.customer.create({
      data: {
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        phone: "555-0101",
        addressLine1: "123 Main Street",
        city: "Springfield",
        state: "IL",
        zip: "62701",
        sourceType: SourceType.CALL_IN,
      },
    })
  }

  let customer2 = await prisma.customer.findFirst({
    where: { email: "sarah.johnson@example.com" },
  })
  if (!customer2) {
    customer2 = await prisma.customer.create({
      data: {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@example.com",
        phone: "555-0102",
        addressLine1: "456 Oak Avenue",
        city: "Springfield",
        state: "IL",
        zip: "62702",
        sourceType: SourceType.WALK_IN,
      },
    })
  }

  let customer3 = await prisma.customer.findFirst({
    where: { email: "michael.brown@example.com" },
  })
  if (!customer3) {
    customer3 = await prisma.customer.create({
      data: {
        firstName: "Michael",
        lastName: "Brown",
        email: "michael.brown@example.com",
        phone: "555-0103",
        addressLine1: "789 Elm Drive",
        addressLine2: "Apt 4B",
        city: "Springfield",
        state: "IL",
        zip: "62703",
        sourceType: SourceType.REFERRAL,
      },
    })
  }

  let customer4 = await prisma.customer.findFirst({
    where: { email: "emily.davis@example.com" },
  })
  if (!customer4) {
    customer4 = await prisma.customer.create({
      data: {
        firstName: "Emily",
        lastName: "Davis",
        email: "emily.davis@example.com",
        phone: "555-0104",
        addressLine1: "321 Pine Street",
        city: "Springfield",
        state: "IL",
        zip: "62704",
        sourceType: SourceType.CALL_IN,
      },
    })
  }

  console.log("Created customers")

  // Create sample leads (only if they don't exist)
  let lead1 = await prisma.lead.findFirst({
    where: {
      customerId: customer1.id,
      leadTypes: { has: LeadType.FLOOR },
    },
  })
  if (!lead1) {
    lead1 = await prisma.lead.create({
      data: {
        customerId: customer1.id,
        leadTypes: [LeadType.FLOOR],
        description: "Interested in hardwood flooring for living room and kitchen",
        status: LeadStatus.APPOINTMENT_SET,
        assignedSalesRepId: salesRep.id,
      },
    })
  }

  let lead2 = await prisma.lead.findFirst({
    where: {
      customerId: customer2.id,
      leadTypes: { has: LeadType.KITCHEN },
    },
  })
  if (!lead2) {
    lead2 = await prisma.lead.create({
      data: {
        customerId: customer2.id,
        leadTypes: [LeadType.KITCHEN],
        description: "Kitchen renovation - new cabinets and countertops",
        status: LeadStatus.QUOTED,
        assignedSalesRepId: salesRep.id,
      },
    })
  }

  let lead3 = await prisma.lead.findFirst({
    where: {
      customerId: customer3.id,
      leadTypes: { has: LeadType.BATH },
    },
  })
  if (!lead3) {
    lead3 = await prisma.lead.create({
      data: {
        customerId: customer3.id,
        leadTypes: [LeadType.BATH],
        description: "Bathroom remodel - full renovation needed",
        status: LeadStatus.NEW,
        assignedSalesRepId: salesRep.id,
      },
    })
  }

  let lead4 = await prisma.lead.findFirst({
    where: {
      customerId: customer4.id,
      leadTypes: { has: LeadType.OTHER },
    },
  })
  if (!lead4) {
    lead4 = await prisma.lead.create({
      data: {
        customerId: customer4.id,
        leadTypes: [LeadType.OTHER],
        description: "Basement finishing project",
        status: LeadStatus.ASSIGNED,
        assignedSalesRepId: salesRep.id,
      },
    })
  }

  console.log("Created leads")

  // Create sample appointments (only if they don't exist)
  const scheduledDate1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
  let appointment1 = await prisma.appointment.findFirst({
    where: {
      leadId: lead1.id,
      scheduledFor: scheduledDate1,
    },
  })
  if (!appointment1) {
    appointment1 = await prisma.appointment.create({
      data: {
        leadId: lead1.id,
        salesRepId: salesRep.id,
        scheduledFor: scheduledDate1,
        siteAddressLine1: customer1.addressLine1,
        city: customer1.city,
        state: customer1.state,
        zip: customer1.zip,
        status: AppointmentStatus.SCHEDULED,
        notes: "Customer prefers morning appointments",
      },
    })
  }

  const scheduledDate2 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
  let appointment2 = await prisma.appointment.findFirst({
    where: {
      leadId: lead2.id,
      scheduledFor: scheduledDate2,
    },
  })
  if (!appointment2) {
    appointment2 = await prisma.appointment.create({
      data: {
        leadId: lead2.id,
        salesRepId: salesRep.id,
        scheduledFor: scheduledDate2,
        siteAddressLine1: customer2.addressLine1,
        city: customer2.city,
        state: customer2.state,
        zip: customer2.zip,
        status: AppointmentStatus.COMPLETED,
        notes: "Site visit completed, measurements taken",
      },
    })
  }

  const scheduledDate3 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
  let appointment3 = await prisma.appointment.findFirst({
    where: {
      leadId: lead1.id,
      scheduledFor: scheduledDate3,
    },
  })
  if (!appointment3) {
    appointment3 = await prisma.appointment.create({
      data: {
        leadId: lead1.id,
        salesRepId: salesRep.id,
        scheduledFor: scheduledDate3,
        siteAddressLine1: customer1.addressLine1,
        city: customer1.city,
        state: customer1.state,
        zip: customer1.zip,
        status: AppointmentStatus.SCHEDULED,
        notes: "Follow-up appointment to review samples",
      },
    })
  }

  const scheduledDate4 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  let appointment4 = await prisma.appointment.findFirst({
    where: {
      leadId: lead3.id,
      scheduledFor: scheduledDate4,
    },
  })
  if (!appointment4) {
    appointment4 = await prisma.appointment.create({
      data: {
        leadId: lead3.id,
        salesRepId: salesRep.id,
        scheduledFor: scheduledDate4,
        siteAddressLine1: customer3.addressLine1,
        siteAddressLine2: customer3.addressLine2,
        city: customer3.city,
        state: customer3.state,
        zip: customer3.zip,
        status: AppointmentStatus.SCHEDULED,
        notes: "Initial consultation for bathroom remodel",
      },
    })
  }

  console.log("Created appointments")
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

