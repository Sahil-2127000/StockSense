import http from 'node:http';
import app from './app.js';
import config from './config/env.js';
import prisma from './config/db.js';

const server = http.createServer(app);

// Connect to MySQL before accepting requests, so a bad DATABASE_URL fails fast at startup
try {
  await prisma.$connect();
  console.log('🗄️  Connected to MySQL');
} catch (error) {
  console.error('❌ Could not connect to MySQL. Check DATABASE_URL in .env:', error.message);
  process.exit(1);
}

server.listen(config.PORT, () => {
  console.log(`🚀 StockSense Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
  console.log(`👉 Health check: http://localhost:${config.PORT}/api/health`);
});

const handleShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);

  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Prisma client disconnected successfully.');
      process.exit(0);
    } catch (error) {
      console.error('Error during database disconnection:', error);
      process.exit(1);
    }
  });

  // Fallback timeout to force shutdown if hanging
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing termination.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
