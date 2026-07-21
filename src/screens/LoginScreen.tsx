import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import loginAPIs from '../services/loginAPIs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserFriendlyError } from '../utils/errorHandler';
import responsiveUtils, {
  responsiveSpacing,
  responsiveFontSize,
  responsiveSize,
  responsiveLayout,
  responsiveShadow,
  responsiveText,
  responsiveGrid,
  responsiveButton,
  responsiveInput,
  responsiveCard,
  isTablet,
  isLandscape
} from '../utils/responsiveUtils';

const LoginScreen: React.FC = ({ navigation }: any) => {
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
  const [phone, setPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<'empty' | 'invalid_phone' | 'generic'>('generic');
  const [phoneValidationError, setPhoneValidationError] = useState('');

  const isPhoneValid = useMemo(() => {
    const digits = phone.trim().replace(/\D/g, '');
    return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
  }, [phone]);

  useEffect(() => {
    console.log('Login screen mounted - waiting for phone login action');
  }, []);

  const validatePhone = (phoneNumber: string): string => {
    if (!phoneNumber || !phoneNumber.trim()) return 'Phone number is required';
    const digits = phoneNumber.trim().replace(/\D/g, '');
    if (digits.length !== 10) return 'Phone must be exactly 10 digits';
    if (!/^[6-9]\d{9}$/.test(digits)) return 'Please enter a valid Indian mobile number starting with 6-9';
    return '';
  };

  const getModalContent = useCallback((type: typeof errorType) => {
    switch (type) {
      case 'empty':
        return {
          title: 'Missing Information',
          message: 'Please enter your mobile number',
          icon: 'info' as const
        };
      case 'invalid_phone':
        return {
          title: 'Incorrect Phone',
          message: 'Please enter a valid 10-digit mobile number starting with 6-9',
          icon: 'info' as const
        };
      case 'generic':
      default:
        return {
          title: 'Login Failed',
          message: errorMessage,
          icon: 'info' as const
        };
    }
  }, [errorMessage]);

  const handleSignIn = useCallback(async () => {
    const error = validatePhone(phone);
    if (error) {
      setPhoneValidationError(error);
      setErrorType('invalid_phone');
      setErrorMessage(error);
      setShowErrorModal(true);
      return;
    }
    setPhoneValidationError('');
    setIsLoading(true);

    try {
      console.log('🔐 Attempting login for phone:', phone);
      const result = await loginAPIs.loginUser({
        phone: phone.trim(),
      });

      // Handle verification requirement (success path)
      if (result.requiresVerification) {
        // Navigate to email verification screen to let them verify their OTP
        navigation.navigate('EmailVerification', { phone: phone.trim() });
        return;
      }

      console.log('✅ Login successful:', result);
    } catch (error: any) {
      console.error('❌ Sign in error:', error);

      // Check if the server says the user needs to verify their phone OTP
      const requiresVerification = error?.response?.data?.requiresVerification;
      if (requiresVerification) {
        navigation.navigate('EmailVerification', { phone: phone.trim() });
        return;
      }

      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.error || error?.response?.data?.message || '';

      if (status === 404 || backendMessage.toLowerCase().includes('not found') || backendMessage.toLowerCase().includes('invalid') || backendMessage.toLowerCase().includes('register first')) {
        setErrorType('generic');
        setErrorMessage('This mobile number is not registered. Please sign up first.');
      } else {
        const message = getUserFriendlyError(error);
        setErrorType('generic');
        setErrorMessage(message);
      }

      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  }, [phone, navigation]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={theme.colors.gradient}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <Image
                  source={require('../assets/MainLogo/main_logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={[styles.title, { color: theme.colors.text }]}>Welcome Back</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Sign in to continue your journey</Text>
              </View>

              {/* Form */}
              <View style={[styles.formContainer, { backgroundColor: theme.colors.cardBackground }]}>

                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>WhatsApp Mobile Number <Text style={styles.redAsteriskText}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.colors.text,
                        borderColor: phoneValidationError ? theme.colors.error : (phoneFocused ? theme.colors.primary : theme.colors.border),
                        backgroundColor: theme.colors.inputBackground,
                      }
                    ]}
                    value={phone}
                    onChangeText={(value) => {
                      const digitsOnly = value.replace(/\D/g, '');
                      setPhone(digitsOnly);
                      if (phoneValidationError) setPhoneValidationError('');
                    }}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    placeholder="Enter 10 digit phone number"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="phone-pad"
                    maxLength={10}
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

                <TouchableOpacity
                  style={[
                    styles.signInButton,
                    { backgroundColor: isPhoneValid ? theme.colors.buttonPrimary : '#A0A0A0' },
                    (isLoading || !isPhoneValid) && styles.buttonDisabled
                  ]}
                  onPress={handleSignIn}
                  disabled={isLoading || !isPhoneValid}
                >
                  <Text style={[styles.signInButtonText, { color: '#ffffff' }]}>
                    {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
                    <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Privacy Policy Link */}
                <View style={styles.privacyFooter}>
                  <Text style={[styles.privacyFooterText, { color: theme.colors.textSecondary }]}>
                    By signing in, you agree to our{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                    <Text style={[styles.privacyFooterLink, { color: theme.colors.primary }]}>
                      Privacy Policy
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowErrorModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { }} // Prevent closing when tapping inside modal
          >
            <View style={[styles.errorModalContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Header with close button */}
              <View style={styles.errorModalHeader}>
                <TouchableOpacity
                  style={[styles.closeModalButton, { backgroundColor: theme.colors.inputBackground }]}
                  onPress={() => setShowErrorModal(false)}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={Math.min(screenWidth * 0.06, 24)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Info icon */}
              <View style={[styles.errorIconContainer, { backgroundColor: '#2196F330' }]}>
                <Icon name="info" size={Math.min(screenWidth * 0.08, 32)} color="#2196F3" />
              </View>

              {/* Title */}
              <Text style={[styles.errorModalTitle, { color: theme.colors.text }]}>
                {getModalContent(errorType).title}
              </Text>

              {/* Message */}
              <View style={styles.errorModalContent}>
                <Text style={[styles.errorModalMessage, { color: theme.colors.textSecondary }]}>
                  {getModalContent(errorType).message}
                </Text>
              </View>

              {/* Actions */}
              <View style={[styles.errorModalButtonsContainer, { justifyContent: 'center' }]}>
                <TouchableOpacity
                  style={[
                    styles.errorModalCancelButton,
                    { backgroundColor: theme.colors.inputBackground },
                    { flex: undefined, paddingHorizontal: screenWidth * 0.08 }
                  ]}
                  onPress={() => setShowErrorModal(false)}
                >
                  <Text style={[styles.errorModalCancelButtonText, { color: theme.colors.textSecondary }]}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  gradientBackground: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenWidth * 0.05,
    paddingTop: screenHeight * 0.05,
    paddingBottom: screenHeight * 0.05,
  },
  header: {
    alignItems: 'center',
    marginBottom: screenHeight * 0.04,
  },
  logo: {
    width: screenWidth * 0.45,
    height: screenWidth * 0.45,
    marginBottom: 5,
  },
  title: {
    fontSize: Math.min(screenWidth * 0.08, 32),
    fontWeight: 'bold',
    marginBottom: screenHeight * 0.01,
  },
  subtitle: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    textAlign: 'center',
    opacity: 0.9,
  },
  formContainer: {
    borderRadius: 20,
    padding: screenWidth * 0.05,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  redAsteriskText: {
    color: '#E53E3E',
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
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
  signInButton: {
    borderRadius: responsiveSize.buttonBorderRadius,
    paddingVertical: responsiveSize.buttonPaddingVertical,
    alignItems: 'center',
    marginBottom: Math.max(responsiveSpacing.md, screenHeight * 0.015),
    ...responsiveShadow.large,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
  },
  footerLink: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
  },
  privacyFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: screenHeight * 0.02,
    paddingHorizontal: screenWidth * 0.05,
  },
  privacyFooterText: {
    fontSize: Math.min(screenWidth * 0.032, 12),
    textAlign: 'center',
  },
  privacyFooterLink: {
    fontSize: Math.min(screenWidth * 0.032, 12),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContainer: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    padding: screenWidth * 0.06,
    paddingTop: screenWidth * 0.04,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorModalHeader: {
    alignItems: 'flex-end',
    marginBottom: screenHeight * 0.01,
    height: Math.min(screenWidth * 0.08, 32),
  },
  errorIconContainer: {
    width: Math.min(screenWidth * 0.16, 64),
    height: Math.min(screenWidth * 0.16, 64),
    borderRadius: Math.min(screenWidth * 0.08, 32),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: screenHeight * 0.02,
  },
  errorModalTitle: {
    fontSize: Math.min(screenWidth * 0.055, 22),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: screenHeight * 0.015,
  },
  closeModalButton: {
    width: Math.min(screenWidth * 0.08, 32),
    height: Math.min(screenWidth * 0.08, 32),
    borderRadius: Math.min(screenWidth * 0.04, 16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContent: {
    marginBottom: screenHeight * 0.03,
    paddingHorizontal: screenWidth * 0.02,
  },
  errorModalMessage: {
    fontSize: Math.min(screenWidth * 0.038, 15),
    textAlign: 'center',
    lineHeight: Math.min(screenWidth * 0.055, 22),
  },
  errorModalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: screenHeight * 0.02,
    gap: screenWidth * 0.03,
  },
  errorModalCancelButton: {
    flex: 1,
    paddingVertical: screenHeight * 0.018,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorModalCancelButtonText: {
    fontSize: Math.min(screenWidth * 0.042, 17),
    fontWeight: '600',
  },
});

export default LoginScreen;