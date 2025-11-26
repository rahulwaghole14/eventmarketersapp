import { Request, Response } from 'express';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { createId as cuid } from '@paralleldrive/cuid2';
import Razorpay from 'razorpay';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Middleware to extract user ID from JWT token for mobile users
const extractMobileUserId = (req: Request, res: Response, next: any) => {
  try {
    console.log('🔐 extractMobileUserId middleware - Processing request');
    console.log('📥 Authorization header:', req.headers.authorization);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header found');
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    console.log('🔑 Token extracted:', token.substring(0, 20) + '...');
    
    // Try to verify JWT token
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      console.log('🔍 JWT decoded:', decoded);
      
      // Extract user ID from token - check for mobile user type
      let userId;
      if (decoded.userType === 'MOBILE_USER' && decoded.id) {
        userId = decoded.id;
        req.mobileUserId = userId;
        console.log('✅ Mobile user ID extracted from JWT:', userId);
      } else {
        // Fallback to header-based user ID
        userId = req.headers['x-user-id'] as string || 'demo-mobile-user-id';
        req.mobileUserId = userId;
        console.log('⚠️ Using fallback user ID:', userId);
      }
      
      console.log('✅ User ID set from JWT:', userId);
      next();
    } catch (jwtError) {
      console.log('⚠️ JWT verification failed, using fallback:', jwtError.message);
      
      // Fallback to header-based user ID
      const userId = req.headers['x-user-id'] as string || 'demo-mobile-user-id';
      req.mobileUserId = userId;
      
      console.log('✅ User ID set from header fallback:', userId);
      next();
    }
  } catch (error) {
    console.log('❌ Error in extractMobileUserId middleware:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid authorization token'
    });
  }
};

// Extend Request interface to include mobileUserId
declare global {
  namespace Express {
    interface Request {
      mobileUserId?: string;
    }
  }
}

// Get Subscription Plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    // Define subscription plans (these could be stored in database)
    const plans = [
     
      {
        id: 'quarterly_pro',
        name: 'Quarterly Pro',
        price: 499,
        originalPrice: 999,
        savings: '49% OFF',
        period: 'quarter',
        features: [
          'Access to all premium business templates',
          'Unlimited downloads',
          'High-resolution content',
          'Priority customer support',
          'New templates every week',
          'Commercial usage rights',
          'Exclusive yearly subscriber content',
          'Advanced editing tools',
          'Bulk download feature'
        ]
      }
    ];

    res.json({
      success: true,
      data: {
        plans
      }
    });

  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch subscription plans'
      }
    });
  }
});

