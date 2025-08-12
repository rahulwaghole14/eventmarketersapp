import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_CONFIG } from '../constants/firebase';

interface PaymentOptions {
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
  orderId?: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  notes?: { [key: string]: string };
  theme?: {
    color?: string;
  };
}

class PaymentService {
  // Initialize payment
  async initiatePayment(options: PaymentOptions): Promise<any> {
    try {
      const paymentOptions = {
        key: RAZORPAY_CONFIG.key,
        amount: options.amount * 100, // Razorpay expects amount in paise
        currency: options.currency || RAZORPAY_CONFIG.currency,
        name: options.name || RAZORPAY_CONFIG.name,
        description: options.description || RAZORPAY_CONFIG.description,
        order_id: options.orderId,
        prefill: options.prefill || {},
        notes: options.notes || {},
        theme: {
          color: options.theme?.color || '#3399cc',
        },
      };

      const data = await RazorpayCheckout.open(paymentOptions);
      return data;
    } catch (error) {
      console.error('Payment error:', error);
      throw error;
    }
  }

  // Verify payment signature
  verifyPaymentSignature(paymentId: string, orderId: string, signature: string): boolean {
    // Implement signature verification logic here
    // You'll need to verify the signature on your backend
    return true;
  }

  // Get payment status
  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      // Implement API call to get payment status
      // This should call your backend API
      return { status: 'success', paymentId };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }
}

export default new PaymentService(); 