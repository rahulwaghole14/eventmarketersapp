import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Modal,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import loginAPIs from '../services/loginAPIs';
import { moderateScale } from '../utils/responsiveUtils';
import { getUserFriendlyError } from '../utils/errorHandler';

const RegistrationScreen: React.FC = ({ navigation }: any) => {
  const { isDarkMode, theme } = useTheme();

  // Dynamic dimensions hook
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;

  const styles = useMemo(() => {
    return getStyles(screenWidth, screenHeight, theme);
  }, [screenWidth, screenHeight, theme]);

  // Step 1 States
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [hasPromo, setHasPromo] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Validation States
  const [phoneValidationError, setPhoneValidationError] = useState('');
  const [otpValidationError, setOtpValidationError] = useState('');
  const [promoValidationError, setPromoValidationError] = useState('');

  // Modals / Animation States
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: 'Error',
    message: '',
    type: 'error' as 'error' | 'success' | 'info' | 'warning',
    buttonText: 'OK',
    onPress: null as (() => void) | null,
  });
  const modalAnimation = useRef(new Animated.Value(0)).current;

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validatePhone = (phoneNumber: string): string => {
    if (!phoneNumber || !phoneNumber.trim()) return 'Phone number is required';
    const digits = phoneNumber.trim().replace(/\D/g, '');
    if (digits.length !== 10) return 'Phone must be exactly 10 digits';
    if (!/^[6-9]\d{9}$/.test(digits)) return 'Please enter a valid Indian mobile number starting with 6-9';
    return '';
  };

  const handlePhoneSubmit = async () => {
    const error = validatePhone(phone);
    if (error) {
      setPhoneValidationError(error);
      return;
    }
    setPhoneValidationError('');
    setIsLoading(true);

    try {
      const registerResult = await loginAPIs.registerUser({
        phoneNumber: phone.trim(),
      });

      if (registerResult.requiresVerification) {
        setOtpSent(true);
        setResendCooldown(60);
        showCustomModal('OTP Sent', 'A verification OTP has been sent to your WhatsApp.', 'success');
      }
    } catch (error: any) {
      const status = error.response?.status;
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || '';
      
      // If user already exists (409 conflict), show Already Registered modal and redirect to Sign In
      if (status === 409 || errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('duplicate')) {
        showCustomModal(
          'Already Registered',
          'This phone number is already registered. Please sign in to your account.',
          'warning',
          'Go to Sign In',
          () => navigation.navigate('Login')
        );
      } else {
        const friendlyMessage = getUserFriendlyError(error);
        showCustomModal('Registration Error', friendlyMessage, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpValidationError('Invalid OTP. Please try again');
      return;
    }
    setOtpValidationError('');
    setPromoValidationError('');
    setIsLoading(true);

    try {
      console.log('Verifying OTP code:', otpCode);
      const response = await loginAPIs.verifyEmailCode({
        phone: phone.trim(),
        otpCode: otpCode.trim(),
        promoCode: promoCode.trim() || undefined,
      });

      const user = response.user || response.data?.user;
      const token = response.token || response.data?.token;

      if (response.success && token) {
        // Save verified credentials to AsyncStorage for Axios Bearer Token auth
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('currentUser', JSON.stringify(user));
        
        // Save registration wizard progress
        await AsyncStorage.setItem('registration_step', 'CategorySelection');
        await AsyncStorage.setItem('registration_phone', phone.trim());

        // Clear logout flag
        await AsyncStorage.removeItem('isLoggedOut');

        const promoStatus = (response as any).promoStatus || (response as any).data?.promoStatus;

        if (promoCode.trim()) {
          // User provided a promo code
          if (promoStatus?.applied) {
            showCustomModal(
              'Promo Code Applied! 🎉',
              promoStatus.message || 'Complimentary trial subscription activated successfully.',
              'success',
              'Continue',
              () => navigation.navigate('CategorySelection')
            );
          } else {
            // Promo code was entered but invalid: STOP! DO NOT PROCEED TO NEXT SCREEN!
            const errorMsg = promoStatus?.error || 'The entered promo code is invalid. Please check the code or clear it to proceed.';
            setPromoValidationError(errorMsg);
            showCustomModal(
              'Invalid Promo Code',
              errorMsg,
              'error'
            );
            return;
          }
        } else {
          // No promo code entered: proceed to Category Selection
          navigation.navigate('CategorySelection');
        }
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      const backendError = error?.response?.data?.error || error?.response?.data?.message || '';
      const errMsg = getUserFriendlyError(error);

      if (backendError.toLowerCase().includes('promo') || errMsg.toLowerCase().includes('promo')) {
        const promoMsg = backendError || errMsg || 'Invalid promo code. Please check the code or clear it to proceed.';
        setPromoValidationError(promoMsg);
        showCustomModal(
          'Invalid Promo Code',
          promoMsg,
          'error'
        );
      } else {
        setOtpValidationError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);

    try {
      await loginAPIs.resendEmailVerification({ phone: phone.trim() });
      setResendCooldown(60);
      showCustomModal('OTP Resent', 'A new verification OTP has been sent to your WhatsApp.', 'success');
    } catch (error: any) {
      const errMsg = getUserFriendlyError(error);
      showCustomModal('Error', errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const hideModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalConfig(prev => ({ ...prev, visible: false }));
    });
  };

  const showCustomModal = (title: string, message: string, type: 'error' | 'success' | 'info' | 'warning' = 'error', buttonText: string = 'OK', onPress: (() => void) | null = null) => {
    setModalConfig({ visible: true, title, message, type, buttonText, onPress });
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  

  // Step Indicators (Step 1 Active)
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        {/* Step 1 */}
        <View style={styles.stepWrapper}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
          ]}>
            <Text style={[styles.stepNumber, { color: '#ffffff' }]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.primary }]}>Verify</Text>
        </View>

        <View style={[styles.stepLine, { backgroundColor: theme.colors.border }]} />

        {/* Step 2 */}
        <View style={styles.stepWrapper}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }
          ]}>
            <Text style={[styles.stepNumber, { color: theme.colors.textSecondary }]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>Category</Text>
        </View>

        <View style={[styles.stepLine, { backgroundColor: theme.colors.border }]} />

        {/* Step 3 */}
        <View style={styles.stepWrapper}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }
          ]}>
            <Text style={[styles.stepNumber, { color: theme.colors.textSecondary }]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>Profile</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient colors={theme.colors.gradient} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Image source={require('../assets/MainLogo/main_logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={[styles.title, { color: theme.colors.text }]}>Register Account</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Join our community of event professionals</Text>
            </View>

            <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Step indicator */}
              {renderStepIndicator()}

              {/* Step 1 Layout */}
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Mobile Verification</Text>
                <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                  Verify your mobile number via WhatsApp OTP to secure your account.
                </Text>

                {/* Phone Input */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>WhatsApp Mobile Number <Text style={styles.redAsteriskText}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.colors.text,
                        borderColor: phoneValidationError ? theme.colors.error : (focusedField === 'phone' ? theme.colors.primary : theme.colors.border),
                        backgroundColor: theme.colors.inputBackground,
                      }
                    ]}
                    value={phone}
                    onChangeText={(value) => {
                      const digitsOnly = value.replace(/\D/g, '');
                      setPhone(digitsOnly);
                      if (phoneValidationError) setPhoneValidationError('');
                    }}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter 10 digit phone number"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!otpSent}
                  />
                  {phoneValidationError ? (
                    <View style={styles.errorContainer}>
                      <Icon name="error" size={16} color={theme.colors.error} />
                      <Text style={[styles.errorText, { color: theme.colors.error }]}>
                        {phoneValidationError}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* OTP Code Input */}
                {otpSent && (
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Enter 6-Digit OTP <Text style={styles.redAsteriskText}>*</Text></Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          color: theme.colors.text,
                          borderColor: otpValidationError ? theme.colors.error : (focusedField === 'otpCode' ? theme.colors.primary : theme.colors.border),
                          backgroundColor: theme.colors.inputBackground,
                          letterSpacing: 8,
                          textAlign: 'center',
                        }
                      ]}
                      value={otpCode}
                      onChangeText={(value) => {
                        const digits = value.replace(/\D/g, '');
                        setOtpCode(digits);
                        if (otpValidationError) setOtpValidationError('');
                      }}
                      onFocus={() => setFocusedField('otpCode')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="000000"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    {otpValidationError ? (
                      <View style={styles.errorContainer}>
                        <Icon name="error" size={16} color={theme.colors.error} />
                        <Text style={[styles.errorText, { color: theme.colors.error }]}>
                          {otpValidationError}
                        </Text>
                      </View>
                    ) : null}

                    {/* Optional Promo Code */}
                    {hasPromo ? (
                      <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                        <View style={styles.promoCodeHeader}>
                          <Text style={[styles.promoCodeTitle, { color: theme.colors.text }]}>Promo Code</Text>
                          <TouchableOpacity onPress={() => {
                            setHasPromo(false);
                            setPromoCode('');
                            setPromoValidationError('');
                          }}>
                            <Icon name="close" size={18} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: theme.colors.text,
                              borderColor: promoValidationError ? theme.colors.error : (focusedField === 'promoCode' ? theme.colors.primary : theme.colors.border),
                              backgroundColor: theme.colors.inputBackground,
                              textTransform: 'uppercase',
                              letterSpacing: 2,
                            }
                          ]}
                          value={promoCode}
                          onChangeText={(val) => {
                            setPromoCode(val.toUpperCase());
                            if (promoValidationError) setPromoValidationError('');
                          }}
                          onFocus={() => setFocusedField('promoCode')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="ENTER PROMO CODE"
                          placeholderTextColor={theme.colors.textSecondary}
                          autoCapitalize="characters"
                        />
                        {promoValidationError ? (
                          <View style={styles.errorContainer}>
                            <Icon name="error" size={16} color={theme.colors.error} />
                            <Text style={[styles.errorText, { color: theme.colors.error }]}>
                              {promoValidationError}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setHasPromo(true)}>
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Do you have a promo code?</Text>
                      </TouchableOpacity>
                    )}

                    {/* Resend Cooldown */}
                    <View style={styles.resendContainer}>
                      {resendCooldown > 0 ? (
                        <Text style={[styles.resendText, { color: theme.colors.textSecondary }]}>
                          Resend OTP in {resendCooldown}s
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleResendOtp}>
                          <Text style={[styles.resendLink, { color: theme.colors.primary }]}>Resend OTP via WhatsApp</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Buttons */}
                {!otpSent ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary, marginTop: moderateScale(25) }]}
                    onPress={handlePhoneSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit>Send OTP via WhatsApp</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: 'row', gap: moderateScale(10), marginTop: moderateScale(25) }}>
                    <TouchableOpacity
                      style={[styles.secondaryButton, { borderColor: theme.colors.border, flex: 1 }]}
                      onPress={() => {
                        setOtpSent(false);
                        setOtpCode('');
                      }}
                      disabled={isLoading}
                    >
                      <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>Change Number</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: theme.colors.primary, flex: 1 }]}
                      onPress={handleVerifyOtp}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit>Verify & Proceed</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Login Redirection */}
              <View style={[styles.loginLinkContainer, { marginTop: moderateScale(25) }]}>
                <Text style={[styles.loginLinkText, { color: theme.colors.textSecondary }]}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[styles.loginLink, { color: theme.colors.primary }]}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Error Modal */}
      <Modal visible={modalConfig.visible} transparent={true} animationType="fade" onRequestClose={hideModal} statusBarTranslucent={true}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={hideModal}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Animated.View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
                <View style={[
                  styles.modalIconContainer, 
                  { 
                    backgroundColor: 
                      modalConfig.type === 'error' ? 'rgba(229, 62, 62, 0.1)' : 
                      modalConfig.type === 'success' ? 'rgba(56, 161, 105, 0.1)' : 
                      modalConfig.type === 'warning' ? 'rgba(255, 152, 0, 0.15)' : 
                      'rgba(49, 130, 206, 0.1)' 
                  }
                ]}>
                  <Icon 
                    name={
                      modalConfig.type === 'error' ? "error-outline" : 
                      modalConfig.type === 'success' ? "check-circle-outline" : 
                      modalConfig.type === 'warning' ? "warning-amber" : 
                      "info-outline"
                    } 
                    size={40} 
                    color={
                      modalConfig.type === 'error' ? theme.colors.error : 
                      modalConfig.type === 'success' ? '#38A169' : 
                      modalConfig.type === 'warning' ? '#FF9800' : 
                      '#3182CE'
                    } 
                  />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{modalConfig.title}</Text>
                <View style={styles.modalContent}>
                  <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>{modalConfig.message}</Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.primary }]} onPress={() => {
                    hideModal();
                    if (modalConfig.onPress) {
                      modalConfig.onPress();
                    }
                  }}>
                    <Text style={styles.modalButtonText}>{modalConfig.buttonText}</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
    </SafeAreaView>
  );
};

