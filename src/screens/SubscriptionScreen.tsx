import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RazorpayCheckout from 'react-native-razorpay';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isSubscribed, setIsSubscribed } = useSubscription();
  const { theme } = useTheme();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  // Subscription plans configuration
  const plans = {
    monthly: {
      name: 'Monthly Pro',
      price: '₹299',
      originalPrice: '₹499',
      savings: '40% OFF',
      period: 'month',
      features: [
        'Unlimited poster creation',
        'Premium templates',
        'No watermarks',
        'High-resolution exports',
        'Priority support',
        'Custom branding',
        'Advanced editing tools',
        'Cloud storage',
      ],
    },
    yearly: {
      name: 'Yearly Pro',
      price: '₹1,999',
      originalPrice: '₹5,988',
      savings: '67% OFF',
      period: 'year',
      features: [
        'Everything in Monthly Pro',
        '2 months free',
        'Early access to new features',
        'Exclusive templates',
        'API access',
        'White-label solution',
        'Team collaboration',
        'Analytics dashboard',
      ],
    },
  };

  const currentPlan = plans[selectedPlan];

  // Handle payment with Razorpay
  const handlePayment = async () => {
    if (isSubscribed) {
      Alert.alert('Already Subscribed', 'You are already a Pro subscriber!');
      return;
    }

    setIsProcessing(true);

    try {
      // Demo mode for testing (when using quick demo access)
      const isDemoMode = true; // Set to false for real payments
      
      if (isDemoMode) {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate successful payment
        const mockResponse = {
          razorpay_payment_id: 'pay_demo_' + Date.now(),
          razorpay_order_id: 'order_demo_' + Date.now(),
          razorpay_signature: 'demo_signature_' + Date.now(),
        };
        
        console.log('Demo payment success:', mockResponse);
        
        // Update subscription status
        await updateSubscriptionStatus(mockResponse.razorpay_payment_id);
        
        if (Platform.OS === 'android') {
          ToastAndroid.show('Demo Payment successful! Welcome to Pro!', ToastAndroid.LONG);
        } else {
          Alert.alert('Demo Success', 'Demo payment successful! Welcome to Pro!');
        }
        
        setIsSubscribed(true);
        navigation.goBack();
        return;
      }

      // Real Razorpay integration (when not in demo mode)
      const options = {
        description: `${currentPlan.name} Subscription`,
        image: 'https://your-app-logo.png',
        currency: 'INR',
        key: 'rzp_test_cB8TVykpqqbxSn', // Your Razorpay test key
        amount: selectedPlan === 'monthly' ? 29900 : 199900, // Amount in paise
        name: 'EventMarketers Pro',
        prefill: {
          email: 'user@example.com',
          contact: '9999999999',
          name: 'User Name',
        },
        theme: { color: '#667eea' },
        handler: async (response: any) => {
          console.log('Payment success:', response);
          
          // Call your backend to verify payment and update subscription
          await updateSubscriptionStatus(response.razorpay_payment_id);
          
          if (Platform.OS === 'android') {
            ToastAndroid.show('Payment successful! Welcome to Pro!', ToastAndroid.LONG);
          } else {
            Alert.alert('Success', 'Payment successful! Welcome to Pro!');
          }
          
          setIsSubscribed(true);
          navigation.goBack();
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const data = await RazorpayCheckout.open(options);
      console.log('Payment data:', data);
    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.code === 'PAYMENT_CANCELLED') {
        Alert.alert('Payment Cancelled', 'Payment was cancelled by user.');
      } else {
        Alert.alert('Payment Failed', 'Something went wrong with the payment. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Update subscription status on backend
  const updateSubscriptionStatus = async (paymentId: string) => {
    try {
      // In a real app, make API call to your backend
      // await axios.post('/api/subscription/activate', {
      //   paymentId,
      //   plan: selectedPlan,
      //   userId: currentUser.id,
      // });
      
      console.log('Subscription updated on backend:', { paymentId, plan: selectedPlan });
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const FeatureItem = ({ text, included = true }: { text: string; included?: boolean }) => (
    <View style={styles.featureItem}>
      <Icon 
        name={included ? 'check-circle' : 'remove-circle'} 
        size={20} 
        color={included ? '#28a745' : '#dc3545'} 
      />
      <Text style={[
        styles.featureText, 
        { color: theme.colors.text },
        !included && { color: theme.colors.textSecondary }
      ]}>
        {text}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { 
      paddingTop: insets.top,
      backgroundColor: theme.colors.background 
    }]}>
      <StatusBar 
        barStyle={theme.dark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background} 
      />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
                 <View style={styles.headerContent}>
           <Text style={styles.headerTitle}>Upgrade to Pro</Text>
           <Text style={styles.headerSubtitle}>
             Unlock unlimited possibilities
           </Text>
           <View style={styles.demoBadge}>
             <Text style={styles.demoBadgeText}>DEMO MODE</Text>
           </View>
         </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Plan Selector */}
        <View style={[styles.planSelector, { backgroundColor: theme.colors.cardBackground }]}>
          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === 'monthly' && styles.planOptionSelected
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={[
              styles.planOptionText,
              { color: theme.colors.textSecondary },
              selectedPlan === 'monthly' && styles.planOptionTextSelected
            ]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === 'yearly' && styles.planOptionSelected
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.yearlyBadge}>
              <Text style={styles.yearlyBadgeText}>BEST VALUE</Text>
            </View>
            <Text style={[
              styles.planOptionText,
              { color: theme.colors.textSecondary },
              selectedPlan === 'yearly' && styles.planOptionTextSelected
            ]}>
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comparison Cards */}
        <View style={styles.comparisonContainer}>
          {/* Free Plan Card */}
          <View style={[styles.planCard, { backgroundColor: theme.colors.cardBackground }]}>
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: theme.colors.text }]}>Free</Text>
              <Text style={styles.planPrice}>₹0</Text>
              <Text style={[styles.planPeriod, { color: theme.colors.textSecondary }]}>forever</Text>
            </View>
            
            <View style={styles.featuresList}>
              <FeatureItem text="5 posters per month" included={true} />
              <FeatureItem text="Basic templates" included={true} />
              <FeatureItem text="Standard resolution" included={true} />
              <FeatureItem text="Community support" included={true} />
              <FeatureItem text="Premium templates" included={false} />
              <FeatureItem text="No watermarks" included={false} />
              <FeatureItem text="High-resolution exports" included={false} />
              <FeatureItem text="Priority support" included={false} />
            </View>
          </View>

          {/* Pro Plan Card */}
          <View style={[styles.proCard, { backgroundColor: theme.colors.cardBackground }]}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: theme.colors.text }]}>Pro</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.planPrice}>{currentPlan.price}</Text>
                <Text style={[styles.originalPrice, { color: theme.colors.textSecondary }]}>{currentPlan.originalPrice}</Text>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>{currentPlan.savings}</Text>
                </View>
              </View>
              <Text style={[styles.planPeriod, { color: theme.colors.textSecondary }]}>per {currentPlan.period}</Text>
            </View>
            
            <View style={styles.featuresList}>
              {currentPlan.features.map((feature, index) => (
                <FeatureItem key={index} text={feature} included={true} />
              ))}
            </View>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={[styles.benefitsSection, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.benefitsTitle, { color: theme.colors.text }]}>Why Upgrade to Pro?</Text>
          <View style={styles.benefitsGrid}>
                         <View style={[styles.benefitItem, { backgroundColor: theme.colors.inputBackground }]}>
               <Icon name="infinity" size={32} color="#667eea" />
               <Text style={[styles.benefitTitle, { color: theme.colors.text }]}>Unlimited</Text>
               <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>Create unlimited posters</Text>
             </View>
             <View style={[styles.benefitItem, { backgroundColor: theme.colors.inputBackground }]}>
               <Icon name="star" size={32} color="#667eea" />
               <Text style={[styles.benefitTitle, { color: theme.colors.text }]}>Premium</Text>
               <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>Access premium templates</Text>
             </View>
             <View style={[styles.benefitItem, { backgroundColor: theme.colors.inputBackground }]}>
               <Icon name="hd" size={32} color="#667eea" />
               <Text style={[styles.benefitTitle, { color: theme.colors.text }]}>HD Quality</Text>
               <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>High-resolution exports</Text>
             </View>
             <View style={[styles.benefitItem, { backgroundColor: theme.colors.inputBackground }]}>
               <Icon name="support-agent" size={32} color="#667eea" />
               <Text style={[styles.benefitTitle, { color: theme.colors.text }]}>Priority</Text>
               <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>Priority customer support</Text>
             </View>
          </View>
        </View>

                 {/* Bottom Spacer for Sticky Button */}
         <View style={{ height: 140 }} />
      </ScrollView>

      {/* Sticky Upgrade Button */}
      <View style={[
        styles.stickyButtonContainer, 
        { 
          paddingBottom: Math.max(insets.bottom + 20, 40),
          backgroundColor: theme.colors.cardBackground,
          borderTopColor: theme.colors.border
        }
      ]}>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handlePayment}
          disabled={isProcessing || isSubscribed}
        >
          <LinearGradient
            colors={isSubscribed 
              ? ['#28a745', '#20c997'] 
              : isProcessing 
                ? ['#cccccc', '#999999'] 
                : ['#667eea', '#764ba2']
            }
            style={styles.upgradeButtonGradient}
          >
            <Icon 
              name={isSubscribed ? 'check-circle' : 'upgrade'} 
              size={24} 
              color="#ffffff" 
            />
                         <Text style={styles.upgradeButtonText}>
               {isSubscribed 
                 ? 'Already Pro' 
                 : isProcessing 
                   ? 'Processing...' 
                   : `Demo: Upgrade to Pro - ${currentPlan.price}`
               }
             </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {!isSubscribed && (
          <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
            By upgrading, you agree to our Terms of Service and Privacy Policy
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 0,
    zIndex: 1000,
    elevation: 10,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
     headerSubtitle: {
     fontSize: 14,
     color: 'rgba(255, 255, 255, 0.8)',
     marginTop: 2,
   },
   demoBadge: {
     backgroundColor: 'rgba(255, 255, 255, 0.2)',
     paddingHorizontal: 12,
     paddingVertical: 4,
     borderRadius: 12,
     marginTop: 8,
   },
   demoBadgeText: {
     fontSize: 10,
     fontWeight: '700',
     color: '#ffffff',
     textAlign: 'center',
   },
   headerSpacer: {
     width: 44,
   },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  planSelector: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  planOptionSelected: {
    backgroundColor: '#667eea',
  },
  planOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  planOptionTextSelected: {
    color: '#ffffff',
  },
  yearlyBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  yearlyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  planCard: {
    flex: 1,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  proCard: {
    flex: 1,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    position: 'relative',
  },
  proBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -30,
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#667eea',
  },
  originalPrice: {
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: -40,
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  planPeriod: {
    fontSize: 14,
    marginTop: 4,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  benefitsSection: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  benefitItem: {
    width: (screenWidth - 88) / 2,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    minHeight: 120,
    justifyContent: 'center',
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  benefitText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  upgradeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  upgradeButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default SubscriptionScreen;
