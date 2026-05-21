import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import authService from '../services/auth';
import { useSubscription } from '../contexts/SubscriptionContext';
import { navigationRef } from './NavigationService';
import logger from '../utils/logger';
import { RootStackParamList } from './types';
import TabNavigator from './TabNavigator';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import BusinessProfileCreationScreen from '../screens/BusinessProfileCreationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VerifyResetCodeScreen from '../screens/VerifyResetCodeScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialRoute, setInitialRoute] = useState<string>('Login');
  const { refreshSubscription, refreshTransactions } = useSubscription();
  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    logger.log('🚀 AppNavigator: Starting initialization');
    let authStateReceived = false;
    let authUser: any = null;
    const startTime = Date.now();
    const MIN_SPLASH_TIME = 4000;

    const timeout = setTimeout(() => {
      if (!authStateReceived) {
        logger.warn('⚠️ AppNavigator: Timeout reached without auth state - showing login');
        setIsLoading(false);
        setIsAuthenticated(false);
      }
    }, 5000);

    const unsubscribe = authService.onAuthStateChanged((user) => {
      authStateReceived = true;
      authUser = user;
      clearTimeout(timeout);

      logger.log('AppNavigator: Auth state changed callback fired.');
      logger.log('AppNavigator: Received user:', JSON.stringify(user));

      // NAVIGATION SAFETY: Only consider user authenticated if they have valid data and registration is not pending
      const isValidUser = !!(user && (user.email || user.phone || user.phoneNumber) && user.id && !user.isRegistrationPending);
      
      logger.log('AppNavigator: isValidUser evaluation details:', {
        userExists: !!user,
        hasEmailPhone: !!(user && (user.email || user.phone || user.phoneNumber)),
        hasId: !!(user && user.id),
        isRegistrationPending: !!(user && user.isRegistrationPending),
        isValidUser
      });

      if (isValidUser) {
        refreshSubscription().catch(e => logger.error(' Error preloading subscription:', e));
        refreshTransactions().catch(e => logger.error(' Error preloading transactions:', e));
      }

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_SPLASH_TIME - elapsedTime);

      setTimeout(async () => {
        try {
          const step = await AsyncStorage.getItem('registration_step');
          logger.log('AppNavigator: AsyncStorage registration_step is:', step);
          if (step && !isValidUser) {
            logger.log('AppNavigator: Resuming incomplete registration at step:', step);
            setInitialRoute(step);
          } else if (!isValidUser) {
            setInitialRoute('Login');
          }
        } catch (err) {
          logger.error('AppNavigator: Error checking registration step:', err);
        }

        logger.log('AppNavigator: Setting isAuthenticated to:', isValidUser);
        setIsAuthenticated(isValidUser);
        setIsLoading(false);
      }, remainingTime);
    });

    authService.initialize().catch((error) => {
      logger.error(' AppNavigator: Error initializing auth service:', error);
      authStateReceived = true;
      clearTimeout(timeout);
      setTimeout(() => {
        setIsLoading(false);
        setIsAuthenticated(false);
      }, 2000);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Create navigation theme based on app theme
  const navigationTheme = React.useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.gradient[0] || theme.colors.background,
      card: theme.colors.cardBackground,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.primary,
      primary: theme.colors.primary,
    },
  }), [theme]);

  if (isLoading) {
    return (
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <Stack.Navigator
          screenOptions={{
            cardStyle: { backgroundColor: theme.colors.gradient[0] || theme.colors.background },
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute as any}
        screenOptions={{
          cardStyle: { backgroundColor: theme.colors.gradient[0] || theme.colors.background },
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen name="MainApp" component={TabNavigator} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Registration" component={RegistrationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BusinessProfileCreation" component={BusinessProfileCreationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
            <Stack.Screen name="VerifyResetCode" component={VerifyResetCodeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ headerShown: false }} />
          </>
        )}
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;