import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
  Platform,
  ToastAndroid,
  Share,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
// import RNFS from 'react-native-fs'; // Removed - package uninstalled
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import downloadedPostersService from '../services/downloadedPosters';

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

// Calculate responsive dimensions that avoid notch problems
const getResponsiveDimensions = (insets: any) => {
  const availableWidth = screenWidth - (insets.left + insets.right);
  const availableHeight = screenHeight - (insets.top + insets.bottom);
  
  // Calculate image dimensions to fit within available space
  const imageWidth = Math.min(availableWidth * 0.9, screenWidth * 0.9);
  const imageHeight = Math.min(availableHeight * 0.7, screenHeight * 0.7);
  
  return {
    imageWidth,
    imageHeight,
    availableWidth,
    availableHeight
  };
};

interface PosterPreviewScreenProps {
  route: {
    params: {
      capturedImageUri: string;
      selectedImage: {
        uri: string;
        title?: string;
        description?: string;
      };
      selectedLanguage: string;
      selectedTemplateId: string;
      selectedBusinessProfile?: any;
      posterLayers?: any[];
      selectedFrame?: any;
      frameContent?: any;
      selectedTemplate?: string;
      selectedFooterStyle?: string;
      visibleFields?: {[key: string]: boolean};
      canvasWidth?: number;
      canvasHeight?: number;
      isSubscribed?: boolean; // Subscription status passed from editor
    };
  };
}

