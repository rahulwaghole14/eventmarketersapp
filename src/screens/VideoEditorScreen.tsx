import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  Image,
  FlatList,
  Animated,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/AppNavigator';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PanGestureHandler, State, PinchGestureHandler } from 'react-native-gesture-handler';
import businessProfileService, { BusinessProfile } from '../services/businessProfile';
import { frames, Frame, getFramesByCategory } from '../data/frames';
import { mapBusinessProfileToFrameContent, generateLayersFromFrame, getFrameBackgroundSource } from '../utils/frameUtils';
import FrameSelector from '../components/FrameSelector';
import { GOOGLE_FONTS, getFontsByCategory, SYSTEM_FONTS, getFontFamily } from '../services/fontService';
import { useSubscription } from '../contexts/SubscriptionContext';
import Watermark from '../components/Watermark';
import videoProcessingService, { VideoLayer } from '../services/videoProcessingService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');



interface VideoEditorScreenProps {
  route: {
    params: {
      selectedVideo: {
        uri: string;
        title?: string;
        description?: string;
      };
      selectedLanguage: string;
      selectedTemplateId: string;
    };
  };
}

const VideoEditorScreen: React.FC<VideoEditorScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { selectedVideo, selectedLanguage, selectedTemplateId } = route.params;
  const { isSubscribed } = useSubscription();

  // Video refs
  const videoRef = useRef<any>(null);
  const visibleVideoRef = useRef<any>(null);

  // State for video layers
  const [layers, setLayers] = useState<VideoLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showFontStyleModal, setShowFontStyleModal] = useState(false);
  const [showLogoSelectionModal, setShowLogoSelectionModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [showLogoModal, setShowLogoModal] = useState(false);

  // Video state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Business profiles
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<BusinessProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Template and frame state
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [selectedFont, setSelectedFont] = useState('System');
  const [fontSearchQuery, setFontSearchQuery] = useState('');

  // Video templates (similar to poster templates but for videos)
  const videoTemplates = [
    {
      id: 'video-1',
      name: 'Event Promo Video',
      thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
      category: 'Promotional',
      duration: '30s',
    },
    {
      id: 'video-2',
      name: 'Wedding Highlight',
      thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
      category: 'Wedding',
      duration: '60s',
    },
    {
      id: 'video-3',
      name: 'Corporate Event',
      thumbnail: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
      category: 'Corporate',
      duration: '45s',
    },
  ];

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Fetch business profiles
  const fetchBusinessProfiles = async () => {
    try {
      const profiles = await businessProfileService.getBusinessProfiles();
      setBusinessProfiles(profiles);
    } catch (error) {
      console.error('Error fetching business profiles:', error);
    }
  };

  useEffect(() => {
    fetchBusinessProfiles();
  }, []);

  // Apply business profile to video
  const applyBusinessProfileToVideo = (profile: BusinessProfile) => {
    const newLayers: VideoLayer[] = [];
    
    // Add business name
    if (profile.name) {
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: profile.name,
        position: { x: 50, y: 50 },
        size: { width: 200, height: 40 },
        style: {
          fontSize: 24,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: 'bold',
        },
      });
    }

    // Add contact info
    if (profile.phone) {
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: profile.phone,
        position: { x: 50, y: 100 },
        size: { width: 200, height: 30 },
        style: {
          fontSize: 18,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: 'normal',
        },
      });
    }

    // Add logo if available
    if (profile.logo) {
      newLayers.push({
        id: generateId(),
        type: 'logo',
        content: profile.logo,
        position: { x: screenWidth - 100, y: 50 },
        size: { width: 80, height: 80 },
      });
    }

    setLayers(newLayers);
    setSelectedProfile(profile);
    setShowProfileModal(false);
  };

  // Video controls
  const toggleVideoPlayback = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  const onVideoLoad = (data: any) => {
    setVideoDuration(data.duration);
  };

  const onVideoProgress = (data: any) => {
    setCurrentTime(data.currentTime);
  };

  // Layer management
  const addTextLayer = () => {
    const newLayer: VideoLayer = {
      id: generateId(),
      type: 'text',
      content: 'New Text',
      position: { x: screenWidth / 2 - 50, y: screenHeight / 2 - 20 },
      size: { width: 100, height: 40 },
      style: {
        fontSize: 20,
        color: '#ffffff',
        fontFamily: selectedFont,
        fontWeight: 'normal',
      },
    };
    setLayers([...layers, newLayer]);
    setSelectedLayer(newLayer.id);
    setShowTextModal(false);
  };

  const addImageLayer = () => {
    const newLayer: VideoLayer = {
      id: generateId(),
      type: 'image',
      content: newImageUrl,
      position: { x: 50, y: 100 },
      size: { width: 150, height: 150 },
    };
    setLayers([...layers, newLayer]);
    setSelectedLayer(newLayer.id);
    setShowImageModal(false);
    setNewImageUrl('');
  };

  const addLogoLayer = () => {
    const newLayer: VideoLayer = {
      id: generateId(),
      type: 'logo',
      content: newLogoUrl,
      position: { x: screenWidth - 100, y: 50 },
      size: { width: 80, height: 80 },
    };
    setLayers([...layers, newLayer]);
    setSelectedLayer(newLayer.id);
    setShowLogoModal(false);
    setNewLogoUrl('');
  };

  const updateLayer = (layerId: string, updates: Partial<VideoLayer>) => {
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  };

  const deleteLayer = (layerId: string) => {
    setLayers(layers.filter(layer => layer.id !== layerId));
    if (selectedLayer === layerId) {
      setSelectedLayer(null);
    }
  };

  // Camera and gallery access
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos.',
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

  const handleCameraAccess = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      });

      if (result.assets && result.assets[0]) {
        setNewImageUrl(result.assets[0].uri || '');
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const handleGalleryAccess = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      });

      if (result.assets && result.assets[0]) {
        setNewImageUrl(result.assets[0].uri || '');
      }
    } catch (error) {
      console.error('Gallery error:', error);
    }
  };

  // Font handling
  const handleFontSelect = (fontFamily: string) => {
    setSelectedFont(fontFamily);
    if (selectedLayer) {
      updateLayer(selectedLayer, {
        style: { ...layers.find(l => l.id === selectedLayer)?.style, fontFamily }
      });
    }
    setShowFontModal(false);
  };

  // Navigation
  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = async () => {
    if (layers.length === 0) {
      Alert.alert('No Content', 'Please add at least one text, image, or logo layer to your video.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingProgress(0);

      // Request storage permission
      const hasPermission = await videoProcessingService.requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is required to process videos.');
        setIsProcessing(false);
        return;
      }

      // Process video with overlays (simplified)
      setProcessingProgress(25);
      const processedVideoPath = await videoProcessingService.processVideoWithOverlays(
        selectedVideo.uri,
        layers,
        { addWatermark: !isSubscribed }
      );

      setProcessingProgress(75);

      // Navigate to video preview screen with processed video
      navigation.navigate('VideoPreview', {
        selectedVideo: {
          ...selectedVideo,
          uri: processedVideoPath, // Use processed video path
        },
        selectedLanguage,
        selectedTemplateId,
        layers,
        selectedProfile,
      });

      setProcessingProgress(100);
      setIsProcessing(false);
    } catch (error) {
      console.error('Video processing error:', error);
      Alert.alert('Processing Error', 'Failed to process video. Please try again.');
      setIsProcessing(false);
    }
  };

  // Render functions
  const renderLayer = (layer: VideoLayer) => {
    const isSelected = selectedLayer === layer.id;
    
    const handleLayerPress = () => {
      setSelectedLayer(layer.id);
    };

    return (
      <TouchableOpacity
        key={layer.id}
        style={[
          styles.layer,
          {
            position: 'absolute',
            left: layer.position.x,
            top: layer.position.y,
            width: layer.size.width,
            height: layer.size.height,
            zIndex: layers.indexOf(layer) + 1, // Use array index for zIndex
          },
          isSelected && styles.selectedLayer,
        ]}
        onPress={handleLayerPress}
      >
        {layer.type === 'text' && (
          <Text
            style={[
              styles.layerText,
              layer.style,
            ]}
          >
            {layer.content}
          </Text>
        )}
        {layer.type === 'image' && (
          <Image
            source={{ uri: layer.content }}
            style={styles.layerImage}
            resizeMode="cover"
          />
        )}
        {layer.type === 'logo' && (
          <Image
            source={{ uri: layer.content }}
            style={styles.layerLogo}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderProfileItem = ({ item }: { item: BusinessProfile }) => (
    <TouchableOpacity
      style={styles.profileItem}
      onPress={() => applyBusinessProfileToVideo(item)}
    >
      <Image source={{ uri: item.logo || '' }} style={styles.profileLogo} />
      <Text style={styles.profileName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientBackground}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Video Editor</Text>
          <TouchableOpacity 
            style={[styles.nextButton, isProcessing && styles.nextButtonDisabled]} 
            onPress={handleNext}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Video Canvas */}
        <View style={styles.videoCanvas}>
          <Video
            ref={videoRef}
            source={{ uri: selectedVideo.uri }}
            style={styles.video}
            resizeMode="cover"
            paused={!isVideoPlaying}
            onLoad={onVideoLoad}
            onProgress={onVideoProgress}
            repeat={true}
          />
          
          {/* Video Layers */}
          {layers.map(renderLayer)}
          
          {/* Watermark */}
          {isCapturing && <Watermark isSubscribed={isSubscribed} />}

          {/* Processing Overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingModal}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.processingTitle}>Processing Video</Text>
                <Text style={styles.processingSubtitle}>
                  Adding overlays and effects...
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${processingProgress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{processingProgress}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* Video Controls */}
        <View style={styles.videoControls}>
          <TouchableOpacity style={styles.playButton} onPress={toggleVideoPlayback}>
            <Icon 
              name={isVideoPlaying ? 'pause' : 'play-arrow'} 
              size={24} 
              color="#ffffff" 
            />
          </TouchableOpacity>
          <Text style={styles.timeText}>
            {Math.floor(currentTime)}s / {Math.floor(videoDuration)}s
          </Text>
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => setShowTextModal(true)}
          >
            <Icon name="text-fields" size={24} color="#ffffff" />
            <Text style={styles.toolbarButtonText}>Text</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => setShowImageModal(true)}
          >
            <Icon name="image" size={24} color="#ffffff" />
            <Text style={styles.toolbarButtonText}>Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => setShowLogoModal(true)}
          >
            <Icon name="business" size={24} color="#ffffff" />
            <Text style={styles.toolbarButtonText}>Logo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => setShowFontModal(true)}
          >
            <Icon name="font-download" size={24} color="#ffffff" />
            <Text style={styles.toolbarButtonText}>Font</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => setShowProfileModal(true)}
          >
            <Icon name="account-circle" size={24} color="#ffffff" />
            <Text style={styles.toolbarButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Text Modal */}
      <Modal visible={showTextModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Text</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter text..."
              value={newText}
              onChangeText={setNewText}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setShowTextModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={addTextLayer}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal visible={showImageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Image</Text>
            <View style={styles.imageOptions}>
              <TouchableOpacity style={styles.imageOption} onPress={handleCameraAccess}>
                <Icon name="camera-alt" size={32} color="#667eea" />
                <Text style={styles.imageOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageOption} onPress={handleGalleryAccess}>
                <Icon name="photo-library" size={32} color="#667eea" />
                <Text style={styles.imageOptionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            {newImageUrl ? (
              <Image source={{ uri: newImageUrl }} style={styles.previewImage} />
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setShowImageModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={addImageLayer}
                disabled={!newImageUrl}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logo Modal */}
      <Modal visible={showLogoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Logo</Text>
            <View style={styles.imageOptions}>
              <TouchableOpacity style={styles.imageOption} onPress={handleCameraAccess}>
                <Icon name="camera-alt" size={32} color="#667eea" />
                <Text style={styles.imageOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageOption} onPress={handleGalleryAccess}>
                <Icon name="photo-library" size={32} color="#667eea" />
                <Text style={styles.imageOptionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            {newLogoUrl ? (
              <Image source={{ uri: newLogoUrl }} style={styles.previewLogo} />
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setShowLogoModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={addLogoLayer}
                disabled={!newLogoUrl}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Font Modal */}
      <Modal visible={showFontModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Font</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search fonts..."
              value={fontSearchQuery}
              onChangeText={setFontSearchQuery}
            />
            <ScrollView style={styles.fontList}>
              {Object.entries(SYSTEM_FONTS).map(([key, font]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.fontItem}
                  onPress={() => handleFontSelect(font)}
                >
                  <Text style={[styles.fontItemText, { fontFamily: getFontFamily(font) }]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setShowFontModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Business Profile</Text>
            <FlatList
              data={businessProfiles}
              renderItem={renderProfileItem}
              keyExtractor={(item) => item.id}
              style={styles.profileList}
            />
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  nextButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    color: '#667eea',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 12,
  },
  videoCanvas: {
    flex: 1,
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  playButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 25,
    marginRight: 20,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 16,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  toolbarButton: {
    alignItems: 'center',
  },
  toolbarButtonText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 5,
  },
  layer: {
    position: 'absolute',
  },
  selectedLayer: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  layerText: {
    fontSize: 20,
    color: '#ffffff',
  },
  layerImage: {
    width: '100%',
    height: '100%',
  },
  layerLogo: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    minHeight: 100,
  },
  imageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  imageOption: {
    alignItems: 'center',
    padding: 20,
  },
  imageOptionText: {
    marginTop: 10,
    fontSize: 16,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 15,
  },
  previewLogo: {
    width: 80,
    height: 80,
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  modalButtonPrimary: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  modalButtonText: {
    fontSize: 16,
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  fontList: {
    maxHeight: 200,
    marginBottom: 15,
  },
  fontItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  fontItemText: {
    fontSize: 16,
  },
  profileList: {
    maxHeight: 200,
    marginBottom: 15,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  profileLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profileName: {
    fontSize: 16,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingModal: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    minWidth: 250,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 15,
    marginBottom: 5,
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: 200,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
});

export default VideoEditorScreen;
