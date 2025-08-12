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
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import authService from '../services/auth';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RegistrationScreen: React.FC = ({ navigation }: any) => {
  console.log('RegistrationScreen: Component rendering');
  const { isDarkMode, theme } = useTheme();
  console.log('RegistrationScreen: Theme loaded:', theme.colors.background);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleRegister = useCallback(async () => {
    // Basic validation
    if (!formData.companyName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await authService.registerUser({
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      Alert.alert('Success', 'Registration successful! Please sign in.');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, navigation]);

  const FloatingInput = useMemo(() => ({ 
    label, 
    value, 
    onChangeText, 
    field,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'words'
  }: any) => (
    <View style={styles.inputContainer}>
      <Text style={[
        styles.floatingLabel,
        { color: (focusedField === field || value) ? theme.colors.primary : theme.colors.textSecondary },
        (focusedField === field || value) && styles.floatingLabelFocused
      ]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          { 
            borderColor: focusedField === field ? theme.colors.primary : theme.colors.border,
            backgroundColor: theme.colors.inputBackground,
            color: theme.colors.text
          },
          focusedField === field && styles.inputFocused
        ]}
        value={value}
        onChangeText={(text) => onChangeText(field, text)}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField(null)}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  ), [focusedField, theme]);

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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join our professional community</Text>
            </View>

            {/* Form */}
                         <View style={[styles.formContainer, { backgroundColor: theme.colors.cardBackground }]}>
                <FloatingInput
                  label="Company Name"
                  value={formData.companyName}
                  onChangeText={handleInputChange}
                  field="companyName"
                  autoCapitalize="words"
                />

                <FloatingInput
                  label="Email Address"
                  value={formData.email}
                  onChangeText={handleInputChange}
                  field="email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <FloatingInput
                  label="Phone Number"
                  value={formData.phone}
                  onChangeText={handleInputChange}
                  field="phone"
                  keyboardType="phone-pad"
                />

                <FloatingInput
                  label="Password"
                  value={formData.password}
                  onChangeText={handleInputChange}
                  field="password"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />

                <FloatingInput
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={handleInputChange}
                  field="confirmPassword"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />

                                 <TouchableOpacity 
                   style={[
                     styles.registerButton, 
                     { backgroundColor: theme.colors.buttonPrimary },
                     isLoading && styles.buttonDisabled
                   ]} 
                   onPress={handleRegister}
                   disabled={isLoading}
                 >
                   <Text style={[styles.registerButtonText, { color: '#ffffff' }]}>
                     {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                   </Text>
                 </TouchableOpacity>

                 <View style={styles.footer}>
                   <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                     Already have an account?{' '}
                   </Text>
                   <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                     <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
                       Sign In
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
  registerButton: {
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
  registerButtonText: {
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

export default RegistrationScreen; 