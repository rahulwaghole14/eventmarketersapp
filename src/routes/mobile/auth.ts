import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createId as cuid } from '@paralleldrive/cuid2';
import { sendPasswordResetCodeEmail } from '../../services/emailService';

const router = Router();
const prisma = new PrismaClient();
const prismaAny = prisma as any;
const RESET_CODE_EXPIRY_MINUTES = parseInt(process.env.PASSWORD_RESET_CODE_EXPIRY_MINUTES || '15', 10);
const MAX_RESET_ATTEMPTS = parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || '5', 10);

const generateResetCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Middleware to extract user ID from JWT token (placeholder for mobile users)
const extractUserId = (req: Request, res: Response, next: any) => {
  // TODO: Implement actual JWT verification for mobile users
  // For now, we'll use a placeholder user ID
  req.userId = 'demo-mobile-user-id';
  next();
};

// Extend Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * POST /api/mobile/auth/register
 * Register new mobile user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { 
      deviceId, 
      name, 
      email, 
      password,
      phone, 
      appVersion, 
      platform, 
      fcmToken,
      companyName,
      alternatePhone,
      displayName,
      category,
      address,
      companyLogo,
      description,
      website
    } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID is required'
      });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (email && password) {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required for email registration'
        });
      }

      // Check if user with this email already exists
      const existingEmailUser = await prisma.mobileUser.findUnique({
        where: { email }
      });

      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Check if user already exists by deviceId
    const existingUser = await prisma.mobileUser.findUnique({
      where: { deviceId }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this device ID already exists'
      });
    }

    // Create new mobile user
    const mobileUser = await prisma.mobileUser.create({
      data: {
        deviceId,
        name: name || companyName || displayName,
        email,
        password: email && password ? hashedPassword : null,
        phone,
        isActive: true,
        lastActiveAt: new Date()
      }
    });

    // Create business profile if business information is provided
    let businessProfile = null;
    if (companyName || category) {
      businessProfile = await prisma.businessProfile.create({
        data: {
          mobileUserId: mobileUser.id,
          businessName: companyName || name || displayName || 'My Business',
          businessEmail: email || '',
          businessPhone: phone || '',
          alternatePhone: phone || '',
          businessAddress: address || '',
          businessCategory: category || 'General',
          businessLogo: companyLogo || '',
          businessDescription: description || '',
          businessWebsite: website || ''
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: mobileUser.id, 
        deviceId: mobileUser.deviceId,
        userType: 'MOBILE_USER' 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Mobile user registered successfully',
      data: {
        user: {
          id: mobileUser.id,
          deviceId: mobileUser.deviceId,
          name: mobileUser.name,
          email: mobileUser.email,
          phone: mobileUser.phone,
          isActive: mobileUser.isActive,
          businessProfile: businessProfile
        },
        token,
        refreshToken: null, // Can be implemented later
        expiresIn: 604800 // 7 days in seconds
      }
    });

  } catch (error) {
    console.error('Mobile user registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to register mobile user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/mobile/auth/login
 * Login mobile user by email/password or device ID
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, deviceId, rememberMe } = req.body;

    let mobileUser = null;

    // Email/password login
    if (email && password) {
      // Find mobile user by email
      mobileUser = await prisma.mobileUser.findUnique({
        where: { email }
      });

      if (!mobileUser) {
        return res.status(404).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      if (!mobileUser.password) {
        return res.status(400).json({
          success: false,
          error: 'Account was created without password. Please register again.'
        });
      }

      // Verify password
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, mobileUser.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      console.log('✅ Mobile user authenticated with email/password:', mobileUser.email);
    }
    // Device ID login (legacy support)
    else if (deviceId) {
      mobileUser = await prisma.mobileUser.findUnique({
        where: { deviceId }
      });

      if (!mobileUser) {
        return res.status(404).json({
          success: false,
          error: 'Mobile user not found'
        });
      }
    }
    else {
      return res.status(400).json({
        success: false,
        error: 'Email/password or device ID is required'
      });
    }

    if (!mobileUser.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Mobile user account is inactive'
      });
    }

    // Update last active time
    await prisma.mobileUser.update({
      where: { id: mobileUser.id },
      data: { lastActiveAt: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: mobileUser.id, 
        deviceId: mobileUser.deviceId,
        userType: 'MOBILE_USER' 
      },
      process.env.JWT_SECRET!,
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    res.json({
      success: true,
      message: 'Mobile user login successful',
      data: {
        user: {
          id: mobileUser.id,
          deviceId: mobileUser.deviceId,
          name: mobileUser.name,
          email: mobileUser.email,
          phone: mobileUser.phone,
          isActive: mobileUser.isActive,
          lastActiveAt: mobileUser.lastActiveAt,
          createdAt: mobileUser.createdAt,
          updatedAt: mobileUser.updatedAt
        },
        accessToken: token,
        token,
        refreshToken: null, // Can be implemented later
        expiresIn: rememberMe ? 2592000 : 604800 // 30 days or 7 days in seconds
      }
    });

  } catch (error) {
    console.error('Mobile user login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login mobile user'
    });
  }
});

