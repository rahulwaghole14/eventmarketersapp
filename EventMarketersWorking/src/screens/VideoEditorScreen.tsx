// VideoEditorScreen - Metro cache fix - VideoProcessor import commented out
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
import { useTheme } from '../context/ThemeContext';
import ViewShot from 'react-native-view-shot';
// import VideoProcessor from '../components/VideoProcessor'; // Temporarily disabled
import responsiveUtils, { 
  responsiveSpacing as responsiveSpacingUtils, 
  responsiveFontSize as responsiveFontSizeUtils, 
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate video canvas dimensions - optimized for no scrolling
const videoCanvasWidth = Math.min(screenWidth - 32, screenWidth * 0.88); // Slightly wider for better fit
const videoCanvasHeight = Math.min(screenHeight - 280, screenHeight * 0.4); // Reduced height to fit all controls

// Responsive design helpers - using centralized utilities

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
  const { isDarkMode, theme } = useTheme();

  // Video refs
  const videoRef = useRef<any>(null);
  const visibleVideoRef = useRef<any>(null);
  const canvasRef = useRef<ViewShot>(null);
  const overlaysRef = useRef<ViewShot>(null);
  const [overlayImageUri, setOverlayImageUri] = useState<string | null>(null);

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
  const [showVideoProcessor, setShowVideoProcessor] = useState(false);

  // Business profiles
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<BusinessProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileSelectionModal, setShowProfileSelectionModal] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Template and frame state
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [visibleFields, setVisibleFields] = useState<{[key: string]: boolean}>({
    logo: true,
    companyName: true,
    footerCompanyName: true,
    footerBackground: true,
    phone: true,
    email: true,
    website: true,
    category: true,
    address: true,
    services: true,
  });
  const [selectedFont, setSelectedFont] = useState('System');
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('business');

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Create theme-aware styles
  const getThemeStyles = () => ({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    modalContent: {
      backgroundColor: theme?.colors?.surface || '#ffffff',
      borderRadius: 20,
      padding: 20,
      width: screenWidth * 0.9,
      maxHeight: screenHeight * 0.95,
      shadowColor: theme?.colors?.shadow || '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: isDarkMode ? 0.4 : 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: theme?.colors?.text || '#333333',
      marginBottom: 10,
    },
    modalSubtitle: {
      fontSize: 15,
      color: theme?.colors?.textSecondary || '#666666',
      marginBottom: 20,
      fontWeight: '500' as const,
    },
    cancelButton: {
      backgroundColor: theme?.colors?.surface || '#f8f9fa',
      borderWidth: 2,
      borderColor: theme?.colors?.border || '#e9ecef',
    },
    cancelButtonText: {
      color: theme?.colors?.textSecondary || '#666666',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    profileItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: theme?.colors?.surface || '#f8f9fa',
      borderRadius: 12,
      marginBottom: 12,
    },
    profileLogoPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme?.colors?.border || '#e9ecef',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: 16,
    },
    profileLogo: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginRight: 16,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: theme?.colors?.text || '#333333',
      marginBottom: 4,
    },
    profileCategory: {
      fontSize: 13,
      color: theme?.colors?.textSecondary || '#666666',
      marginBottom: 2,
    },
    profileDescription: {
      fontSize: 13,
      color: theme?.colors?.textSecondary || '#666666',
      lineHeight: 18,
    },
  });

  const themeStyles = getThemeStyles();

  // Fetch business profiles with optimized loading
  const fetchBusinessProfiles = async () => {
    try {
      // Show loading state immediately
      setLoadingProfiles(true);
      
      // Use Promise.race to timeout quickly if API is slow
      const profilesPromise = businessProfileService.getBusinessProfiles();
      const timeoutPromise = new Promise<BusinessProfile[]>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000) // 3 second timeout
      );
      
      const profiles = await Promise.race([profilesPromise, timeoutPromise]);
      setBusinessProfiles(profiles);
      
      if (profiles.length === 1) {
        // If only one profile, auto-select it
        setSelectedProfile(profiles[0]);
        applyBusinessProfileToVideo(profiles[0]);
      } else if (profiles.length > 1) {
        // If multiple profiles, show selection modal
        setShowProfileSelectionModal(true);
      }
    } catch (error) {
      console.error('Error fetching business profiles:', error);
      // Use mock data immediately on error
      const mockProfiles = [
        {
          id: '1',
          name: 'Tech Solutions Inc.',
          description: 'Leading technology solutions provider',
          category: 'Technology',
          address: '123 Innovation Drive, Tech City',
          phone: '+1 (555) 123-4567',
          email: 'contact@techsolutions.com',
          services: ['Custom Software Development', 'Web Development'],
          workingHours: {},
          rating: 4.8,
          reviewCount: 156,
          isVerified: true,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z',
        }
      ];
      setBusinessProfiles(mockProfiles);
      setSelectedProfile(mockProfiles[0]);
      applyBusinessProfileToVideo(mockProfiles[0]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    // Only fetch profiles if we don't have any cached data
    if (businessProfiles.length === 0) {
      fetchBusinessProfiles();
    }
  }, []);

  // Apply default template when component loads
  useEffect(() => {
    console.log('useEffect triggered - selectedProfile:', selectedProfile?.name, 'selectedTemplate:', selectedTemplate); // Debug log
    if (selectedProfile) {
      applyTemplate(selectedTemplate);
    } else {
      // Apply template even without profile to test
      console.log('No profile selected, applying template with defaults'); // Debug log
      applyTemplate(selectedTemplate);
    }
  }, [selectedProfile, selectedTemplate]);

  // Force apply template on mount
  useEffect(() => {
    console.log('Component mounted, applying business template'); // Debug log
    setTimeout(() => {
      applyTemplate('business');
    }, 1000); // Apply after 1 second
  }, []);

  // Apply business profile to video
  const applyBusinessProfileToVideo = (profile: BusinessProfile) => {
    setSelectedProfile(profile);
    setShowProfileModal(false);
    setShowProfileSelectionModal(false);
    
    // Apply the current template with the new profile
    applyTemplate(selectedTemplate);
  };

  const applyFrame = useCallback((frame: Frame) => {
    setSelectedFrame(frame);
    setShowFrameSelector(false);
    if (selectedProfile) {
      const content = mapBusinessProfileToFrameContent(selectedProfile);
      const frameLayers = generateLayersFromFrame(frame, content, screenWidth, screenHeight);
      // Map to VideoLayer with fieldType preserved
      const converted = frameLayers.map(fl => ({
        id: fl.id,
        type: fl.type as 'text' | 'image' | 'logo',
        content: fl.content,
        position: fl.position,
        size: fl.size,
        style: fl.style,
        fieldType: (fl as any).fieldType,
      })) as VideoLayer[];
      setLayers(converted);
    }
  }, [selectedProfile]);

  const toggleFieldVisibility = useCallback((field: string) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  // Apply template function
  const applyTemplate = (template: string) => {
    setSelectedTemplate(template);
    console.log('Applying template:', template); // Debug log
    
    // Apply different styling based on template
    const newLayers: VideoLayer[] = [];
    
    if (selectedProfile) {
      console.log('Selected profile:', selectedProfile.name); // Debug log
      
      // Add company name on top left corner with responsive positioning
      if (selectedProfile.name) {
        const companyNameWidth = Math.min(videoCanvasWidth - 120, 300); // Responsive width
        const companyNameFontSize = template === 'business' ? 18 : template === 'event' ? 22 : 16;
        
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: selectedProfile.name,
          position: { x: 20, y: 20 },
          size: { width: companyNameWidth, height: 40 },
          style: {
            fontSize: companyNameFontSize,
            color: template === 'business' ? '#ffffff' : template === 'event' ? '#ff6b6b' : '#333333',
            fontFamily: 'System',
            fontWeight: 'bold',
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
          },
          fieldType: 'companyName',
        });
      }

      // Add logo on top right corner with responsive positioning
      if (selectedProfile.logo) {
        const logoSize = Math.min(60, videoCanvasWidth * 0.15); // Responsive logo size
        newLayers.push({
          id: generateId(),
          type: 'logo',
          content: selectedProfile.logo,
          position: { x: videoCanvasWidth - logoSize - 20, y: 20 },
          size: { width: logoSize, height: logoSize },
          fieldType: 'logo',
        });
      }

      // Create professional footer with contact information - always at bottom
      const footerHeight = Math.max(120, videoCanvasHeight * 0.15); // Responsive footer height
      const footerY = videoCanvasHeight - footerHeight - Math.max(10, videoCanvasHeight * 0.02); // Always at bottom with small margin
      
      console.log('Footer positioning debug:', {
        screenHeight,
        videoCanvasHeight,
        footerHeight,
        footerY,
        videoCanvasWidth
      });
      

      

      
      // Footer background overlay for better readability
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '',
        position: { x: 0, y: footerY },
        size: { width: videoCanvasWidth, height: footerHeight },
        style: {
          backgroundColor: template === 'business' ? 'rgba(102, 126, 234, 0.9)' : 
                          template === 'event' ? 'rgba(255, 107, 107, 0.9)' : 
                          template === 'restaurant' ? 'rgba(255, 167, 38, 0.9)' : 
                          'rgba(236, 64, 122, 0.9)',
        },
        fieldType: 'footerBackground',
      });

      // Company name in footer
      if (selectedProfile.name) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: selectedProfile.name,
          position: { x: 20, y: footerY + 10 },
          size: { width: videoCanvasWidth - 40, height: 20 },
          style: {
            fontSize: 16,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '600',
          },
          fieldType: 'footerCompanyName',
        });
      }

      // Contact information in two columns
      const leftColumnX = 20;
      const rightColumnX = videoCanvasWidth / 2 + 10;
      const contactStartY = footerY + 35;
      const contactLineHeight = 14;

      // Left column - Phone and Email
      if (selectedProfile.phone) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `📞 ${selectedProfile.phone}`,
          position: { x: leftColumnX, y: contactStartY },
          size: { width: (videoCanvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: 12,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '500',
          },
          fieldType: 'phone',
        });
      }

      if (selectedProfile.email) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `✉️ ${selectedProfile.email}`,
          position: { x: leftColumnX, y: contactStartY + contactLineHeight },
          size: { width: (videoCanvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: 12,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '500',
          },
          fieldType: 'email',
        });
      }

      // Right column - Website and Category
      if (selectedProfile.website) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `🌐 ${selectedProfile.website}`,
          position: { x: rightColumnX, y: contactStartY },
          size: { width: (videoCanvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: 12,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '500',
          },
          fieldType: 'website',
        });
      }

      if (selectedProfile.category) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `🏢 ${selectedProfile.category}`,
          position: { x: rightColumnX, y: contactStartY + contactLineHeight },
          size: { width: (videoCanvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: 12,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '500',
          },
          fieldType: 'category',
        });
      }

      // Address on a separate line (full width)
      if (selectedProfile.address) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `📍 ${selectedProfile.address}`,
          position: { x: 20, y: contactStartY + contactLineHeight * 2 + 5 },
          size: { width: videoCanvasWidth - 40, height: contactLineHeight },
          style: {
            fontSize: 12,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '500',
          },
          fieldType: 'address',
        });
      }

      // Services as a tag line
      if (selectedProfile.services && selectedProfile.services.length > 0) {
        const servicesText = selectedProfile.services.slice(0, 3).join(' • ');
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `🛠️ ${servicesText}${selectedProfile.services.length > 3 ? '...' : ''}`,
          position: { x: 20, y: contactStartY + contactLineHeight * 3 + 10 },
          size: { width: videoCanvasWidth - 40, height: contactLineHeight },
          style: {
            fontSize: 11,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '500',
          },
          fieldType: 'services',
        });
      }
    } else {
      // If no profile is selected, create default layers for the template
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: 'Company Name',
        position: { x: 20, y: 20 },
        size: { width: videoCanvasWidth - 100, height: 40 },
        style: {
          fontSize: template === 'business' ? 20 : template === 'event' ? 24 : 18,
          color: template === 'business' ? '#ffffff' : template === 'event' ? '#ff6b6b' : '#333333',
          fontFamily: 'System',
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 3,
        },
        fieldType: 'companyName',
      });

      // Create professional footer with contact information (default) - always at bottom
      const footerHeight = Math.max(120, videoCanvasHeight * 0.15); // Responsive footer height
      const footerY = videoCanvasHeight - footerHeight - Math.max(10, videoCanvasHeight * 0.02); // Always at bottom with small margin
      

      
      // Footer background overlay for better readability
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '',
        position: { x: 0, y: footerY },
        size: { width: videoCanvasWidth, height: footerHeight },
        style: {
          backgroundColor: template === 'business' ? 'rgba(102, 126, 234, 0.9)' : 
                          template === 'event' ? 'rgba(255, 107, 107, 0.9)' : 
                          template === 'restaurant' ? 'rgba(255, 167, 38, 0.9)' : 
                          'rgba(236, 64, 122, 0.9)',
        },
        fieldType: 'footerBackground',
      });

      // Company name in footer
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: 'Company Name',
        position: { x: 20, y: footerY + 10 },
        size: { width: videoCanvasWidth - 40, height: 20 },
        style: {
          fontSize: 16,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: '600',
        },
        fieldType: 'footerCompanyName',
      });

      // Contact information in two columns
      const leftColumnX = 20;
      const rightColumnX = videoCanvasWidth / 2 + 10;
      const contactStartY = footerY + 35;
      const contactLineHeight = 14;

      // Left column - Phone and Email
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '📞 +1 (555) 123-4567',
        position: { x: leftColumnX, y: contactStartY },
        size: { width: (videoCanvasWidth - 40) / 2, height: contactLineHeight },
        style: {
          fontSize: 11,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: '400',
        },
        fieldType: 'phone',
      });

      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '✉️ info@company.com',
        position: { x: leftColumnX, y: contactStartY + contactLineHeight },
        size: { width: (videoCanvasWidth - 40) / 2, height: contactLineHeight },
        style: {
          fontSize: 11,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: '400',
        },
        fieldType: 'email',
      });

      // Right column - Website and Category
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '🌐 www.company.com',
        position: { x: rightColumnX, y: contactStartY },
        size: { width: (videoCanvasWidth - 40) / 2, height: contactLineHeight },
        style: {
          fontSize: 11,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: '400',
        },
        fieldType: 'website',
      });

      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '🏢 Business Category',
        position: { x: rightColumnX, y: contactStartY + contactLineHeight },
        size: { width: (videoCanvasWidth - 40) / 2, height: contactLineHeight },
        style: {
          fontSize: 11,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: '400',
        },
        fieldType: 'category',
      });

      // Address on a separate line (full width)
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '📍 123 Business Street, City, State 12345',
        position: { x: 20, y: contactStartY + contactLineHeight * 2 + 5 },
        size: { width: videoCanvasWidth - 40, height: contactLineHeight },
        style: {
          fontSize: 11,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: '400',
        },
        fieldType: 'address',
      });

      // Services as a tag line
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '🛠️ Service 1 • Service 2 • Service 3...',
        position: { x: 20, y: contactStartY + contactLineHeight * 3 + 10 },
        size: { width: videoCanvasWidth - 40, height: contactLineHeight },
        style: {
          fontSize: 10,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: '400',
        },
        fieldType: 'services',
      });
    }
    
    // Footer positioning issue resolved
    
    // Test layers removed - footer is working correctly
    
    // Footer is now working correctly - test layer removed

    console.log('New layers:', newLayers.length); // Debug log
    console.log('Layer details:', newLayers.map(l => ({ id: l.id, type: l.type, fieldType: l.fieldType, content: l.content?.substring(0, 20) })));
    setLayers(newLayers);
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

    // Capture overlays-only transparent PNG for processing
    try {
      if (overlaysRef.current && (overlaysRef.current as any).capture) {
        const uri = await (overlaysRef.current as any).capture?.();
        if (uri) {
          setOverlayImageUri(uri);
          console.log('Overlay PNG captured at:', uri);
        }
      }
    } catch (e) {
      console.warn('Overlay capture failed, continuing without overlay PNG', e);
      setOverlayImageUri(null);
    }

    // Show the video processor modal
    setShowVideoProcessor(true);
  };

  const handleVideoProcessingComplete = (processedVideoPath: string) => {
    console.log('Video processing completed. Processed video path:', processedVideoPath);

    // Navigate to video preview screen with processed video and layer data
    navigation.navigate('VideoPreview', {
      selectedVideo: {
        ...selectedVideo,
        uri: processedVideoPath, // Use processed video path
      },
      selectedLanguage,
      selectedTemplateId,
      layers, // Pass layers for rendering in preview
      selectedProfile,
      processedVideoPath: processedVideoPath, // Pass the processed video path
      canvasData: {
        width: videoCanvasWidth,
        height: videoCanvasHeight,
        layers: layers,
      },
    });

    // Close the video processor modal
    setShowVideoProcessor(false);
  };

  const handleVideoProcessingClose = () => {
    setShowVideoProcessor(false);
  };

  // Render functions
  const renderLayer = (layer: VideoLayer) => {
    const isSelected = selectedLayer === layer.id;
    
    const handleLayerPress = () => {
      setSelectedLayer(layer.id);
    };

    console.log('Rendering layer:', layer.type, layer.content, layer.style); // Debug log

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
          layer.style?.backgroundColor ? (
            // Background layer (footer background)
            <View
              style={[
                {
                  width: '100%',
                  height: '100%',
                  backgroundColor: layer.style.backgroundColor,
                },
              ]}
            />
          ) : (
            // Text layer
            <Text
              style={[
                styles.layerText,
                layer.style,
              ]}
            >
              {layer.content}
            </Text>
          )
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
      style={themeStyles.profileItem}
      onPress={() => applyBusinessProfileToVideo(item)}
    >
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={themeStyles.profileLogo} />
      ) : (
        <View style={themeStyles.profileLogoPlaceholder}>
          <Icon name="business" size={24} color={theme?.colors?.textSecondary || '#666666'} />
        </View>
      )}
      <View style={themeStyles.profileInfo}>
        <Text style={themeStyles.profileName}>{item.name}</Text>
        {item.category && (
          <Text style={themeStyles.profileCategory}>{item.category}</Text>
        )}
        {item.description && (
          <Text style={themeStyles.profileDescription}>{item.description}</Text>
        )}
      </View>
      <Icon name="chevron-right" size={24} color={theme?.colors?.textSecondary || '#666666'} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + responsiveSpacingUtils.sm }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Video Editor</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => setShowProfileModal(true)}
            >
              <Icon name="business" size={20} color="#ffffff" />
              <Text style={styles.profileButtonText}>
                {selectedProfile ? selectedProfile.name : 'Select Profile'}
              </Text>
            </TouchableOpacity>
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
        </View>

        {/* Video Canvas Container */}
        <View style={styles.videoCanvasContainer}>
          <ViewShot
            ref={canvasRef}
            style={styles.videoCanvas}
            options={{
              format: 'jpg',
              quality: 0.9,
              width: videoCanvasWidth,
              height: videoCanvasHeight,
            }}
          >
          <Video
            ref={videoRef}
            source={{ uri: selectedVideo.uri }}
            style={styles.video}
            resizeMode="stretch"
            paused={!isVideoPlaying}
            onLoad={onVideoLoad}
            onProgress={onVideoProgress}
            repeat={true}
          />
          
          {/* Video Layers */}
          {layers.map(l => {
            console.log('Processing layer:', l.id, l.type, l.fieldType, l.fieldType ? visibleFields[l.fieldType] : 'no fieldType'); // Debug log
            if (l.fieldType && !visibleFields[l.fieldType]) {
              console.log('Layer filtered out:', l.id); // Debug log
              return null;
            }
            console.log('Rendering layer:', l.id, l.type, l.position, l.size); // Debug log
            return renderLayer(l);
          })}
          
          {/* Footer layers are working correctly - test layer removed */}
          



          
          {/* Overlays-only transparent PNG capture */}
          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
            <ViewShot
              ref={overlaysRef}
              style={{ flex: 1, backgroundColor: 'transparent' }}
              options={{ format: 'png', quality: 1, result: 'tmpfile', width: videoCanvasWidth, height: videoCanvasHeight }}
            >
              <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                {layers.map(l => {
                  if (l.fieldType && !visibleFields[l.fieldType]) return null;
                  return renderLayer(l);
                })}
                {isCapturing && <Watermark isSubscribed={isSubscribed} />}
              </View>
            </ViewShot>
          </View>

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
        </ViewShot>
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



        {/* Controls Container */}
        <ScrollView 
          style={[
            styles.controlsContainer, 
            { 
              paddingBottom: Math.max(insets.bottom + responsiveSpacingUtils.md, responsiveSpacingUtils.lg)
            }
          ]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
        
        {/* Field Toggle Buttons */}
        <View style={styles.fieldToggleSection}>
          <View style={styles.fieldToggleHeader}>
            <Text style={styles.fieldToggleTitle}>Toggle Elements</Text>
            <Text style={styles.fieldToggleSubtitle}>Show or hide video elements</Text>
          </View>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fieldToggleScrollContent}
          >
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.logo && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('logo')}
            >
              <Icon name="account-balance" size={20} color={visibleFields.logo ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.logo && styles.fieldToggleButtonTextActive]}>
                Logo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.companyName && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('companyName')}
            >
              <Icon name="title" size={20} color={visibleFields.companyName ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.companyName && styles.fieldToggleButtonTextActive]}>
                Company Name
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.footerCompanyName && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('footerCompanyName')}
            >
              <Icon name="subtitles" size={20} color={visibleFields.footerCompanyName ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.footerCompanyName && styles.fieldToggleButtonTextActive]}>
                Footer Name
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.footerBackground && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('footerBackground')}
            >
              <Icon name="format-color-fill" size={20} color={visibleFields.footerBackground ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.footerBackground && styles.fieldToggleButtonTextActive]}>
                Footer BG
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.phone && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('phone')}
            >
              <Icon name="call" size={20} color={visibleFields.phone ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.phone && styles.fieldToggleButtonTextActive]}>
                Phone
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.email && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('email')}
            >
              <Icon name="mail" size={20} color={visibleFields.email ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.email && styles.fieldToggleButtonTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.website && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('website')}
            >
              <Icon name="public" size={20} color={visibleFields.website ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.website && styles.fieldToggleButtonTextActive]}>
                Website
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.category && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('category')}
            >
              <Icon name="business-center" size={20} color={visibleFields.category ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.category && styles.fieldToggleButtonTextActive]}>
                Category
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.address && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('address')}
            >
              <Icon name="place" size={20} color={visibleFields.address ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.address && styles.fieldToggleButtonTextActive]}>
                Address
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fieldToggleButton, visibleFields.services && styles.fieldToggleButtonActive]}
              onPress={() => toggleFieldVisibility('services')}
            >
              <Icon name="handyman" size={20} color={visibleFields.services ? "#ffffff" : "#667eea"} />
              <Text style={[styles.fieldToggleButtonText, visibleFields.services && styles.fieldToggleButtonTextActive]}>
                Services
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Templates Section */}
        <View style={styles.templatesSection}>
          <View style={styles.templatesHeader}>
            <Text style={styles.templatesTitle}>Video Templates</Text>
            <Text style={styles.templatesSubtitle}>Choose a professional template design</Text>
          </View>
          <View 
            style={styles.templatesContent}
          >
            <View style={styles.templatesScrollContent}>
            <TouchableOpacity
              style={[styles.templateButton, selectedTemplate === 'business' && styles.templateButtonActive]}
              onPress={() => applyTemplate('business')}
            >
              <View style={[styles.templatePreview, styles.businessTemplatePreview]}>
                <View style={styles.templatePreviewContent}>
                  <View style={[styles.templatePreviewFooter, styles.businessTemplateStyle]} />
                </View>
              </View>
              <Text style={[styles.templateText, selectedTemplate === 'business' && styles.templateTextActive]}>
                Business
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.templateButton, selectedTemplate === 'event' && styles.templateButtonActive]}
              onPress={() => applyTemplate('event')}
            >
              <View style={[styles.templatePreview, styles.eventTemplatePreview]}>
                <View style={styles.templatePreviewContent}>
                  <View style={[styles.templatePreviewFooter, styles.eventTemplateStyle]} />
                </View>
              </View>
              <Text style={[styles.templateText, selectedTemplate === 'event' && styles.templateTextActive]}>
                Event
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.templateButton, selectedTemplate === 'restaurant' && styles.templateButtonActive]}
              onPress={() => applyTemplate('restaurant')}
            >
              <View style={[styles.templatePreview, styles.restaurantTemplatePreview]}>
                <View style={styles.templatePreviewContent}>
                  <View style={[styles.templatePreviewFooter, styles.restaurantTemplateStyle]} />
                </View>
              </View>
              <Text style={[styles.templateText, selectedTemplate === 'restaurant' && styles.templateTextActive]}>
                Restaurant
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.templateButton, selectedTemplate === 'fashion' && styles.templateButtonActive]}
              onPress={() => applyTemplate('fashion')}
            >
              <View style={[styles.templatePreview, styles.fashionTemplatePreview]}>
                <View style={styles.templatePreviewContent}>
                  <View style={[styles.templatePreviewFooter, styles.fashionTemplateStyle]} />
                </View>
              </View>
              <Text style={[styles.templateText, selectedTemplate === 'fashion' && styles.templateTextActive]}>
                Fashion
              </Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>
        </ScrollView>
      </LinearGradient>
      {/* Frame Selector */}
      {showFrameSelector && (
        <FrameSelector
          frames={frames}
          selectedFrameId={selectedFrame?.id || ''}
          onFrameSelect={applyFrame}
        />
      )}

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

      {/* Business Profile Selection Modal */}
      <Modal
        visible={showProfileSelectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          // Prevent closing without selection - user must select a profile or go back
          Alert.alert(
            'Selection Required',
            'You must select a business profile to continue. If you want to go back, use the Cancel button.',
            [{ text: 'OK' }]
          );
        }}
      >
        <View style={themeStyles.modalOverlay}>
          <View style={themeStyles.modalContent}>
            <Text style={themeStyles.modalTitle}>Select Business Profile</Text>
            <Text style={themeStyles.modalSubtitle}>
              Choose which business profile to use for your video. You must select one to continue.
            </Text>
            {loadingProfiles ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme?.colors?.primary || '#007AFF'} />
                <Text style={themeStyles.modalSubtitle}>Loading profiles...</Text>
              </View>
            ) : (
              <FlatList
                data={businessProfiles}
                renderItem={renderProfileItem}
                keyExtractor={(item) => item.id}
                style={styles.profileList}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={10}
                initialNumToRender={3}
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, themeStyles.cancelButton]}
                onPress={() => {
                  setShowProfileSelectionModal(false);
                  navigation.goBack(); // Go back to previous screen if user cancels
                }}
              >
                <Text style={themeStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Modal (for manual selection later) */}
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

             {/* Video Processor Modal - Temporarily disabled */}
       {/* <VideoProcessor
         visible={showVideoProcessor}
         onComplete={handleVideoProcessingComplete}
         onClose={handleVideoProcessingClose}
         layers={layers}
         selectedVideoUri={selectedVideo.uri}
         selectedLanguage={selectedLanguage}
         selectedTemplateId={selectedTemplateId}
         selectedProfile={selectedProfile}
         videoCanvasWidth={videoCanvasWidth}
         videoCanvasHeight={videoCanvasHeight}
         isSubscribed={isSubscribed}
         overlayImageUri={overlayImageUri || undefined}
       /> */}
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
    paddingHorizontal: Math.max(16, screenWidth * 0.04),
    paddingTop: Math.max(40, screenHeight * 0.05),
    paddingBottom: Math.max(16, screenHeight * 0.02),
    marginBottom: Math.max(8, screenHeight * 0.01),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Math.max(12, screenWidth * 0.03),
    marginHorizontal: Math.max(8, screenWidth * 0.02),
  },
  backButton: {
    padding: Math.max(12, screenWidth * 0.03),
    marginRight: Math.max(8, screenWidth * 0.02),
  },
  headerTitle: {
    fontSize: responsiveText.subheading,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  nextButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Math.max(20, screenWidth * 0.05),
    paddingVertical: Math.max(10, screenHeight * 0.012),
    borderRadius: Math.max(20, screenWidth * 0.05),
    marginLeft: Math.max(12, screenWidth * 0.03),
    borderWidth: Math.max(1, screenWidth * 0.002),
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...responsiveShadow.medium,
  },
  nextButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
    fontSize: responsiveText.caption,
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
  videoCanvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Math.max(2, screenHeight * 0.002),
    flex: 0,
  },
  videoCanvas: {
    width: videoCanvasWidth,
    height: videoCanvasHeight,
    alignSelf: 'center',
    marginVertical: Math.max(4, screenHeight * 0.005),
    marginHorizontal: Math.max(12, screenWidth * 0.03),
    borderRadius: Math.max(16, screenWidth * 0.04),
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: Math.max(2, screenWidth * 0.005),
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...responsiveShadow.large,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Math.max(12, screenWidth * 0.03),
    paddingVertical: Math.max(4, screenHeight * 0.005),
    marginBottom: Math.max(4, screenHeight * 0.005),
    marginTop: Math.max(2, screenHeight * 0.002),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Math.max(16, screenWidth * 0.04),
    marginHorizontal: Math.max(12, screenWidth * 0.03),
  },
  playButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: Math.max(10, screenWidth * 0.025),
    borderRadius: Math.max(18, screenWidth * 0.045),
    marginRight: Math.max(12, screenWidth * 0.03),
  },
  timeText: {
    color: '#ffffff',
    fontSize: responsiveText.body,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Math.max(20, screenWidth * 0.05),
    paddingVertical: Math.max(15, screenHeight * 0.018),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  toolbarButton: {
    alignItems: 'center',
  },
  toolbarButtonText: {
    color: '#ffffff',
    fontSize: responsiveText.caption,
    marginTop: Math.max(5, screenHeight * 0.006),
  },
  layer: {
    position: 'absolute',
  },
  selectedLayer: {
    borderWidth: Math.max(2, screenWidth * 0.005),
    borderColor: '#667eea',
  },
  layerText: {
    fontSize: responsiveText.subheading,
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

  textInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    minHeight: 100,
  },
  profileList: {
    maxHeight: 400,
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.7,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 20,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#667eea',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
  },
  // Image and logo modal styles
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
  // Font modal styles
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
  // Controls Container
  controlsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopLeftRadius: Math.max(20, screenWidth * 0.05),
    borderTopRightRadius: Math.max(20, screenWidth * 0.05),
    paddingTop: Math.max(8, screenHeight * 0.01),
    paddingHorizontal: Math.max(8, screenWidth * 0.02),
    paddingBottom: Math.max(8, screenHeight * 0.01),
    borderTopWidth: Math.max(1, screenWidth * 0.002),
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    ...responsiveShadow.large,
    flex: 1,
  },
  // Field Toggle Section
  fieldToggleSection: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: Math.max(12, screenWidth * 0.03),
    padding: Math.max(8, screenWidth * 0.02),
    ...responsiveShadow.medium,
    borderWidth: Math.max(1, screenWidth * 0.002),
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: Math.max(8, screenHeight * 0.01),
    marginHorizontal: Math.max(2, screenWidth * 0.005),
  },
  fieldToggleHeader: {
    alignItems: 'center',
    marginBottom: Math.max(4, screenHeight * 0.005),
  },
  fieldToggleTitle: {
    fontSize: Math.max(10, screenWidth * 0.025),
    fontWeight: '700',
    color: '#333333',
  },
  fieldToggleSubtitle: {
    fontSize: Math.max(8, screenWidth * 0.02),
    color: '#666666',
    marginTop: Math.max(1, screenHeight * 0.001),
  },
  fieldToggleContent: {
    // Removed maxHeight and flexWrap for horizontal scrolling
  },
  fieldToggleScrollContent: {
    paddingHorizontal: Math.max(8, screenWidth * 0.02),
    alignItems: 'center',
    gap: Math.max(8, screenWidth * 0.02),
    flexDirection: 'row',
  },
  fieldToggleButton: {
    alignItems: 'center',
    paddingVertical: Math.max(4, screenHeight * 0.005),
    paddingHorizontal: Math.max(6, screenWidth * 0.015),
    borderRadius: Math.max(8, screenWidth * 0.02),
    backgroundColor: '#f8f9fa',
    marginHorizontal: Math.max(1, screenWidth * 0.002),
    marginVertical: Math.max(1, screenHeight * 0.001),
    flexDirection: 'row',
    minWidth: Math.max(50, screenWidth * 0.1),
    justifyContent: 'center',
    borderWidth: Math.max(1, screenWidth * 0.002),
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  fieldToggleButtonActive: {
    backgroundColor: '#667eea',
  },
  fieldToggleButtonText: {
    fontSize: Math.max(8, screenWidth * 0.02),
    color: '#666666',
    marginLeft: Math.max(2, screenWidth * 0.005),
    fontWeight: '500',
  },
  fieldToggleButtonTextActive: {
    color: '#ffffff',
  },
  // Templates Section
  templatesSection: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: Math.max(12, screenWidth * 0.03),
    padding: Math.max(8, screenWidth * 0.02),
    ...responsiveShadow.medium,
    borderWidth: Math.max(1, screenWidth * 0.002),
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: Math.max(8, screenHeight * 0.01),
    marginHorizontal: Math.max(2, screenWidth * 0.005),
  },
  templatesHeader: {
    alignItems: 'center',
    marginBottom: Math.max(4, screenHeight * 0.005),
  },
  templatesTitle: {
    fontSize: Math.max(10, screenWidth * 0.025),
    fontWeight: '700',
    color: '#333333',
  },
  templatesSubtitle: {
    fontSize: Math.max(8, screenWidth * 0.02),
    color: '#666666',
    marginTop: Math.max(1, screenHeight * 0.001),
  },
  templatesContent: {
    maxHeight: Math.max(80, screenHeight * 0.1),
    flexWrap: 'wrap',
  },
  templatesScrollContent: {
    paddingHorizontal: Math.max(8, screenWidth * 0.02),
    alignItems: 'center',
    gap: Math.max(8, screenWidth * 0.02),
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  templateButton: {
    alignItems: 'center',
    marginHorizontal: Math.max(2, screenWidth * 0.005),
    marginVertical: Math.max(1, screenHeight * 0.001),
    minWidth: Math.max(60, screenWidth * 0.12),
  },
  templateButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: Math.max(12, screenWidth * 0.03),
    padding: Math.max(8, screenWidth * 0.02),
  },
  templatePreview: {
    width: Math.max(50, screenWidth * 0.12),
    height: Math.max(50, screenWidth * 0.12),
    borderRadius: Math.max(8, screenWidth * 0.02),
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Math.max(4, screenHeight * 0.005),
    borderWidth: Math.max(2, screenWidth * 0.005),
    borderColor: 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    ...responsiveShadow.small,
  },
  templatePreviewContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  templatePreviewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  templateText: {
    fontSize: Math.max(8, screenWidth * 0.02),
    color: '#666666',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: Math.max(8, screenHeight * 0.01),
  },
  templateTextActive: {
    color: '#667eea',
    fontWeight: '700',
  },
  // Template Preview Styles
  businessTemplatePreview: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  businessTemplateStyle: {
    backgroundColor: 'rgba(102, 126, 234, 0.8)',
  },
  eventTemplatePreview: {
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  eventTemplateStyle: {
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
  },
  restaurantTemplatePreview: {
    borderWidth: 2,
    borderColor: '#ffa726',
  },
  restaurantTemplateStyle: {
    backgroundColor: 'rgba(255, 167, 38, 0.8)',
  },
  fashionTemplatePreview: {
    borderWidth: 2,
    borderColor: '#ec407a',
  },
  fashionTemplateStyle: {
    backgroundColor: 'rgba(236, 64, 122, 0.8)',
  },


  // Header Button Styles
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Math.max(16, screenWidth * 0.04),
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Math.max(14, screenWidth * 0.035),
    paddingVertical: Math.max(8, screenHeight * 0.01),
    borderRadius: Math.max(18, screenWidth * 0.045),
    gap: Math.max(6, screenWidth * 0.015),
    borderWidth: Math.max(1, screenWidth * 0.002),
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileButtonText: {
    color: '#ffffff',
    fontSize: responsiveText.caption,
    fontWeight: '500',
  },

});

export default VideoEditorScreen;

