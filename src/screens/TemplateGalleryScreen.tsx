import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  FlatList,
  Image,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { useBusinessProfile } from '../context/BusinessProfileContext';
import ImagePickerModal from '../components/ImagePickerModal';
import OptimizedImage from '../components/OptimizedImage';
import { launchImageLibrary } from 'react-native-image-picker';
import logger from '../utils/logger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Storage key for uploaded photos
const UPLOADED_PHOTOS_KEY = '@uploaded_photos';

// Interface for uploaded photo
interface UploadedPhoto {
  id: string;
  uri: string;
  timestamp: number;
}

// Responsive design helpers
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414;
const isTablet = screenWidth >= 768;

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

const TemplateGalleryScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { selectedBusinessProfile } = useBusinessProfile();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);

  // Custom delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const deleteModalAnim = useRef(new Animated.Value(0)).current;
  const deleteModalScale = useRef(new Animated.Value(0.85)).current;

  // Dynamic dimensions for responsive layout
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  // Update dimensions on screen rotation/resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const currentScreenWidth = dimensions.width;
  const currentScreenHeight = dimensions.height;

  // Dynamic responsive scaling functions
  const dynamicScale = (size: number) => (currentScreenWidth / 375) * size;
  const dynamicModerateScale = (size: number, factor = 0.5) => size + (dynamicScale(size) - size) * factor;

  // Load uploaded photos from storage
  const loadUploadedPhotos = useCallback(async () => {
    try {
      const photosJson = await AsyncStorage.getItem(UPLOADED_PHOTOS_KEY);
      if (photosJson) {
        const photos: UploadedPhoto[] = JSON.parse(photosJson);
        // Sort by timestamp, newest first
        photos.sort((a, b) => b.timestamp - a.timestamp);
        setUploadedPhotos(photos);
      }
    } catch (error) {
      logger.error('Error loading uploaded photos:', error);
    }
  }, []);

  // Save uploaded photos to storage
  const saveUploadedPhotos = async (photos: UploadedPhoto[]) => {
    try {
      await AsyncStorage.setItem(UPLOADED_PHOTOS_KEY, JSON.stringify(photos));
    } catch (error) {
      logger.error('Error saving uploaded photos:', error);
    }
  };

  // Load photos on mount
  useEffect(() => {
    loadUploadedPhotos();
  }, [loadUploadedPhotos]);

  // Handle image selection from picker
  const handleImageSelected = async (imageUri: string) => {
    logger.log('Image selected:', imageUri);
    
    // Save to uploaded photos
    const newPhoto: UploadedPhoto = {
      id: `photo_${Date.now()}`,
      uri: imageUri,
      timestamp: Date.now(),
    };
    
    const updatedPhotos = [newPhoto, ...uploadedPhotos];
    setUploadedPhotos(updatedPhotos);
    await saveUploadedPhotos(updatedPhotos);
    
    // Navigate to PosterEditor screen with the selected image
    console.log("🔧 [TEMPLATE GALLERY] Navigating with businessProfile:", selectedBusinessProfile);
    
    navigation.navigate('PosterEditor', {
      selectedImage: {
        uri: imageUri,
        title: 'Custom Upload',
        description: 'Your uploaded photo',
      },
      selectedLanguage: 'English',
      selectedTemplateId: undefined,
      posterCategory: selectedBusinessProfile?.category || 'Custom',
      type: selectedBusinessProfile ? "business" : "custom",
      categoryName: selectedBusinessProfile?.category || 'Custom Upload',
      source: "TemplateGallery",
      
      // ✅ CRITICAL: Pass business profile like working flow
      businessProfile: selectedBusinessProfile,
      businessCategory: selectedBusinessProfile?.category || undefined,
    } as any);
  };

  const handleVideoUpload = useCallback(() => {
    try {
      const options = {
        mediaType: 'video' as const,
        selectionLimit: 1,
      };

      launchImageLibrary(options, (response) => {
        if (response.didCancel) return;
        
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to select video');
          return;
        }

        if (response.assets && response.assets[0] && response.assets[0].uri) {
          const videoUri = response.assets[0].uri;
          
          navigation.navigate('VideoEditor', {
            selectedVideo: {
              uri: videoUri,
              title: 'Custom Upload',
              description: 'Your uploaded video',
            },
            selectedLanguage: 'English',
            selectedTemplateId: 'custom_video_' + Date.now(),
          } as any);
        }
      });
    } catch (error) {
      console.error('Video gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  }, [navigation]);

  // Handle photo press from gallery
  const handlePhotoPress = (photo: UploadedPhoto) => {
    console.log("🔧 [TEMPLATE GALLERY] Photo press navigating with businessProfile:", selectedBusinessProfile);
    
    navigation.navigate('PosterEditor', {
      selectedImage: {
        uri: photo.uri,
        title: 'Custom Upload',
        description: 'Your uploaded photo',
      },
      selectedLanguage: 'English',
      selectedTemplateId: undefined,
      posterCategory: selectedBusinessProfile?.category || 'Custom',
      type: selectedBusinessProfile ? "business" : "custom",
      categoryName: selectedBusinessProfile?.category || 'Custom Upload',
      source: "TemplateGallery",
      
      // ✅ CRITICAL: Pass business profile like working flow
      businessProfile: selectedBusinessProfile,
      businessCategory: selectedBusinessProfile?.category || undefined,
    } as any);
  };

  // Show custom delete modal
  const handleDeletePhoto = (photoId: string) => {
    setPhotoToDelete(photoId);
    setDeleteModalVisible(true);
    Animated.parallel([
      Animated.timing(deleteModalAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(deleteModalScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(deleteModalAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(deleteModalScale, {
        toValue: 0.85,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDeleteModalVisible(false);
      setPhotoToDelete(null);
    });
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const updatedPhotos = uploadedPhotos.filter(p => p.id !== photoToDelete);
    closeDeleteModal();
    // Slight delay so animation plays before state update
    setTimeout(async () => {
      setUploadedPhotos(updatedPhotos);
      await saveUploadedPhotos(updatedPhotos);
    }, 200);
  };

  // Calculate grid dimensions dynamically
  const isCurrentTablet = currentScreenWidth >= 768;
  const numColumns = isCurrentTablet ? 4 : 3;
  const cardGap = 6;
  const horizontalPadding = currentScreenWidth * 0.04 * 2;
  const totalGapWidth = cardGap * (numColumns - 1);
  const cardWidth = (currentScreenWidth - horizontalPadding - totalGapWidth) / numColumns;
  const cardHeight = cardWidth * 1.2;

  // Render uploaded photo item - memoized with useCallback
  const renderPhotoItem = useCallback(({ item }: { item: UploadedPhoto }) => (
    <TouchableOpacity
      style={[styles.photoCard, { 
        width: cardWidth, 
        height: cardHeight,
        borderRadius: 8,
      }]}
      onPress={() => handlePhotoPress(item)}
      activeOpacity={0.8}
    >
      <OptimizedImage
        uri={item.uri}
        style={styles.photoImage}
        resizeMode="cover"
        showLoader={true}
        loaderColor={theme.colors.primary}
        loaderSize="small"
      />
      <TouchableOpacity
        style={[styles.deleteButton, {
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: 11,
        }]}
        onPress={() => handleDeletePhoto(item.id)}
        activeOpacity={0.8}
      >
        <Icon name="delete" size={12} color="#ffffff" />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [cardWidth, cardHeight, theme.colors.primary, handlePhotoPress, handleDeletePhoto]);

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.gradient[0] || '#e8e8e8' }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar 
        barStyle="dark-content"
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
        <View style={[styles.header, { 
          paddingTop: insets.top,
          paddingHorizontal: currentScreenWidth * 0.04,
          paddingBottom: currentScreenHeight * 0.008,
        }]}>
          <View style={styles.headerTop}>
            <View style={styles.greeting}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>Create your custom design</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Upload Section */}
          <View style={[styles.uploadSection, {
            paddingHorizontal: currentScreenWidth * 0.08,
            paddingTop: currentScreenHeight * 0.01,
            paddingBottom: currentScreenHeight * 0.025,
          }]}>
            {/* Upload Icon */}
            <View style={[styles.uploadIconContainer, { 
              backgroundColor: `${theme.colors.primary}15`,
              width: isCurrentTablet ? 100 : 80,
              height: isCurrentTablet ? 100 : 80,
              marginBottom: 12,
            }]}>
              <Icon name="cloud-upload" size={isCurrentTablet ? 50 : 40} color={theme.colors.primary} />
            </View>

            {/* Upload Info */}
            <Text style={[styles.uploadTitle, { 
              color: theme.colors.text,
              marginBottom: 6,
            }]}>
              Upload Your Photo
            </Text>
            <Text style={[styles.uploadSubtitle, { 
              color: theme.colors.textSecondary,
              marginBottom: 16,
              paddingHorizontal: 12,
            }]}>
              Select a photo from your gallery or take a new one with your camera
            </Text>

            {/* Upload Button */}
            <TouchableOpacity
              style={[styles.uploadButton, {
                borderRadius: isCurrentTablet ? 12 : 10,
                maxWidth: isCurrentTablet ? 280 : 240,
              }]}
              onPress={() => setImagePickerVisible(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={[styles.uploadButtonGradient, {
                  paddingVertical: isCurrentTablet ? 12 : 10,
                  paddingHorizontal: isCurrentTablet ? 20 : 16,
                }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="add-photo-alternate" size={isCurrentTablet ? 16 : 14} color="#ffffff" style={[styles.uploadButtonIcon, { marginRight: 6 }]} />
                <Text style={styles.uploadButtonText}>Choose Photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadButton, {
                borderRadius: isCurrentTablet ? 12 : 10,
                maxWidth: isCurrentTablet ? 280 : 240,
                marginTop: 12,
              }]}
              onPress={handleVideoUpload}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.secondary, theme.colors.primary]}
                style={[styles.uploadButtonGradient, {
                  paddingVertical: isCurrentTablet ? 12 : 10,
                  paddingHorizontal: isCurrentTablet ? 20 : 16,
                }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="movie" size={isCurrentTablet ? 16 : 14} color="#ffffff" style={[styles.uploadButtonIcon, { marginRight: 6 }]} />
                <Text style={styles.uploadButtonText}>Choose Video</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Uploaded Photos Gallery Section */}
          {uploadedPhotos.length > 0 && (
            <View style={[styles.gallerySection, {
              paddingTop: currentScreenHeight * 0.01,
              paddingHorizontal: currentScreenWidth * 0.04,
            }]}>
              <View style={[styles.gallerySectionHeader, {
                marginBottom: 6,
              }]}>
                <Text style={[styles.gallerySectionTitle, { 
                  color: theme.colors.text,
                  marginBottom: 2,
                }]}>
                  Your Uploaded Photos
                </Text>
                <Text style={[styles.gallerySectionSubtitle, { color: theme.colors.textSecondary }]}>
                  {uploadedPhotos.length} {uploadedPhotos.length === 1 ? 'photo' : 'photos'}
                </Text>
              </View>

              <FlatList
                data={uploadedPhotos}
                renderItem={renderPhotoItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                key={`${numColumns}-${currentScreenWidth}`}
                columnWrapperStyle={[styles.photoRow, {
                  gap: cardGap,
                  marginBottom: 6,
                }]}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {/* Empty State */}
          {uploadedPhotos.length === 0 && (
            <View style={[styles.emptyState, {
              paddingVertical: currentScreenHeight * 0.03,
              paddingHorizontal: currentScreenWidth * 0.08,
            }]}>
              <Icon name="photo-library" size={isCurrentTablet ? 32 : 24} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateText, { 
                color: theme.colors.textSecondary,
                marginTop: 8,
              }]}>
                No photos uploaded yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { 
                color: theme.colors.textSecondary,
                marginTop: 4,
              }]}>
                Upload your first photo to get started
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
      
      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        onImageSelected={handleImageSelected}
        cropWidth={2400}
        cropHeight={2400}
        isCircleCrop={false}
        title="Crop Background Image"
      />

      {/* ── Custom Delete Confirmation Modal ── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeDeleteModal}
        statusBarTranslucent
      >
        <Animated.View
          style={[
            styles.deleteModalBackdrop,
            { opacity: deleteModalAnim },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeDeleteModal}
          />
          <Animated.View
            style={[
              styles.deleteModalCard,
              {
                backgroundColor: theme.colors.cardBackground || '#ffffff',
                transform: [{ scale: deleteModalScale }],
                opacity: deleteModalAnim,
              },
            ]}
          >
            {/* Icon */}
            <View style={[styles.deleteModalIconWrap, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
              <Icon name="delete-forever" size={36} color="#FF3B30" />
            </View>

            {/* Title */}
            <Text style={[styles.deleteModalTitle, { color: theme.colors.text }]}>
              Delete Photo
            </Text>

            {/* Subtitle */}
            <Text style={[styles.deleteModalSubtitle, { color: theme.colors.textSecondary }]}>
              This photo will be permanently removed from your gallery. This action cannot be undone.
            </Text>

            {/* Buttons */}
            <View style={styles.deleteModalButtons}>
              {/* Cancel */}
              <TouchableOpacity
                style={[
                  styles.deleteModalBtn,
                  styles.deleteModalCancelBtn,
                  { borderColor: theme.colors.border || '#e0e0e0', backgroundColor: theme.colors.surface || '#f8f8f8' },
                ]}
                onPress={closeDeleteModal}
                activeOpacity={0.75}
              >
                <Text style={[styles.deleteModalBtnText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                style={[styles.deleteModalBtn, styles.deleteModalDeleteBtn]}
                onPress={confirmDeletePhoto}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF3B30', '#FF6B6B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.deleteModalDeleteGradient}
                >
                  <Icon name="delete" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteModalDeleteText}>Delete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
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
    paddingTop: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    alignItems: 'center',
  },
  userName: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  uploadSection: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  uploadIconContainer: {
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadTitle: {
    fontSize: isTablet ? 24 : isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: isTablet ? 14 : isSmallScreen ? 11 : 12,
    textAlign: 'center',
    lineHeight: isTablet ? 20 : 16,
  },
  uploadButton: {
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonIcon: {
  },
  uploadButtonText: {
    fontSize: isTablet ? 16 : isSmallScreen ? 13 : 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  gallerySection: {
  },
  gallerySectionHeader: {
  },
  gallerySectionTitle: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: 'bold',
  },
  gallerySectionSubtitle: {
    fontSize: isTablet ? 11 : 9,
  },
  photoRow: {
    justifyContent: 'flex-start',
  },
  photoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: isTablet ? 13 : 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  // ── Delete Modal Styles ──
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  deleteModalCard: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 20,
  },
  deleteModalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    opacity: 0.8,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  deleteModalBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteModalCancelBtn: {
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  deleteModalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteModalDeleteBtn: {
    borderRadius: 14,
  },
  deleteModalDeleteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  deleteModalDeleteText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyStateSubtext: {
    fontSize: isTablet ? 11 : 9,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default TemplateGalleryScreen; 
