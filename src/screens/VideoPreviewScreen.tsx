import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  Modal,
  Share,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/types';
import { getAccessState, isAccessGranted, getAccessStateMessage, isTransitionalState } from '../utils/subscriptionAccess';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useBusinessProfile } from '../context/BusinessProfileContext';
import VideoComposer from '../services/VideoComposer';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
// import videoProcessingService from '../services/videoProcessingService'; // Removed - service deleted

const OMBRE_GRADIENTS: Record<string, string[]> = {
  'ombre-sunset': ['#FF6B6B', '#FFA500', '#FFD700'],
  'ombre-ocean': ['#667eea', '#06b6d4', '#22c55e'],
  'ombre-purple': ['#9333ea', '#ec4899', '#f43f5e'],
  'ombre-forest': ['#065f46', '#059669', '#10b981'],
  'ombre-fire': ['#dc2626', '#f59e0b', '#fbbf24'],
  'ombre-night': ['#1e3a8a', '#7c3aed', '#ec4899'],
  'ombre-tropical': ['#f472b6', '#fb923c', '#06b6d4'],
  'ombre-autumn': ['#78350f', '#ea580c', '#dc2626'],
  'ombre-rose': ['#be123c', '#f472b6', '#fda4af'],
  'ombre-galaxy': ['#6366f1', '#8b5cf6', '#06b6d4'],
};

