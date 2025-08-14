import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
  Image,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import authService from '../services/auth';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive design helpers
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414;

// Responsive spacing and sizing
const responsiveSpacing = {
  xs: isSmallScreen ? 8 : isMediumScreen ? 12 : 16,
  sm: isSmallScreen ? 12 : isMediumScreen ? 16 : 20,
  md: isSmallScreen ? 16 : isMediumScreen ? 20 : 24,
  lg: isSmallScreen ? 20 : isMediumScreen ? 24 : 32,
  xl: isSmallScreen ? 24 : isMediumScreen ? 32 : 40,
};

const responsiveFontSize = {
  xs: isSmallScreen ? 10 : isMediumScreen ? 12 : 14,
  sm: isSmallScreen ? 12 : isMediumScreen ? 14 : 16,
  md: isSmallScreen ? 14 : isMediumScreen ? 16 : 18,
  lg: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
  xl: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
  xxl: isSmallScreen ? 20 : isMediumScreen ? 22 : 24,
  xxxl: isSmallScreen ? 24 : isMediumScreen ? 28 : 32,
};

const ProfileScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser?.displayName || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phoneNumber || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const { isSubscribed } = useSubscription();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const currentUser = authService.getCurrentUser();

  // Animation values for toggles
  const notificationsAnimation = useRef(new Animated.Value(notificationsEnabled ? 1 : 0)).current;
  const darkModeAnimation = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  // Sync animation values with state changes
  useEffect(() => {
    notificationsAnimation.setValue(notificationsEnabled ? 1 : 0);
  }, [notificationsEnabled]);

  useEffect(() => {
    darkModeAnimation.setValue(isDarkMode ? 1 : 0);
  }, [isDarkMode]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('ProfileScreen: Starting sign out process...');
              await authService.signOut();
              console.log('ProfileScreen: Sign out completed successfully');
            } catch (error) {
              console.error('ProfileScreen: Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };



  const handleNotificationToggle = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    
    // Animate the toggle
    Animated.timing(notificationsAnimation, {
      toValue: newValue ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBusinessProfiles = () => {
    navigation.navigate('BusinessProfiles' as never);
  };

  const handleDarkModeToggle = () => {
    const newValue = !isDarkMode;
    toggleDarkMode();
    
    // Animate the toggle
    Animated.timing(darkModeAnimation, {
      toValue: newValue ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSubscription = () => {
    navigation.navigate('Subscription' as never);
  };

  const handleEditProfile = () => {
    setEditDisplayName(currentUser?.displayName || '');
    setEditEmail(currentUser?.email || '');
    setEditPhone(currentUser?.phoneNumber || '');
    setEditBio(currentUser?.bio || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    setIsUpdating(true);
    try {
      // Here you would typically call your auth service to update the profile
      // For now, we'll simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the current user object (in a real app, this would come from the service)
      if (currentUser) {
        currentUser.displayName = editDisplayName.trim();
        currentUser.email = editEmail.trim();
        currentUser.phoneNumber = editPhone.trim();
        currentUser.bio = editBio.trim();
      }
      
      setShowEditProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditProfileModal(false);
    setEditDisplayName(currentUser?.displayName || '');
    setEditEmail(currentUser?.email || '');
    setEditPhone(currentUser?.phoneNumber || '');
    setEditBio(currentUser?.bio || '');
  };

  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    showToggle?: boolean,
    toggleValue?: boolean,
    onToggle?: () => void,
    animationValue?: Animated.Value
  ) => (
    <TouchableOpacity 
      style={[styles.menuItem, { backgroundColor: theme.colors.cardBackground }]} 
      onPress={onPress} 
      disabled={showToggle}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuItemIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Icon name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.menuItemSubtext, { color: theme.colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
             {showToggle ? (
          <TouchableOpacity
            style={[
              styles.toggle, 
              { 
                backgroundColor: toggleValue ? theme.colors.primary : theme.colors.border,
              }
            ]}
            onPress={onToggle}
            activeOpacity={0.7}
          >
            <Animated.View 
              style={[
                styles.toggleThumb, 
                { 
                  backgroundColor: theme.colors.surface,
                  transform: [{
                    translateX: animationValue ? animationValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, screenWidth * 0.06] // Move from left to right
                    }) : 0
                  }]
                }
              ]} 
            />
          </TouchableOpacity>
        ) : (
          <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
        )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar 
        barStyle="light-content"
        backgroundColor="transparent" 
        translucent={true}
      />
      
      <LinearGradient
        colors={theme.colors.gradient}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + responsiveSpacing.sm }]}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 120 + insets.bottom }]}
        >
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.colors.cardBackground }]}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                  </Text>
                </LinearGradient>
                <TouchableOpacity style={[styles.editAvatarButton, { backgroundColor: theme.colors.primary }]}>
                  <Icon name="camera-alt" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.userName, { color: theme.colors.text }]}>
                  {currentUser?.displayName || 'Event Marketer'}
                </Text>
                <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                  {currentUser?.email || 'eventmarketer@example.com'}
                </Text>
                {currentUser?.bio && (
                  <Text style={[styles.userBio, { color: theme.colors.textSecondary }]}>
                    {currentUser.bio}
                  </Text>
                )}
                <View style={styles.profileStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.colors.primary }]}>24</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Templates</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.colors.primary }]}>156</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Downloads</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.colors.primary }]}>89</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Likes</Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.editProfileButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleEditProfile}
            >
              <Icon name="edit" size={16} color="#ffffff" />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Account Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            {renderMenuItem('business', 'Business Profiles', 'Manage your business profiles', handleBusinessProfiles)}
            {renderMenuItem('notifications', 'Notifications', 'Manage notification preferences', undefined, true, notificationsEnabled, handleNotificationToggle, notificationsAnimation)}
          </View>

          {/* Subscription Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <TouchableOpacity 
              style={[styles.subscriptionCard, { backgroundColor: theme.colors.cardBackground }]}
              onPress={handleSubscription}
            >
              <View style={styles.subscriptionContent}>
                <View style={styles.subscriptionLeft}>
                  <View style={[styles.subscriptionIcon, { backgroundColor: isSubscribed ? '#28a745' : '#667eea' }]}>
                    <Icon 
                      name={isSubscribed ? 'check-circle' : 'star'} 
                      size={24} 
                      color="#ffffff" 
                    />
                  </View>
                  <View style={styles.subscriptionInfo}>
                    <Text style={[styles.subscriptionTitle, { color: theme.colors.text }]}>
                      {isSubscribed ? 'Pro Subscription' : 'Upgrade to Pro'}
                    </Text>
                    <Text style={[styles.subscriptionSubtitle, { color: theme.colors.textSecondary }]}>
                      {isSubscribed ? 'Active • Unlimited features' : 'Unlock unlimited possibilities'}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

                     {/* App Settings */}
           <View style={styles.section}>
             <Text style={styles.sectionTitle}>App Settings</Text>
             {renderMenuItem('dark-mode', 'Dark Mode', 'Switch to dark theme', undefined, true, isDarkMode, handleDarkModeToggle, darkModeAnimation)}
           </View>

          {/* Support & Legal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support & Legal</Text>
            {renderMenuItem('help', 'Help & Support', 'Get help and contact support', () => Alert.alert('Help', 'Help center will be implemented soon.'))}
            {renderMenuItem('privacy-tip', 'Privacy Policy', 'Read our privacy policy', () => Alert.alert('Privacy Policy', 'Privacy policy will be implemented soon.'))}
            {renderMenuItem('info', 'About App', 'Version 1.0.0', () => Alert.alert('About', 'About app information will be implemented soon.'))}
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            style={[styles.signOutButton, { 
              backgroundColor: '#ff4444',
              borderColor: '#ff4444'
            }]} 
            onPress={handleSignOut}
          >
            <Icon name="logout" size={20} color="#ffffff" style={styles.signOutIcon} />
            <Text style={[styles.signOutText, { color: '#ffffff' }]}>Sign Out</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={[styles.versionText, { color: 'rgba(255,255,255,0.6)' }]}>Version 1.0.0</Text>
        </ScrollView>
      </LinearGradient>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.modalCloseButton}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Display Name *</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Enter your display name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Phone Number</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Bio</Text>
                <TextInput
                  style={[styles.textArea, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton, { borderColor: theme.colors.border }]}
                onPress={handleCancelEdit}
                disabled={isUpdating}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveModalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveProfile}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Text style={styles.modalButtonText}>Updating...</Text>
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    paddingTop: screenHeight * 0.02,
    paddingHorizontal: screenWidth * 0.05,
    paddingBottom: screenHeight * 0.02,
  },
  headerTitle: {
    fontSize: Math.min(screenWidth * 0.06, 24),
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100, // Add padding to account for tab bar
  },
  profileCard: {
    marginHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.03,
    borderRadius: 20,
    padding: screenWidth * 0.05,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: screenHeight * 0.02,
  },
  avatarGradient: {
    width: screenWidth * 0.2,
    height: screenWidth * 0.2,
    borderRadius: screenWidth * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Math.min(screenWidth * 0.08, 32),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: screenWidth * 0.06,
    height: screenWidth * 0.06,
    borderRadius: screenWidth * 0.03,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: screenHeight * 0.012,
    paddingHorizontal: screenWidth * 0.04,
    borderRadius: 12,
    marginTop: screenHeight * 0.02,
    gap: 8,
  },
  editProfileButtonText: {
    color: '#ffffff',
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: Math.min(screenWidth * 0.05, 20),
    fontWeight: 'bold',
    marginBottom: screenHeight * 0.005,
  },
  userEmail: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    marginBottom: screenHeight * 0.01,
  },
  userBio: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    textAlign: 'center',
    marginBottom: screenHeight * 0.015,
    lineHeight: 16,
    paddingHorizontal: screenWidth * 0.05,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.03,
  },
  statNumber: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: Math.min(screenWidth * 0.025, 10),
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: screenHeight * 0.02,
    marginHorizontal: screenWidth * 0.02,
  },
  section: {
    marginBottom: screenHeight * 0.03,
  },
  sectionTitle: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.05,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.01,
    paddingVertical: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.05,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: screenWidth * 0.08,
    height: screenWidth * 0.08,
    borderRadius: screenWidth * 0.04,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: screenWidth * 0.04,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '500',
  },
  menuItemSubtext: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    marginTop: 2,
  },
     toggle: {
      width: screenWidth * 0.1,
      height: screenHeight * 0.025,
      borderRadius: screenHeight * 0.0125,
      justifyContent: 'flex-start',
      alignItems: 'center',
      flexDirection: 'row',
      paddingHorizontal: 2,
    },
    toggleThumb: {
      width: screenHeight * 0.02,
      height: screenHeight * 0.02,
      borderRadius: screenHeight * 0.01,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: screenWidth * 0.05,
    marginTop: screenHeight * 0.02,
    paddingVertical: screenHeight * 0.015,
    borderRadius: 15,
    borderWidth: 1,
  },
  signOutIcon: {
    marginRight: screenWidth * 0.02,
  },
  signOutText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
  },
  subscriptionCard: {
    marginHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.01,
    paddingVertical: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.05,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subscriptionIcon: {
    width: screenWidth * 0.08,
    height: screenWidth * 0.08,
    borderRadius: screenWidth * 0.04,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: screenWidth * 0.04,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
  },
  subscriptionSubtitle: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    marginTop: 2,
  },
  versionText: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    textAlign: 'center',
    marginTop: screenHeight * 0.03,
  },
  // Edit Profile Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: Math.min(screenWidth * 0.05, 20),
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: screenHeight * 0.5,
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.02,
  },
  inputGroup: {
    marginBottom: screenHeight * 0.02,
  },
  inputLabel: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
    marginBottom: screenHeight * 0.008,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.012,
    fontSize: Math.min(screenWidth * 0.04, 16),
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.012,
    fontSize: Math.min(screenWidth * 0.04, 16),
    minHeight: screenHeight * 0.08,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.02,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: screenWidth * 0.03,
  },
  modalButton: {
    flex: 1,
    paddingVertical: screenHeight * 0.015,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  saveModalButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
  },
});

export default ProfileScreen; 