/**
 * GET /api/mobile/auth/me
 * Get current mobile user info
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: decoded.id },
      include: {
        business_profiles: {
          orderBy: { createdAt: 'asc' }  // Use OLDEST profile (registration data)
        },
        mobile_subscriptions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'Mobile user not found'
      });
    }

    res.json({
      success: true,
      message: 'Mobile user info retrieved successfully',
      data: {
        id: mobileUser.id,
        deviceId: mobileUser.deviceId,
        name: mobileUser.name,
        email: mobileUser.email,
        phone: mobileUser.phone,
        isActive: mobileUser.isActive,
        lastActiveAt: mobileUser.lastActiveAt,
        createdAt: mobileUser.createdAt,
        updatedAt: mobileUser.updatedAt,
        businessProfiles: mobileUser.business_profiles,
        subscriptions: mobileUser.mobile_subscriptions
      }
    });

  } catch (error) {
    console.error('Get mobile user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mobile user info'
    });
  }
});

/**
 * GET /api/mobile/auth/profile
 * Get mobile user profile (authenticated endpoint)
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: decoded.id },
      include: {
        business_profiles: true,
        mobile_subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'Mobile user not found'
      });
    }

    const activeSubscription = mobileUser.mobile_subscriptions[0];

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        profile: {
          id: mobileUser.id,
          deviceId: mobileUser.deviceId,
          name: mobileUser.name,
          email: mobileUser.email,
          phone: mobileUser.phone,
          isActive: mobileUser.isActive,
          lastActiveAt: mobileUser.lastActiveAt,
          createdAt: mobileUser.createdAt,
          updatedAt: mobileUser.updatedAt,
          businessProfiles: mobileUser.business_profiles,
          subscription: activeSubscription ? {
            plan: activeSubscription.plan,
            status: activeSubscription.status,
            expiresAt: activeSubscription.endDate
          } : {
            plan: 'free',
            status: 'inactive',
            expiresAt: null
          }
        }
      }
    });

  } catch (error) {
    console.error('Get mobile user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mobile user profile'
    });
  }
});

/**
 * POST /api/mobile/auth/forgot-password
 * Send password reset email (for users with email)
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find mobile user by email
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { email }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'User with this email not found'
      });
    }

    if (!mobileUser.password) {
      return res.status(400).json({
        success: false,
        error: 'Account was created without password. Please register again.'
      });
    }

    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prismaAny.mobilePasswordResetCode.upsert({
      where: { mobileUserId: mobileUser.id },
      update: {
        code,
        email,
        expiresAt,
        attempts: 0,
        verifiedAt: null
      },
      create: {
        mobileUserId: mobileUser.id,
        email,
        code,
        expiresAt
      }
    });

    const emailSent = await sendPasswordResetCodeEmail({
      to: email,
      code,
      minutesValid: RESET_CODE_EXPIRY_MINUTES
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Unable to send verification email. Please try again later.'
      });
    }

    const responseData: Record<string, any> = {};
    if (process.env.NODE_ENV !== 'production') {
      responseData.debugCode = code;
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: responseData
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

/**
 * POST /api/mobile/auth/verify-reset-code
 * Verify 6-digit reset code before allowing password update
 */
