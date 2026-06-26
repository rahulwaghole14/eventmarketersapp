import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
  Animated,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive design helpers
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414;
const isTablet = screenWidth >= 768;
const isLandscape = screenWidth > screenHeight;

// Dynamic responsive helpers for modal
const getModalDimensions = () => {
  const currentWidth = Dimensions.get('window').width;
  const currentHeight = Dimensions.get('window').height;
  const isCurrentlyLandscape = currentWidth > currentHeight;

  return {
    width: currentWidth,
    height: currentHeight,
    isLandscape: isCurrentlyLandscape,
    isSmall: currentWidth < 375,
    isMedium: currentWidth >= 375 && currentWidth < 414,
    isLarge: currentWidth >= 414,
    isTablet: currentWidth >= 768,
  };
};

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageUri: string) => void;
  cropWidth?: number;
  cropHeight?: number;
  isCircleCrop?: boolean;
  title?: string;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onImageSelected,
  cropWidth = 400,
  cropHeight = 400,
  isCircleCrop = true,
  title: customTitle,
}) => {
  const { theme } = useTheme();
  const [dimensions, setDimensions] = useState(getModalDimensions());
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const backdropAnimation = useRef(new Animated.Value(0)).current;

  // Update dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDimensions(getModalDimensions());
    });

    return () => subscription?.remove();
  }, []);

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs access to your camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        console.log('Camera permission result:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Camera permission error:', err);
        return false;
      }
    }
    // iOS permissions are handled automatically by react-native-image-picker
    return true;
  };

  // ✅ Single-pass camera: openCamera picks AND crops in one native step,
  //   eliminating the double-compression that launchCamera + openCropper caused.
  const handleCameraPress = async () => {
    console.log('📷 Camera button pressed');

    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Camera permission granted, opening camera+crop in one step...');

      const image = await ImageCropPicker.openCamera({
        width: cropWidth,
        height: cropHeight,
        cropping: true,
        cropperCircleOverlay: isCircleCrop,
        compressImageQuality: 1.0,
        compressImageMaxWidth: 3000,
        compressImageMaxHeight: 3000,
        includeBase64: false,
        includeExif: false,
        cropperToolbarTitle: customTitle || 'Crop Your Picture',
        cropperStatusBarColor: '#667eea',
        cropperToolbarColor: '#667eea',
        cropperActiveWidgetColor: '#667eea',
        cropperToolbarWidgetColor: '#ffffff',
        freeStyleCropEnabled: false,
        enableRotationGesture: true,
        avoidEmptySpaceAroundImage: true,
        mediaType: 'photo',
      });

      let finalPath = image.path;
      if (Platform.OS === 'android' && !finalPath.startsWith('file://')) {
        finalPath = `file://${finalPath}`;
      }
      console.log('✅ Camera+crop complete:', finalPath, image.width, 'x', image.height);
      onImageSelected(finalPath);
      onClose();
    } catch (error: any) {
      if (
        error?.code === 'E_PICKER_CANCELLED' ||
        error?.message?.toLowerCase().includes('cancel')
      ) {
        return;
      }
      console.error('❌ Camera error:', error);
      Alert.alert('Camera Error', 'Failed to capture photo. Please try again.');
    }
  };

  // ✅ Single-pass gallery: openPicker picks AND crops in one native step,
  //   eliminating the double-compression that launchImageLibrary + openCropper caused.
  const handleGalleryPress = async () => {
    console.log('🖼️ Gallery button pressed');

    try {
      const image = await ImageCropPicker.openPicker({
        width: cropWidth,
        height: cropHeight,
        cropping: true,
        cropperCircleOverlay: isCircleCrop,
        compressImageQuality: 1.0,       // no lossy compression
        compressImageMaxWidth: 3000,
        compressImageMaxHeight: 3000,
        includeBase64: false,
        includeExif: false,
        cropperToolbarTitle: customTitle || 'Crop Your Picture',
        cropperStatusBarColor: '#667eea',
        cropperToolbarColor: '#667eea',
        cropperActiveWidgetColor: '#667eea',
        cropperToolbarWidgetColor: '#ffffff',
        freeStyleCropEnabled: false,
        enableRotationGesture: true,
        avoidEmptySpaceAroundImage: true,
        mediaType: 'photo',
      });

      let finalPath = image.path;
      if (Platform.OS === 'android' && !finalPath.startsWith('file://')) {
        finalPath = `file://${finalPath}`;
      }
      console.log('✅ Gallery+crop complete:', finalPath, image.width, 'x', image.height);
      onImageSelected(finalPath);
      onClose();
    } catch (error: any) {
      if (
        error?.code === 'E_PICKER_CANCELLED' ||
        error?.message?.toLowerCase().includes('cancel')
      ) {
        return;
      }
      console.error('❌ Gallery error:', error);
      Alert.alert('Gallery Error', 'Failed to select photo. Please try again.');
    }
  };


  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const renderOption = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    iconColor: string
  ) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        {
          backgroundColor: theme.colors.cardBackground,
          marginBottom: dimensions.isSmall ? 12 : dimensions.isMedium ? 16 : 20,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionContent}>
        <View style={[styles.optionIcon, { backgroundColor: `${iconColor}20` }]}>
          <Icon name={icon} size={dimensions.isSmall ? 24 : dimensions.isMedium ? 28 : 32} color={iconColor} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={[
            styles.optionTitle,
            { color: theme.colors.text, fontSize: dimensions.isSmall ? 16 : dimensions.isMedium ? 18 : 20 }
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.optionSubtitle,
            { color: theme.colors.textSecondary, fontSize: dimensions.isSmall ? 12 : dimensions.isMedium ? 14 : 16 }
          ]}>
            {subtitle}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnimation,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [
              {
                translateY: modalAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [dimensions.height, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.colors.cardBackground,
              borderTopLeftRadius: dimensions.isTablet ? 24 : 20,
              borderTopRightRadius: dimensions.isTablet ? 24 : 20,
              paddingHorizontal: dimensions.isSmall ? 16 : dimensions.isMedium ? 20 : 24,
              paddingTop: dimensions.isSmall ? 16 : dimensions.isMedium ? 20 : 24,
              paddingBottom: Math.max(34, dimensions.height * 0.05), // Account for safe area
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[
              styles.modalTitle,
              {
                color: theme.colors.text,
                fontSize: dimensions.isSmall ? 18 : dimensions.isMedium ? 20 : 22,
              }
            ]}>
              {customTitle || 'Select Profile Picture'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {renderOption(
              'camera-alt',
              'Take Photo',
              'Capture a new photo with camera',
              handleCameraPress,
              theme.colors.primary
            )}
            {renderOption(
              'photo-library',
              'Choose from Gallery',
              'Select an existing photo from gallery',
              handleGalleryPress,
              '#4CAF50'
            )}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                paddingVertical: dimensions.isSmall ? 12 : dimensions.isMedium ? 14 : 16,
              }
            ]}
            onPress={handleClose}
          >
            <Text style={[
              styles.cancelButtonText,
              {
                color: theme.colors.textSecondary,
                fontSize: dimensions.isSmall ? 16 : dimensions.isMedium ? 18 : 20,
              }
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    opacity: 0.8,
  },
  cancelButton: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
});

export default ImagePickerModal;
