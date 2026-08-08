import { SignJWT, jwtVerify } from 'jose';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET missing');
  return new TextEncoder().encode(s);
}

export async function signToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string }> {
  const { payload } = await jwtVerify(token, secret());
  const userId = payload.sub;
  const email = typeof payload.email === 'string' ? payload.email : '';
  if (!userId) throw new Error('invalid token');
  return { userId, email };
}
