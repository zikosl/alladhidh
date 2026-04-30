import dotenv from 'dotenv';
import { app } from './app';
import { prisma } from './lib/prisma';

dotenv.config();

const port = Number(process.env.PORT ?? 3000);

async function start() {
  await prisma.$connect();

  const server = app.listen(port, () => {
    console.log(`Restaurant POS API listening on port ${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Closing Restaurant POS API...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Graceful shutdown timeout reached.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