// Create Payment Order (Mock Razorpay Integration)
router.post('/create-order', extractMobileUserId, [
  body('planId').notEmpty().withMessage('Plan ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { planId, amount } = req.body;
    const mobileUserId = req.mobileUserId;

    if (!mobileUserId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'User authentication required'
        }
      });
    }

    // Check if mobile user exists
    const mobileUser = await prisma.mobileUser.findFirst({
      where: { id: mobileUserId }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Mobile user not found'
        }
      });
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Amount must be a positive number'
        }
      });
    }

    // Razorpay expects amount in paise, so multiply rupees by 100
    const amountInPaise = Math.round(numericAmount * 100);

    // Verify Razorpay credentials are configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('❌ Razorpay credentials not configured');
      return res.status(500).json({
        success: false,
        error: {
          code: 'RAZORPAY_CONFIG_ERROR',
          message: 'Razorpay credentials not configured',
          details: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required'
        }
      });
    }

    // Create order in Razorpay
    let razorpayOrder;
    try {
      console.log('🔄 Creating Razorpay order with amount:', amountInPaise, 'paise');
      // Generate short receipt (max 40 chars as per Razorpay requirement)
      const shortUserId = mobileUserId.substring(0, 8);
      const timestamp = Date.now().toString().slice(-10);
      const receipt = `rcpt_${shortUserId}_${timestamp}`.substring(0, 40);
      
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise, // Amount in paise
        currency: 'INR',
        receipt: receipt,
        notes: {
          planId,
          mobileUserId,
          description: `Subscription payment for ${planId}`
        }
      });

      console.log('✅ Razorpay order created:', razorpayOrder.id);
    } catch (razorpayError: any) {
      console.error('❌ Razorpay order creation failed:', razorpayError);
      const errorMessage = razorpayError.message || razorpayError.error?.description || JSON.stringify(razorpayError);
      const errorDetails = {
        message: errorMessage,
        statusCode: razorpayError.statusCode,
        error: razorpayError.error
      };
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'RAZORPAY_ERROR',
          message: 'Failed to create Razorpay order',
          details: errorMessage,
          debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        }
      });
    }

    const orderId = razorpayOrder.id;

    // Log the payment attempt
    await prisma.mobileActivity.create({
      data: {
        id: cuid(),
        mobileUserId: mobileUserId,
        action: 'PAYMENT_INITIATED',
        resource: 'Subscription',
        resourceType: 'Subscription',
        resourceId: orderId,
        details: JSON.stringify({
          planId,
          amount: numericAmount,
          amountInPaise,
          orderId,
          razorpayOrderId: razorpayOrder.id,
          razorpayStatus: razorpayOrder.status
        })
      }
    });

    res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id, // Real Razorpay order ID
        amount: numericAmount, // Amount in rupees (for display)
        amountInPaise, // Amount in paise (use this for Razorpay order creation)
        currency: 'INR',
        // Razorpay key - use this in frontend Razorpay initialization
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
        planId,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status
      }
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create payment order'
      }
    });
  }
});

// Verify Payment (Mock Implementation)
router.post('/verify-payment', extractMobileUserId, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('signature').notEmpty().withMessage('Signature is required'),
  body('planId').optional().isString().withMessage('Plan ID must be a string'),
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { orderId, paymentId, signature, planId, amount } = req.body;
    const mobileUserId = req.mobileUserId;

    if (!mobileUserId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'User authentication required'
        }
      });
    }

    // Check if mobile user exists
    const mobileUser = await prisma.mobileUser.findFirst({
      where: { id: mobileUserId }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Mobile user not found'
        }
      });
    }

    // Check if this paymentId has already been used (prevent duplicate payments)
    const existingSubscriptionWithPayment = await prisma.mobileSubscription.findFirst({
      where: { paymentId: paymentId }
    });

    if (existingSubscriptionWithPayment) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_PAYMENT',
          message: 'This payment has already been processed',
          data: {
            existingSubscriptionId: existingSubscriptionWithPayment.id
          }
        }
      });
    }

    // Check for existing active subscription
    const existingActiveSubscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId: mobileUserId,
        status: 'ACTIVE',
        endDate: {
          gte: new Date()
        }
      },
      orderBy: { endDate: 'desc' }
    });

    // In a real implementation, you would verify the payment signature with Razorpay:
    // const crypto = require('crypto');
    // const razorpaySecret = process.env.RAZORPAY_SECRET || '';
    // const text = orderId + '|' + paymentId;
    // const generatedSignature = crypto.createHmac('sha256', razorpaySecret).update(text).digest('hex');
    // if (generatedSignature !== signature) {
    //   return res.status(400).json({
    //     success: false,
    //     error: { code: 'INVALID_SIGNATURE', message: 'Payment signature verification failed' }
    //   });
    // }

    // For now, we'll mock a successful verification
    // Validate signature format (basic check)
    if (!signature || signature.length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid payment signature format'
        }
      });
    }

    // Determine plan details
    const subscriptionPlanId = planId || 'quarterly_pro';
    const subscriptionAmount = amount || 499;
    
    // Calculate subscription duration based on plan
    let monthsToAdd = 3; // Default quarterly
    if (subscriptionPlanId.includes('monthly')) {
      monthsToAdd = 1;
    } else if (subscriptionPlanId.includes('yearly') || subscriptionPlanId.includes('annual')) {
      monthsToAdd = 12;
    }

    // Handle existing subscription: extend end date instead of creating duplicate
    let subscription;
    if (existingActiveSubscription) {
      // Extend existing subscription
      const newEndDate = new Date(existingActiveSubscription.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);

      subscription = await prisma.mobileSubscription.update({
        where: { id: existingActiveSubscription.id },
        data: {
          plan: subscriptionPlanId,
          planId: subscriptionPlanId,
          status: 'ACTIVE',
          endDate: newEndDate,
          amount: subscriptionAmount,
          paymentId: paymentId,
          paymentMethod: 'razorpay',
          autoRenew: true,
          updatedAt: new Date()
        }
      });

      // Log renewal activity
      await prisma.mobileActivity.create({
        data: {
          id: cuid(),
          mobileUserId: mobileUserId,
          action: 'SUBSCRIPTION_RENEWED',
          resource: 'Subscription',
          resourceType: 'Subscription',
          resourceId: subscription.id,
          details: JSON.stringify({
            orderId,
            paymentId,
            planId: subscription.planId,
            amount: subscription.amount,
            previousEndDate: existingActiveSubscription.endDate,
            newEndDate: subscription.endDate
          })
        }
      });

      // Create transaction record for renewal
      await prisma.mobileTransaction.create({
        data: {
          id: cuid(),
          mobileUserId: mobileUserId,
          amount: subscriptionAmount,
          currency: 'INR',
          paymentId: paymentId,
          paymentMethod: 'razorpay',
          status: 'SUCCESS'
        }
      });
    } else {
      // Create new subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthsToAdd);

      subscription = await prisma.mobileSubscription.create({
        data: {
          id: cuid(),
          mobileUserId: mobileUserId,
          plan: subscriptionPlanId,
          planId: subscriptionPlanId,
          status: 'ACTIVE',
          startDate,
          endDate,
          amount: subscriptionAmount,
          paymentId: paymentId,
          paymentMethod: 'razorpay',
          autoRenew: true
        }
      });

      // Log successful payment
      await prisma.mobileActivity.create({
        data: {
          id: cuid(),
          mobileUserId: mobileUserId,
          action: 'PAYMENT_SUCCESS',
          resource: 'Subscription',
          resourceType: 'Subscription',
          resourceId: subscription.id,
          details: JSON.stringify({
            orderId,
            paymentId,
            planId: subscription.planId,
            amount: subscription.amount
          })
        }
      });

      // Create transaction record
      await prisma.mobileTransaction.create({
        data: {
          id: cuid(),
          mobileUserId: mobileUserId,
          amount: subscriptionAmount,
          currency: 'INR',
          paymentId: paymentId,
          paymentMethod: 'razorpay',
          status: 'SUCCESS'
        }
      });
    }

    res.json({
      success: true,
      message: existingActiveSubscription ? 'Payment verified and subscription renewed successfully' : 'Payment verified successfully',
      data: {
        subscription: {
          id: subscription.id,
          plan: subscription.planId,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          amount: subscription.amount,
          daysRemaining: Math.ceil((subscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        },
        isRenewal: !!existingActiveSubscription
      }
    });

  } catch (error: any) {
    console.error('Verify payment error:', error);
    
    // Check for duplicate entry error
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_PAYMENT',
          message: 'This payment has already been processed'
        }
      });
    }
    
    // Log failed payment
    if (req.mobileUserId) {
      await prisma.mobileActivity.create({
        data: {
          id: cuid(),
          mobileUserId: req.mobileUserId,
          action: 'PAYMENT_FAILED',
          resource: 'Subscription',
          resourceType: 'Subscription',
          resourceId: req.body.orderId || 'unknown',
          details: JSON.stringify({
            orderId: req.body.orderId,
            paymentId: req.body.paymentId,
            error: error.message || 'Payment verification failed'
          })
        }
      }).catch(console.error);
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_VERIFICATION_FAILED',
        message: error.message || 'Failed to verify payment'
      }
    });
  }
});

