import app from './app';
import pool from './db/pool';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

async function cleanupExpiredRefreshTokens() {
  try {
    await pool.query(
      'DELETE FROM refresh_tokens WHERE revoked_at IS NOT NULL OR expires_at < NOW()'
    );
  } catch (err) {
    console.error('Failed to clean up refresh tokens:', err);
  }
}

cleanupExpiredRefreshTokens();
setInterval(cleanupExpiredRefreshTokens, 24 * 60 * 60 * 1000);
