import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/mongodb/User';
import { LoginLog } from '../models/mongodb/LoginLog';

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!user || !user.isActive) {
      // Log failed attempt
      await LoginLog.create({
        userId: user?._id?.toString() || 'unknown',
        username: usernameOrEmail,
        loginAt: new Date(),
        ip,
        success: false,
      });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Log failed attempt
      await LoginLog.create({
        userId: user._id.toString(),
        username: user.username,
        loginAt: new Date(),
        ip,
        success: false,
      });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Log successful login
    await LoginLog.create({
      userId: user._id.toString(),
      username: user.username,
      loginAt: new Date(),
      ip,
      success: true,
    });

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        roles: user.roles,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      username: string;
      roles: string[];
    };

    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;

