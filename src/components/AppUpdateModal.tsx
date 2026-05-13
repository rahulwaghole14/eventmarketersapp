import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { moderateScale, responsiveModal, responsiveText, responsiveShadow } from '../utils/responsiveUtils';

// Import App Icon
import AppIcon from '../assets/MainLogo/App_icon.png';

const { width: screenWidth } = Dimensions.get('window');

interface AppUpdateModalProps {
  isVisible: boolean;
  onUpdate: () => void;
  onLater?: () => void;
  forceUpdate?: boolean;
}

const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isVisible,
  onUpdate,
  onLater,
  forceUpdate = false,
}) => {
  const { isDarkMode, theme } = useTheme();

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        if (!forceUpdate && onLater) {
          onLater();
        }
      }}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer, 
          { backgroundColor: theme.colors.surface }
        ]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary || theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={[
              styles.iconContainer, 
              { 
                backgroundColor: isDarkMode ? theme.colors.cardBackground : '#FFFFFF',
                borderColor: isDarkMode ? theme.colors.border : 'rgba(255, 255, 255, 0.5)'
              }
            ]}>
              <Image 
                source={AppIcon} 
                style={styles.appIcon} 
                resizeMode="contain"
              />
            </View>
          </LinearGradient>

          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Update Available 
            </Text>
            
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              A new version of the app is available on the Play Store. Please update now to enjoy the latest features, improved performance, and bug fixes.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.updateButton, { backgroundColor: theme.colors.primary }]}
                onPress={onUpdate}
                activeOpacity={0.8}
              >
                <Text style={styles.updateButtonText}>Update Now</Text>
              </TouchableOpacity>

              {!forceUpdate && onLater && (
                <TouchableOpacity
                  style={styles.laterButton}
                  onPress={onLater}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.laterButtonText, { color: theme.colors.textSecondary }]}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(20),
  },
  modalContainer: {
    width: responsiveModal.width,
    borderRadius: moderateScale(24),
    overflow: 'hidden',
    ...responsiveShadow.large,
  },
  headerGradient: {
    height: moderateScale(120),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    padding: moderateScale(10),
    overflow: 'hidden',
  },
  appIcon: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(30),
  },
  contentContainer: {
    padding: moderateScale(24),
    alignItems: 'center',
  },
  title: {
    fontSize: responsiveText.heading,
    fontWeight: '800',
    marginBottom: moderateScale(12),
    textAlign: 'center',
  },
  description: {
    fontSize: responsiveText.body,
    textAlign: 'center',
    lineHeight: moderateScale(22),
    marginBottom: moderateScale(28),
  },
  buttonContainer: {
    width: '100%',
  },
  updateButton: {
    width: '100%',
    height: moderateScale(54),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    ...responsiveShadow.medium,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveText.subheading,
    fontWeight: '700',
  },
  laterButton: {
    width: '100%',
    height: moderateScale(48),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: moderateScale(8),
  },
  laterButtonText: {
    fontSize: responsiveText.body,
    fontWeight: '600',
  },
});

export default AppUpdateModal;