// Get Subscription Status
router.get('/status', extractMobileUserId, async (req: Request, res: Response) => {
  try {
    const mobileUserId = req.mobileUserId;

    if (!mobileUserId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'User authentication required'
        }
      });
    }

    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: {
        mobile_subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          take: 1
        }
      }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Mobile user not found'
        }
      });
    }

    const activeSubscription = mobileUser.mobile_subscriptions[0];
    const now = new Date();

    // Check if subscription is expired
    if (activeSubscription && activeSubscription.endDate < now) {
      // Update subscription status to expired
      await Promise.all([
        prisma.mobileSubscription.update({
          where: { id: activeSubscription.id },
          data: { status: 'EXPIRED' }
        })
      ]);
    }

    res.json({
      success: true,
      data: {
        subscription: activeSubscription && activeSubscription.endDate >= now ? {
          id: activeSubscription.id,
          plan: activeSubscription.planId,
          status: activeSubscription.status,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
          daysRemaining: Math.ceil((activeSubscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        } : {
          plan: 'free',
          status: 'inactive',
          startDate: null,
          endDate: null,
          daysRemaining: 0
        }
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch subscription status'
      }
    });
  }
});

// Cancel Subscription
router.post('/cancel', extractMobileUserId, async (req: Request, res: Response) => {
  try {
    const mobileUserId = req.mobileUserId;

    if (!mobileUserId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'User authentication required'
        }
      });
    }

    const activeSubscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId,
        status: 'ACTIVE'
      }
    });

    if (!activeSubscription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_ACTIVE_SUBSCRIPTION',
          message: 'No active subscription found'
        }
      });
    }

    // Update subscription status
    await Promise.all([
      prisma.mobileSubscription.update({
        where: { id: activeSubscription.id },
        data: { status: 'CANCELLED' }
      }),
      // Log cancellation
      prisma.mobileActivity.create({
        data: {
          id: cuid(),
          mobileUserId: mobileUserId,
          action: 'SUBSCRIPTION_CANCELLED',
          resource: 'Subscription',
          resourceType: 'Subscription',
          resourceId: activeSubscription.id,
          details: JSON.stringify({
            subscriptionId: activeSubscription.id,
            planId: activeSubscription.planId,
            reason: 'User cancelled subscription'
          })
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscription: {
          id: activeSubscription.id,
          status: 'CANCELLED',
          endDate: activeSubscription.endDate // Still valid until end date
        }
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to cancel subscription'
      }
    });
  }
});

// Get Payment History
router.get('/history', extractMobileUserId, async (req: Request, res: Response) => {
  try {
    const mobileUserId = req.mobileUserId;

    if (!mobileUserId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'User authentication required'
        }
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [mobile_subscriptions, total] = await Promise.all([
      prisma.mobileSubscription.findMany({
        where: { mobileUserId },
        select: {
          id: true,
          planId: true,
          status: true,
          amount: true,
          startDate: true,
          endDate: true,
          paymentId: true,
          paymentMethod: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.mobileSubscription.count({ where: { mobileUserId } })
    ]);

    const paymentHistory = mobile_subscriptions.map(subscription => ({
      id: subscription.id,
      plan: subscription.planId,
      status: subscription.status,
      amount: subscription.amount,
      currency: 'INR',
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      paymentId: subscription.paymentId || `mock_${subscription.id.slice(-8)}`,
      paymentMethod: subscription.paymentMethod || 'Razorpay',
      paidAt: subscription.createdAt,
      description: 'Quarterly Pro Plan Subscription',
      isActive: subscription.status === 'ACTIVE' && subscription.endDate > new Date()
    }));

    res.json({
      success: true,
      data: {
        payments: paymentHistory,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalPayments: total,
          totalAmount: mobile_subscriptions.reduce((sum, sub) => sum + sub.amount, 0),
          currency: 'INR'
        }
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch payment history'
      }
    });
  }
});

export default router;