const toRgba = (color: string, alpha: number): string => {
  if (!color) return `rgba(0,0,0,${alpha})`;
  const trimmed = color.trim();
  if (trimmed.startsWith('rgba')) {
    const parts = trimmed.replace(/rgba\(|\)/g, '').split(',').map(p => p.trim());
    const r = Number(parts[0]) || 0;
    const g = Number(parts[1]) || 0;
    const b = Number(parts[2]) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (trimmed.startsWith('rgb')) {
    const parts = trimmed.replace(/rgb\(|\)/g, '').split(',').map(p => p.trim());
    const r = Number(parts[0]) || 0;
    const g = Number(parts[1]) || 0;
    const b = Number(parts[2]) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (trimmed.startsWith('#')) {
    const hex = trimmed.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(0,0,0,${alpha})`;
};

const getOmbreColors = (base: string | undefined) => {
  const color = base || '#000000';
  return [
    toRgba(color, 0.9),
    toRgba(color, 0.45),
    toRgba(color, 0),
  ];
};

const getColorAlpha = (color?: string) => {
  if (!color) return 1;
  const trimmed = color.trim().toLowerCase();
  if (trimmed.startsWith('rgba')) {
    const match = trimmed.match(/rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/i);
    if (match) {
      const alpha = Number(match[4]);
      if (!Number.isNaN(alpha)) {
        return alpha;
      }
    }
  }
  return 1;
};

const gradientHasTransparency = (colors?: string[]) =>
  colors?.some(color => getColorAlpha(color) < 0.999) ?? false;

const { width: initialScreenWidth, height: initialScreenHeight } = Dimensions.get('window');

const COMPACT_MULTIPLIER = 0.5;

const scale = (size: number) => (initialScreenWidth / 375) * size;
const verticalScale = (size: number) => (initialScreenHeight / 667) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

const isUltraSmallScreen = initialScreenWidth < 360;
const isSmallScreen = initialScreenWidth >= 360 && initialScreenWidth < 375;
const isMediumScreen = initialScreenWidth >= 375 && initialScreenWidth < 414;
const isLargeScreen = initialScreenWidth >= 414 && initialScreenWidth < 480;
const isXLargeScreen = initialScreenWidth >= 480;
const isTablet = Math.min(initialScreenWidth, initialScreenHeight) >= 768;

const responsiveSpacing = {
  xs: Math.max(1, (isUltraSmallScreen ? 2 : isSmallScreen ? 4 : isMediumScreen ? 6 : isLargeScreen ? 8 : 10) * COMPACT_MULTIPLIER),
  sm: Math.max(2, (isUltraSmallScreen ? 4 : isSmallScreen ? 6 : isMediumScreen ? 8 : isLargeScreen ? 10 : 12) * COMPACT_MULTIPLIER),
  md: Math.max(3, (isUltraSmallScreen ? 6 : isSmallScreen ? 8 : isMediumScreen ? 10 : isLargeScreen ? 12 : 14) * COMPACT_MULTIPLIER),
  lg: Math.max(4, (isUltraSmallScreen ? 8 : isSmallScreen ? 10 : isMediumScreen ? 12 : isLargeScreen ? 14 : 16) * COMPACT_MULTIPLIER),
  xl: Math.max(5, (isUltraSmallScreen ? 10 : isSmallScreen ? 12 : isMediumScreen ? 14 : isLargeScreen ? 16 : 18) * COMPACT_MULTIPLIER),
  xxl: Math.max(6, (isUltraSmallScreen ? 12 : isSmallScreen ? 14 : isMediumScreen ? 16 : isLargeScreen ? 18 : 20) * COMPACT_MULTIPLIER),
  xxxl: Math.max(7, (isUltraSmallScreen ? 14 : isSmallScreen ? 16 : isMediumScreen ? 18 : isLargeScreen ? 20 : 24) * COMPACT_MULTIPLIER),
};

const responsiveFontSize = {
  xs: Math.max(7, (isUltraSmallScreen ? 8 : isSmallScreen ? 9 : isMediumScreen ? 10 : isLargeScreen ? 11 : 12) * 0.85),
  sm: Math.max(8, (isUltraSmallScreen ? 9 : isSmallScreen ? 10 : isMediumScreen ? 11 : isLargeScreen ? 12 : 13) * 0.85),
  md: Math.max(9, (isUltraSmallScreen ? 10 : isSmallScreen ? 11 : isMediumScreen ? 12 : isLargeScreen ? 13 : 14) * 0.85),
  lg: Math.max(10, (isUltraSmallScreen ? 11 : isSmallScreen ? 12 : isMediumScreen ? 13 : isLargeScreen ? 14 : 15) * 0.85),
  xl: Math.max(11, (isUltraSmallScreen ? 12 : isSmallScreen ? 13 : isMediumScreen ? 14 : isLargeScreen ? 15 : 16) * 0.85),
  xxl: Math.max(12, (isUltraSmallScreen ? 13 : isSmallScreen ? 14 : isMediumScreen ? 15 : isLargeScreen ? 16 : 17) * 0.85),
  xxxl: Math.max(13, (isUltraSmallScreen ? 14 : isSmallScreen ? 15 : isMediumScreen ? 16 : isLargeScreen ? 17 : 18) * 0.85),
};

const getIconSize = (baseSize: number) => {
  return Math.max(10, Math.round(baseSize * (initialScreenWidth / 375) * 0.6));
};

const getResponsiveDimensions = (insets: any) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isLandscape = screenWidth > screenHeight;

  const availableWidth = screenWidth - (insets.left + insets.right);
  const availableHeight = screenHeight - (insets.top + insets.bottom);

  let videoWidthRatio = isLandscape ? (isTablet ? 0.6 : 0.7) : 0.85;
  let videoHeightRatio = isLandscape ? (isTablet ? 0.8 : 0.6) : 0.55;

  if (!isLandscape) {
    if (isUltraSmallScreen) {
      videoWidthRatio = 0.95;
      videoHeightRatio = 0.75;
    } else if (isSmallScreen) {
      videoWidthRatio = 0.92;
      videoHeightRatio = 0.7;
    } else if (isMediumScreen) {
      videoWidthRatio = 0.9;
      videoHeightRatio = 0.65;
    } else if (isLargeScreen) {
      videoWidthRatio = 0.88;
      videoHeightRatio = 0.6;
    }
  }

  const videoWidth = Math.min(availableWidth * videoWidthRatio, screenWidth * videoWidthRatio);
  const videoHeight = Math.min(availableHeight * videoHeightRatio, screenHeight * videoHeightRatio);

  return {
    videoWidth,
    videoHeight,
    availableWidth,
    availableHeight,
  };
};

interface VideoPreviewScreenProps {
  route: {
    params: {
      selectedVideo: {
        uri: string;
        title?: string;
        description?: string;
      };
      selectedLanguage: string;
      selectedTemplateId: string;
      layers: any[];
      selectedProfile?: any;
      processedVideoPath?: string;
      canvasData?: {
        width: number;
        height: number;
        layers: any[];
      };
    };
  };
}

const VideoPreviewScreen: React.FC<VideoPreviewScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  const { videoWidth, videoHeight, availableWidth, availableHeight } = getResponsiveDimensions(insets);
  const { selectedVideo, selectedLanguage, selectedTemplateId, layers, selectedProfile, processedVideoPath: initialProcessedVideoPath, canvasData } = route.params;
  const { isSubscribed } = useSubscription();
  const { selectedBusinessProfile } = useBusinessProfile();

  // Unified access state based on business profile or global subscription
  const accessState = getAccessState({
    businessProfile: selectedBusinessProfile,
    isSubscribed,
  });
  const hasAccess = isAccessGranted(accessState);

  // Video state
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [actionType, setActionType] = useState<'share' | 'download' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [renderedVideoSize, setRenderedVideoSize] = useState<{ width: number; height: number }>({
    width: videoWidth,
    height: videoHeight,
  });

  // processedVideoPath is only used for download/share, not for preview display
  const processedVideoPath = initialProcessedVideoPath;

  const videoRef = useRef<any>(null);
  const naturalVideoSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Request storage permission for Android
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // For Android 13+ (API 33+), we need READ_MEDIA_VIDEO permission
        // For older versions, we might need WRITE_EXTERNAL_STORAGE
        const androidVersion = Platform.Version;
        console.log('Android version:', androidVersion);

        if (androidVersion >= 33) {
          // Android 13+ - use READ_MEDIA_VIDEO permission
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
            {
              title: 'Media Permission',
              message: 'This app needs access to save videos to your gallery.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          console.log('READ_MEDIA_VIDEO permission result:', granted);
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // For older Android versions, try WRITE_EXTERNAL_STORAGE
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission',
              message: 'This app needs access to storage to save videos to your gallery.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          console.log('WRITE_EXTERNAL_STORAGE permission result:', granted);
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('Permission request error:', err);
        // For newer Android versions, CameraRoll might work without explicit permissions
        // Let's try to proceed anyway
        return true;
      }
    }
    return true; // iOS doesn't need explicit permission for CameraRoll
  };

  // Helper function to ensure we only use local video URIs
  // Preview always plays the ORIGINAL video with React Native overlays on top.
  // The processedVideoPath (Media3 output) is only used for download/share.
  // This ensures overlay positions in the preview exactly match the editor canvas.
  const getSafeVideoUri = useCallback(() => {
    const uri = selectedVideo?.uri || '';
    if (!uri) {
      console.warn('⚠️ Empty URI detected, using fallback');
      return Platform.OS === 'android'
        ? 'android.resource://com.marketbrand/raw/test'
        : 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4';
    }

    // Convert asset:// URIs to correct raw resource path on Android
    if (Platform.OS === 'android' && uri.startsWith('asset://')) {
      const fileName = uri.replace('asset://', '').replace('.mp4', '');
      return `android.resource://com.marketbrand/raw/${fileName}`;
    }

    // Remove asset:// prefix on iOS to load as local bundle file
    if (Platform.OS === 'ios' && uri.startsWith('asset://')) {
      return uri.replace('asset://', '');
    }

    return uri;
  }, [selectedVideo?.uri]);

  React.useEffect(() => {
    console.log('VideoPreviewScreen - Debug Info:');
    console.log('- Original video URI:', selectedVideo.uri);
    console.log('- Processed video path (for download):', initialProcessedVideoPath);
    console.log('- Layers count:', layers?.length || 0);
    console.log('- Canvas data:', canvasData?.width, 'x', canvasData?.height);
  }, [selectedVideo.uri, initialProcessedVideoPath, layers, canvasData]);

  // Video controls
  const updateRenderedVideoSize = useCallback(
    (_naturalWidth?: number, _naturalHeight?: number) => {
      // Always base preview size on canvasData (the square canvas from the editor).
      // This ensures the preview shows the same square with bars as the editor canvas.
      // Natural video size is intentionally ignored for sizing — the canvas is what matters.
      const sourceSize =
        canvasData && canvasData.width > 0 && canvasData.height > 0
          ? { width: canvasData.width, height: canvasData.height }
          : { width: videoWidth, height: videoHeight };

      const ratio =
        sourceSize.height === 0 ? 1 : sourceSize.width / sourceSize.height;

      const maxWidth = Math.min(videoWidth, availableWidth);
      const maxHeight = Math.min(videoHeight, availableHeight);

      let targetWidth = maxWidth;
      let targetHeight = targetWidth / ratio;

      if (targetHeight > maxHeight) {
        targetHeight = maxHeight;
        targetWidth = targetHeight * ratio;
      }

      setRenderedVideoSize({
        width: targetWidth,
        height: targetHeight,
      });
    },
    [availableHeight, availableWidth, videoHeight, videoWidth, canvasData],
  );

  useEffect(() => {
    updateRenderedVideoSize();
  }, [updateRenderedVideoSize]);

  const onVideoLoad = (data: any) => {
    setVideoDuration(data.duration);
    console.log('✅ Video loaded successfully, duration:', data.duration);
  };

  const onVideoProgress = (data: any) => {
    setCurrentTime(data.currentTime);
  };

  const onVideoError = (error: any) => {
    // We always play the original video in the preview, errors are just logged.
    console.error('🚨 Video playback error:', {
      errorCode: error?.error?.errorCode,
      errorString: error?.error?.errorString,
      attemptedURI: getSafeVideoUri(),
      platform: Platform.OS,
    });
  };

  // Navigation
  const handleBackToEditor = () => {
    navigation.goBack();
  };

  // Share functionality
  const handleShare = async () => {
    setIsSharing(true);
    try {
      // Use the processed video path if available, otherwise use original
      let videoPath = processedVideoPath || selectedVideo.uri;

      // If videoPath is empty or is a fallback resource, convert to remote fallback video URL
      if (!videoPath || videoPath.startsWith('android.resource://') || videoPath.startsWith('asset://') || videoPath === 'test.mp4') {
        videoPath = 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4';
      }

      // Check if it's a remote URL
      const isRemoteUrl = videoPath.startsWith('http://') || videoPath.startsWith('https://');

      const shareOptions = {
        title: selectedVideo.title || 'Event Video',
        message: `Event Video: ${selectedVideo.title || 'Professional Event Content'}`,
        url: videoPath,
      };

      // For remote URLs, we can share the URL directly
      if (isRemoteUrl) {
        const result = await Share.share(shareOptions);

        if (result.action === Share.sharedAction) {
          // Successfully shared
        } else if (result.action === Share.dismissedAction) {
          // User dismissed the share sheet
        }
      } else {
        // For local files, handle platform differences
        if (Platform.OS === 'ios') {
          // On iOS, we'll share the video file directly
          const result = await Share.share(shareOptions);

          if (result.action === Share.sharedAction) {
            // Successfully shared
          } else if (result.action === Share.dismissedAction) {
            // User dismissed the share sheet
          }
        } else {
          // For Android, we can share the file path
          const result = await Share.share(shareOptions);

          if (result.action === Share.sharedAction) {
            // Successfully shared
          } else if (result.action === Share.dismissedAction) {
            // User dismissed the share sheet
          }
        }
      }
    } catch (error) {
      Alert.alert(
        '❌ Share Failed',
        'We encountered an issue while sharing your video.\n\nPlease try again or check your internet connection.',
        [
          {
            text: 'Try Again',
            style: 'default'
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsSharing(false);
    }
  };

  // Download functionality - save video to gallery
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // Request storage permission first (but don't block if it fails)
      const hasPermission = await requestStoragePermission();
      console.log('Permission check result:', hasPermission);

      // For newer Android versions, CameraRoll might work without explicit permissions
      // So we'll proceed even if permission request fails
      if (!hasPermission) {
        console.log('Permission denied, but proceeding anyway for newer Android versions');
        // Don't return early - let's try to save anyway
      }

      // Use the processed video path if available, otherwise use original
      let videoPath = processedVideoPath || selectedVideo.uri;

      // If videoPath is empty or is a fallback resource, convert to remote fallback video URL
      if (!videoPath || videoPath.startsWith('android.resource://') || videoPath.startsWith('asset://') || videoPath === 'test.mp4') {
        videoPath = 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4';
      }

      // Check if video file exists
      if (!videoPath) {
        Alert.alert(
          '❌ Video Not Found',
          'The video file could not be located on your device.\n\nPlease try regenerating the video or check your internet connection.',
          [
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
        setIsDownloading(false);
        return;
      }

      setDownloadProgress(20);

      // Handle different video source types
      let finalVideoPath = videoPath;

      // If it's a remote URL, download it first
      if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
        setDownloadProgress(40);

        // Create a temporary file path
        const tempFileName = `temp_video_${Date.now()}.mp4`;
        const tempPath = `${RNFS.DocumentDirectoryPath}/${tempFileName}`;

        // Download the video
        const downloadResult = await RNFS.downloadFile({
          fromUrl: videoPath,
          toFile: tempPath,
        }).promise;

        if (downloadResult.statusCode === 200) {
          finalVideoPath = tempPath;
          setDownloadProgress(70);
        } else {
          throw new Error(`Failed to download video: ${downloadResult.statusCode}`);
        }
      } else if (videoPath.startsWith('file://')) {
        // Remove file:// prefix for CameraRoll
        finalVideoPath = videoPath.replace('file://', '');
        setDownloadProgress(60);
      } else if (videoPath.startsWith('asset://')) {
        // Handle asset videos - copy to temporary location
        setDownloadProgress(50);

        // For asset videos, we need to copy them to a accessible location
        const tempFileName = `asset_video_${Date.now()}.mp4`;
        const tempPath = `${RNFS.DocumentDirectoryPath}/${tempFileName}`;

        // Copy asset to temporary location
        await RNFS.copyFile(videoPath.replace('asset://', ''), tempPath);
        finalVideoPath = tempPath;
        setDownloadProgress(70);
      }

      setDownloadProgress(80);

      // Save to gallery using CameraRoll
      console.log('Attempting to save video to gallery:', finalVideoPath);

      let result;
      try {
        // First try with album
        result = await CameraRoll.save(finalVideoPath, {
          type: 'video',
          album: 'EventMarketers',
        });
      } catch (albumError) {
        console.log('Failed to save with album, trying without album:', albumError);
        // Fallback: save without specifying album
        result = await CameraRoll.save(finalVideoPath, {
          type: 'video',
        });
      }

      setDownloadProgress(100);

      // Show success message
      setShowDownloadSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowDownloadSuccess(false);
      }, 3000);

      console.log('✅ Video saved to gallery:', result);

    } catch (error) {
      console.error('❌ Download failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        '❌ Download Failed',
        'We encountered an issue while saving your video to the gallery.\n\nPlease check your device storage and try again.',
        [
          {
            text: 'Try Again',
            style: 'default'
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Action handlers
  const handleActionPress = (type: 'share' | 'download') => {
    setActionType(type);
    setShowConfirmationModal(true);
  };

  const handleConfirmAction = () => {
    if (actionType === 'share') {
      handleShare();
    } else if (actionType === 'download') {
      handleDownload();
    }
    setShowConfirmationModal(false);
    setActionType(null);
  };

  const handleCancelAction = () => {
    setShowConfirmationModal(false);
    setActionType(null);
  };

  // Quick download without confirmation
  const handleQuickDownload = () => {
    handleDownload();
  };

  // Render video layers - mirrors DraggableLayer from VideoEditorScreen exactly
  const renderLayer = (layer: any, index: number, selectedTemplate?: string) => {
    let scaleX = 1;
    let scaleY = 1;

    if (canvasData && canvasData.width && canvasData.height) {
      scaleX = renderedVideoSize.width / canvasData.width;
      scaleY = renderedVideoSize.height / canvasData.height;
    }

    const left = Math.round((layer.position.x || 0) * scaleX);
    const top = Math.round((layer.position.y || 0) * scaleY);
    const explicitWidth = Math.max(0, Math.round((layer.size.width || 0) * scaleX));
    const explicitHeight = Math.max(0, Math.round((layer.size.height || 0) * scaleY));

    const isBackground = layer.type === 'text' && layer.content === '' && layer.fieldType === 'footerBackground';
    const isTextLayer = layer.type === 'text' && !isBackground;
    const zIndex = layer.zIndex ?? index + 1;
    const avgScale = (scaleX + scaleY) / 2;

    // Scale every text style property the same way DraggableLayer does
    const getScaledTextStyle = () => {
      const base = { ...(layer.style || {}) } as Record<string, any>;
      if (scaleX === 1 && scaleY === 1) return base;
      const adj = (v: any, f: number) => (typeof v === 'number' ? v * f : v);
      return {
        ...base,
        fontSize: adj(base.fontSize, scaleY),
        lineHeight: adj(base.lineHeight, scaleY),
        letterSpacing: adj(base.letterSpacing, scaleX),
        padding: adj(base.padding, avgScale),
        margin: adj(base.margin, avgScale),
        borderWidth: adj(base.borderWidth, avgScale),
        borderRadius: adj(base.borderRadius, avgScale),
        paddingHorizontal: adj(base.paddingHorizontal, scaleX),
        paddingVertical: adj(base.paddingVertical, scaleY),
        paddingTop: adj(base.paddingTop, scaleY),
        paddingBottom: adj(base.paddingBottom, scaleY),
        paddingLeft: adj(base.paddingLeft, scaleX),
        paddingRight: adj(base.paddingRight, scaleX),
        marginHorizontal: adj(base.marginHorizontal, scaleX),
        marginVertical: adj(base.marginVertical, scaleY),
        marginTop: adj(base.marginTop, scaleY),
        marginBottom: adj(base.marginBottom, scaleY),
        marginLeft: adj(base.marginLeft, scaleX),
        marginRight: adj(base.marginRight, scaleX),
        ...(base.shadowOffset && typeof base.shadowOffset === 'object'
          ? { shadowOffset: { width: adj(base.shadowOffset.width, scaleX), height: adj(base.shadowOffset.height, scaleY) } }
          : {}),
      };
    };

    // Footer background gradient rendering (mirrors DraggableLayer exactly)
    const renderFooterBackground = () => {
      const tmpl = selectedTemplate || '';
      const isOmbreTemplate = tmpl.startsWith('ombre-');
      const gradientColors = (layer.style as any)?.gradientColors as string[] | undefined;
      const baseColors =
        gradientColors ||
        (isOmbreTemplate ? OMBRE_GRADIENTS[tmpl] : undefined) ||
        getOmbreColors(layer.style?.backgroundColor);

      if (baseColors && baseColors.length >= 2) {
        const gradientStart = isOmbreTemplate ? { x: 0, y: 0 } : { x: 0, y: 1 };
        const gradientEnd = isOmbreTemplate ? { x: 1, y: 0 } : { x: 0, y: 0 };
        return (
          <LinearGradient
            colors={baseColors}
            start={gradientStart}
            end={gradientEnd}
            style={{ width: '100%', height: '100%' }}
          />
        );
      }
      return (
        <View
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: layer.style?.backgroundColor || 'rgba(0,0,0,0.6)',
          }}
        />
      );
    };

    const imageRadius = layer.isCircular
      ? explicitWidth / 2
      : (layer.borderRadius ? layer.borderRadius * scaleX : 0);

    return (
      <View
        key={layer.id}
        style={[
          styles.layer,
          {
            left,
            top,
            zIndex: zIndex + 5,
            elevation: zIndex + 10,
            overflow: 'visible',
            borderRadius: layer.isCircular
              ? explicitWidth / 2
              : (layer.borderRadius ? layer.borderRadius * scaleX : 0),
          },
          // Text layers size themselves; background/image/logo use explicit size
          isTextLayer
            ? { maxWidth: renderedVideoSize.width }
            : { width: explicitWidth, height: explicitHeight },
        ]}
      >
        {layer.type === 'text' && (
          isBackground
            ? renderFooterBackground()
            : (
              <Text
                style={[styles.layerText, getScaledTextStyle()]}
                allowFontScaling={false}
              >
                {layer.content}
              </Text>
            )
        )}
        {layer.type === 'image' && (
          <Image
            source={{ uri: layer.content }}
            style={[styles.layerImage, { borderRadius: imageRadius }]}
            resizeMode="cover"
          />
        )}
        {layer.type === 'logo' && (
          <Image
            source={{ uri: layer.content }}
            style={[styles.layerLogo, { borderRadius: imageRadius }]}
            resizeMode="contain"
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.videoContainer}>
        <View
          style={[
            styles.videoSurface,
            { width: renderedVideoSize.width, height: renderedVideoSize.height },
          ]}
        >
          <Video
            ref={videoRef}
            source={{ uri: getSafeVideoUri() }}
            style={styles.video}
            resizeMode="contain"
            paused={!isVideoPlaying}
            onLoad={onVideoLoad}
            onProgress={onVideoProgress}
            onError={onVideoError}
            repeat
            controls
          />

          {/* Overlay layers always rendered on top of the video at canvas-relative positions.
              This ensures positions match the editor canvas exactly, including bar areas. */}
          {layers && layers.length > 0 && (
            <View style={styles.overlayContainer}>
              {layers.map((layer, idx) => renderLayer(layer, idx, selectedTemplateId))}
            </View>
          )}

        </View>
      </View>

      {showDownloadSuccess && (
        <View style={styles.successMessageContainer}>
          <View style={styles.successMessage}>
            <Icon name="check-circle" size={getIconSize(20)} color="#4CAF50" />
            <Text style={styles.successMessageText}>Downloaded successfully</Text>
          </View>
        </View>
      )}

      <View
        style={[
          styles.actionContainer,
          {
            paddingBottom: Math.max(insets.bottom + responsiveSpacing.xs, responsiveSpacing.md),
          },
        ]}
      >
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            disabled={isSharing || isDownloading}
          >
            <LinearGradient
              colors={isSharing ? ['#cccccc', '#999999'] : ['#667eea', '#764ba2']}
              style={styles.shareButtonGradient}
            >
              <Icon name="share" size={getIconSize(24)} color="#ffffff" />
              <Text style={styles.shareButtonText}>
                {isSharing ? 'Processing...' : 'Share'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleQuickDownload}
            disabled={isSharing || isDownloading}
          >
            <LinearGradient
              colors={isDownloading ? ['#cccccc', '#999999'] : ['#28a745', '#20c997']}
              style={styles.saveButtonGradient}
            >
              {isDownloading ? (
                <Text style={styles.saveButtonText}>
                  {downloadProgress > 0 ? `Downloading ${downloadProgress}%` : 'Saving...'}
                </Text>
              ) : (
                <>
                  <Icon name="download" size={getIconSize(24)} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Save to Gallery</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={handleBackToEditor}
        >
          <Text style={styles.editButtonText}>Back to Editor</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showConfirmationModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelAction}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'share' ? 'Share Video' : 'Save to Gallery'}
            </Text>
            <Text style={styles.modalMessage}>
              {actionType === 'share'
                ? 'Share this video with your friends and followers?'
                : 'Save this video to your device gallery?'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCancelAction}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleConfirmAction}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  {actionType === 'share' ? 'Share' : 'Save'}
                </Text>
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
    backgroundColor: '#f8f9fa',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoSurface: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000', // Letterbox bars appear as clean black
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  layer: {
    position: 'absolute',
  },
  layerText: {
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
  successMessageContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -25 }],
    zIndex: 1000,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successMessageText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionContainer: {
    paddingHorizontal: moderateScale(4),
    paddingTop: moderateScale(4),
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#e9ecef',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: moderateScale(4),
  },
  actionButton: {
    flex: 1,
    marginHorizontal: moderateScale(2),
    borderRadius: moderateScale(6),
    overflow: 'hidden',
  },
  shareButtonGradient: {
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(9.5),
    fontWeight: '600',
    marginLeft: moderateScale(2.5),
  },
  saveButtonGradient: {
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(9.5),
    fontWeight: '600',
    marginLeft: moderateScale(2.5),
  },
  downloadingContainer: {
    alignItems: 'center',
  },
  downloadingText: {
    color: '#ffffff',
    fontSize: moderateScale(8.5),
    fontWeight: '600',
    marginTop: moderateScale(2),
  },
  editButton: {
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(8),
    borderRadius: moderateScale(6),
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    minHeight: moderateScale(40),
  },
  editButtonText: {
    color: '#666666',
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333333',
    letterSpacing: 0.3,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
    color: '#666666',
    lineHeight: 24,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    minWidth: 110,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonPrimary: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  modalButtonText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  demoVideoContainer: {
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
  demoVideoContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  demoVideoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  demoVideoSubtitle: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  demoVideoNote: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  demoVideoButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  demoVideoButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VideoPreviewScreen;
