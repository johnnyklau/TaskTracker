import app from './app';
import pool from './db/pool';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    pool.end().then(() => process.exit(0));
  });
});

async function cleanupExpiredRefreshTokens() {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
  } catch (err) {
    console.error('Failed to clean up refresh tokens:', err);
  }
}

cleanupExpiredRefreshTokens();
setInterval(cleanupExpiredRefreshTokens, 24 * 60 * 60 * 1000);
