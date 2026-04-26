import dotenv from 'dotenv';
import { app } from './app';
import { prisma } from './lib/prisma';

dotenv.config();

const port = Number(process.env.PORT ?? 3000);

async function start() {
  await prisma.$connect();

  app.listen(port, () => {
    console.log(`Restaurant POS API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
