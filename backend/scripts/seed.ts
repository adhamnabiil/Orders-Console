import { faker } from "@faker-js/faker";
import { connectDb, disconnectDb } from "../src/config/db.js";
import { ORDER_STATUSES } from "../src/models/order.model.js";
import { orderRepository } from "../src/repositories/order.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { authService } from "../src/services/auth.service.js";

const TOTAL_ORDERS = 50_000;
const BATCH_SIZE = 5_000;

const STATUS_WEIGHTS: Array<{
  status: (typeof ORDER_STATUSES)[number];
  weight: number;
}> = [
  { status: "pending", weight: 25 },
  { status: "paid", weight: 30 },
  { status: "shipped", weight: 20 },
  { status: "delivered", weight: 15 },
  { status: "cancelled", weight: 10 },
];

function pickStatus(): (typeof ORDER_STATUSES)[number] {
  const total = STATUS_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  let roll = faker.number.int({ min: 1, max: total });
  for (const item of STATUS_WEIGHTS) {
    roll -= item.weight;
    if (roll <= 0) return item.status;
  }
  return "pending";
}

async function seed() {
  faker.seed(42);
  await connectDb();

  console.log("Clearing existing data...");
  await orderRepository.deleteAll();
  await userRepository.deleteAll();

  const adminHash = await authService.hashPassword("admin123");
  const agentHash = await authService.hashPassword("agent123");

  const admin = await userRepository.create({
    email: "admin@example.com",
    passwordHash: adminHash,
    role: "admin",
  });
  const agent = await userRepository.create({
    email: "agent@example.com",
    passwordHash: agentHash,
    role: "agent",
  });

  console.log("Created users:");
  console.log("  admin@example.com / admin123");
  console.log("  agent@example.com / agent123");

  const creators = [admin._id, agent._id];
  const start = Date.now();

  for (let offset = 0; offset < TOTAL_ORDERS; offset += BATCH_SIZE) {
    const batch = Array.from({ length: BATCH_SIZE }, () => {
      const itemCount = faker.number.int({ min: 1, max: 5 });
      const items = Array.from({ length: itemCount }, () => ({
        productName: faker.commerce.productName(),
        quantity: faker.number.int({ min: 1, max: 8 }),
        unitPriceCents: faker.number.int({ min: 199, max: 49999 }),
      }));
      const totalCents = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceCents,
        0,
      );
      const customerName = faker.person.fullName();
      return {
        customerName,
        customerNameLower: customerName.toLowerCase(),
        customerEmail: faker.internet.email().toLowerCase(),
        status: pickStatus(),
        items,
        totalCents,
        createdAt: faker.date.past({ years: 1 }),
        createdBy: faker.helpers.arrayElement(creators),
      };
    });

    await orderRepository.insertMany(batch);
    console.log(
      `Inserted ${Math.min(offset + BATCH_SIZE, TOTAL_ORDERS)} / ${TOTAL_ORDERS}`,
    );
  }

  await orderRepository.syncIndexes();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Seed complete in ${elapsed}s`);
  await disconnectDb();
}

seed().catch(async (err) => {
  console.error(err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
