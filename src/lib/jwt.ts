import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const KEY = new TextEncoder().encode(JWT_SECRET);

export async function signToken(payload: { userId: string; email: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(KEY);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, KEY, {
      algorithms: ['HS256'],
    });
    return payload as { userId: string; email: string };
  } catch (error) {
    return null;
  }
}