router.post('/verify-reset-code', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and code are required'
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format'
      });
    }

    const mobileUser = await prisma.mobileUser.findUnique({
      where: { email }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'User with this email not found'
      });
    }

    const resetRecord = await prismaAny.mobilePasswordResetCode.findUnique({
      where: { mobileUserId: mobileUser.id }
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'No active reset request found. Please request a new code.'
      });
    }

    if (resetRecord.expiresAt < new Date()) {
      await prismaAny.mobilePasswordResetCode.delete({
        where: { mobileUserId: mobileUser.id }
      });
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.'
      });
    }

    if (resetRecord.attempts >= MAX_RESET_ATTEMPTS) {
      await prismaAny.mobilePasswordResetCode.delete({
        where: { mobileUserId: mobileUser.id }
      });
      return res.status(429).json({
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    if (resetRecord.code !== code) {
      await prismaAny.mobilePasswordResetCode.update({
        where: { mobileUserId: mobileUser.id },
        data: {
          attempts: { increment: 1 }
        }
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    await prismaAny.mobilePasswordResetCode.update({
      where: { mobileUserId: mobileUser.id },
      data: {
        verifiedAt: new Date(),
        attempts: 0
      }
    });

    res.json({
      success: true,
      message: 'Verification code confirmed'
    });

  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify code'
    });
  }
});

/**
 * POST /api/mobile/auth/reset-password
 * Reset password using reset token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, code, new password, and confirm password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    const mobileUser = await prisma.mobileUser.findUnique({
      where: { email }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const resetRecord = await prismaAny.mobilePasswordResetCode.findUnique({
      where: { mobileUserId: mobileUser.id }
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'No active reset request found. Please request a new code.'
      });
    }

    if (resetRecord.expiresAt < new Date()) {
      await prismaAny.mobilePasswordResetCode.delete({
        where: { mobileUserId: mobileUser.id }
      });
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.'
      });
    }

    if (resetRecord.code !== code) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.mobileUser.update({
        where: { id: mobileUser.id },
        data: { password: hashedPassword }
      }),
            prismaAny.mobilePasswordResetCode.delete({
        where: { mobileUserId: mobileUser.id }
      })
    ]);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

/**
 * POST /api/mobile/auth/verify-email
 * Verify user's email address
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    // Verify email token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    // Find user
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: decoded.id }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update email verification status (you might need to add this field to MobileUser model)
    // await prisma.mobileUser.update({
    //   where: { id: mobileUser.id },
    //   data: { isEmailVerified: true }
    // });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email'
    });
  }
});

/**
 * POST /api/mobile/auth/logout
 * Logout mobile user (user-specific)
 */
router.post('/logout', extractUserId, async (req: Request, res: Response) => {
  try {
    const mobileUserId = req.userId;

    if (!mobileUserId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Check if user exists
    const user = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update last active time
    await prisma.mobileUser.update({
      where: { id: mobileUserId },
      data: { lastActiveAt: new Date() }
    });

    // Log the logout activity
    await prisma.mobileActivity.create({
      data: {
        id: cuid(),
        mobileUserId: mobileUserId,
        action: 'LOGOUT',
        resource: 'Authentication',
        resourceType: 'Authentication',
        resourceId: null,
        details: JSON.stringify({
          logoutTime: new Date().toISOString(),
          userAgent: req.headers['user-agent'] || 'unknown'
        })
      }
    });

    res.json({
      success: true,
      message: 'Logout successful',
      data: {
        userId: mobileUserId,
        logoutTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

export default router;
