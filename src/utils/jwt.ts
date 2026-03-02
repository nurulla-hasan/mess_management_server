import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mess_management_jwt_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mess_management_refresh_secret_key_2024_secure';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateToken = (userId: string, role: string, messId?: string): string => {
  return jwt.sign({ userId, role, messId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (userId: string, role: string, messId?: string): string => {
  return jwt.sign({ userId, role, messId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): { userId: string; role: string; messId?: string } => {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; messId?: string };
};

export const verifyRefreshToken = (token: string): { userId: string; role: string; messId?: string } => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; role: string; messId?: string };
};
