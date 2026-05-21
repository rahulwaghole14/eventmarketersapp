import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import loginAPIs from '../services/loginAPIs';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RegistrationScreen: React.FC = ({ navigation }: any) => {
  const { theme } = useTheme();

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

  // Modals / Animation States
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: 'Error',
    message: '',
    type: 'error',
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
      
      // If user already exists (409 conflict), trigger resend verification code
      if (status === 409 || errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('duplicate')) {
        try {
          console.log('User already exists. Sending OTP resend request.');
          await loginAPIs.resendEmailVerification({ phone: phone.trim() });
          setOtpSent(true);
          setResendCooldown(60);
          showCustomModal('OTP Sent', 'A verification OTP has been sent to your WhatsApp.', 'success');
        } catch (resendError: any) {
          const resendMessage = resendError.response?.data?.error || resendError.response?.data?.message || resendError.message || '';
          if (resendMessage.toLowerCase().includes('verified')) {
            showCustomModal('Already Registered', 'This phone number is already registered and verified. Please sign in instead.', 'info', 'Go to Sign In', () => navigation.navigate('Login'));
          } else {
            showCustomModal('Registration Error', resendMessage || 'Failed to send OTP code. Please try again.', 'error');
          }
        }
      } else {
        showCustomModal('Registration Error', errMsg || 'Registration failed. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpValidationError('Please enter a 6-digit OTP code');
      return;
    }
    setOtpValidationError('');
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

        // Transition to next screen (Category Selection)
        navigation.navigate('CategorySelection');
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Verification failed';
      setOtpValidationError(errMsg);
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
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to resend OTP';
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

  const showCustomModal = (title: string, message: string, type: 'error' | 'success' | 'info' = 'error', buttonText: string = 'OK', onPress: (() => void) | null = null) => {
    setModalConfig({ visible: true, title, message, type: type as 'error' | 'success' | 'info', buttonText, onPress });
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
      <LinearGradient colors={theme.colors.gradient} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Image source={require('../assets/MainLogo/main_logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={[styles.title, { color: '#ffffff' }]}>Register Account</Text>
              <Text style={[styles.subtitle, { color: '#ffffff' }]}>Join our community of event professionals</Text>
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
                          }}>
                            <Icon name="close" size={18} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: theme.colors.text,
                              borderColor: focusedField === 'promoCode' ? theme.colors.primary : theme.colors.border,
                              backgroundColor: theme.colors.inputBackground,
                              textTransform: 'uppercase',
                              letterSpacing: 2,
                            }
                          ]}
                          value={promoCode}
                          onChangeText={(val) => setPromoCode(val.toUpperCase())}
                          onFocus={() => setFocusedField('promoCode')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="ENTER PROMO CODE"
                          placeholderTextColor={theme.colors.textSecondary}
                          autoCapitalize="characters"
                        />
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
                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary, marginTop: 25 }]}
                    onPress={handlePhoneSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send OTP via WhatsApp</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 25 }}>
                    <TouchableOpacity
                      style={[styles.secondaryButton, { borderColor: theme.colors.border, flex: 1 }]}
                      onPress={() => {
                        setOtpSent(false);
                        setOtpCode('');
                      }}
                      disabled={isLoading}
                    >
                      <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Change Number</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: theme.colors.primary, flex: 1.5 }]}
                      onPress={handleVerifyOtp}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Login Redirection */}
              <View style={[styles.loginLinkContainer, { marginTop: 25 }]}>
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
                <View style={[styles.modalIconContainer, { backgroundColor: modalConfig.type === 'error' ? 'rgba(229, 62, 62, 0.1)' : modalConfig.type === 'success' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(49, 130, 206, 0.1)' }]}>
                  <Icon name={modalConfig.type === 'error' ? "error-outline" : modalConfig.type === 'success' ? "check-circle-outline" : "info-outline"} size={40} color={modalConfig.type === 'error' ? theme.colors.error : modalConfig.type === 'success' ? '#38A169' : '#3182CE'} />
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

const styles = StyleSheet.create({
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
    paddingBottom: 25,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.85,
    marginTop: 5,
  },
  formContainer: {
    marginHorizontal: 16,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 25,
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
    paddingHorizontal: 10,
    marginBottom: 30,
    marginTop: 10,
  },
  stepWrapper: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  stepContent: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 25,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  redAsteriskText: {
    color: '#E53E3E',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 6,
  },
  resendContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
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
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalContent: {
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    width: '100%',
  },
  modalButton: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  promoCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promoCodeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegistrationScreen;