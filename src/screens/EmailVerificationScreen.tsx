import React, { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Alert } from 'react-native';
import loginAPIs from '../services/loginAPIs';
import authService from '../services/auth';
import OtpVerificationComponent from '../components/OtpVerificationComponent';
import { RootStackParamList } from '../navigation/types';

type EmailVerificationNavigationProp = StackNavigationProp<RootStackParamList, 'EmailVerification'>;
type EmailVerificationRouteProp = RouteProp<RootStackParamList, 'EmailVerification'>;

type Props = {
  navigation: EmailVerificationNavigationProp;
  route: EmailVerificationRouteProp;
};

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email, phone } = route.params;

  const handleVerify = useCallback(async (code: string) => {
    console.log('[EmailVerification] Verifying OTP:', { phone, otpCode: code });
    
    // Call email verification API
    const response = await loginAPIs.verifyEmailCode({ phone, otpCode: code });
    
    console.log('[EmailVerification] API Response:', JSON.stringify(response));
    
    const user = response.user || response.data?.user;
    const token = response.token || response.data?.token;
    
    console.log('[EmailVerification] Extracted user:', JSON.stringify(user));
    console.log('[EmailVerification] Extracted token:', token ? 'EXISTS' : 'MISSING');
    
    if (response.success && token) {
      console.log('[EmailVerification] Save user to storage...');
      // Save token and user data
      await authService.saveUserToStorage(user, token);
      
      // Remove logout flag and registration steps since user is now explicitly logged in
      await AsyncStorage.removeItem('isLoggedOut');
      await AsyncStorage.removeItem('registration_step');
      
      authService.setCurrentUser(user);
      
      console.log('[EmailVerification] Notifying auth state listeners with user...');
      // Notify auth state listeners to trigger navigation
      authService.notifyAuthStateListeners(user);
      
      // Navigation will be handled automatically by auth state change
    } else {
      console.error('[EmailVerification] Verification failed. Success:', response.success, 'Token:', !!token);
      throw new Error('Verification failed');
    }
  }, [phone, navigation]);

  const handleResend = useCallback(async () => {
    console.log('api', { phone });
    
    await loginAPIs.resendEmailVerification({ phone });
    
    console.log('Response', 'Resend requested');
  }, [phone]);

  return (
    <OtpVerificationComponent
      email={email || phone || ''}
      onVerify={handleVerify}
      onResend={handleResend}
      title={phone ? "Verify Your Phone" : "Verify Your Email"}
      subtitle={phone ? "Enter the 6-digit code sent to your WhatsApp" : "Enter the 6-digit code sent to your email"}
      buttonText="Verify"
      resendCooldown={60}
    />
  );
};

export default EmailVerificationScreen;