const PosterPreviewScreen: React.FC<PosterPreviewScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Get responsive dimensions
  const { imageWidth, imageHeight, availableWidth, availableHeight } = getResponsiveDimensions(insets);

  const { 
    capturedImageUri, 
    selectedImage, 
    selectedLanguage, 
    selectedTemplateId, 
    selectedBusinessProfile, 
    posterLayers, 
    selectedFrame, 
    frameContent,
    selectedTemplate,
    selectedFooterStyle,
    visibleFields,
    canvasWidth,
    canvasHeight,
    isSubscribed = false // Default to false if not provided
  } = route.params;

  const [isUploading, setIsUploading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug safe area values
  console.log('Safe area insets:', {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  });

  // Debug: Log the received data
  console.log('PosterPreviewScreen - Received data:', {
    capturedImageUri,
    capturedImageUriLength: capturedImageUri?.length,
    capturedImageUriType: typeof capturedImageUri,
    selectedImage,
    selectedLanguage,
    selectedTemplateId,
    selectedBusinessProfile: selectedBusinessProfile?.id,
  });

  // Additional debugging for image URI
  if (capturedImageUri) {
    console.log('Captured image URI starts with:', capturedImageUri.substring(0, 100));
    console.log('Captured image URI is data URI:', capturedImageUri.startsWith('data:image'));
    console.log('Captured image URI is file URI:', capturedImageUri.startsWith('file://'));
    console.log('Captured image URI length:', capturedImageUri.length);
    console.log('Full URI type:', typeof capturedImageUri);
  } else {
    console.log('No captured image URI received');
  }

  // Upload image to backend
  const uploadImage = async () => {
    setIsUploading(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append('poster', {
        uri: capturedImageUri,
        type: 'image/png',
        name: 'poster.png',
      } as any);
      formData.append('templateId', selectedTemplateId);
      formData.append('language', selectedLanguage);
      formData.append('businessProfileId', selectedBusinessProfile?.id || '');

      // Upload to backend
      const response = await axios.post('YOUR_BACKEND_URL/api/posters/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Poster saved successfully!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Poster saved successfully!');
        }
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload poster. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

     // Request permissions for Android
   const requestPermissions = async () => {
     if (Platform.OS === 'android') {
       try {
         const granted = await PermissionsAndroid.request(
           PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
           {
             title: 'Storage Permission',
             message: 'This app needs access to your storage to save the poster to EventMarketers folder.',
             buttonNeutral: 'Ask Me Later',
             buttonNegative: 'Cancel',
             buttonPositive: 'OK',
           }
         );
         return granted === PermissionsAndroid.RESULTS.GRANTED;
       } catch (err) {
         console.warn(err);
         return false;
       }
     }
     return true;
   };

   // Helper function removed - RNFS package uninstalled

   // Helper function to get user-friendly folder path
   const getFolderPathForDisplay = () => {
     if (Platform.OS === 'android') {
       return 'Downloads/EventMarketers';
     } else {
       return 'Files app > On My iPhone/iPad > EventMarketers';
     }
   };

  // Share poster
  const sharePoster = async () => {
    if (!capturedImageUri) {
      Alert.alert('Error', 'No poster image available to share');
      return;
    }

    try {
      setIsProcessing(true);
      const result = await Share.share({
        url: capturedImageUri,
        title: selectedImage.title || 'My Event Poster',
        message: `Check out my event poster: ${selectedImage.title || 'Custom Poster'}`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
          console.log('Shared with activity type:', result.activityType);
        } else {
          // shared
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing poster:', error);
      Alert.alert('Error', 'Failed to share poster. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

     // Download poster to gallery
   const downloadPoster = async () => {
     if (!capturedImageUri) {
       Alert.alert('Error', 'No poster image available to download');
       return;
     }

     try {
       setIsProcessing(true);
       
       console.log('=== DOWNLOAD DEBUG START ===');
       console.log('CapturedImageUri type:', typeof capturedImageUri);
       console.log('CapturedImageUri length:', capturedImageUri?.length);
       console.log('CapturedImageUri starts with:', capturedImageUri.substring(0, 100));
       console.log('Platform:', Platform.OS);
       
       // Request permissions for Android
       if (Platform.OS === 'android') {
         console.log('Requesting Android permissions...');
         const hasPermission = await requestPermissions();
         console.log('Permission granted:', hasPermission);
         if (!hasPermission) {
           Alert.alert('Permission Denied', 'Storage permission is required to save the poster to gallery.');
           return;
         }
       }

       // Check if source file exists (for file:// URIs) - RNFS removed, skip check
       if (capturedImageUri.startsWith('file://')) {
         console.log('File URI detected, proceeding with save');
       }

       // Save to gallery using CameraRoll
       console.log('Saving to gallery...');
       await CameraRoll.save(capturedImageUri, {
         type: 'photo',
         album: 'EventMarketers'
       });
       
       console.log('Image saved to gallery successfully');
       
       // Save poster information to local storage
       try {
         await downloadedPostersService.savePosterInfo({
           title: selectedImage.title || 'Custom Poster',
           description: selectedImage.description || 'Event poster created with EventMarketers',
           imageUri: capturedImageUri,
           templateId: selectedTemplateId,
           category: selectedImage.title?.toLowerCase().includes('event') ? 'Events' : 'General',
           tags: ['poster', 'event', 'marketing'],
           size: {
             width: canvasWidth || 1080,
             height: canvasHeight || 1920,
           },
         });
         console.log('Poster information saved successfully');
       } catch (error) {
         console.error('Error saving poster information:', error);
         // Don't fail the download if poster info saving fails
       }
       
       console.log('=== DOWNLOAD DEBUG END ===');

       // Show simple success message
       if (Platform.OS === 'android') {
         ToastAndroid.show(
           'Poster saved to gallery!', 
           ToastAndroid.LONG
         );
       } else {
         // For iOS, we'll use a simple alert with just OK button
         Alert.alert(
           'Success!', 
           'Poster has been saved to your device gallery!',
           [
             {
               text: 'OK',
               style: 'cancel'
             }
           ]
         );
       }
     } catch (error: any) {
       console.error('=== DOWNLOAD ERROR ===');
       console.error('Error saving to gallery:', error);
       console.error('Error details:', {
         message: error?.message || 'Unknown error',
         stack: error?.stack,
         capturedImageUri: capturedImageUri?.substring(0, 100) + '...',
         uriType: capturedImageUri?.startsWith('data:image') ? 'base64' : 
                 capturedImageUri?.startsWith('file://') ? 'file' : 'other'
       });
       
       // Show user-friendly error message
       Alert.alert(
         'Download Failed', 
         `Failed to save poster to gallery: ${error?.message || 'Unknown error'}`,
         [
           {
             text: 'OK',
             style: 'cancel'
           }
         ]
       );
     } finally {
       setIsProcessing(false);
     }
   };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      
             {/* Professional Header */}
       <LinearGradient
         colors={['#667eea', '#764ba2']}
         style={[styles.header, { paddingTop: insets.top + responsiveSpacing.sm }]}
       >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Preview Poster</Text>
          <Text style={styles.headerSubtitle}>
            Review your poster before saving
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Poster Preview */}
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Your Poster</Text>
          <Text style={styles.previewSubtitle}>
            {selectedImage.title || 'Custom Poster'} • {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}
          </Text>
        </View>
        
                 <View style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}>
           {!capturedImageUri ? (
             <View style={styles.errorContainer}>
               <Icon name="error" size={48} color="#ff6b6b" />
               <Text style={styles.errorText}>No poster image captured</Text>
               <Text style={styles.errorSubtext}>Using original image</Text>
               <Image
                 source={{ uri: selectedImage.uri }}
                 style={styles.posterImage}
                 resizeMode="contain"
               />
             </View>
           ) : imageLoadError ? (
             <View style={styles.errorContainer}>
               <Icon name="error" size={48} color="#ff6b6b" />
               <Text style={styles.errorText}>Failed to load poster image</Text>
               <Text style={styles.errorSubtext}>Using fallback image</Text>
               <Image
                 source={{ uri: selectedImage.uri }}
                 style={styles.posterImage}
                 resizeMode="contain"
               />
             </View>
                       ) : (
              <View style={styles.imageWrapper}>
                {imageLoading && (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading poster...</Text>
                  </View>
                )}
                <Image
                  source={{ uri: capturedImageUri }}
                  style={styles.posterImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('Image load error:', error);
                    console.log('Error details:', error.nativeEvent);
                    console.log('Error message:', error.nativeEvent?.error);
                    setImageLoadError(true);
                    setImageLoading(false);
                  }}
                  onLoad={(event) => {
                    console.log('Poster image loaded successfully');
                    console.log('Image dimensions:', event.nativeEvent);
                    setImageLoading(false);
                  }}
                                 />
               </View>
            )}
         </View>
      </View>

             {/* Action Buttons */}
       <View style={[
         styles.actionContainer, 
         { 
           paddingBottom: Math.max(insets.bottom + responsiveSpacing.md, responsiveSpacing.lg)
         }
       ]}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={sharePoster}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={isProcessing ? ['#cccccc', '#999999'] : ['#667eea', '#764ba2']}
              style={styles.shareButtonGradient}
            >
              <Icon name="share" size={24} color="#ffffff" />
              <Text style={styles.shareButtonText}>
                {isProcessing ? 'Processing...' : 'Share'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={downloadPoster}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={isProcessing ? ['#cccccc', '#999999'] : ['#28a745', '#20c997']}
              style={styles.saveButtonGradient}
            >
              <Icon name="download" size={24} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                {isProcessing ? 'Processing...' : 'Download'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.editButton, { marginBottom: 8 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.editButtonText}>Back to Editor</Text>
        </TouchableOpacity>
      </View>
      
             
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveSpacing.md,
    paddingVertical: responsiveSpacing.sm,
    borderBottomWidth: 0,
    zIndex: 1000,
    elevation: 10,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: responsiveFontSize.xxl,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: responsiveFontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 44, // Same width as back button for centering
  },
  previewContainer: {
    flex: 1,
    padding: responsiveSpacing.md,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: responsiveSpacing.md,
  },
  previewTitle: {
    fontSize: responsiveFontSize.xxl,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: responsiveFontSize.md,
    color: '#666666',
    textAlign: 'center',
  },
  imageContainer: {
    // These will be set dynamically based on responsive dimensions
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
    marginTop: 12,
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  frameOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  frameOverlayImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  layer: {
    position: 'absolute',
  },
  layerText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  layerImage: {
    width: '100%',
    height: '100%',
  },
  debugInfo: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 5,
  },
  // Template Styles
  canvasWithFrame: {
    borderWidth: 8,
    borderColor: '#667eea',
    borderRadius: 16,
  },
  businessFrame: {
    borderWidth: 10,
    borderColor: '#2c3e50',
    borderRadius: 20,
  },
  eventFrame: {
    borderWidth: 12,
    borderColor: '#e74c3c',
    borderRadius: 24,
  },
  restaurantFrame: {
    borderWidth: 10,
    borderColor: '#f39c12',
    borderRadius: 18,
  },
  fashionFrame: {
    borderWidth: 12,
    borderColor: '#9b59b6',
    borderRadius: 22,
  },
  realEstateFrame: {
    borderWidth: 10,
    borderColor: '#27ae60',
    borderRadius: 16,
  },
  educationFrame: {
    borderWidth: 10,
    borderColor: '#3498db',
    borderRadius: 20,
  },
  healthcareFrame: {
    borderWidth: 10,
    borderColor: '#e74c3c',
    borderRadius: 18,
  },
  fitnessFrame: {
    borderWidth: 12,
    borderColor: '#f39c12',
    borderRadius: 24,
  },
  weddingFrame: {
    borderWidth: 15,
    borderColor: '#e91e63',
    borderRadius: 30,
  },
  birthdayFrame: {
    borderWidth: 12,
    borderColor: '#ff9800',
    borderRadius: 26,
  },
  corporateFrame: {
    borderWidth: 10,
    borderColor: '#34495e',
    borderRadius: 16,
  },
  creativeFrame: {
    borderWidth: 12,
    borderColor: '#9c27b0',
    borderRadius: 28,
  },
  minimalFrame: {
    borderWidth: 4,
    borderColor: '#95a5a6',
    borderRadius: 12,
  },
  luxuryFrame: {
    borderWidth: 15,
    borderColor: '#d4af37',
    borderRadius: 32,
  },
  modernFrame: {
    borderWidth: 8,
    borderColor: '#607d8b',
    borderRadius: 20,
  },
  vintageFrame: {
    borderWidth: 12,
    borderColor: '#8d6e63',
    borderRadius: 24,
  },
  retroFrame: {
    borderWidth: 10,
    borderColor: '#ff5722',
    borderRadius: 18,
  },
  elegantFrame: {
    borderWidth: 12,
    borderColor: '#795548',
    borderRadius: 26,
  },
  boldFrame: {
    borderWidth: 15,
    borderColor: '#000000',
    borderRadius: 30,
  },
  techFrame: {
    borderWidth: 10,
    borderColor: '#00bcd4',
    borderRadius: 20,
  },
  natureFrame: {
    borderWidth: 10,
    borderColor: '#4caf50',
    borderRadius: 18,
  },
  oceanFrame: {
    borderWidth: 10,
    borderColor: '#2196f3',
    borderRadius: 20,
  },
  sunsetFrame: {
    borderWidth: 12,
    borderColor: '#ff9800',
    borderRadius: 24,
  },
  cosmicFrame: {
    borderWidth: 12,
    borderColor: '#673ab7',
    borderRadius: 26,
  },
  artisticFrame: {
    borderWidth: 12,
    borderColor: '#e91e63',
    borderRadius: 28,
  },
  sportFrame: {
    borderWidth: 10,
    borderColor: '#ff5722',
    borderRadius: 20,
  },
  warmFrame: {
    borderWidth: 10,
    borderColor: '#ff7043',
    borderRadius: 18,
  },
  coolFrame: {
    borderWidth: 10,
    borderColor: '#42a5f5',
    borderRadius: 20,
  },
  actionContainer: {
    paddingHorizontal: responsiveSpacing.md,
    paddingTop: responsiveSpacing.md,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    // paddingBottom will be set dynamically with safe area
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsiveSpacing.md,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: responsiveFontSize.md,
    fontWeight: '600',
    marginLeft: responsiveSpacing.xs,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: responsiveFontSize.md,
    fontWeight: '600',
    marginLeft: responsiveSpacing.xs,
  },
  editButton: {
    paddingVertical: responsiveSpacing.sm,
    paddingHorizontal: responsiveSpacing.md,
    borderRadius: responsiveSpacing.sm,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
    minHeight: 48, // Ensure minimum touch target size
  },
  editButtonText: {
    color: '#666666',
    fontSize: responsiveFontSize.sm,
    fontWeight: '600',
  },
});

export default PosterPreviewScreen;
