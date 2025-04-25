import { Router } from 'express';
import prisma from '../db';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, Role } from '../config';
import bcrypt from 'bcryptjs';
import { authenticateToken, authorizeRole } from '../middlewares';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import crypto, { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().optional(),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
const requestResetSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  password: z.string().min(8),
});
const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string(),
});

function validate(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }
    req.body = result.data;
    next();
  };
}

// Password policy utility
function isPasswordStrong(password: string): boolean {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(
    password
  );
}

// Log authentication events
function logAuthEvent(
  type: 'login' | 'register' | 'fail',
  email: string,
  req: any
) {
  req.log?.info?.({
    event: type,
    email,
    ip: req.ip,
    time: new Date().toISOString(),
  });
}

authRouter.post('/register', validate(registerSchema), async (req, res) => {
  const { email, password, role } = req.body;
  if (!isPasswordStrong(password)) {
    logAuthEvent('fail', email, req);
    return res.status(400).json({
      error:
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
    });
  }
  // Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const emailVerificationTokenExpiry = new Date(
    Date.now() + 1000 * 60 * 60 * 24
  ); // 24h
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || Role.USER,
        isEmailVerified: false,
        emailVerificationToken,
        emailVerificationTokenExpiry,
      },
    });
    // Send verification email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASS || 'pass',
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to: email,
      subject: 'Verify your email',
      text: `Verify your email: https://your-app/verify-email?token=${emailVerificationToken}&email=${email}`,
    });
    logAuthEvent('register', email, req);
    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      message: 'Please verify your email.',
    });
  } catch (e: any) {
    logAuthEvent('fail', email, req);
    console.error('Register error:', e); // Log the actual error
    // Prisma unique constraint error code: P2002
    if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Registration failed', details: e.message });
  }
});

authRouter.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logAuthEvent('fail', email, req);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Account lockout logic
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    return res.status(403).json({
      error:
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
    });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    // Increment failed attempts
    let failedLoginAttempts = user.failedLoginAttempts + 1;
    let lockoutUntil = null;
    if (failedLoginAttempts >= 5) {
      lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
      failedLoginAttempts = 0; // reset after lockout
    }
    await prisma.user.update({
      where: { email },
      data: { failedLoginAttempts, lockoutUntil },
    });
    logAuthEvent('fail', email, req);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Reset failed attempts on successful login
  if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
    await prisma.user.update({
      where: { email },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });
  }
  logAuthEvent('login', email, req);
  // Issue access and refresh tokens
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '15m',
  });
  const refreshToken = randomBytes(40).toString('hex');
  const refreshTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
  await prisma.user.update({
    where: { email },
    data: { refreshToken, refreshTokenExpiry },
  });
  res.json({ token, refreshToken });
});

authRouter.post('/refresh-token', async (req, res) => {
  const { email, refreshToken } = req.body;
  if (!email || !refreshToken)
    return res.status(400).json({ error: 'Email and refresh token required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.refreshToken || !user.refreshTokenExpiry)
    return res.status(401).json({ error: 'Invalid refresh token' });
  if (
    user.refreshToken !== refreshToken ||
    user.refreshTokenExpiry < new Date()
  )
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  // Issue new access and refresh tokens
  const newToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '15m',
  });
  const newRefreshToken = randomBytes(40).toString('hex');
  const newRefreshTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await prisma.user.update({
    where: { email },
    data: {
      refreshToken: newRefreshToken,
      refreshTokenExpiry: newRefreshTokenExpiry,
    },
  });
  res.json({ token: newToken, refreshToken: newRefreshToken });
});

authRouter.post('/logout', async (req, res) => {
  const { email, refreshToken } = req.body;
  if (!email || !refreshToken)
    return res.status(400).json({ error: 'Email and refresh token required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.refreshToken !== refreshToken)
    return res.status(200).json({ message: 'Logged out' });
  await prisma.user.update({
    where: { email },
    data: { refreshToken: null, refreshTokenExpiry: null },
  });
  res.json({ message: 'Logged out' });
});

authRouter.post(
  '/request-password-reset',
  validate(requestResetSchema),
  async (req, res) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res
        .status(200)
        .json({ message: 'If the email exists, a reset link will be sent.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 30); // 30 min
    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
    // Send email (replace with your email config)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASS || 'pass',
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to: email,
      subject: 'Password Reset',
      text: `Reset your password: https://your-app/reset-password?token=${token}&email=${email}`,
    });
    res.json({ message: 'If the email exists, a reset link will be sent.' });
  }
);

authRouter.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req, res) => {
    const { email, token, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetToken || !user.resetTokenExpiry)
      return res.status(400).json({ error: 'Invalid or expired token' });
    if (user.resetToken !== token || user.resetTokenExpiry < new Date())
      return res.status(400).json({ error: 'Invalid or expired token' });
    if (!isPasswordStrong(password))
      return res.status(400).json({
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    res.json({ message: 'Password reset successful' });
  }
);

authRouter.post(
  '/verify-email',
  validate(verifyEmailSchema),
  async (req, res) => {
    const { email, token } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.emailVerificationToken ||
      !user.emailVerificationTokenExpiry
    ) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    if (
      user.emailVerificationToken !== token ||
      user.emailVerificationTokenExpiry < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    await prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });
    res.json({ message: 'Email verified successfully' });
  }
);

authRouter.get('/me', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  res.json(user);
});

authRouter.get(
  '/admin',
  authenticateToken,
  authorizeRole([Role.ADMIN]),
  (req, res) => {
    res.json({ message: 'Welcome, admin!' });
  }
);

// Centralized error handler
function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.log?.error?.(err);
  res.status(500).json({ error: 'Internal server error' });
}

// At the end of the file, after all routes:
authRouter.use(errorHandler);
