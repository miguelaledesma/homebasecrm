/**
 * Script to backfill customer numbers for existing leads
 * Run with: npx tsx scripts/backfill-customer-numbers.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting customer number backfill...");

  // Get all leads without a customer number
  const leadsWithoutNumber = await prisma.lead.findMany({
    where: {
      customerNumber: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${leadsWithoutNumber.length} leads without customer numbers`);

  if (leadsWithoutNumber.length === 0) {
    console.log("No leads to update. Exiting.");
    return;
  }

  // Get the highest existing customer number to continue from there
  const leadWithHighestNumber = await prisma.lead.findFirst({
    where: {
      customerNumber: {
        not: null,
      },
    },
    orderBy: {
      customerNumber: "desc",
    },
    select: {
      customerNumber: true,
    },
  });

  let startingNumber = 1;
  if (leadWithHighestNumber?.customerNumber) {
    // Extract the number part from "105-XXXXXX"
    const match = leadWithHighestNumber.customerNumber.match(/105-(\d+)/);
    if (match) {
      startingNumber = parseInt(match[1], 10) + 1;
    }
  }

  console.log(`Starting numbering from: 105-${String(startingNumber).padStart(6, '0')}`);

  // Update each lead
  let updated = 0;
  for (let i = 0; i < leadsWithoutNumber.length; i++) {
    const lead = leadsWithoutNumber[i];
    const customerNumber = `105-${String(startingNumber + i).padStart(6, '0')}`;

    await prisma.lead.update({
      where: { id: lead.id },
      data: { customerNumber },
    });

    updated++;
    if (updated % 10 === 0) {
      console.log(`Updated ${updated}/${leadsWithoutNumber.length} leads...`);
    }
  }

  console.log(`✅ Successfully backfilled ${updated} customer numbers`);
}

main()
  .catch((error) => {
    console.error("Error backfilling customer numbers:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
