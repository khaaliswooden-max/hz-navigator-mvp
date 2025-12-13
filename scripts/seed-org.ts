import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'test-org-123' },
    update: {},
    create: {
      id: 'test-org-123',
      name: 'Test Company',
    },
  })

  console.log('✅ Created organization:', org)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
