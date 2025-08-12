import React, { useState, useCallback, useMemo } from 'react';
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
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import authService from '../services/auth';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LoginScreen: React.FC = ({ navigation }: any) => {
  const { isDarkMode, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await authService.signInWithEmail(email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
      
      // Handle specific Google Sign-In errors
      let errorMessage = 'Google sign in failed. Please try again.';
      
      if (error.message) {
        if (error.message.includes('cancelled')) {
          errorMessage = 'Sign in was cancelled.';
        } else if (error.message.includes('Google Play Services')) {
          errorMessage = 'Google Play Services not available on this device.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Google Sign-In Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDevelopmentSignIn = useCallback(async () => {
    console.log('Development sign in clicked');
    setIsLoading(true);
    try {
      await authService.signInAnonymously();
      console.log('Development sign in successful');
    } catch (error) {
      console.error('Development sign in error:', error);
      Alert.alert('Error', 'Development sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const FloatingInput = useMemo(() => ({ 
    label, 
    value, 
    onChangeText, 
    onFocus, 
    onBlur, 
    isFocused, 
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'none'
  }: any) => (
    <View style={styles.inputContainer}>
      <Text style={[
        styles.floatingLabel, 
        { color: isFocused ? theme.colors.primary : theme.colors.textSecondary },
        isFocused && styles.floatingLabelFocused
      ]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input, 
          { 
            borderColor: isFocused ? theme.colors.primary : theme.colors.border,
            backgroundColor: theme.colors.inputBackground,
            color: theme.colors.text
          },
          isFocused && styles.inputFocused
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  ), [theme]);

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar 
        barStyle="light-content"
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
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your journey</Text>
            </View>

            {/* Form */}
            <View style={[styles.formContainer, { backgroundColor: theme.colors.cardBackground }]}>
              <FloatingInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                isFocused={emailFocused}
                keyboardType="email-address"
              />

              <FloatingInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                isFocused={passwordFocused}
                secureTextEntry={true}
              />

              <TouchableOpacity 
                style={[
                  styles.signInButton, 
                  { backgroundColor: theme.colors.buttonPrimary },
                  isLoading && styles.buttonDisabled
                ]} 
                onPress={handleSignIn}
                disabled={isLoading}
              >
                <Text style={[styles.signInButtonText, { color: '#ffffff' }]}>
                  {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.googleButton, 
                  { 
                    backgroundColor: '#ffffff',
                    borderColor: theme.colors.border
                  },
                  isLoading && styles.buttonDisabled
                ]} 
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                                 <Image 
                   source={require('../assets/icons/google.png')} 
                   style={styles.googleIcon} 
                   resizeMode="contain"
                 />
                <Text style={[styles.googleButtonText, { color: '#333333' }]}>
                  {isLoading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.developmentButton, 
                  { 
                    backgroundColor: `${theme.colors.primary}20`,
                    borderColor: `${theme.colors.primary}30`
                  },
                  isLoading && styles.buttonDisabled
                ]} 
                onPress={handleDevelopmentSignIn}
                disabled={isLoading}
              >
                <Text style={[styles.developmentButtonText, { color: theme.colors.primary }]}>
                  QUICK DEMO ACCESS
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
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
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
    marginBottom: screenHeight * 0.05,
  },
  title: {
    fontSize: Math.min(screenWidth * 0.08, 32),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: screenHeight * 0.01,
  },
  subtitle: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
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
  inputContainer: {
    marginBottom: screenHeight * 0.02,
  },
  floatingLabel: {
    position: 'absolute',
    left: screenWidth * 0.02,
    top: screenHeight * 0.015,
    fontSize: Math.min(screenWidth * 0.04, 16),
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  floatingLabelFocused: {
    top: screenHeight * 0.005,
    fontSize: Math.min(screenWidth * 0.03, 12),
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.015,
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '500',
  },
  inputFocused: {
    borderWidth: 2,
  },
  signInButton: {
    borderRadius: 12,
    paddingVertical: screenHeight * 0.015,
    alignItems: 'center',
    marginBottom: screenHeight * 0.015,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
  },
  googleButton: {
    borderRadius: 12,
    paddingVertical: screenHeight * 0.015,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: screenHeight * 0.015,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: screenWidth * 0.02,
  },
  googleButtonText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
  },
  developmentButton: {
    borderRadius: 12,
    paddingVertical: screenHeight * 0.015,
    alignItems: 'center',
    marginBottom: screenHeight * 0.02,
    borderWidth: 1,
  },
  developmentButtonText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
  },
  footerLink: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
  },
});

export default LoginScreen; 