const getStyles = (screenWidth: number, screenHeight: number, theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Math.max(screenHeight * 0.02, 12),
  },
  header: {
    alignItems: 'center',
    paddingVertical: screenHeight < 700 ? screenHeight * 0.02 : screenHeight * 0.035,
  },
  logo: {
    width: Math.min(screenWidth * 0.22, 90),
    height: Math.min(screenWidth * 0.22, 90),
    marginBottom: screenHeight < 700 ? 4 : moderateScale(10),
  },
  title: {
    fontSize: Math.min(screenWidth * 0.065, 26),
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    textAlign: 'center',
    opacity: 0.85,
    marginTop: moderateScale(4),
  },
  formContainer: {
    marginHorizontal: Math.max(screenWidth * 0.04, 12),
    borderRadius: moderateScale(24),
    paddingHorizontal: Math.max(screenWidth * 0.04, 16),
    paddingVertical: screenHeight < 700 ? 14 : moderateScale(25),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(10),
    marginBottom: screenHeight < 700 ? 12 : moderateScale(30),
    marginTop: screenHeight < 700 ? 4 : moderateScale(10),
  },
  stepWrapper: {
    alignItems: 'center',
    width: moderateScale(60),
  },
  stepCircle: {
    width: screenHeight < 700 ? 28 : moderateScale(36),
    height: screenHeight < 700 ? 28 : moderateScale(36),
    borderRadius: screenHeight < 700 ? 14 : moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: screenHeight < 700 ? 12 : moderateScale(14),
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: screenHeight < 700 ? 10 : moderateScale(11),
    marginTop: screenHeight < 700 ? 3 : moderateScale(6),
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: moderateScale(2),
    alignSelf: 'center',
    marginBottom: screenHeight < 700 ? 12 : moderateScale(20),
  },
  stepContent: {
    width: '100%',
  },
  stepTitle: {
    fontSize: Math.min(screenWidth * 0.05, 20),
    fontWeight: '700',
    marginBottom: screenHeight < 700 ? 4 : moderateScale(8),
  },
  stepSubtitle: {
    fontSize: Math.min(screenWidth * 0.033, 13),
    lineHeight: Math.min(screenWidth * 0.048, 18),
    marginBottom: screenHeight < 700 ? 12 : moderateScale(25),
  },
  input: {
    height: screenHeight < 700 ? 42 : moderateScale(50),
    borderWidth: 1.5,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    fontSize: Math.min(screenWidth * 0.038, 15),
  },
  inputWrapper: {
    width: '100%',
    marginBottom: screenHeight < 700 ? 10 : moderateScale(16),
  },
  inputLabel: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
    marginBottom: screenHeight < 700 ? 4 : moderateScale(8),
  },
  redAsteriskText: {
    color: '#E53E3E',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(6),
  },
  errorText: {
    fontSize: moderateScale(12),
    marginLeft: moderateScale(6),
  },
  resendContainer: {
    marginTop: screenHeight < 700 ? 8 : moderateScale(12),
    alignItems: 'center',
  },
  resendText: {
    fontSize: Math.min(screenWidth * 0.033, 13),
  },
  resendLink: {
    fontSize: Math.min(screenWidth * 0.033, 13),
    fontWeight: '600',
  },
  primaryButton: {
    height: screenHeight < 700 ? 42 : moderateScale(50),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: Math.min(screenWidth * 0.033, 13),
    fontWeight: '600',
  },
  secondaryButton: {
    height: screenHeight < 700 ? 42 : moderateScale(50),
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: Math.min(screenWidth * 0.033, 13),
    fontWeight: '600',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
  },
  loginLink: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.85,
    padding: moderateScale(20),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    elevation: 5,
  },
  modalIconContainer: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    marginBottom: moderateScale(8),
  },
  modalContent: {
    marginBottom: moderateScale(20),
  },
  modalMessage: {
    fontSize: moderateScale(14),
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  modalActions: {
    width: '100%',
  },
  modalButton: {
    height: moderateScale(46),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  promoCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(8),
  },
  promoCodeTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
});

export default RegistrationScreen;