import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';

export async function createTestUser(email = 'HSY@example.com') {
  const passwordHash = await bcrypt.hash('password123', 10);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email, passwordHash]
  );
  const user = result.rows[0];
  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: '15m',
  });

  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshTokenHash, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
  );

  return { user, accessToken, refreshToken };
}
