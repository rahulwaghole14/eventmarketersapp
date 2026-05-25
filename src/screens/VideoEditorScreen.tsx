// VideoEditorScreen - Metro cache fix - VideoProcessor import commented out
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  NativeModules,
  Easing,
  TouchableWithoutFeedback,
} from 'react-native';
import Video from 'react-native-video';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PanGestureHandler, State, PinchGestureHandler } from 'react-native-gesture-handler';
import { BusinessProfile } from '../services/businessProfile';
import authService from '../services/auth';
import { GOOGLE_FONTS, getFontsByCategory, SYSTEM_FONTS, getFontFamily } from '../services/fontService';
import { getAccessState, isAccessGranted, getAccessStateMessage, isTransitionalState } from '../utils/subscriptionAccess';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useBusinessProfile } from '../context/BusinessProfileContext';
import { useTheme } from '../context/ThemeContext';
import ViewShot from 'react-native-view-shot';
import { convertCanvasToVideoFormat, createSampleVideoCanvas } from '../utils/videoCanvasConverter';
import VideoComposer, { OverlayConfig, VideoLayer as ComposerVideoLayer } from '../services/VideoComposer';
import { getVideoAssetSource, getAvailableVideoNames, getRandomVideoFromAssets } from '../utils/videoAssets';
import { getVideoSource, getVideoComponentSource, getNativeVideoSource, VideoSourceConfig, clearVideoCache, getVideoCacheInfo } from '../utils/videoSourceHelper';
import { testVideoSourceHelper, debugVideoSource } from '../utils/videoSourceTest';
import VideoCompositionService, { Overlay as CloudOverlay } from '../services/CloudVideoCompositionService';
import RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
import { responsiveText } from '../utils/responsiveUtils';
import VideoOverlayProcessor, { OverlayPayload } from '../services/VideoOverlayProcessor';
import PremiumTemplateModal from '../components/PremiumTemplateModal';
import InfoRequiredModal from '../components/InfoRequiredModal';
import { applyVideoFrameLayoutToLayers as applyFrameLayoutToLayers, VIDEO_FRAME_ASSETS as FRAME_ASSETS } from '../data/videoFrames';

// Frame options for overlay frames - dynamically generated from FRAME_ASSETS
const FRAME_OPTIONS = Object.keys(FRAME_ASSETS).map(id => ({
  id,
  source: FRAME_ASSETS[id as keyof typeof FRAME_ASSETS]
}));

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate video canvas dimensions - same as poster editor canvas size (square)
const getCanvasDimensions = () => {
  const isTabletDevice = Math.min(screenWidth, screenHeight) >= 600;
  const isFoldableExpanded = screenWidth > 550 && (screenWidth / screenHeight > 0.7 && screenWidth / screenHeight < 1.3);
  const isUltraSmallDevice = screenWidth < 360;
  const isSmallDevice = screenWidth >= 360 && screenWidth < 375;
  const isMediumDevice = screenWidth >= 375 && screenWidth < 414;
  const isLargeDevice = screenWidth >= 414 && screenWidth < 480;

  let canvasWidthRatio = 0.95;

  if (isTabletDevice || isFoldableExpanded) {
    canvasWidthRatio = 0.65;
  } else if (isUltraSmallDevice) {
    canvasWidthRatio = 0.95;
  } else if (isSmallDevice) {
    canvasWidthRatio = 0.93;
  } else if (isMediumDevice) {
    canvasWidthRatio = 0.92;
  } else if (isLargeDevice) {
    canvasWidthRatio = 0.90;
  } else {
    canvasWidthRatio = 0.88;
  }

  let canvasWidth = screenWidth * canvasWidthRatio;
  const maxHeightAllowed = screenHeight * (isFoldableExpanded ? 0.42 : 0.5);
  if (canvasWidth > maxHeightAllowed) {
    canvasWidth = maxHeightAllowed;
  }

  return {
    width: Math.round(canvasWidth),
    height: Math.round(canvasWidth), // Square!
  };
};

const initialCanvasDims = getCanvasDimensions();
const videoCanvasWidth = initialCanvasDims.width;
const videoCanvasHeight = initialCanvasDims.height;


const POSTER_BASE_WIDTH = 720;
const POSTER_BASE_HEIGHT = 487.2;

const scale = (size: number) => (screenWidth / 375) * size;
const verticalScale = (size: number) => (screenHeight / 667) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

const isUltraSmallScreen = screenWidth < 360;
const isSmallScreen = screenWidth >= 360 && screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414 && screenWidth < 480;
const isXLargeScreen = screenWidth >= 480;
const isPortrait = screenHeight > screenWidth;
const isLandscape = screenWidth > screenHeight;
const isTablet = Math.min(screenWidth, screenHeight) >= 768;
const isPhone = !isTablet;

const responsiveSpacing = {
  xs: Math.max(1, (isUltraSmallScreen ? 2 : isSmallScreen ? 4 : isMediumScreen ? 6 : isLargeScreen ? 8 : 10)),
  sm: Math.max(2, (isUltraSmallScreen ? 4 : isSmallScreen ? 6 : isMediumScreen ? 8 : isLargeScreen ? 10 : 12)),
  md: Math.max(3, (isUltraSmallScreen ? 6 : isSmallScreen ? 8 : isMediumScreen ? 10 : isLargeScreen ? 12 : 14)),
  lg: Math.max(4, (isUltraSmallScreen ? 8 : isSmallScreen ? 10 : isMediumScreen ? 12 : isLargeScreen ? 14 : 16)),
  xl: Math.max(5, (isUltraSmallScreen ? 10 : isSmallScreen ? 12 : isMediumScreen ? 14 : isLargeScreen ? 16 : 18)),
  xxl: Math.max(6, (isUltraSmallScreen ? 12 : isSmallScreen ? 14 : isMediumScreen ? 16 : isLargeScreen ? 18 : 20)),
  xxxl: Math.max(7, (isUltraSmallScreen ? 14 : isSmallScreen ? 16 : isMediumScreen ? 18 : isLargeScreen ? 20 : 24)),
};

const responsiveFontSize = {
  xs: Math.max(7, (isUltraSmallScreen ? 8 : isSmallScreen ? 9 : isMediumScreen ? 10 : isLargeScreen ? 11 : 12) * 0.85),
  sm: Math.max(8, (isUltraSmallScreen ? 9 : isSmallScreen ? 10 : isMediumScreen ? 11 : isLargeScreen ? 12 : 13) * 0.85),
  md: Math.max(9, (isUltraSmallScreen ? 10 : isSmallScreen ? 11 : isMediumScreen ? 12 : isLargeScreen ? 13 : 14) * 0.85),
  lg: Math.max(10, (isUltraSmallScreen ? 11 : isSmallScreen ? 12 : isMediumScreen ? 13 : isLargeScreen ? 14 : 15) * 0.85),
  xl: Math.max(11, (isUltraSmallScreen ? 12 : isSmallScreen ? 13 : isMediumScreen ? 14 : isLargeScreen ? 15 : 16) * 0.85),
  xxl: Math.max(12, (isUltraSmallScreen ? 13 : isSmallScreen ? 14 : isMediumScreen ? 15 : isLargeScreen ? 16 : 17) * 0.85),
  xxxl: Math.max(13, (isUltraSmallScreen ? 14 : isSmallScreen ? 15 : isMediumScreen ? 16 : isLargeScreen ? 17 : 18) * 0.85),
  xxxxl: Math.max(14, (isUltraSmallScreen ? 15 : isSmallScreen ? 16 : isMediumScreen ? 17 : isLargeScreen ? 18 : 20) * 0.85),
  xxxxxl: Math.max(15, (isUltraSmallScreen ? 16 : isSmallScreen ? 17 : isMediumScreen ? 18 : isLargeScreen ? 19 : 22) * 0.85),
};

const getHeaderButtonSize = () => {
  if (isLandscape) {
    return Math.max(24, (isTablet ? 44 : 32) * 0.7);
  }
  return Math.max(20, (isUltraSmallScreen ? 28 : isSmallScreen ? 32 : isMediumScreen ? 36 : isLargeScreen ? 40 : 44) * 0.7);
};

const getHeaderTitleSize = () => {
  if (isLandscape) {
    return Math.max(14, (isTablet ? 20 : 16) * 0.85);
  }
  return Math.max(12, (isUltraSmallScreen ? 14 : isSmallScreen ? 16 : isMediumScreen ? 18 : isLargeScreen ? 20 : 22) * 0.85);
};

const getHeaderSubtitleSize = () => {
  if (isLandscape) {
    return Math.max(10, (isTablet ? 14 : 12) * 0.85);
  }
  return Math.max(9, (isUltraSmallScreen ? 10 : isSmallScreen ? 11 : isMediumScreen ? 12 : isLargeScreen ? 13 : 14) * 0.85);
};

const getResponsiveButtonSize = () => {
  if (isLandscape) {
    return (isTablet ? 60 : 45) * 0.7;
  }
  return (isUltraSmallScreen ? 40 : isSmallScreen ? 50 : isMediumScreen ? 60 : isLargeScreen ? 70 : 80) * 0.7;
};

const getResponsiveIconSize = (base: number = 16) => {
  if (isLandscape) {
    return Math.max(base - 2, (isTablet ? base + 4 : base) * 0.85);
  }
  return Math.max(base - 2, (isUltraSmallScreen ? base - 1 : isSmallScreen ? base : isMediumScreen ? base + 1 : base + 2) * 0.85);
};

const getToolbarButtonTextSize = () => {
  if (isLandscape) {
    return Math.max(8, (isTablet ? 12 : 10) * 0.85);
  }
  return Math.max(7, (isUltraSmallScreen ? 8 : isSmallScreen ? 9 : isMediumScreen ? 10 : isLargeScreen ? 11 : 12) * 0.85);
};

interface LanguageOption {
  id: string;
  name: string;
  code: string;
}

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

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'english', name: 'English', code: 'EN' },
  { id: 'hindi', name: 'Hindi', code: 'HI' },
  { id: 'marathi', name: 'Marathi', code: 'MR' },
];

const TEXT_FIELD_KEYS = ['companyName', 'phone', 'email', 'website', 'category', 'address', 'services'];

const DEFAULT_FRAME_PROFILE: BusinessProfile = {
  id: 'default-profile',
  name: 'Your Business Name',
  description: 'Business description goes here',
  category: 'Business',
  address: '123 Main Street, City',
  phone: '+1 234 567 890',
  alternatePhone: '',
  email: 'hello@business.com',
  website: 'www.business.com',
  logo: 'https://via.placeholder.com/120x120/667eea/ffffff?text=LOGO',
  companyLogo: 'https://via.placeholder.com/120x120/667eea/ffffff?text=LOGO',
  banner: '',
  services: ['Service One', 'Service Two', 'Service Three'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const normalizeLanguageId = (value?: string) => {
  if (!value) return 'english';
  const lower = value.toLowerCase();
  if (lower === 'en' || lower === 'english') return 'english';
  if (lower === 'hi' || lower === 'hindi') return 'hindi';
  if (lower === 'mr' || lower === 'marathi') return 'marathi';
  return lower;
};

const getLanguageCode = (id: string) =>
  LANGUAGE_OPTIONS.find(option => option.id === id)?.code.toLowerCase() || id;

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

const ensureOpaqueColor = (color?: string) => {
  if (!color) return color;
  const trimmed = color.trim();
  if (trimmed.startsWith('rgba')) {
    return trimmed;
  }
  if (trimmed.startsWith('rgb(')) {
    return trimmed.replace(/^rgb\((.*)\)$/i, 'rgba($1,1)');
  }
  return trimmed;
};

const ensureOpaqueGradient = (colors?: string[]) =>
  colors?.map(color => ensureOpaqueColor(color)).filter(Boolean) as string[] | undefined;

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

const getOmbreColors = (base: string | undefined) => {
  const color = base || '#000000';
  return [
    toRgba(color, 0.9),
    toRgba(color, 0.45),
    toRgba(color, 0),
  ];
};

// Memoized Frame Item Component for optimization
const FrameItem = React.memo(({ frame, isSelected, onPress, styles }: {
  frame: any,
  isSelected: boolean,
  onPress: () => void,
  styles: any
}) => (
  <TouchableOpacity
    style={[
      styles.frameButton,
      isSelected && styles.frameButtonActive
    ]}
    onPress={onPress}
  >
    <Image
      source={frame.source}
      style={styles.framePreview}
      resizeMode="contain"
      resizeMethod="resize" // Android optimization
    />
  </TouchableOpacity>
));

// Draggable Layer Component for 60FPS high performance dragging
const DraggableLayer = React.memo(({
  layer,
  index,
  scaleX = 1,
  scaleY = 1,
  forceOpaqueBackground = false,
  isSelected,
  onSelect,
  onDragEnd,
  onResize,
  currentCanvasWidth,
  currentCanvasHeight,
  selectedTemplate,
}: {
  layer: ComposerVideoLayer;
  index: number;
  scaleX?: number;
  scaleY?: number;
  forceOpaqueBackground?: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number) => void;
  currentCanvasWidth: number;
  currentCanvasHeight: number;
  selectedTemplate: string;
}) => {
  const [localPos, setLocalPos] = useState({ x: layer.position.x, y: layer.position.y });
  const dragStartRef = useRef<{ x: number; y: number; layerX: number; layerY: number } | null>(null);
  const [actualDimensions, setActualDimensions] = useState<{ width: number, height: number } | null>(null);

  // Pinch-to-zoom state (for logo/image layers)
  const pinchScaleAnim = useRef(new Animated.Value(1)).current;
  const lastPinchScale = useRef(1);
  const [isPinching, setIsPinching] = useState(false);
  const [liveScale, setLiveScale] = useState(1);

  const pinchStartRef = useRef<{ initialDistance: number; initialWidth: number; initialHeight: number } | null>(null);
  const pinchActiveRef = useRef(false);

  const getTouchDistance = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const t1 = touches[0];
    const t2 = touches[1];
    const dx = t1.pageX - t2.pageX;
    const dy = t1.pageY - t2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Keep local position in sync with parent when not actively dragging
  useEffect(() => {
    if (!dragStartRef.current) {
      setLocalPos({ x: layer.position.x, y: layer.position.y });
    }
  }, [layer.position.x, layer.position.y]);

  // Reset pinch scale when layer size changes externally
  useEffect(() => {
    pinchScaleAnim.setValue(1);
    lastPinchScale.current = 1;
    setLiveScale(1);
  }, [layer.size.width, layer.size.height]);

  const left = Math.round((localPos.x || 0) * scaleX);
  const top = Math.round((localPos.y || 0) * scaleY);
  const explicitWidth = Math.max(0, Math.round((layer.size.width || 0) * scaleX));
  const explicitHeight = Math.max(0, Math.round((layer.size.height || 0) * scaleY));

  const isBackground = layer.type === 'text' && layer.content === '' && layer.fieldType === 'footerBackground';
  const isTextLayer = layer.type === 'text' && !isBackground;
  const isPinchable = (layer.type === 'logo' || layer.type === 'image') && scaleX === 1 && scaleY === 1;

  const currentWidth = (isTextLayer && actualDimensions) ? actualDimensions.width : explicitWidth;
  const currentHeight = (isTextLayer && actualDimensions) ? actualDimensions.height : explicitHeight;

  const zIndex = layer.zIndex ?? index + 1;

  const adjustNumeric = (value: any, factor: number) =>
    typeof value === 'number' ? value * factor : value;

  const getScaledTextStyle = () => {
    const baseStyle = { ...(layer.style || {}) } as Record<string, any>;

    if (forceOpaqueBackground && baseStyle.backgroundColor) {
      baseStyle.backgroundColor = ensureOpaqueColor(String(baseStyle.backgroundColor));
    }

    if (scaleX === 1 && scaleY === 1) {
      return baseStyle;
    }

    const scaled = { ...baseStyle };
    const avgScale = (scaleX + scaleY) / 2;

    scaled.fontSize = adjustNumeric(scaled.fontSize, scaleY);
    scaled.lineHeight = adjustNumeric(scaled.lineHeight, scaleY);
    scaled.letterSpacing = adjustNumeric(scaled.letterSpacing, scaleX);
    scaled.padding = adjustNumeric(scaled.padding, avgScale);
    scaled.margin = adjustNumeric(scaled.margin, avgScale);
    scaled.borderWidth = adjustNumeric(scaled.borderWidth, avgScale);
    scaled.borderRadius = adjustNumeric(scaled.borderRadius, avgScale);
    scaled.paddingHorizontal = adjustNumeric(scaled.paddingHorizontal, scaleX);
    scaled.paddingVertical = adjustNumeric(scaled.paddingVertical, scaleY);
    scaled.paddingTop = adjustNumeric(scaled.paddingTop, scaleY);
    scaled.paddingBottom = adjustNumeric(scaled.paddingBottom, scaleY);
    scaled.paddingLeft = adjustNumeric(scaled.paddingLeft, scaleX);
    scaled.paddingRight = adjustNumeric(scaled.paddingRight, scaleX);
    scaled.marginHorizontal = adjustNumeric(scaled.marginHorizontal, scaleX);
    scaled.marginVertical = adjustNumeric(scaled.marginVertical, scaleY);
    scaled.marginTop = adjustNumeric(scaled.marginTop, scaleY);
    scaled.marginBottom = adjustNumeric(scaled.marginBottom, scaleY);
    scaled.marginLeft = adjustNumeric(scaled.marginLeft, scaleX);
    scaled.marginRight = adjustNumeric(scaled.marginRight, scaleX);

    if (scaled.shadowOffset && typeof scaled.shadowOffset === 'object') {
      scaled.shadowOffset = {
        width: adjustNumeric(scaled.shadowOffset.width, scaleX),
        height: adjustNumeric(scaled.shadowOffset.height, scaleY),
      };
    }

    return scaled;
  };

  const imageRadius = (layer as any).isCircular
    ? explicitWidth / 2
    : ((layer as any).borderRadius ? (layer as any).borderRadius * scaleX : 0);

  const renderImageContent = () => (
    <Image
      source={{ uri: layer.content }}
      style={[
        styles.layerImage,
        { borderRadius: imageRadius },
      ]}
      resizeMode="cover"
    />
  );

  const renderLogoContent = () => (
    <Image
      source={{ uri: layer.content }}
      style={[
        styles.layerLogo,
        {
          borderRadius: (layer as any).isCircular
            ? explicitWidth / 2
            : ((layer as any).borderRadius ? (layer as any).borderRadius * scaleX : 0),
        },
      ]}
      resizeMode="contain"
    />
  );

  return (
    <Animated.View
      style={[
        styles.layer,
        {
          left,
          top,
          zIndex: zIndex + 5,
          elevation: zIndex + 10,
          backgroundColor: 'rgba(0, 0, 0, 0.01)',
          overflow: 'visible',
          borderRadius: (layer as any).isCircular
            ? explicitWidth / 2
            : ((layer as any).borderRadius ? (layer as any).borderRadius * scaleX : 0),
        },
        isTextLayer ? { maxWidth: currentCanvasWidth } : { width: explicitWidth, height: explicitHeight },
        isSelected && scaleX === 1 && scaleY === 1 && styles.selectedLayer,
        isPinchable && { transform: [{ scale: pinchScaleAnim }] },
      ]}
      onLayout={(e) => {
        if (isTextLayer) {
          setActualDimensions({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height
          });
        }
      }}
      onStartShouldSetResponder={() => scaleX === 1 && scaleY === 1 && !isPinching}
      onResponderGrant={(evt) => {
        if (scaleX === 1 && scaleY === 1) {
          onSelect(layer.id);
          dragStartRef.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
            layerX: localPos.x,
            layerY: localPos.y,
          };
          pinchActiveRef.current = false;
        }
      }}
      onResponderMove={(evt) => {
        if (scaleX !== 1 || scaleY !== 1) return;
        const touches = evt.nativeEvent.touches || [];

        if (touches.length === 1 && !pinchActiveRef.current) {
          // Normal drag
          if (dragStartRef.current) {
            const deltaX = evt.nativeEvent.pageX - dragStartRef.current.x;
            const deltaY = evt.nativeEvent.pageY - dragStartRef.current.y;

            let newX = dragStartRef.current.layerX + deltaX;
            let newY = dragStartRef.current.layerY + deltaY;

            const maxX = Math.max(0, currentCanvasWidth - currentWidth);
            const maxY = Math.max(0, currentCanvasHeight - currentHeight);

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            setLocalPos({ x: newX, y: newY });
          }
        } else if (touches.length === 2 && isPinchable) {
          // Pinch zoom
          dragStartRef.current = null;
          pinchActiveRef.current = true;

          const dist = getTouchDistance(touches);
          if (dist > 0) {
            if (!pinchStartRef.current) {
              setIsPinching(true);
              pinchStartRef.current = {
                initialDistance: dist,
                initialWidth: layer.size.width || explicitWidth,
                initialHeight: layer.size.height || explicitHeight,
              };
            } else {
              const scale = dist / pinchStartRef.current.initialDistance;
              setLiveScale(scale);
              pinchScaleAnim.setValue(scale);
            }
          }
        }
      }}
      onResponderRelease={(evt) => {
        if (dragStartRef.current && !pinchActiveRef.current) {
          onDragEnd(layer.id, localPos.x, localPos.y);
        }
        dragStartRef.current = null;

        if (pinchActiveRef.current) {
          setIsPinching(false);
          const finalScale = liveScale;
          const minSize = 20;
          const maxW = currentCanvasWidth;
          const maxH = currentCanvasHeight;

          const baseW = pinchStartRef.current ? pinchStartRef.current.initialWidth : (layer.size.width || explicitWidth);
          const baseH = pinchStartRef.current ? pinchStartRef.current.initialHeight : (layer.size.height || explicitHeight);

          const newW = Math.max(minSize, Math.min(maxW, baseW * finalScale));
          const newH = Math.max(minSize, Math.min(maxH, baseH * finalScale));

          if (onResize) {
            onResize(layer.id, newW, newH);
          }

          pinchStartRef.current = null;
          pinchScaleAnim.setValue(1);
          setLiveScale(1);
          pinchActiveRef.current = false;
        }
      }}
    >
      {layer.type === 'text' && (
        layer.content === '' && layer.fieldType === 'footerBackground' ? (
          (() => {
            const isOmbreTemplate = selectedTemplate?.startsWith('ombre-');
            const gradientColors = (layer.style as any)?.gradientColors as string[] | undefined;
            const baseColors = gradientColors
              || (isOmbreTemplate ? OMBRE_GRADIENTS[selectedTemplate || ''] : undefined)
              || getOmbreColors(layer.style?.backgroundColor);
            const hasTransparency = gradientHasTransparency(baseColors);
            const shouldForceOpacity = forceOpaqueBackground && !hasTransparency;
            const colors = shouldForceOpacity
              ? ensureOpaqueGradient(baseColors)
              : baseColors;

            if (colors && colors.length >= 2) {
              const gradientStart = isOmbreTemplate ? { x: 0, y: 0 } : { x: 0, y: 1 };
              const gradientEnd = isOmbreTemplate ? { x: 1, y: 0 } : { x: 0, y: 0 };

              return (
                <LinearGradient
                  colors={colors}
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
                  backgroundColor: shouldForceOpacity
                    ? ensureOpaqueColor(layer.style?.backgroundColor) || 'rgba(0,0,0,1)'
                    : layer.style?.backgroundColor || 'rgba(0,0,0,0.6)',
                }}
              />
            );
          })()
        ) : (
          <Text
            style={[
              styles.layerText,
              getScaledTextStyle(),
            ]}
            allowFontScaling={false}
          >
            {layer.content}
          </Text>
        )
      )}

      {layer.type === 'image' && renderImageContent()}

      {layer.type === 'logo' && renderLogoContent()}

      {/* Pinch scale indicator badge */}
      {isPinching && isPinchable && (
        <View
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: [{ translateX: -28 }],
            backgroundColor: 'rgba(102, 126, 234, 0.92)',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
            zIndex: 9999,
            elevation: 9999,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {Math.round(liveScale * 100)}%
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

const VideoEditorScreen: React.FC<VideoEditorScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { selectedLanguage: initialLanguage, selectedTemplateId, selectedVideo } = route.params;

  const { isSubscribed, checkPremiumAccess, refreshSubscription } = useSubscription();
  const { selectedBusinessProfile } = useBusinessProfile();
  const { isDarkMode, theme } = useTheme();

  // Unified access state based on business profile or global subscription
  const accessState = getAccessState({
    businessProfile: selectedBusinessProfile,
    isSubscribed,
  });
  const hasAccess = isAccessGranted(accessState);

  // Video refs
  const videoRef = useRef<any>(null);
  const visibleVideoRef = useRef<any>(null);
  const canvasRef = useRef<ViewShot>(null);
  const overlaysRef = useRef<ViewShot>(null);
  const captureOverlayRef = useRef<ViewShot>(null);
  const lastGenerateTimeRef = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number; layerX: number; layerY: number } | null>(null);
  const processingOverlayAnim = useRef(new Animated.Value(0)).current;
  const processingCardScale = useRef(new Animated.Value(0.92)).current;
  const processingPulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const processingProgressAnim = useRef(new Animated.Value(0)).current;
  const progressLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const currentAnimValueRef = useRef(0);
  const maxTargetValRef = useRef(0);

  useEffect(() => {
    const listenerId = processingProgressAnim.addListener(({ value }) => {
      currentAnimValueRef.current = value;
    });
    return () => {
      processingProgressAnim.removeListener(listenerId);
    };
  }, [processingProgressAnim]);

  // State for video layers
  const [layers, setLayers] = useState<ComposerVideoLayer[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [isAutoLayoutApplied, setIsAutoLayoutApplied] = useState<{ [key: string]: boolean }>({});
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showInfoRequiredModal, setShowInfoRequiredModal] = useState(false);
  const [selectedFieldName, setSelectedFieldName] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showLogoSelectionModal, setShowLogoSelectionModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showDeleteElementModal, setShowDeleteElementModal] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(normalizeLanguageId(initialLanguage));

  // Video state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [showCloudComposer, setShowCloudComposer] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [generatedVideoPath, setGeneratedVideoPath] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoSource, setVideoSource] = useState<any>(null);

  // Video assets state
  const [currentVideoFromAssets, setCurrentVideoFromAssets] = useState<string>('test');
  const [availableVideos, setAvailableVideos] = useState<string[]>([]);

  // Business profiles
  const selectedProfile = selectedBusinessProfile;
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Template state
  const [showFontModal, setShowFontModal] = useState(false);
  const [visibleFields, setVisibleFields] = useState<{ [key: string]: boolean }>({
    logo: true,
    companyName: true,
    footerBackground: true,
    phone: true,
    email: true,
    website: true,
    category: true,
    address: true,
    services: true,
  });
  const [selectedFont, setSelectedFont] = useState('System');
  const [selectedFontSize, setSelectedFontSize] = useState<number>(16);
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('business');
  const [originalLayers, setOriginalLayers] = useState<ComposerVideoLayer[]>([]);
  const [originalTemplate, setOriginalTemplate] = useState<string>('business');

  const [canvasDimensions, setCanvasDimensions] = useState({
    width: videoCanvasWidth,
    height: videoCanvasHeight,
  });
  const currentCanvasWidth = canvasDimensions.width;
  const currentCanvasHeight = canvasDimensions.height;
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

  const canvasTopOffset = insets.top + moderateScale(12);
  const canvasBottomY = canvasTopOffset + currentCanvasHeight;
  const fontModalSpacing = moderateScale(24);
  const bottomSafeArea = Math.max(insets.bottom, responsiveSpacing.lg);
  const desiredTop = canvasBottomY + fontModalSpacing;
  const availableBelowCanvas = screenHeight - desiredTop - bottomSafeArea;
  const minFontModalHeight = screenHeight * 0.18;
  const maxFontModalHeight = screenHeight * 0.4;
  const fontModalMaxHeight = availableBelowCanvas >= minFontModalHeight
    ? Math.min(availableBelowCanvas, maxFontModalHeight)
    : maxFontModalHeight;
  const fallbackTop = screenHeight - fontModalMaxHeight - bottomSafeArea;
  const fontModalTopOffset = availableBelowCanvas >= minFontModalHeight
    ? desiredTop
    : Math.max(canvasBottomY - currentCanvasHeight / 2, fallbackTop);
  const fontModalWidth = Math.min(currentCanvasWidth * 0.88, screenWidth * 0.9);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Sync selectedFontSize with selected text layer's current font size
  useEffect(() => {
    if (selectedLayer) {
      const layer = layers.find(l => l.id === selectedLayer);
      if (layer && layer.type === 'text' && layer.style?.fontSize) {
        setSelectedFontSize(layer.style.fontSize);
      }
    }
  }, [selectedLayer, layers]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = VideoOverlayProcessor.addProgressListener?.(event => {
      if (!event || event.durationMs <= 0) {
        return;
      }

      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.progressMs / event.durationMs) * 100))
      );

      setProcessingProgress(percent);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      pulseLoopRef.current?.stop();
      progressLoopRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (isProcessing) {
      maxTargetValRef.current = 0;
      setDisplayProgress(0);
      setShowProcessingOverlay(true);
      processingOverlayAnim.stopAnimation();
      processingCardScale.stopAnimation();
      processingPulseAnim.setValue(0);

      Animated.parallel([
        Animated.timing(processingOverlayAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(processingCardScale, {
          toValue: 1,
          damping: 12,
          stiffness: 120,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();

      pulseLoopRef.current?.stop();
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(processingPulseAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(processingPulseAnim, {
            toValue: 0,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      progressLoopRef.current?.stop();
      progressLoopRef.current = null;

      Animated.parallel([
        Animated.timing(processingOverlayAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(processingCardScale, {
          toValue: 0.92,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setShowProcessingOverlay(false);
          processingProgressAnim.setValue(0);
          setDisplayProgress(0);
        }
      });
    }
  }, [isProcessing, processingOverlayAnim, processingCardScale, processingPulseAnim, processingProgressAnim]);

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    if (processingProgress > 0) {
      // 1. Update display progress state if it's greater than current
      setDisplayProgress(prev => Math.max(prev, processingProgress));

      // 2. Stop the indeterminate loop if it is still running
      const currentVal = currentAnimValueRef.current;
      if (progressLoopRef.current) {
        progressLoopRef.current.stop();
        progressLoopRef.current = null;
        // Freeze the value at its current visual position
        processingProgressAnim.setValue(currentVal);
        // Set the initial max target to the current frozen value
        maxTargetValRef.current = currentVal;
      }

      // Calculate target value based on real progress (percentage directly: 0 to 100)
      const targetVal = Math.min(100, Math.max(processingProgress, 0));

      // 3. Ensure the target value only moves forward
      const nextTarget = Math.max(maxTargetValRef.current, targetVal);
      maxTargetValRef.current = nextTarget;

      Animated.timing(processingProgressAnim, {
        toValue: nextTarget,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();

    } else if (maxTargetValRef.current === 0 && !progressLoopRef.current) {
      processingProgressAnim.setValue(0);
      progressLoopRef.current = Animated.sequence([
        Animated.timing(processingProgressAnim, {
          toValue: 20,
          duration: 3000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(processingProgressAnim, {
          toValue: 40,
          duration: 8000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(processingProgressAnim, {
          toValue: 60,
          duration: 15000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]);
      progressLoopRef.current.start();
    }
  }, [isProcessing, processingProgress, processingProgressAnim]);

  const buildOverlayPayload = useCallback(async (): Promise<{
    payload: OverlayPayload[];
    overlayImageUri?: string;
  }> => {
    const captureTarget = (captureOverlayRef.current as any) || (overlaysRef.current as any);
    if (!captureTarget || !captureTarget.capture) {
      return { payload: [] };
    }

    try {
      setIsCapturing(true);
      // Wait a frame for any last UI updates before capture
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
      const exportWidth = Math.round(videoDimensions?.width || currentCanvasWidth);
      const exportHeight = Math.round(videoDimensions?.height || currentCanvasHeight);

      const captureOptions: any = { format: 'png', quality: 1, width: exportWidth, height: exportHeight };
      if (videoDimensions) {
        captureOptions.result = 'tmpfile';
      }

      const captureUri = await captureTarget.capture?.(captureOptions);
      if (!captureUri) {
        return { payload: [] };
      }

      const normalizedUri = captureUri.startsWith('file://')
        ? captureUri
        : `file://${captureUri}`;

      return {
        overlayImageUri: normalizedUri,
        payload: [
          {
            type: 'image',
            uri: normalizedUri,
            position: { x: 0.5, y: 0.5 },
            width: 1,
            height: 1,
            opacity: 1,
          },
        ],
      };
    } catch (error) {
      console.warn('⚠️ Failed to capture overlay view for export:', error);
      return { payload: [] };
    } finally {
      setIsCapturing(false);
    }
  }, [videoDimensions, currentCanvasWidth, currentCanvasHeight]);

  const ensureLocalVideoUri = useCallback(async (uri: string): Promise<string> => {
    if (!uri) {
      throw new Error('Video URI is missing.');
    }

    if (uri.startsWith('file://') || uri.startsWith('/')) {
      return uri;
    }

    const cacheDir = RNFS.CachesDirectoryPath || RNFS.TemporaryDirectoryPath;
    if (!cacheDir) {
      throw new Error('Cache directory is unavailable for video processing.');
    }

    const extensionMatch = uri.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
    const extension = extensionMatch ? `.${extensionMatch[1]}` : '.mp4';
    const targetPath = `${cacheDir}/media3-input-${Date.now()}${extension}`;

    const downloadResult = await RNFS.downloadFile({
      fromUrl: uri,
      toFile: targetPath,
    }).promise;

    if (downloadResult.statusCode && downloadResult.statusCode >= 200 && downloadResult.statusCode < 300) {
      return `file://${targetPath}`;
    }

    throw new Error(`Failed to download video for processing (status ${downloadResult.statusCode})`);
  }, []);

  const validateBusinessContent = useCallback(() => {
    const hasVisibleCustomLayers = layers.some(layer => {
      if (layer.fieldType === 'footerBackground') return false;
      if (layer.fieldType && visibleFields[layer.fieldType] === false) return false;
      return true;
    });

    if (!hasVisibleCustomLayers) {
      Alert.alert(
        'Add Business Details',
        'Please add at least one visible text, image, or logo layer before continuing.'
      );
      return false;
    }

    const visibleTextFields = TEXT_FIELD_KEYS.filter(key => visibleFields[key] !== false);
    const missingTextForVisibleFields =
      visibleTextFields.length > 0 &&
      visibleTextFields.every(fieldKey => {
        const textLayer = layers.find(layer =>
          layer.type === 'text' &&
          layer.fieldType === fieldKey &&
          visibleFields[fieldKey] !== false &&
          typeof layer.content === 'string' &&
          layer.content.trim().length > 0
        );
        return !textLayer;
      });

    if (missingTextForVisibleFields) {
      Alert.alert(
        'Missing Business Info',
        'Please fill in the visible business fields or hide them before continuing.'
      );
      return false;
    }

    return true;
  }, [layers, visibleFields]);

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
    // Delete Modal Styles - Fully responsive
    deleteModalContainer: {
      borderRadius: moderateScale(14),
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: moderateScale(4),
      },
      shadowOpacity: isDarkMode ? 0.3 : 0.2,
      shadowRadius: moderateScale(10),
      elevation: moderateScale(8),
    },
    deleteModalHeader: {
      alignItems: 'center' as const,
      position: 'relative' as const,
    },
    deleteIconContainer: {
      width: moderateScale(50),
      height: moderateScale(50),
      borderRadius: moderateScale(25),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    deleteModalTitle: {
      fontSize: moderateScale(16),
      fontWeight: '700' as const,
      textAlign: 'center' as const,
    },
    closeModalButton: {
      position: 'absolute' as const,
      top: 0,
      right: 0,
      width: moderateScale(26),
      height: moderateScale(26),
      borderRadius: moderateScale(13),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    deleteModalContent: {
      // Dynamic marginBottom handled inline
    },
    deleteModalMessage: {
      textAlign: 'center' as const,
      // Dynamic fontSize and lineHeight handled inline
    },
    deleteModalButtons: {
      flexDirection: 'row' as const,
      gap: moderateScale(8),
    },
    deleteModalCancelButton: {
      flex: 1,
      alignItems: 'center' as const,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: moderateScale(1.5),
      },
      shadowOpacity: isDarkMode ? 0.15 : 0.08,
      shadowRadius: moderateScale(3),
      elevation: moderateScale(2),
      paddingVertical: moderateScale(10),
      borderRadius: moderateScale(8),
    },
    deleteModalCancelText: {
      fontWeight: '600' as const,
      fontSize: moderateScale(13),
    },
    deleteModalDeleteButton: {
      flex: 1,
      alignItems: 'center' as const,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: moderateScale(1.5),
      },
      shadowOpacity: 0.15,
      shadowRadius: moderateScale(3),
      elevation: moderateScale(2),
      paddingVertical: moderateScale(10),
      borderRadius: moderateScale(8),
    },
    deleteModalDeleteText: {
      fontWeight: '600' as const,
      color: '#ffffff',
      fontSize: moderateScale(13),
    },
  });

  const themeStyles = getThemeStyles();

  const getIconSize = useCallback((baseSize: number) => {
    const scale = screenWidth / 375;
    return Math.round(baseSize * scale);
  }, [screenWidth]);



  // Load available videos from assets
  useEffect(() => {
    const loadAvailableVideos = () => {
      try {
        const videoNames = getAvailableVideoNames();
        setAvailableVideos(videoNames);
        console.log('📹 Available videos loaded:', videoNames);

        // Set default video if none selected
        if (videoNames.length > 0 && !currentVideoFromAssets) {
          setCurrentVideoFromAssets(videoNames[0]);
        }
      } catch (error) {
        console.error('❌ Failed to load available videos:', error);
      }
    };

    loadAvailableVideos();
  }, []);

  // Debug native modules availability
  useEffect(() => {
    console.log('🔍 Debugging native modules availability:');
    console.log('- VideoComposer available:', !!VideoComposer);
    console.log('- VideoComposer module:', VideoComposer);
    console.log('- All native modules:', Object.keys(NativeModules));
    console.log('- NativeModules object:', NativeModules);
  }, []);

  // Apply default template when component loads or canvas size changes
  useEffect(() => {
    console.log('useEffect triggered - selectedProfile:', selectedProfile?.name, 'selectedTemplate:', selectedTemplate, 'dimensions:', canvasDimensions.width, 'x', canvasDimensions.height); // Debug log
    if (selectedProfile) {
      applyTemplate(selectedTemplate);
    } else {
      // Apply template even without profile to test
      console.log('No profile selected, applying template with defaults'); // Debug log
      applyTemplate(selectedTemplate);
    }
  }, [selectedProfile, selectedTemplate, canvasDimensions.width, canvasDimensions.height]);

  // Force apply template on mount
  useEffect(() => {
    console.log('Component mounted, applying business template'); // Debug log
    setTimeout(() => {
      applyTemplate('business');
    }, 1000); // Apply after 1 second
  }, []);



  const isFieldDataAvailable = (fieldType: string): boolean => {
    if (!selectedProfile) return false;

    const trimmedValue = (val: any) => {
      if (typeof val === 'string') return val.trim();
      return val;
    };

    switch (fieldType) {
      case 'logo':
        return !!(trimmedValue(selectedProfile.companyLogo) || trimmedValue(selectedProfile.logo));
      case 'companyName':
        return !!trimmedValue(selectedProfile.name);
      case 'phone':
        return !!trimmedValue(selectedProfile.phone);
      case 'email':
        return !!trimmedValue(selectedProfile.email);
      case 'website':
        return !!trimmedValue(selectedProfile.website);
      case 'category':
        return !!trimmedValue(selectedProfile.category);
      case 'address':
        return !!trimmedValue(selectedProfile.address);
      case 'services':
        return !!(selectedProfile.services && selectedProfile.services.length > 0);
      default:
        return false;
    }
  };

  const getEffectiveToggleValue = (fieldType: string): boolean => {
    const isBusinessField = ['logo', 'companyName', 'phone', 'email', 'website', 'category', 'address', 'services'].includes(fieldType);

    if (isBusinessField) {
      return visibleFields[fieldType] && isFieldDataAvailable(fieldType);
    }

    return visibleFields[fieldType];
  };

  // Sync state with data availability (safety layer)
  useEffect(() => {
    if (selectedProfile) {
      setVisibleFields(prev => {
        const updated = { ...prev };
        const businessFields = ['logo', 'companyName', 'phone', 'email', 'website', 'category', 'address', 'services'];

        businessFields.forEach((fieldType) => {
          if (prev[fieldType] && !isFieldDataAvailable(fieldType)) {
            updated[fieldType] = false;
          }
        });

        return updated;
      });
    }
  }, [selectedProfile]);

  const fieldDisplayNames: { [key: string]: string } = {
    logo: "Logo",
    companyName: "Company Name",
    phone: "Phone Number",
    email: "Email",
    website: "Website",
    category: "Category",
    address: "Address",
    services: "Services",
  };

  const toggleFieldVisibility = useCallback((field: string) => {
    const isCurrentlyVisible = visibleFields[field];
    const isBusinessField = ['logo', 'companyName', 'phone', 'email', 'website', 'category', 'address', 'services'].includes(field);

    if (!isCurrentlyVisible && isBusinessField && !isFieldDataAvailable(field)) {
      const displayName = fieldDisplayNames[field] || field;
      setSelectedFieldName(displayName);
      setShowInfoRequiredModal(true);
      return;
    }

    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  }, [visibleFields, selectedProfile]);

  // Video Processing Functions
  const handleVideoGenerated = useCallback((videoPath: string) => {
    setGeneratedVideoPath(videoPath);
    console.log('✅ Video generated successfully:', videoPath);

    // Show success message
    Alert.alert(
      'Video Generated!',
      'Your video has been created successfully. You can now share or download it.',
      [
        {
          text: 'View Video',
          onPress: () => {
            // Navigate to video viewer or open video player
            console.log('Opening video:', videoPath);
          },
        },
        {
          text: 'OK',
          onPress: () => {
            console.log('Video generation completed');
          },
        },
      ]
    );
  }, []);

  // Get current video source for React Native Video component
  const getCurrentVideoSource = useCallback(() => {
    // Use the selected video from route params
    console.log('📹 Getting video component source from selectedVideo:', selectedVideo);
    return selectedVideo;
  }, [selectedVideo]);

  // Load video source on component mount
  useEffect(() => {
    const source = getCurrentVideoSource();
    setVideoSource(source);
    console.log('📹 Video source loaded:', source);
  }, [getCurrentVideoSource]);

  // Helper function to copy asset to local file and return file:// path
  const copyAssetToLocalFile = useCallback(async (assetPath: string, fileName: string = 'test.mp4'): Promise<string> => {
    try {
      console.log('📁 copyAssetToLocalFile: Starting asset copy process...');
      console.log('📁 Asset path:', assetPath);
      console.log('📁 Target filename:', fileName);

      // Resolve the asset using Image.resolveAssetSource
      const resolvedAsset = Image.resolveAssetSource(require('../assets/video/test.mp4'));
      console.log('📁 Resolved asset source:', resolvedAsset);

      if (!resolvedAsset?.uri) {
        throw new Error('Could not resolve asset URI from require()');
      }

      const originalUri = resolvedAsset.uri;
      console.log('📁 Original asset URI:', originalUri);

      // Create local storage path
      const localPath = RNFS.DocumentDirectoryPath + '/' + fileName;
      console.log('📁 Target local path:', localPath);

      // Always overwrite the file to ensure fresh MP4 each time
      console.log('📁 Copying asset to local storage (overwriting if exists)...');

      // Determine if it's a Metro URL or local file
      const isMetroUrl = originalUri.startsWith('http://localhost:8081') || originalUri.startsWith('https://localhost:8081');
      console.log('📁 Is Metro URL:', isMetroUrl);

      if (isMetroUrl) {
        console.log('📁 Downloading from Metro server...');

        // Download from Metro server (this will overwrite existing file)
        const downloadResult = await RNFS.downloadFile({
          fromUrl: originalUri,
          toFile: localPath,
        }).promise;

        console.log('📁 Download result:', downloadResult);

        if (downloadResult.statusCode === 200) {
          console.log('✅ Video downloaded successfully from Metro server');
        } else {
          throw new Error(`Metro download failed with status: ${downloadResult.statusCode}`);
        }
      } else {
        console.log('📁 Copying from local bundled asset...');

        // Copy from local bundled asset (this will overwrite existing file)
        await RNFS.copyFile(originalUri, localPath);
        console.log('✅ Video file copied successfully from bundled asset');
      }

      // Validate the copied file
      const fileStats = await RNFS.stat(localPath);
      console.log('📁 Copied file stats:', fileStats);

      if (fileStats.size === 0) {
        throw new Error('Copied video file is empty');
      }

      // Return file:// URI
      const fileUri = 'file://' + localPath;
      console.log('📁 Returning file:// URI:', fileUri);
      console.log('📁 File size:', fileStats.size, 'bytes');

      return fileUri;
    } catch (error) {
      console.error('🚨 copyAssetToLocalFile failed:', error);
      throw new Error(`Failed to copy asset to local file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Get current video URI for native module - USES NEW HELPER FOR PLATFORM-SPECIFIC SOURCES
  const getCurrentVideoUri = useCallback(async () => {
    try {
      console.log('🎬 Starting video source resolution...');

      // Use new video source helper for platform-specific sources
      const videoUri = await getNativeVideoSource({
        fileName: 'test',
        useRemote: false, // Use local files first
      });

      console.log('✅ Video source resolution completed');
      console.log('📁 Final video URI:', videoUri);

      return videoUri;
    } catch (error) {
      console.error('🚨 Failed to get current video URI:', error);
      throw new Error(`Failed to get video URI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // New direct video generation function
  const handleGenerateVideo = useCallback(async () => {
    if (layers.length === 0) {
      Alert.alert('No Content', 'Please add some content to your video before generating.');
      return;
    }

    if (!validateBusinessContent()) {
      return;
    }

    // FFmpeg-based processing doesn't require VideoComposer module
    console.log('🎬 Using FFmpeg-based video processing service');

    // Prevent multiple simultaneous calls
    if (isProcessing) {
      console.log('⚠️ Video generation already in progress, skipping...');
      return;
    }

    // Debounce: prevent rapid successive calls (minimum 2 seconds between calls)
    const now = Date.now();
    const timeSinceLastCall = now - lastGenerateTimeRef.current;
    if (timeSinceLastCall < 2000) {
      console.log('⚠️ Video generation called too soon, debouncing...');
      return;
    }
    lastGenerateTimeRef.current = now;

    try {
      setIsProcessing(true);
      setProcessingProgress(0);

      console.log('🎬 Starting direct video generation...');
      console.log('- Layers count:', layers.length);

      // Get video source once and store it - now async
      console.log('📁 Preparing local video file for VideoComposer...');
      const currentVideoSource = await getCurrentVideoUri();
      console.log('📁 Current video source (file:// path):', currentVideoSource);
      console.log('📁 Path type:', typeof currentVideoSource);
      console.log('📁 Path length:', currentVideoSource.length);
      console.log('📁 Path starts with file://:', currentVideoSource.startsWith('file://'));

      // Capture canvas content if available
      let canvasImageUri: string | undefined;
      if (canvasRef.current && canvasRef.current.capture) {
        try {
          console.log('📸 Capturing canvas content...');
          const canvasImage = await canvasRef.current.capture();
          canvasImageUri = canvasImage;
          console.log('✅ Canvas captured:', canvasImageUri);
        } catch (error) {
          console.warn('⚠️ Canvas capture failed:', error);
        }
      }

      // FFmpeg processing uses layers directly, no need for overlay config

      // Validate file existence before calling FFmpeg service
      const filePath = currentVideoSource.replace('file://', '');
      console.log('📁 Checking file existence at:', filePath);

      const fileExists = await RNFS.exists(filePath);
      console.log('📁 File exists:', fileExists);

      if (!fileExists) {
        throw new Error(`Source video file does not exist: ${filePath}`);
      }

      // Get file stats for additional validation
      const fileStats = await RNFS.stat(filePath);
      console.log('📁 File stats:', fileStats);

      if (fileStats.size === 0) {
        throw new Error(`Source video file is empty: ${filePath}`);
      }

      console.log('⚠️ FFmpeg integration removed - local video processing is no longer available');
      Alert.alert('Feature Unavailable', 'Local video processing has been removed. Please use Cloud Processing instead.');
      return;

      // Navigate to video preview
      navigation.navigate('VideoPreview', {
        selectedVideo: { uri: currentVideoSource },
        selectedLanguage: getLanguageCode(currentLanguage),
        selectedTemplateId: 'custom',
        layers: layers,
        selectedProfile: selectedProfile,
        processedVideoPath: undefined,
        canvasData: {
          width: currentCanvasWidth,
          height: currentCanvasHeight,
          layers: layers,
        },
      });

    } catch (error) {
      console.error('🚨 Video generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Generation Failed', `Video generation failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setDisplayProgress(0);
    }
  }, [layers, isProcessing, currentCanvasWidth, currentCanvasHeight, selectedProfile, navigation, validateBusinessContent]);

  // Cloud processing function
  const handleCloudProcessing = useCallback(async () => {
    console.log('🔍 DEBUG: ===== CLOUD PROCESSING BUTTON CLICKED =====');
    console.log('🔍 DEBUG: handleCloudProcessing function started');
    console.log('🔍 DEBUG: Current timestamp:', new Date().toISOString());

    // Show immediate feedback that button was clicked
    Alert.alert('Debug', 'Cloud processing button clicked! Check console logs.');

    console.log('🚀 handleCloudProcessing called!');
    console.log('🔍 Current layers state:', layers);
    console.log('🔍 Layers length:', layers.length);

    // Add timeout to prevent hanging (reduced to 5 minutes for smaller video)
    const timeoutId = setTimeout(() => {
      console.log('🔍 DEBUG: Processing timeout reached (5 minutes)');
      setIsProcessing(false);
      setProcessingProgress(0);
      Alert.alert('Timeout', 'Processing took too long. The video may still be processing in the background. Please check again later.');
    }, 300000); // 5 minute timeout (300 seconds)

    let processingSuccess = false;

    try {
      if (layers.length === 0) {
        console.log('⚠️ No layers found, but continuing with test overlay...');
        // Don't return early - let's test with a fallback overlay
      }

      if (!validateBusinessContent()) {
        return;
      }

      if (isProcessing) {
        console.log('⚠️ Video generation already in progress, skipping...');
        return;
      }
      setIsProcessing(true);
      setProcessingProgress(0);

      console.log('🌐 Starting cloud video composition...');
      console.log('- Video source: Using selected video from route params');
      console.log('- CSS Overlays: These are rendered in frontend, not sent to backend');

      console.log('🔍 DEBUG: About to initialize VideoCompositionService...');
      console.log('🔍 DEBUG: Service URL will be: http://localhost:8000');

      const compositionService = new VideoCompositionService('http://localhost:8000');

      console.log('🔍 DEBUG: VideoCompositionService initialized successfully');
      console.log('🔍 DEBUG: About to check server health...');

      // Skip server health check for now - server is working
      console.log('🔍 Skipping server health check - server is working');
      console.log('✅ Proceeding directly to video processing...');

      // Force bypass health check
      const isHealthy = true; // Force true to bypass check
      console.log('🔍 Forced health check result:', isHealthy);

      // Debug layers array
      console.log('🔍 DEBUGGING LAYERS ARRAY:');
      console.log('- Raw layers array:', JSON.stringify(layers, null, 2));
      console.log('- Layers length:', layers.length);

      // Check each layer individually
      layers.forEach((layer, index) => {
        console.log(`- Layer ${index}:`, {
          type: layer.type,
          content: layer.content,
          hasContent: !!layer.content,
          contentType: typeof layer.content
        });
      });

      // Convert CSS layers to Django API overlay format
      const overlays: CloudOverlay[] = [];

      console.log('🔍 Converting CSS layers to Django overlays:');
      console.log('- Total layers:', layers.length);

      layers.forEach((layer, index) => {
        console.log(`- Processing layer ${index + 1}:`, {
          id: layer.id,
          type: layer.type,
          content: layer.content,
          hasContent: !!layer.content,
          hasBackgroundColor: !!layer.style?.backgroundColor,
          position: layer.position,
          style: layer.style,
          fieldType: layer.fieldType,
          size: layer.size
        });

        if (layer.type === 'text') {
          // Handle background layers (they have backgroundColor but no text content)
          if (layer.style?.backgroundColor && !layer.content) {
            console.log(`- Processing background layer ${index + 1}: has backgroundColor`);
            overlays.push({
              type: 'text',
              text: '', // Empty text for background
              x: Math.round(layer.position.x),
              y: Math.round(layer.position.y),
              start: 0,
              end: 5
            });
            return;
          }

          // Only process layers with actual text content
          if (layer.content && layer.content.trim()) {
            // Extract actual styling from layer
            const fontSize = layer.style?.fontSize || 18;
            const color = layer.style?.color || '#ffffff';
            const fontWeight = layer.style?.fontWeight || 'normal';

            overlays.push({
              type: 'text',
              text: layer.content.trim(),
              x: Math.round(layer.position.x),
              y: Math.round(layer.position.y),
              fontsize: fontSize,
              color: color.replace('#', ''), // Remove # for color format
              start: 0, // Show from start
              end: 5 // Show for 5 seconds
            });
            console.log(`- Text overlay ${index + 1}: "${layer.content}" at (${layer.position.x}, ${layer.position.y}) with color ${color} and size ${fontSize}`);
          } else {
            console.log(`- Skipping text layer ${index + 1}: no content or empty content`);
          }
        } else if (layer.type === 'image' || layer.type === 'logo') {
          // For image overlays, use the actual logo content/URL from the layer
          const logoPath = layer.content || 'src/assets/images/9.png'; // Use actual logo content
          overlays.push({
            type: 'image',
            path: logoPath, // Use actual logo content instead of hardcoded path
            x: Math.round(layer.position.x),
            y: Math.round(layer.position.y),
            start: 0, // Show from start
            end: 5 // Show for 5 seconds
          });
          console.log(`- Image overlay ${index + 1}: "${logoPath}" at (${layer.position.x}, ${layer.position.y})`);
          console.log(`- Logo layer content: "${layer.content}"`);
        }
      });

      console.log('- Converted overlays:', overlays.length);
      console.log('- Overlay details:', overlays.map((overlay, index) => ({
        index: index + 1,
        type: overlay.type,
        x: overlay.x,
        y: overlay.y
      })));

      // Get the proper video URI for cloud processing
      // Use the selected video from route params
      const videoUri = selectedVideo.uri;

      console.log('🚀 Starting cloud composition with:', {
        videoUri: videoUri,
        overlayCount: overlays.length,
        overlays: overlays,
        note: 'Using local video file for Django backend processing'
      });

      console.log('📤 About to call composeVideo with:');
      console.log('- videoPath:', videoUri);
      console.log('- overlays:', overlays);
      console.log('- overlays.length:', overlays.length);
      console.log('🔍 DEBUG: About to call compositionService.composeVideo...');
      console.log('🔍 DEBUG: Service instance:', compositionService);

      const result = await compositionService.composeVideo(
        videoUri,
        overlays,
        {
          outputName: `result_${Date.now()}.mp4`
        },
        (progressUpdate) => {
          setProcessingProgress(progressUpdate.progress);
          console.log(`📊 Progress: ${progressUpdate.stage} - ${progressUpdate.progress}%`);
        }
      );

      if (result.success && result.videoPath) {
        console.log('✅ Cloud composition completed!');
        console.log('📁 Processed video path:', result.videoPath);
        console.log('📁 Original video path:', videoUri);
        console.log('📝 Note: CSS overlays will be applied in VideoPreviewScreen');

        // Force progress bar to 100% and wait for the animation to finish
        setProcessingProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));

        processingSuccess = true;

        // Clean up processing state after a delay (once navigation transition completes)
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingProgress(0);
          setDisplayProgress(0);
        }, 1000);

        // Navigate to video preview
        navigation.navigate('VideoPreview', {
          selectedVideo: { uri: videoUri }, // Keep original video as selectedVideo
          selectedLanguage: getLanguageCode(currentLanguage),
          selectedTemplateId: 'custom',
          layers: layers,
          selectedProfile: selectedProfile,
          processedVideoPath: result.videoPath, // Pass processed video as processedVideoPath
          canvasData: {
            width: currentCanvasWidth,
            height: currentCanvasHeight,
            layers: layers,
          },
        });
      } else {
        throw new Error(result.error || 'Cloud composition failed');
      }

    } catch (error) {
      console.error('❌ Cloud processing failed:', (error as Error).message);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Cloud Processing Failed', `Cloud processing failed: ${errorMessage}`);
    } finally {
      console.log('🔍 DEBUG: Cleaning up - clearing timeout and resetting state');
      clearTimeout(timeoutId);
      if (!processingSuccess) {
        setIsProcessing(false);
        setProcessingProgress(0);
        setDisplayProgress(0);
      }
    }
  }, [layers, selectedVideo, isProcessing, currentCanvasWidth, currentCanvasHeight, selectedProfile, navigation, validateBusinessContent]);

  const createVideoCanvas = useCallback(() => {
    // Convert current layers to video canvas format
    const videoCanvas = {
      id: `canvas_${Date.now()}`,
      name: selectedProfile ? `${selectedProfile.name} Video` : 'My Video',
      duration: videoDuration || 10,
      width: currentCanvasWidth,
      height: currentCanvasHeight,
      fps: 30,
      layers: layers.map((layer, index) => ({
        id: layer.id || `layer_${index}`,
        type: layer.type as 'text' | 'image' | 'logo',
        content: layer.content || '',
        position: { x: layer.position?.x || 0, y: layer.position?.y || 0 },
        size: { width: layer.size?.width || 100, height: layer.size?.height || 100 },
        style: layer.style,
        fieldType: layer.fieldType,
      })),
      backgroundColor: '#000000',
    };

    return videoCanvas;
  }, [layers, selectedProfile, videoDuration, currentCanvasWidth, currentCanvasHeight]);

  const applyTemplateStylesToLayers = useCallback((templateType: string, targetLayers: ComposerVideoLayer[], canvasWidth: number, canvasHeight: number): ComposerVideoLayer[] => {
    return targetLayers.map(layer => {
      if (layer.fieldType === 'footerBackground') {
        const templateStyles: Record<string, { backgroundColor: string; gradient?: string[] }> = {
          'business': { backgroundColor: 'rgba(102, 126, 234, 0.9)' },
          'event': { backgroundColor: 'rgba(239, 68, 68, 0.9)' },
          'restaurant': { backgroundColor: 'rgba(34, 197, 94, 0.9)' },
          'fashion': { backgroundColor: 'rgba(236, 72, 153, 0.9)' },
          'real-estate': { backgroundColor: 'rgba(245, 158, 11, 0.9)' },
          'education': { backgroundColor: 'rgba(59, 130, 246, 0.9)' },
          'healthcare': { backgroundColor: 'rgba(6, 182, 212, 0.9)' },
          'fitness': { backgroundColor: 'rgba(168, 85, 247, 0.9)' },
          'wedding': { backgroundColor: 'rgba(212, 175, 55, 0.9)' },
          'birthday': { backgroundColor: 'rgba(251, 146, 60, 0.9)' },
          'corporate': { backgroundColor: 'rgba(30, 41, 59, 0.95)' },
          'creative': { backgroundColor: 'rgba(147, 51, 234, 0.9)' },
          'minimal': { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
          'luxury': { backgroundColor: 'rgba(212, 175, 55, 0.95)' },
          'vintage': { backgroundColor: 'rgba(120, 113, 108, 0.9)' },
          'retro': { backgroundColor: 'rgba(251, 146, 60, 0.9)' },
          'elegant': { backgroundColor: 'rgba(139, 69, 19, 0.9)' },
          'tech': { backgroundColor: 'rgba(30, 41, 59, 0.95)' },
          'ocean': { backgroundColor: 'rgba(6, 182, 212, 0.9)' },
          'sunset': { backgroundColor: 'rgba(239, 68, 68, 0.9)' },
          'artistic': { backgroundColor: 'rgba(168, 85, 247, 0.9)' },
          'ombre-sunset': { backgroundColor: 'rgba(255, 107, 107, 0.9)', gradient: OMBRE_GRADIENTS['ombre-sunset'] },
          'ombre-ocean': { backgroundColor: 'rgba(102, 126, 234, 0.9)', gradient: OMBRE_GRADIENTS['ombre-ocean'] },
          'ombre-purple': { backgroundColor: 'rgba(147, 51, 234, 0.9)', gradient: OMBRE_GRADIENTS['ombre-purple'] },
          'ombre-forest': { backgroundColor: 'rgba(6, 95, 70, 0.9)', gradient: OMBRE_GRADIENTS['ombre-forest'] },
          'ombre-fire': { backgroundColor: 'rgba(220, 38, 38, 0.9)', gradient: OMBRE_GRADIENTS['ombre-fire'] },
          'ombre-night': { backgroundColor: 'rgba(30, 58, 138, 0.9)', gradient: OMBRE_GRADIENTS['ombre-night'] },
          'ombre-tropical': { backgroundColor: 'rgba(244, 114, 182, 0.9)', gradient: OMBRE_GRADIENTS['ombre-tropical'] },
          'ombre-autumn': { backgroundColor: 'rgba(120, 53, 15, 0.9)', gradient: OMBRE_GRADIENTS['ombre-autumn'] },
          'ombre-rose': { backgroundColor: 'rgba(190, 18, 60, 0.9)', gradient: OMBRE_GRADIENTS['ombre-rose'] },
          'ombre-galaxy': { backgroundColor: 'rgba(99, 102, 241, 0.9)', gradient: OMBRE_GRADIENTS['ombre-galaxy'] },
        };

        const style = templateStyles[templateType] || templateStyles.business;

        return {
          ...layer,
          style: {
            ...layer.style,
            backgroundColor: style.backgroundColor,
            gradientColors: style.gradient,
          },
        };
      }

      if (['phone', 'email', 'website', 'category', 'address', 'services'].includes(layer.fieldType || '')) {
        const textColors: Record<string, string> = {
          'business': '#ffffff',
          'event': '#ffffff',
          'restaurant': '#ffffff',
          'fashion': '#ffffff',
          'real-estate': '#ffffff',
          'education': '#ffffff',
          'healthcare': '#ffffff',
          'fitness': '#ffffff',
          'wedding': '#000000',
          'birthday': '#ffffff',
          'corporate': '#ffffff',
          'creative': '#ffffff',
          'minimal': '#1f2937',
          'luxury': '#000000',
          'vintage': '#ffffff',
          'retro': '#ffffff',
          'elegant': '#ffffff',
          'tech': '#00ff00',
          'ocean': '#ffffff',
          'sunset': '#ffffff',
          'artistic': '#ffffff',
          'ombre-sunset': '#ffffff',
          'ombre-ocean': '#ffffff',
          'ombre-purple': '#ffffff',
          'ombre-forest': '#ffffff',
          'ombre-fire': '#ffffff',
          'ombre-night': '#ffffff',
          'ombre-tropical': '#ffffff',
          'ombre-autumn': '#ffffff',
          'ombre-rose': '#ffffff',
          'ombre-galaxy': '#ffffff',
        };

        const color = textColors[templateType] || textColors.business;

        return {
          ...layer,
          style: {
            ...layer.style,
            color,
          },
        };
      }

      return layer;
    });
  }, []);

  // Apply template function
  const applyTemplate = (template: string) => {
    // Reset frame auto-layout and original backup layer state when loading a new template
    setOriginalLayers([]);
    setIsAutoLayoutApplied({});
    setSelectedFrame(null);

    setSelectedTemplate(template);
    console.log('Applying template:', template); // Debug log

    const canvasWidth = currentCanvasWidth || videoCanvasWidth;
    const canvasHeight = currentCanvasHeight || videoCanvasHeight;
    const scaleX = canvasWidth / POSTER_BASE_WIDTH;
    const scaleY = canvasHeight / POSTER_BASE_HEIGHT;

    const newLayers: ComposerVideoLayer[] = [];
    const isTabletDevice = Math.min(screenWidth, screenHeight) >= 600;

    const buildFooterLayers = (
      companyName: string | undefined,
      phone?: string,
      email?: string,
      website?: string,
      category?: string,
      address?: string,
      services?: string[]
    ) => {
      const contactLineHeight = isTabletDevice ? 20 : 16;
      const footerPadding = 10; // Top and bottom padding
      const footerHeight = (contactLineHeight * 3) + (footerPadding * 2); // 3 lines + padding
      const footerY = canvasHeight - footerHeight;

      const getResponsiveFooterFontSize = (baseSize: number) => {
        const scaleFactor = Math.min(canvasWidth / 400, canvasHeight / 600); // Scale based on canvas size
        return Math.max(baseSize * scaleFactor, baseSize * 0.8); // Minimum 80% of base size
      };

      const footerTextSize = getResponsiveFooterFontSize(isTabletDevice ? 14 : 11);

      newLayers.push({
        id: generateId(),
        type: 'text',
        content: '',
        position: { x: 0, y: footerY },
        size: { width: canvasWidth, height: footerHeight },
        style: {
          backgroundColor: template === 'business' ? 'rgba(102, 126, 234, 0.9)' :
            template === 'event' ? 'rgba(255, 107, 107, 0.9)' :
              template === 'restaurant' ? 'rgba(255, 167, 38, 0.9)' :
                template === 'fashion' ? 'rgba(236, 72, 153, 0.9)' :
                  template === 'real-estate' ? 'rgba(139, 92, 246, 0.9)' :
                    template === 'education' ? 'rgba(59, 130, 246, 0.9)' :
                      template === 'healthcare' ? 'rgba(16, 185, 129, 0.9)' :
                        template === 'fitness' ? 'rgba(239, 68, 68, 0.9)' :
                          template === 'wedding' ? 'rgba(251, 191, 36, 0.9)' :
                            template === 'corporate' ? 'rgba(55, 65, 81, 0.9)' :
                              template === 'creative' ? 'rgba(0, 0, 0, 0.9)' :
                                'rgba(102, 126, 234, 0.9)',
        },
        fieldType: 'footerBackground',
      });

      const leftColumnX = Math.round(20 * scaleX);

      if (phone) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `📞 ${phone}`,
          position: { x: 539.3 * scaleX, y: 436.0 * scaleY },
          size: { width: (canvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: footerTextSize,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '400',
          },
          fieldType: 'phone',
        });
      }

      if (email) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `✉️ ${email}`,
          position: { x: leftColumnX, y: Math.round(436.0 * scaleY) },
          size: { width: (canvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: footerTextSize,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '400',
          },
          fieldType: 'email',
        });
      }

      if (website) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `🌐 ${website}`,
          position: { x: Math.round(12 * scaleX), y: Math.round(423 * scaleY) },
          size: { width: (canvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: footerTextSize,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '400',
          },
          fieldType: 'website',
        });
      }

      if (category) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `🏢 ${category}`,
          position: { x: Math.round(225 * scaleX), y: Math.round(446 * scaleY) },
          size: { width: (canvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: footerTextSize,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '400',
          },
          fieldType: 'category',
        });
      }

      if (address) {
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `📍 ${address}`,
          position: { x: Math.round(434 * scaleX), y: Math.round(426 * scaleY) },
          size: { width: (canvasWidth - 40) / 2, height: contactLineHeight },
          style: {
            fontSize: footerTextSize,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '400',
          },
          fieldType: 'address',
        });
      }

      if (services && services.length > 0) {
        const servicesText = services.slice(0, 3).join(' • ');
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: `🛠️ ${servicesText}${services.length > 3 ? '...' : ''}`,
          position: { x: leftColumnX, y: Math.round(464 * scaleY) },
          size: { width: canvasWidth - 40, height: contactLineHeight },
          style: {
            fontSize: Math.max(isTabletDevice ? 12 : 9, footerTextSize),
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '400',
          },
          fieldType: 'services',
        });
      }
    };

    if (selectedProfile) {
      console.log('Selected profile:', selectedProfile.name); // Debug log

      if (selectedProfile.logo) {
        const logoSize = Math.max(40, Math.min(80, canvasWidth * 0.15));
        const responsiveLogoX = (285.6769230769231 / 375) * canvasWidth;
        newLayers.push({
          id: generateId(),
          type: 'logo',
          content: selectedProfile.logo,
          position: { x: Math.min(responsiveLogoX, canvasWidth - logoSize - 10), y: 5.638499431602881 },
          size: { width: logoSize, height: logoSize },
          fieldType: 'logo',
        });
      }

      if (selectedProfile.name) {
        const companyNameSize = Math.max(16, Math.min(24, canvasWidth * 0.06));
        const responsiveNameX = (9.538461538461538 / 375) * canvasWidth;
        newLayers.push({
          id: generateId(),
          type: 'text',
          content: selectedProfile.name,
          position: { x: Math.min(responsiveNameX, canvasWidth * 0.05), y: 5.638499431602881 },
          size: { width: canvasWidth - 140, height: 60 },
          style: {
            fontSize: companyNameSize,
            color: '#ffffff',
            fontFamily: 'System',
            fontWeight: '600',
          },
          fieldType: 'companyName',
        });
      }

      buildFooterLayers(
        selectedProfile.name,
        selectedProfile.phone,
        selectedProfile.email,
        selectedProfile.website,
        selectedProfile.category,
        selectedProfile.address,
        selectedProfile.services
      );
    } else {
      const companyNameSize = Math.max(16, Math.min(24, canvasWidth * 0.06));
      const responsiveNameX = (9.538461538461538 / 375) * canvasWidth;
      newLayers.push({
        id: generateId(),
        type: 'text',
        content: 'Your Business Name',
        position: { x: Math.min(responsiveNameX, canvasWidth * 0.05), y: 5.638499431602881 },
        size: { width: canvasWidth - 140, height: 60 },
        style: {
          fontSize: companyNameSize,
          color: '#ffffff',
          fontFamily: 'System',
          fontWeight: '600',
        },
        fieldType: 'companyName',
      });

      const logoSize = Math.max(40, Math.min(80, canvasWidth * 0.15));
      const responsiveLogoX = (285.6769230769231 / 375) * canvasWidth;
      newLayers.push({
        id: generateId(),
        type: 'logo',
        content: 'https://via.placeholder.com/80x80/667eea/ffffff?text=LOGO',
        position: { x: Math.min(responsiveLogoX, canvasWidth - logoSize - 10), y: 5.638499431602881 },
        size: { width: logoSize, height: logoSize },
        fieldType: 'logo',
      });

      buildFooterLayers(
        'Business Tagline or Description',
        '+1 234 567 890',
        'hello@business.com',
        'www.business.com',
        'Category',
        '123 Main Street, City',
        ['Service One', 'Service Two', 'Service Three']
      );
    }

    const styledLayers = applyTemplateStylesToLayers(template, newLayers, canvasWidth, canvasHeight);
    setLayers(styledLayers);
  };

  const onVideoProgress = (data: any) => {
    setCurrentTime(data.currentTime);
  };

  const onVideoError = (error: any) => {
    console.error('🚨 Video playback error:', error);
    Alert.alert('Video Error', `Video playback failed: ${error.error?.errorString || 'Unknown error'}`);
  };

  const onVideoLoadStart = () => {
    console.log('📹 Video load started');
  };

  const onVideoLoad = (data: any) => {
    console.log('📹 Video loaded successfully:', data);
    setVideoDuration(data.duration);

    try {
      const naturalSize = data?.naturalSize || {};
      let naturalWidth = Number(naturalSize.width) || Number(data?.videoWidth) || 0;
      let naturalHeight = Number(naturalSize.height) || Number(data?.videoHeight) || 0;

      // Handle cases where orientation is portrait/landscape but width/height swapped or zero
      if (naturalWidth === 0 || naturalHeight === 0) {
        if (naturalSize?.orientation === 'portrait' && naturalSize?.height && naturalSize?.width) {
          naturalWidth = Number(naturalSize.height);
          naturalHeight = Number(naturalSize.width);
        }
      }

      if (naturalWidth > 0 && naturalHeight > 0) {
        // Keep canvas dimensions completely fixed to match template aspect ratio exactly
        setCanvasDimensions({
          width: videoCanvasWidth,
          height: videoCanvasHeight,
        });
        setVideoDimensions({
          width: Math.round(naturalWidth),
          height: Math.round(naturalHeight),
        });
      } else {
        // Fall back to defaults if natural size unavailable
        setCanvasDimensions({ width: videoCanvasWidth, height: videoCanvasHeight });
        setVideoDimensions({
          width: videoCanvasWidth,
          height: videoCanvasHeight,
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to calculate canvas dimensions from video metadata:', error);
      setCanvasDimensions({ width: videoCanvasWidth, height: videoCanvasHeight });
      setVideoDimensions({
        width: videoCanvasWidth,
        height: videoCanvasHeight,
      });
    }
  };

  // Layer management
  const addTextLayer = () => {
    const newLayer: ComposerVideoLayer = {
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
    const newLayer: ComposerVideoLayer = {
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
    const newLayer: ComposerVideoLayer = {
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

  const updateLayer = (layerId: string, updates: Partial<ComposerVideoLayer>) => {
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

  const confirmDeleteElement = () => {
    if (selectedLayer) {
      deleteLayer(selectedLayer);
      setShowDeleteElementModal(false);
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

  // Apply font style
  const applyFontStyle = useCallback((fontFamily: string) => {
    const actualFontFamily = getFontFamily(fontFamily);
    setSelectedFont(actualFontFamily);
    setLayers(prev => prev.map(layer => {
      if (layer.type === 'text') {
        if (selectedLayer && layer.id === selectedLayer) {
          return { ...layer, style: { ...layer.style, fontFamily: actualFontFamily, fontSize: selectedFontSize } };
        } else if (!selectedLayer) {
          return { ...layer, style: { ...layer.style, fontFamily: actualFontFamily } };
        }
      }
      return layer;
    }));
  }, [selectedLayer, selectedFontSize]);

  // Apply font size (selected layer or all text when none selected)
  const applyFontSize = useCallback((fontSize: number) => {
    setSelectedFontSize(fontSize);
    setLayers(prev => prev.map(layer => {
      if (layer.type !== 'text') {
        return layer;
      }
      if (selectedLayer) {
        return layer.id === selectedLayer
          ? { ...layer, style: { ...layer.style, fontSize } }
          : layer;
      }
      return { ...layer, style: { ...layer.style, fontSize } };
    }));
  }, [selectedLayer]);

  // Apply text color (selected layer or all text when none selected)
  const applyTextColor = useCallback((color: string) => {
    setLayers(prev => prev.map(layer => {
      if (layer.type !== 'text') {
        return layer;
      }
      if (selectedLayer) {
        return layer.id === selectedLayer
          ? { ...layer, style: { ...layer.style, color } }
          : layer;
      }
      return { ...layer, style: { ...layer.style, color } };
    }));
  }, [selectedLayer]);

  // Navigation
  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = useCallback(async () => {
    // Use unified access state instead of global isSubscribed
    if (!hasAccess) {
      if (isTransitionalState(accessState)) {
        Alert.alert('Processing', getAccessStateMessage(accessState));
      } else {
        setShowPremiumModal(true);
      }
      return;
    }

    if (layers.length === 0) {
      Alert.alert('No Content', 'Please add at least one text, image, or logo layer to your video.');
      return;
    }

    if (!selectedVideo?.uri) {
      Alert.alert('Missing Video', 'Unable to continue because the source video is missing.');
      return;
    }

    if (!validateBusinessContent()) {
      return;
    }

    const { payload: overlayPayload, overlayImageUri } = await buildOverlayPayload();

    if (Platform.OS !== 'android' || overlayPayload.length === 0) {
      navigation.navigate('VideoPreview', {
        selectedVideo: { uri: selectedVideo.uri },
        selectedLanguage: getLanguageCode(currentLanguage),
        selectedTemplateId: selectedTemplateId || 'custom',
        layers,
        selectedProfile,
        processedVideoPath: undefined,
        canvasData: {
          width: currentCanvasWidth,
          height: currentCanvasHeight,
          layers,
        },
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    let overlaySnapshotPath: string | undefined;
    let processingSuccess = false;

    try {
      if (overlayImageUri) {
        overlaySnapshotPath = overlayImageUri;
      }

      const inputVideoUri = await ensureLocalVideoUri(selectedVideo.uri);

      const outputPath = await VideoOverlayProcessor.applyOverlays(
        inputVideoUri,
        overlayPayload,
        { fileName: `overlay_${Date.now()}.mp4` }
      );

      // Force progress bar to 100% and wait for the animation to finish
      setProcessingProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      processingSuccess = true;

      // Clean up processing state after a delay (once navigation transition completes)
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        setDisplayProgress(0);
      }, 1000);

      navigation.navigate('VideoPreview', {
        selectedVideo: { uri: selectedVideo.uri },
        selectedLanguage: getLanguageCode(currentLanguage),
        selectedTemplateId: selectedTemplateId || 'custom',
        layers,
        selectedProfile,
        processedVideoPath: outputPath,
        canvasData: {
          width: currentCanvasWidth,
          height: currentCanvasHeight,
          layers,
        },
      });
    } catch (error) {
      console.error('Media3 overlay processing failed', error);
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
      Alert.alert(
        'Processing Failed',
        `${message}\n\nThe original video will be used instead.`
      );

      navigation.navigate('VideoPreview', {
        selectedVideo: { uri: selectedVideo.uri },
        selectedLanguage: getLanguageCode(currentLanguage),
        selectedTemplateId: selectedTemplateId || 'custom',
        layers,
        selectedProfile,
        processedVideoPath: undefined,
        canvasData: {
          width: currentCanvasWidth,
          height: currentCanvasHeight,
          layers,
        },
      });
    } finally {
      if (!processingSuccess) {
        setIsProcessing(false);
        setProcessingProgress(0);
        setDisplayProgress(0);
      }
      if (overlaySnapshotPath) {
        const cleanupPath = overlaySnapshotPath.replace('file://', '');
        RNFS.unlink(cleanupPath).catch(() => { });
      }
    }
  }, [
    buildOverlayPayload,
    currentCanvasHeight,
    currentCanvasWidth,
    currentLanguage,
    ensureLocalVideoUri,
    layers,
    navigation,
    selectedBusinessProfile,
    selectedProfile,
    selectedTemplateId,
    selectedVideo?.uri,
    validateBusinessContent,
    accessState,
    hasAccess,
  ]);

  // Apply frame-specific layout to elements
  const applyFrameLayout = useCallback((frameId: string) => {
    // Store original layers ONLY if no frame is currently applied (preserve true original positions)
    if (layers.length > 0 && !selectedFrame) {
      const layersToStore = [...layers];
      setOriginalLayers(layersToStore);
      console.log('🖼️ [FRAME LAYOUT] Stored original layers before first frame application:', {
        frameId,
        layersCount: layersToStore.length,
      });
    }

    const canvasWidth = currentCanvasWidth || videoCanvasWidth;
    const canvasHeight = currentCanvasHeight || videoCanvasHeight;

    // Apply frame layout
    const updatedLayers = applyFrameLayoutToLayers(
      layers,
      frameId,
      canvasWidth,
      canvasHeight,
      originalLayers
    );

    // Update state
    setLayers(updatedLayers);

    // Update auto-layout applied state
    setIsAutoLayoutApplied(prev => ({ ...prev, [frameId]: true }));
  }, [layers, currentCanvasWidth, currentCanvasHeight, originalLayers, selectedFrame]);

  // Handle frame removal modal/button actions
  const handleRemoveFrameOnly = useCallback(() => {
    console.log('🖼️ [FRAME REMOVAL] Starting frame removal process:', {
      currentFrame: selectedFrame,
      originalLayersCount: originalLayers.length
    });

    // Restore original layers before removing frame
    if (originalLayers.length > 0) {
      const restoredLayers = originalLayers.map(layer => {
        if (layer.type === 'logo' && layer.fieldType === 'logo') {
          return { ...layer, isCircular: false };
        }
        return layer;
      });

      setLayers(restoredLayers);
      console.log('🖼️ [FRAME REMOVAL] Original layers restored successfully:', restoredLayers.length);
    }

    setSelectedFrame(null);
    setIsAutoLayoutApplied({});
    setVisibleFields(prev => ({ ...prev, footerBackground: true }));
  }, [selectedFrame, originalLayers]);

  // Synchronize frame state: hide/show footerBackground when frame changes
  useEffect(() => {
    // Avoid running side-effects if the user is actively dragging elements
    if (dragStartRef.current) return;

    if (selectedFrame) {
      setVisibleFields(prev => ({ ...prev, footerBackground: false }));

      // Apply frame layout ONLY if layers are available AND layout hasn't been applied for this frame yet
      if (layers.length > 0 && !isAutoLayoutApplied[selectedFrame]) {
        applyFrameLayout(selectedFrame);
      }
    } else {
      if (originalLayers.length > 0) {
        const restoredLayers = originalLayers.map(layer => {
          if (layer.type === 'logo' && layer.fieldType === 'logo') {
            return { ...layer, isCircular: false };
          }
          return layer;
        });
        setLayers(restoredLayers);
        setOriginalLayers([]);
      } else {
        setVisibleFields(prev => ({ ...prev, footerBackground: true }));
      }
    }
  }, [selectedFrame]);

  // Render functions
  const handleDragEnd = useCallback((layerId: string, x: number, y: number) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, position: { x, y } } : l
    ));
  }, []);

  // Pinch-to-zoom: commit new size from DraggableLayer back to layer state
  const handleLayerResize = useCallback((layerId: string, newWidth: number, newHeight: number) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId
        ? { ...l, size: { width: Math.round(newWidth), height: Math.round(newHeight) } }
        : l
    ));
  }, []);

  const renderLayer = (
    layer: ComposerVideoLayer,
    index: number,
    options: { scaleX?: number; scaleY?: number; forceOpaqueBackground?: boolean } = {},
  ) => {
    const scaleX = options.scaleX ?? 1;
    const scaleY = options.scaleY ?? scaleX;
    const forceOpaqueBackground = options.forceOpaqueBackground ?? false;

    return (
      <DraggableLayer
        key={layer.id}
        layer={layer}
        index={index}
        scaleX={scaleX}
        scaleY={scaleY}
        forceOpaqueBackground={forceOpaqueBackground}
        isSelected={selectedLayer === layer.id}
        onSelect={setSelectedLayer}
        onDragEnd={handleDragEnd}
        onResize={handleLayerResize}
        currentCanvasWidth={currentCanvasWidth || videoCanvasWidth}
        currentCanvasHeight={currentCanvasHeight || videoCanvasHeight}
        selectedTemplate={selectedTemplate}
      />
    );
  };


  const rippleScalePrimary = processingPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });
  const rippleOpacityPrimary = processingPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0],
  });
  const rippleScaleSecondary = processingPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.6],
  });
  const rippleOpacitySecondary = processingPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0],
  });

  const exportWidth = Math.max(1, Math.round(videoDimensions?.width || currentCanvasWidth));
  const exportHeight = Math.max(1, Math.round(videoDimensions?.height || currentCanvasHeight));
  const captureScaleX = currentCanvasWidth > 0 ? exportWidth / currentCanvasWidth : 1;
  const captureScaleY = currentCanvasHeight > 0 ? exportHeight / currentCanvasHeight : 1;

  const headerTopPadding = isTablet
    ? Math.max(insets.top - moderateScale(4), 0)
    : 4;
  const processingBottomPadding = Math.max(
    insets.bottom + (isTablet ? 0 : moderateScale(12)),
    moderateScale(isTablet ? 20 : 28),
  );
  const processingContentScale = useMemo(() => {
    if (isTablet) {
      return 1;
    }
    if (currentCanvasHeight <= 0) {
      return 1;
    }
    const baseHeight = 360;
    const ratio = currentCanvasHeight / baseHeight;
    return Math.min(1, Math.max(0.78, ratio));
  }, [currentCanvasHeight, isTablet]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      <View style={[styles.header, { paddingTop: headerTopPadding, backgroundColor: theme?.colors?.surface || '#ffffff' }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerContent} />

        <TouchableOpacity
          onPress={handleNext}
          style={styles.nextButton}
          activeOpacity={0.7}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.canvasContainer}>
        <ViewShot
          ref={canvasRef}
          style={[styles.canvas, { width: currentCanvasWidth, height: currentCanvasHeight }]}
          options={{
            format: 'jpg',
            quality: 0.9,
            width: currentCanvasWidth,
            height: currentCanvasHeight,
          }}
        >
          <Video
            ref={videoRef}
            source={videoSource}
            style={styles.video}
            resizeMode="cover"
            paused={!isVideoPlaying}
            onLoad={onVideoLoad}
            onLoadStart={onVideoLoadStart}
            onProgress={onVideoProgress}
            onError={onVideoError}
            repeat={true}
          />

          <TouchableWithoutFeedback
            onPress={() => {
              setIsVideoPlaying(!isVideoPlaying);
              if (selectedLayer) {
                setSelectedLayer(null);
              }
            }}
          >
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          {/* Frame integrated overlay */}
          {selectedFrame && (
            <View style={styles.frameIntegrated} pointerEvents="none">
              <Image
                source={FRAME_OPTIONS.find(f => f.id === selectedFrame)?.source}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Video Layers */}
          {layers.map((layer, idx) => {
            console.log('Processing layer:', layer.id, layer.type, layer.fieldType, layer.fieldType ? getEffectiveToggleValue(layer.fieldType) : 'no fieldType'); // Debug log
            if (layer.fieldType && !getEffectiveToggleValue(layer.fieldType)) {
              console.log('Layer filtered out:', layer.id); // Debug log
              return null;
            }
            console.log('Rendering layer:', layer.id, layer.type, layer.position, layer.size); // Debug log
            return renderLayer(layer, idx);
          })}


          <View
            style={[styles.playButtonOverlay, isVideoPlaying && { opacity: 0 }]}
            pointerEvents={isVideoPlaying ? 'none' : 'auto'}
          >
            <TouchableOpacity
              onPress={() => setIsVideoPlaying(!isVideoPlaying)}
              activeOpacity={0.8}
            >
              <View style={styles.playButton}>
                <Icon
                  name="play-arrow"
                  size={48}
                  color="#ffffff"
                />
              </View>
            </TouchableOpacity>
          </View>

          {languageMenuVisible && (
            <View style={styles.languageDropdownMenuSmall}>
              {LANGUAGE_OPTIONS.map(option => {
                const isSelected = option.id === currentLanguage;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.languageDropdownItem,
                      isSelected && styles.languageDropdownItemSelected,
                    ]}
                    onPress={() => {
                      setCurrentLanguage(option.id);
                      setLanguageMenuVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.languageDropdownItemText,
                        isSelected && styles.languageDropdownItemTextSelected,
                      ]}
                    >
                      {option.name}
                    </Text>
                    {isSelected && (
                      <Icon name="check" size={getIconSize(12)} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
            <ViewShot
              ref={overlaysRef}
              style={{ flex: 1, backgroundColor: 'transparent' }}
              options={{ format: 'png', quality: 1, result: 'tmpfile' }}
            >
              <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                {selectedFrame && (
                  <View style={styles.frameIntegrated} pointerEvents="none">
                    <Image
                      source={FRAME_OPTIONS.find(f => f.id === selectedFrame)?.source}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>
                )}
                {layers.map((l, idx) => {
                  if (l.fieldType && !getEffectiveToggleValue(l.fieldType)) return null;
                  return renderLayer(l, idx);
                })}
              </View>
            </ViewShot>
          </View>

          <View
            style={{
              position: 'absolute',
              left: -exportWidth - 1000,
              top: -exportHeight - 1000,
              width: exportWidth,
              height: exportHeight,
              opacity: 0,
            }}
            pointerEvents="none"
          >
            <ViewShot
              ref={captureOverlayRef}
              style={{ width: exportWidth, height: exportHeight, backgroundColor: 'transparent' }}
              options={{
                format: 'png',
                quality: 1,
                result: 'tmpfile',
                width: exportWidth,
                height: exportHeight,
              }}
            >
              <View style={{ width: exportWidth, height: exportHeight, backgroundColor: 'transparent' }}>
                {selectedFrame && (
                  <View style={styles.frameIntegrated} pointerEvents="none">
                    <Image
                      source={FRAME_OPTIONS.find(f => f.id === selectedFrame)?.source}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>
                )}
                {layers.map((l, idx) => {
                  if (l.fieldType && !getEffectiveToggleValue(l.fieldType)) return null;
                  return renderLayer(l, idx, {
                    scaleX: captureScaleX,
                    scaleY: captureScaleY,
                    forceOpaqueBackground: true,
                  });
                })}
              </View>
            </ViewShot>
          </View>

          {showProcessingOverlay && (
            <Animated.View
              pointerEvents="auto"
              style={[styles.processingOverlay, { opacity: processingOverlayAnim }]}
            >
              <View style={[styles.processingContentOuter, { paddingBottom: processingBottomPadding }]}>
                <View style={{ transform: [{ scale: processingContentScale }] }}>
                  <Animated.View
                    style={[
                      styles.processingContentWrapper,
                      {
                        transform: [{ scale: processingCardScale }],
                      },
                    ]}
                  >
                    <View style={styles.processingAnimationContainer}>
                      <Animated.View
                        style={[
                          styles.processingRipple,
                          {
                            opacity: rippleOpacitySecondary,
                            transform: [{ scale: rippleScaleSecondary }],
                          },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.processingRipple,
                          {
                            opacity: rippleOpacityPrimary,
                            transform: [{ scale: rippleScalePrimary }],
                          },
                        ]}
                      />
                      <View style={styles.processingIndicator}>
                        <ActivityIndicator size="large" color="#ffffff" />
                      </View>
                    </View>
                    <Text style={styles.processingHeadline}>Processing</Text>
                    <Text style={styles.processingCaption}>
                      Adding overlays and finishing touches
                    </Text>
                    <View style={styles.progressBar}>
                      <Animated.View
                        style={[
                          styles.progressFill,
                          {
                            width: processingProgressAnim.interpolate({
                              inputRange: [0, 100],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressValue}>
                      {displayProgress > 0
                        ? `${Math.min(100, Math.max(1, Math.round(displayProgress)))}%`
                        : 'Processing...'}
                    </Text>
                  </Animated.View>
                </View>
              </View>
            </Animated.View>
          )}
        </ViewShot>
      </View>

      <View style={styles.controlsContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.controlsContent,
            {
              paddingBottom: isUltraSmallScreen
                ? insets.bottom + 20
                : isSmallScreen
                  ? insets.bottom + 16
                  : Math.max(insets.bottom + responsiveSpacing.md, responsiveSpacing.lg)
            }
          ]}
        >

          <View style={styles.bottomToolbar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolbarScrollContent}
            >
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={() => setShowTextModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.toolbarButtonGradient}
                >
                  <Icon name="text-fields" size={getResponsiveIconSize(16)} color="#ffffff" />
                  <Text style={styles.toolbarButtonText}>Text</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={() => setShowFontModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.toolbarButtonGradient}
                >
                  <Icon name="format-size" size={getResponsiveIconSize(16)} color="#ffffff" />
                  <Text style={styles.toolbarButtonText}>Font</Text>
                </LinearGradient>
              </TouchableOpacity>

              {selectedLayer && (
                <TouchableOpacity
                  style={styles.toolbarButton}
                  onPress={() => setShowDeleteElementModal(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#ff4757', '#ff3742']}
                    style={styles.toolbarButtonGradient}
                  >
                    <Icon name="delete" size={getResponsiveIconSize(16)} color="#ffffff" />
                    <Text style={styles.toolbarButtonText}>Delete</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

            </ScrollView>
          </View>

          {/* Field Toggle Buttons */}
          <View style={styles.fieldToggleSection}>
            <View style={styles.fieldToggleHeader}>
              <Text style={styles.fieldToggleTitle}>Toggle Fields</Text>
              <Text style={styles.fieldToggleSubtitle}>Click to show/hide elements</Text>
            </View>
            <ScrollView
              style={styles.fieldToggleContent}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.fieldToggleScrollContent}
            >
              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('logo') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('logo')}
              >
                <Icon name="account-balance" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('logo') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('logo') && styles.fieldToggleButtonTextActive]}>
                  Logo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('companyName') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('companyName')}
              >
                <Icon name="title" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('companyName') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('companyName') && styles.fieldToggleButtonTextActive]}>
                  Company Name
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('footerBackground') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('footerBackground')}
              >
                <Icon name="format-color-fill" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('footerBackground') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('footerBackground') && styles.fieldToggleButtonTextActive]}>
                  Footer BG
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('phone') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('phone')}
              >
                <Icon name="call" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('phone') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('phone') && styles.fieldToggleButtonTextActive]}>
                  Phone
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('email') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('email')}
              >
                <Icon name="mail" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('email') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('email') && styles.fieldToggleButtonTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('website') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('website')}
              >
                <Icon name="public" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('website') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('website') && styles.fieldToggleButtonTextActive]}>
                  Website
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('category') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('category')}
              >
                <Icon name="business-center" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('category') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('category') && styles.fieldToggleButtonTextActive]}>
                  Category
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('address') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('address')}
              >
                <Icon name="place" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('address') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('address') && styles.fieldToggleButtonTextActive]}>
                  Address
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldToggleButton, getEffectiveToggleValue('services') && styles.fieldToggleButtonActive]}
                onPress={() => toggleFieldVisibility('services')}
              >
                <Icon name="handyman" size={getResponsiveIconSize(16)} color={getEffectiveToggleValue('services') ? "#ffffff" : "#667eea"} />
                <Text style={[styles.fieldToggleButtonText, getEffectiveToggleValue('services') && styles.fieldToggleButtonTextActive]}>
                  Services
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Templates Section */}
          <View style={styles.templatesSection}>
            <View style={styles.templatesHeader}>
              <Text style={styles.templatesTitle}>Templates</Text>
            </View>
            <ScrollView
              style={styles.templatesContent}
              horizontal
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.templatesScrollContent}
            >
              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'business' && styles.templateButtonActive]}
                onPress={() => applyTemplate('business')}
              >
                <View style={[styles.templatePreview, styles.businessTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.businessTemplateStyle]} />
                  </View>
                </View>
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
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'real-estate' && styles.templateButtonActive]}
                onPress={() => applyTemplate('real-estate')}
              >
                <View style={[styles.templatePreview, styles.realEstateTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.realEstateTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'education' && styles.templateButtonActive]}
                onPress={() => applyTemplate('education')}
              >
                <View style={[styles.templatePreview, styles.educationTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.educationTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'healthcare' && styles.templateButtonActive]}
                onPress={() => applyTemplate('healthcare')}
              >
                <View style={[styles.templatePreview, styles.healthcareTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.healthcareTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'fitness' && styles.templateButtonActive]}
                onPress={() => applyTemplate('fitness')}
              >
                <View style={[styles.templatePreview, styles.fitnessTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.fitnessTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'wedding' && styles.templateButtonActive]}
                onPress={() => applyTemplate('wedding')}
              >
                <View style={[styles.templatePreview, styles.weddingTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.weddingTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'birthday' && styles.templateButtonActive]}
                onPress={() => applyTemplate('birthday')}
              >
                <View style={[styles.templatePreview, styles.birthdayTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.birthdayTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'corporate' && styles.templateButtonActive]}
                onPress={() => applyTemplate('corporate')}
              >
                <View style={[styles.templatePreview, styles.corporateTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.corporateTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'creative' && styles.templateButtonActive]}
                onPress={() => applyTemplate('creative')}
              >
                <View style={[styles.templatePreview, styles.creativeTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.creativeTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'minimal' && styles.templateButtonActive]}
                onPress={() => applyTemplate('minimal')}
              >
                <View style={[styles.templatePreview, styles.minimalTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.minimalTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'luxury' && styles.templateButtonActive]}
                onPress={() => applyTemplate('luxury')}
              >
                <View style={[styles.templatePreview, styles.luxuryTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.luxuryTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'vintage' && styles.templateButtonActive]}
                onPress={() => applyTemplate('vintage')}
              >
                <View style={[styles.templatePreview, styles.vintageTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.vintageTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'retro' && styles.templateButtonActive]}
                onPress={() => applyTemplate('retro')}
              >
                <View style={[styles.templatePreview, styles.retroTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.retroTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'elegant' && styles.templateButtonActive]}
                onPress={() => applyTemplate('elegant')}
              >
                <View style={[styles.templatePreview, styles.elegantTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.elegantTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'tech' && styles.templateButtonActive]}
                onPress={() => applyTemplate('tech')}
              >
                <View style={[styles.templatePreview, styles.techTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.techTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ocean' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ocean')}
              >
                <View style={[styles.templatePreview, styles.oceanTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.oceanTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'sunset' && styles.templateButtonActive]}
                onPress={() => applyTemplate('sunset')}
              >
                <View style={[styles.templatePreview, styles.sunsetTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.sunsetTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'artistic' && styles.templateButtonActive]}
                onPress={() => applyTemplate('artistic')}
              >
                <View style={[styles.templatePreview, styles.artisticTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <View style={[styles.templatePreviewFooter, styles.artisticTemplateStyle]} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-sunset' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-sunset')}
              >
                <View style={[styles.templatePreview, styles.ombreSunsetTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#FF6B6B', '#FFA500', '#FFD700']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-ocean' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-ocean')}
              >
                <View style={[styles.templatePreview, styles.ombreOceanTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#667eea', '#06b6d4', '#22c55e']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-purple' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-purple')}
              >
                <View style={[styles.templatePreview, styles.ombrePurpleTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#9333ea', '#ec4899', '#f43f5e']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-forest' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-forest')}
              >
                <View style={[styles.templatePreview, styles.ombreForestTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#065f46', '#059669', '#10b981']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-fire' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-fire')}
              >
                <View style={[styles.templatePreview, styles.ombreFireTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#dc2626', '#f59e0b', '#fbbf24']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-night' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-night')}
              >
                <View style={[styles.templatePreview, styles.ombreNightTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#1e3a8a', '#7c3aed', '#ec4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-tropical' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-tropical')}
              >
                <View style={[styles.templatePreview, styles.ombreTropicalTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#f472b6', '#fb923c', '#06b6d4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-autumn' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-autumn')}
              >
                <View style={[styles.templatePreview, styles.ombreAutumnTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#78350f', '#ea580c', '#dc2626']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-rose' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-rose')}
              >
                <View style={[styles.templatePreview, styles.ombreRoseTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#be123c', '#f472b6', '#fda4af']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.templateButton, selectedTemplate === 'ombre-galaxy' && styles.templateButtonActive]}
                onPress={() => applyTemplate('ombre-galaxy')}
              >
                <View style={[styles.templatePreview, styles.ombreGalaxyTemplatePreview]}>
                  <View style={styles.templatePreviewContent}>
                    <LinearGradient
                      colors={['#6366f1', '#8b5cf6', '#06b6d4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.templatePreviewFooter, { backgroundColor: 'transparent' }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Frames Section */}
          <View style={styles.framesSection}>
            <View style={styles.framesHeader}>
              <Text style={styles.framesTitle}>Frames</Text>
            </View>
            <FlatList
              data={FRAME_OPTIONS}
              renderItem={({ item: frame }) => (
                <FrameItem
                  frame={frame}
                  isSelected={selectedFrame === frame.id}
                  onPress={() => {
                    if (selectedFrame === frame.id) {
                      handleRemoveFrameOnly();
                    } else {
                      setSelectedFrame(frame.id);
                      setVisibleFields(prev => ({ ...prev, footerBackground: false }));
                      applyFrameLayout(frame.id);
                    }
                  }}
                  styles={styles}
                />
              )}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.framesScrollContent}
              initialNumToRender={6}
              maxToRenderPerBatch={4}
              windowSize={3}
              removeClippedSubviews={true}
            />
          </View>

        </ScrollView>
      </View>

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

      {/* Font Style Modal */}
      <Modal
        visible={showFontModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontModal(false)}
      >
        <View style={styles.fontModalRoot}>
          <TouchableWithoutFeedback onPress={() => setShowFontModal(false)}>
            <View style={[
              styles.fontModalBackdrop,
              { top: fontModalTopOffset }
            ]} />
          </TouchableWithoutFeedback>
          <View style={[
            styles.fontModalWrapper,
            { top: fontModalTopOffset }
          ]}>
            <View style={[
              styles.fontModalContent,
              {
                width: fontModalWidth,
                height: fontModalMaxHeight
              }
            ]}>
              {/* Modal Header */}
              <View style={styles.fontModalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Font & Size</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedLayer ? 'Customize selected text' : 'Choose a font style'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.fontModalCloseButton}
                  onPress={() => setShowFontModal(false)}
                >
                  <Icon name="close" size={getResponsiveIconSize()} color="#666666" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Content Container */}
              <ScrollView
                style={styles.fontModalScrollView}
                contentContainerStyle={styles.fontModalScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {/* Font Size Controls */}
                <View style={styles.fontSizeControlsContainer}>
                  <View style={styles.fontSizeHeader}>
                    <Icon name="format-size" size={getResponsiveIconSize()} color="#667eea" />
                    <View style={styles.fontSizeHeaderTextGroup}>
                      <Text style={styles.fontSizeLabel}>Font Size</Text>
                      {!selectedLayer && (
                        <Text style={styles.fontSizeHelperText}>No layer selected — applies to all text</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.fontSizeButtons}>
                    {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48].map(size => (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.fontSizeButton,
                          selectedFontSize === size && styles.fontSizeButtonActive
                        ]}
                        onPress={() => applyFontSize(size)}
                      >
                        <Text style={[
                          styles.fontSizeButtonText,
                          selectedFontSize === size && styles.fontSizeButtonTextActive
                        ]}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Text Color Section */}
                <View style={styles.textColorControlsContainer}>
                  <View style={styles.textColorHeader}>
                    <Icon name="palette" size={getResponsiveIconSize()} color="#667eea" />
                    <View style={styles.textColorHeaderTextGroup}>
                      <Text style={styles.textColorLabel}>TEXT COLOR</Text>
                      {!selectedLayer && (
                        <Text style={styles.textColorHelperText}>No layer selected — applies to all text</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.colorPalette}>
                    {[
                      '#000000', // Black
                      '#FFFFFF', // White
                      '#FF0000', // Red
                      '#00FF00', // Green
                      '#0000FF', // Blue
                      '#FFA500', // Orange
                      '#800080', // Purple
                      '#808080', // Gray
                    ].map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: color },
                          color === '#FFFFFF' && styles.whiteSwatchBorder
                        ]}
                        onPress={() => applyTextColor(color)}
                      />
                    ))}
                  </View>
                </View>

                {/* Font Family Section */}
                <View style={styles.fontFamilySection}>
                  <View style={styles.fontFamilySectionHeader}>
                    <Icon name="font-download" size={getResponsiveIconSize()} color="#667eea" />
                    <Text style={styles.fontFamilySectionTitle}>Font Family</Text>
                  </View>
                </View>
                {/* System Fonts Category */}
                <View style={styles.fontCategorySection}>
                  <Text style={styles.fontCategoryTitle}>System Fonts</Text>
                  <View style={styles.fontCategoryGrid}>
                    <TouchableOpacity
                      style={styles.fontOptionButton}
                      onPress={() => applyFontStyle(SYSTEM_FONTS.default)}
                    >
                      <Text style={[styles.fontPreviewText, { fontFamily: SYSTEM_FONTS.default }]}>Aa</Text>
                      <Text style={styles.fontOptionName}>System</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.fontOptionButton}
                      onPress={() => applyFontStyle(SYSTEM_FONTS.serif)}
                    >
                      <Text style={[styles.fontPreviewText, { fontFamily: SYSTEM_FONTS.serif }]}>Aa</Text>
                      <Text style={styles.fontOptionName}>Serif</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.fontOptionButton}
                      onPress={() => applyFontStyle(SYSTEM_FONTS.monospace)}
                    >
                      <Text style={[styles.fontPreviewText, { fontFamily: SYSTEM_FONTS.monospace }]}>Aa</Text>
                      <Text style={styles.fontOptionName}>Monospace</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.fontOptionButton}
                      onPress={() => applyFontStyle(SYSTEM_FONTS.cursive)}
                    >
                      <Text style={[styles.fontPreviewText, { fontFamily: SYSTEM_FONTS.cursive }]}>Aa</Text>
                      <Text style={styles.fontOptionName}>Cursive</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.fontOptionButton}
                      onPress={() => applyFontStyle(SYSTEM_FONTS.fantasy)}
                    >
                      <Text style={[styles.fontPreviewText, { fontFamily: SYSTEM_FONTS.fantasy }]}>Aa</Text>
                      <Text style={styles.fontOptionName}>Fantasy</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Google Fonts - Sans-serif */}
                <View style={styles.fontCategorySection}>
                  <Text style={styles.fontCategoryTitle}>Sans-Serif Fonts</Text>
                  <View style={styles.fontCategoryGrid}>
                    {getFontsByCategory('sans-serif').slice(0, 6).map((font) => (
                      <TouchableOpacity
                        key={font.name}
                        style={styles.fontOptionButton}
                        onPress={() => applyFontStyle(font.name)}
                      >
                        <Text style={[styles.fontPreviewText, { fontFamily: getFontFamily(font.name) }]}>Aa</Text>
                        <Text style={styles.fontOptionName}>{font.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Google Fonts - Serif */}
                <View style={styles.fontCategorySection}>
                  <Text style={styles.fontCategoryTitle}>Serif Fonts</Text>
                  <View style={styles.fontCategoryGrid}>
                    {getFontsByCategory('serif').slice(0, 4).map((font) => (
                      <TouchableOpacity
                        key={font.name}
                        style={styles.fontOptionButton}
                        onPress={() => applyFontStyle(font.name)}
                      >
                        <Text style={[styles.fontPreviewText, { fontFamily: getFontFamily(font.name) }]}>Aa</Text>
                        <Text style={styles.fontOptionName}>{font.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Google Fonts - Display */}
                <View style={styles.fontCategorySection}>
                  <Text style={styles.fontCategoryTitle}>Display Fonts</Text>
                  <View style={styles.fontCategoryGrid}>
                    {getFontsByCategory('display').slice(0, 4).map((font) => (
                      <TouchableOpacity
                        key={font.name}
                        style={styles.fontOptionButton}
                        onPress={() => applyFontStyle(font.name)}
                      >
                        <Text style={[styles.fontPreviewText, { fontFamily: getFontFamily(font.name) }]}>Aa</Text>
                        <Text style={styles.fontOptionName}>{font.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Google Fonts - Handwriting */}
                <View style={styles.fontCategorySection}>
                  <Text style={styles.fontCategoryTitle}>Handwriting Fonts</Text>
                  <View style={styles.fontCategoryGrid}>
                    {getFontsByCategory('handwriting').slice(0, 4).map((font) => (
                      <TouchableOpacity
                        key={font.name}
                        style={styles.fontOptionButton}
                        onPress={() => applyFontStyle(font.name)}
                      >
                        <Text style={[styles.fontPreviewText, { fontFamily: getFontFamily(font.name) }]}>Aa</Text>
                        <Text style={styles.fontOptionName}>{font.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Google Fonts - Monospace */}
                <View style={styles.fontCategorySection}>
                  <Text style={styles.fontCategoryTitle}>Monospace Fonts</Text>
                  <View style={styles.fontCategoryGrid}>
                    {getFontsByCategory('monospace').slice(0, 2).map((font) => (
                      <TouchableOpacity
                        key={font.name}
                        style={styles.fontOptionButton}
                        onPress={() => applyFontStyle(font.name)}
                      >
                        <Text style={[styles.fontPreviewText, { fontFamily: getFontFamily(font.name) }]}>Aa</Text>
                        <Text style={styles.fontOptionName}>{font.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Modal */}
      <PremiumTemplateModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={async () => {
          setShowPremiumModal(false);
          await refreshSubscription();
          (navigation as any).navigate('Subscription');
        }}
        selectedTemplate={null}
      />

      {/* Info Required Modal */}
      <InfoRequiredModal
        visible={showInfoRequiredModal}
        fieldName={selectedFieldName}
        onClose={() => setShowInfoRequiredModal(false)}
      />

      {/* Delete Element Confirmation Modal - Responsive across all screen sizes */}
      <Modal
        visible={showDeleteElementModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteElementModal(false)}
        statusBarTranslucent={true}
      >
        <View style={[styles.modalOverlay, { paddingHorizontal: isTablet ? responsiveSpacing.xl : isLandscape ? responsiveSpacing.lg : responsiveSpacing.md }]}>
          <View style={[
            themeStyles.deleteModalContainer,
            {
              backgroundColor: theme?.colors?.surface || '#ffffff',
              width: isTablet
                ? screenWidth * 0.5
                : isLandscape
                  ? screenWidth * 0.6
                  : isUltraSmallScreen
                    ? screenWidth * 0.92
                    : isSmallScreen
                      ? screenWidth * 0.9
                      : screenWidth * 0.85,
              maxWidth: isTablet ? 500 : 450,
              paddingHorizontal: isTablet ? responsiveSpacing.xl : isLandscape ? responsiveSpacing.lg : isUltraSmallScreen ? responsiveSpacing.md : responsiveSpacing.lg,
              paddingVertical: isTablet ? responsiveSpacing.xl : isLandscape ? responsiveSpacing.lg : isUltraSmallScreen ? responsiveSpacing.md : responsiveSpacing.lg,
            }
          ]}>
            <View style={themeStyles.deleteModalHeader}>
              <View style={[
                themeStyles.deleteIconContainer,
                {
                  backgroundColor: '#ff444420',
                  marginBottom: isTablet ? responsiveSpacing.md : responsiveSpacing.sm
                }
              ]}>
                <Icon
                  name="warning"
                  size={isTablet ? 36 : isLandscape ? 32 : isUltraSmallScreen ? 24 : 32}
                  color="#ff4444"
                />
              </View>
              <Text
                style={[
                  themeStyles.deleteModalTitle,
                  {
                    color: theme?.colors?.text || '#333333',
                    marginBottom: isTablet ? responsiveSpacing.sm : responsiveSpacing.xs
                  }
                ]}
              >
                Delete Element
              </Text>
              <TouchableOpacity
                style={[
                  themeStyles.closeModalButton,
                  { backgroundColor: theme?.colors?.border || '#e9ecef' }
                ]}
                onPress={() => setShowDeleteElementModal(false)}
                activeOpacity={0.7}
              >
                <Icon
                  name="close"
                  size={isTablet ? 24 : isLandscape ? 22 : isUltraSmallScreen ? 18 : 20}
                  color={theme?.colors?.textSecondary || '#666666'}
                />
              </TouchableOpacity>
            </View>

            <View style={[
              themeStyles.deleteModalContent,
              {
                marginBottom: isTablet ? responsiveSpacing.lg : responsiveSpacing.md,
                paddingHorizontal: isTablet ? responsiveSpacing.md : isUltraSmallScreen ? responsiveSpacing.xs : responsiveSpacing.sm
              }
            ]}>
              <Text style={[
                themeStyles.deleteModalMessage,
                {
                  color: theme?.colors?.text || '#333333',
                  fontSize: isTablet ? 16 : isLandscape ? 15 : isUltraSmallScreen ? 13 : 15,
                  lineHeight: isTablet ? 24 : isLandscape ? 22 : isUltraSmallScreen ? 18 : 22,
                }
              ]}>
                Are you sure you want to delete this element? This action cannot be undone.
              </Text>
            </View>

            <View style={[
              themeStyles.deleteModalButtons,
              {
                gap: isTablet ? responsiveSpacing.md : isLandscape ? responsiveSpacing.sm : isUltraSmallScreen ? responsiveSpacing.xs : responsiveSpacing.sm
              }
            ]}>
              <TouchableOpacity
                style={[
                  themeStyles.deleteModalCancelButton,
                  {
                    backgroundColor: theme?.colors?.border || '#e9ecef',
                    paddingVertical: isTablet ? 16 : isLandscape ? 14 : isUltraSmallScreen ? 12 : 14,
                    borderRadius: isTablet ? 12 : isLandscape ? 10 : isUltraSmallScreen ? 8 : 10,
                  }
                ]}
                onPress={() => setShowDeleteElementModal(false)}
              >
                <Text style={[
                  themeStyles.deleteModalCancelText,
                  {
                    color: theme?.colors?.text || '#333333',
                    fontSize: isTablet ? 17 : isLandscape ? 16 : isUltraSmallScreen ? 14 : 16,
                  }
                ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  themeStyles.deleteModalDeleteButton,
                  {
                    backgroundColor: '#ff4444',
                    paddingVertical: isTablet ? 16 : isLandscape ? 14 : isUltraSmallScreen ? 12 : 14,
                    borderRadius: isTablet ? 12 : isLandscape ? 10 : isUltraSmallScreen ? 8 : 10,
                  }
                ]}
                onPress={confirmDeleteElement}
              >
                <Text style={[
                  themeStyles.deleteModalDeleteText,
                  {
                    fontSize: isTablet ? 17 : isLandscape ? 16 : isUltraSmallScreen ? 14 : 16,
                  }
                ]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      {/* Video Processing Modal - Removed, using direct generation */}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(8),
    paddingBottom: moderateScale(4),
    borderBottomWidth: 0,
  },
  backButton: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#000000',
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isLandscape
      ? (isTablet ? 16 : 8)
      : (isUltraSmallScreen ? 4 : isSmallScreen ? 6 : isMediumScreen ? 8 : isLargeScreen ? 12 : 16),
  },
  headerTitle: {
    fontSize: getHeaderTitleSize(),
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: isLandscape
      ? (isTablet ? 2 : 1)
      : (isUltraSmallScreen ? 0 : isSmallScreen ? 1 : 2),
  },
  headerSubtitle: {
    fontSize: getHeaderSubtitleSize(),
    color: 'rgba(102, 102, 102, 0.8)',
    marginTop: isLandscape
      ? (isTablet ? 2 : 1)
      : (isUltraSmallScreen ? 0 : isSmallScreen ? 1 : 2),
    textAlign: 'center',
    lineHeight: isLandscape
      ? (isTablet ? 16 : 14)
      : (isUltraSmallScreen ? 12 : isSmallScreen ? 13 : isMediumScreen ? 14 : isLargeScreen ? 15 : 16),
    includeFontPadding: false,
  },
  nextButton: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#000000',
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(8),
    paddingBottom: moderateScale(6),
  },
  headerTextButton: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#000000',
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  languageDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  languageDropdownText: {
    color: '#000000',
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  languageDropdownMenuSmall: {
    alignSelf: 'center',
    marginHorizontal: moderateScale(8),
    marginBottom: moderateScale(6),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: moderateScale(4),
    paddingHorizontal: moderateScale(4),
    overflow: 'hidden',
  },
  languageDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
  },
  languageDropdownItemSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.35)',
  },
  languageDropdownItemText: {
    color: '#ffffff',
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  languageDropdownItemTextSelected: {
    fontWeight: '700',
  },
  canvasContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: isLandscape ? (isTablet ? responsiveSpacing.sm : responsiveSpacing.xs) : (isUltraSmallScreen ? 1 : isSmallScreen ? 2 : responsiveSpacing.xs),
    paddingBottom: isLandscape ? (isTablet ? responsiveSpacing.sm : responsiveSpacing.xs) : (isUltraSmallScreen ? 1 : isSmallScreen ? 2 : responsiveSpacing.xs),
    marginBottom: isTablet ? responsiveSpacing.md : isLandscape ? responsiveSpacing.sm : isUltraSmallScreen ? responsiveSpacing.sm : responsiveSpacing.md,
    maxHeight: isLandscape
      ? screenHeight * 0.65
      : isTablet
        ? screenHeight * 0.50
        : isUltraSmallScreen
          ? screenHeight * 0.42
          : isSmallScreen
            ? screenHeight * 0.44
            : screenHeight * 0.45,
  },
  canvas: {
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bottomToolbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: isTablet ? 16 : isLandscape ? 12 : isUltraSmallScreen ? 6 : isSmallScreen ? 8 : 12,
    paddingHorizontal: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
    paddingVertical: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 3 : isSmallScreen ? 4 : 6,
    marginTop: isTablet ? 40 : isLandscape ? 35 : isUltraSmallScreen ? 25 : isSmallScreen ? 30 : 35,
    marginBottom: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 5 : 10,
    marginHorizontal: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  toolbarScrollContent: {
    paddingHorizontal: isLandscape ? (isTablet ? responsiveSpacing.sm : responsiveSpacing.xs) : (isUltraSmallScreen ? responsiveSpacing.xs : responsiveSpacing.sm),
    alignItems: 'center',
  },
  toolbarButton: {
    marginHorizontal: isLandscape ? (isTablet ? 6 : 4) : (isUltraSmallScreen ? 2 : isSmallScreen ? 3 : isMediumScreen ? 4 : isLargeScreen ? 5 : 6),
    marginVertical: isLandscape ? (isTablet ? 2 : 1) : (isUltraSmallScreen ? 1 : isSmallScreen ? 2 : isMediumScreen ? 3 : isLargeScreen ? 4 : 5),
  },
  toolbarButtonGradient: {
    alignItems: 'center',
    paddingVertical: isLandscape ? (isTablet ? 12 : 10) : (isUltraSmallScreen ? 6 : isSmallScreen ? 8 : isMediumScreen ? 10 : isLargeScreen ? 12 : 14),
    paddingHorizontal: isLandscape ? (isTablet ? 16 : 12) : (isUltraSmallScreen ? 8 : isSmallScreen ? 10 : isMediumScreen ? 12 : isLargeScreen ? 14 : 16),
    borderRadius: isLandscape ? (isTablet ? 12 : 10) : (isUltraSmallScreen ? 6 : isSmallScreen ? 8 : isMediumScreen ? 10 : isLargeScreen ? 12 : 14),
    minWidth: isLandscape ? (isTablet ? 80 : 70) : (isUltraSmallScreen ? 55 : isSmallScreen ? 60 : isMediumScreen ? 65 : isLargeScreen ? 70 : 75),
    minHeight: isLandscape ? (isTablet ? 50 : 45) : (isUltraSmallScreen ? 36 : isSmallScreen ? 38 : isMediumScreen ? 42 : isLargeScreen ? 45 : 48),
  },
  toolbarButtonText: {
    fontSize: getToolbarButtonTextSize(),
    color: '#ffffff',
    marginTop: isLandscape ? (isTablet ? 2 : 1) : (isUltraSmallScreen ? 1 : isSmallScreen ? 2 : isMediumScreen ? 3 : isLargeScreen ? 4 : 5),
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -moderateScale(40),
    marginLeft: -moderateScale(40),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: moderateScale(40),
    padding: moderateScale(10),
    zIndex: 10,
    elevation: 10,
  },
  playButton: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Math.max(20, screenWidth * 0.05),
    paddingVertical: Math.max(15, screenHeight * 0.018),
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  processingContentOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  processingContentWrapper: {
    alignItems: 'center',
    paddingHorizontal: moderateScale(18),
  },
  processingHeadline: {
    fontSize: isTablet ? 20 : responsiveFontSize.lg,
    fontWeight: '700',
    color: '#f5f6ff',
    marginTop: moderateScale(12),
    marginBottom: moderateScale(4),
    letterSpacing: 0.3,
  },
  processingCaption: {
    fontSize: isTablet ? 15 : responsiveFontSize.md,
    color: 'rgba(245, 246, 255, 0.85)',
    textAlign: 'center',
    marginBottom: moderateScale(10),
    paddingHorizontal: moderateScale(22),
  },
  processingAnimationContainer: {
    width: moderateScale(isTablet ? 138 : 100),
    height: moderateScale(isTablet ? 138 : 100),
    marginBottom: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingRipple: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(isTablet ? 70 : 55),
    backgroundColor: 'rgba(102, 126, 234, 0.45)',
  },
  processingIndicator: {
    width: moderateScale(isTablet ? 86 : 68),
    height: moderateScale(isTablet ? 86 : 68),
    borderRadius: moderateScale(isTablet ? 43 : 34),
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(102, 126, 234, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    alignSelf: 'stretch',
    height: moderateScale(isTablet ? 8 : 5),
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: moderateScale(3),
    overflow: 'hidden',
    marginBottom: moderateScale(6),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
  progressValue: {
    fontSize: isTablet ? 16 : responsiveFontSize.sm,
    color: '#f5f6ff',
    fontWeight: '600',
    marginTop: moderateScale(4),
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
  fontModalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fontModalBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  fontModalWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: moderateScale(6),
  },
  fontModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(14),
    padding: moderateScale(12),
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  fontModalScrollView: {
    flex: 1,
    marginTop: moderateScale(3),
    minHeight: 0,
  },
  fontModalScrollContent: {
    paddingBottom: moderateScale(12),
    paddingHorizontal: moderateScale(2),
  },
  fontModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isLandscape
      ? (isTablet ? moderateScale(7) : moderateScale(6))
      : (isUltraSmallScreen ? moderateScale(5) : isSmallScreen ? moderateScale(5) : isTablet ? moderateScale(7) : moderateScale(6)),
    paddingBottom: isLandscape
      ? (isTablet ? moderateScale(6) : moderateScale(5))
      : (isUltraSmallScreen ? moderateScale(4) : isSmallScreen ? moderateScale(5) : isTablet ? moderateScale(6) : moderateScale(5)),
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  fontModalCloseButton: {
    padding: moderateScale(3),
    borderRadius: moderateScale(14),
    backgroundColor: '#f8f9fa',
    width: isLandscape
      ? (isTablet ? moderateScale(28) : moderateScale(26))
      : (isUltraSmallScreen ? moderateScale(24) : isSmallScreen ? moderateScale(26) : isTablet ? moderateScale(28) : moderateScale(26)),
    height: isLandscape
      ? (isTablet ? moderateScale(28) : moderateScale(26))
      : (isUltraSmallScreen ? moderateScale(24) : isSmallScreen ? moderateScale(26) : isTablet ? moderateScale(28) : moderateScale(26)),
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeControlsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: moderateScale(6),
    padding: isLandscape
      ? (isTablet ? moderateScale(10) : moderateScale(8))
      : (isUltraSmallScreen ? moderateScale(8) : isSmallScreen ? moderateScale(8) : isTablet ? moderateScale(10) : moderateScale(8)),
    marginBottom: moderateScale(8),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  fontSizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(6),
    gap: moderateScale(4),
  },
  fontSizeHeaderTextGroup: {
    flexDirection: 'column',
  },
  fontSizeLabel: {
    fontSize: isLandscape
      ? (isTablet ? moderateScale(12) : moderateScale(11))
      : (isUltraSmallScreen ? moderateScale(10) : isSmallScreen ? moderateScale(10.5) : isTablet ? moderateScale(12) : moderateScale(11)),
    fontWeight: '700',
    color: '#333333',
  },
  fontSizeHelperText: {
    fontSize: moderateScale(8.5),
    color: '#888888',
  },
  fontSizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: isUltraSmallScreen ? moderateScale(3) : moderateScale(4),
  },
  fontSizeButton: {
    paddingVertical: isLandscape
      ? (isTablet ? moderateScale(7) : moderateScale(6))
      : (isUltraSmallScreen ? moderateScale(5) : isSmallScreen ? moderateScale(5) : isTablet ? moderateScale(7) : moderateScale(6)),
    paddingHorizontal: isLandscape
      ? (isTablet ? moderateScale(10) : moderateScale(8))
      : (isUltraSmallScreen ? moderateScale(6) : isSmallScreen ? moderateScale(7) : isTablet ? moderateScale(10) : moderateScale(8)),
    borderRadius: moderateScale(5),
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: isUltraSmallScreen ? moderateScale(34) : isSmallScreen ? moderateScale(36) : moderateScale(38),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fontSizeButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  fontSizeButtonText: {
    fontSize: isLandscape
      ? (isTablet ? moderateScale(11) : moderateScale(10))
      : (isUltraSmallScreen ? moderateScale(9) : isSmallScreen ? moderateScale(9.5) : isTablet ? moderateScale(11) : moderateScale(10)),
    fontWeight: '600',
    color: '#666666',
  },
  fontSizeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textColorControlsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: moderateScale(6),
    padding: isLandscape
      ? (isTablet ? moderateScale(10) : moderateScale(8))
      : (isUltraSmallScreen ? moderateScale(8) : isSmallScreen ? moderateScale(8) : isTablet ? moderateScale(10) : moderateScale(8)),
    marginBottom: moderateScale(8),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textColorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(6),
    gap: moderateScale(4),
  },
  textColorHeaderTextGroup: {
    flexDirection: 'column',
  },
  textColorLabel: {
    fontSize: isLandscape
      ? (isTablet ? moderateScale(12) : moderateScale(11))
      : (isUltraSmallScreen ? moderateScale(10) : isSmallScreen ? moderateScale(10.5) : isTablet ? moderateScale(12) : moderateScale(11)),
    fontWeight: '700',
    color: '#333333',
  },
  textColorHelperText: {
    fontSize: moderateScale(8.5),
    color: '#888888',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: isUltraSmallScreen ? moderateScale(3) : moderateScale(4),
  },
  colorSwatch: {
    width: isUltraSmallScreen ? moderateScale(28) : isSmallScreen ? moderateScale(30) : moderateScale(32),
    height: isUltraSmallScreen ? moderateScale(28) : isSmallScreen ? moderateScale(30) : moderateScale(32),
    borderRadius: moderateScale(16),
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  whiteSwatchBorder: {
    borderColor: '#cccccc',
  },
  fontFamilySection: {
    marginBottom: moderateScale(5),
  },
  fontFamilySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(3),
    paddingBottom: moderateScale(5),
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  fontFamilySectionTitle: {
    fontSize: isLandscape
      ? (isTablet ? moderateScale(11) : moderateScale(10))
      : (isUltraSmallScreen ? moderateScale(9.5) : isSmallScreen ? moderateScale(10) : isTablet ? moderateScale(11) : moderateScale(10.5)),
    fontWeight: '700',
    color: '#333333',
  },
  fontCategorySection: {
    marginBottom: isLandscape
      ? (isTablet ? moderateScale(10) : moderateScale(8))
      : (isUltraSmallScreen ? moderateScale(6) : isSmallScreen ? moderateScale(7) : isTablet ? moderateScale(10) : moderateScale(8)),
  },
  fontCategoryTitle: {
    fontSize: isLandscape
      ? (isTablet ? moderateScale(10) : moderateScale(9))
      : (isUltraSmallScreen ? moderateScale(8.5) : isSmallScreen ? moderateScale(9) : isTablet ? moderateScale(10) : moderateScale(9.5)),
    fontWeight: '600',
    color: '#667eea',
    marginBottom: moderateScale(5),
    marginLeft: moderateScale(2),
  },
  fontCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isUltraSmallScreen ? moderateScale(2.5) : moderateScale(3),
  },
  fontOptionButton: {
    width: (() => {
      const modalWidth = isLandscape
        ? (isTablet ? screenWidth * 0.65 : screenWidth * 0.75)
        : (isUltraSmallScreen ? screenWidth * 0.95 : isSmallScreen ? screenWidth * 0.92 : isMediumScreen ? screenWidth * 0.88 : isLargeScreen ? screenWidth * 0.85 : isTablet ? screenWidth * 0.8 : screenWidth * 0.85);
      const padding = isLandscape
        ? (isTablet ? 18 : 14)
        : (isUltraSmallScreen ? 10 : isSmallScreen ? 12 : isMediumScreen ? 14 : isLargeScreen ? 16 : isTablet ? 18 : 16);
      const gapSize = isUltraSmallScreen ? moderateScale(2.5) : moderateScale(3);
      const scrollPadding = moderateScale(2) * 2;
      const availableWidth = modalWidth - (padding * 2) - scrollPadding;
      const columns = isLandscape ? (isTablet ? 4 : 3) : (isUltraSmallScreen ? 2 : isTablet ? 4 : 3);
      return (availableWidth - (gapSize * (columns - 1))) / columns;
    })(),
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(4),
    padding: isLandscape
      ? (isTablet ? moderateScale(6) : moderateScale(5))
      : (isUltraSmallScreen ? moderateScale(4) : isSmallScreen ? moderateScale(4) : isTablet ? moderateScale(6) : moderateScale(5)),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fontPreviewText: {
    fontSize: isLandscape
      ? (isTablet ? moderateScale(16) : moderateScale(14))
      : (isUltraSmallScreen ? moderateScale(13) : isSmallScreen ? moderateScale(14) : isTablet ? moderateScale(18) : moderateScale(15)),
    fontWeight: '400',
    color: '#333333',
    marginBottom: moderateScale(1.5),
  },
  fontOptionName: {
    fontSize: isLandscape
      ? (isTablet ? moderateScale(7) : moderateScale(6.5))
      : (isUltraSmallScreen ? moderateScale(6) : isSmallScreen ? moderateScale(6.5) : isTablet ? moderateScale(7.5) : moderateScale(7)),
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
    lineHeight: isLandscape
      ? (isTablet ? moderateScale(9) : moderateScale(8))
      : (isUltraSmallScreen ? moderateScale(8) : isSmallScreen ? moderateScale(8) : isTablet ? moderateScale(9.5) : moderateScale(9)),
  },
  // Controls Container
  controlsContainer: {
    flex: 0,
    paddingTop: 0,
  },
  controlsContent: {
    paddingHorizontal: isLandscape ? (isTablet ? responsiveSpacing.sm : responsiveSpacing.xs) : (isUltraSmallScreen ? responsiveSpacing.xs : responsiveSpacing.sm),
  },
  // Field Toggle Section
  fieldToggleSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: isTablet ? 16 : isLandscape ? 12 : isUltraSmallScreen ? 6 : isSmallScreen ? 8 : 12,
    paddingHorizontal: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
    paddingVertical: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 3 : isSmallScreen ? 4 : 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 5 : 10,
    marginHorizontal: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
  },
  fieldToggleHeader: {
    alignItems: 'center',
    marginBottom: isLandscape ? (isTablet ? responsiveSpacing.xs : 0) : (isUltraSmallScreen ? 0 : isSmallScreen ? 0 : 1),
  },
  fieldToggleTitle: {
    fontSize: isLandscape ? (isTablet ? responsiveFontSize.lg : responsiveFontSize.md) : (isUltraSmallScreen ? responsiveFontSize.sm : isSmallScreen ? responsiveFontSize.md : responsiveFontSize.lg),
    fontWeight: '700',
    color: '#333333',
    marginBottom: 0,
    lineHeight: isUltraSmallScreen ? 10 : isSmallScreen ? 11 : 14,
  },
  fieldToggleSubtitle: {
    fontSize: isLandscape ? (isTablet ? responsiveFontSize.sm : responsiveFontSize.xs) : (isUltraSmallScreen ? responsiveFontSize.xs : isSmallScreen ? responsiveFontSize.sm : responsiveFontSize.md),
    color: '#666666',
    marginTop: isLandscape ? (isTablet ? responsiveSpacing.xs : 0) : (isUltraSmallScreen ? 0 : isSmallScreen ? 0 : 1),
  },
  fieldToggleContent: {
    height: isTablet ? 60 : isLandscape ? 55 : isUltraSmallScreen ? 45 : isSmallScreen ? 50 : 55,
  },
  fieldToggleScrollContent: {
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  fieldToggleButton: {
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 6 : 10,
    paddingHorizontal: isSmallScreen ? 8 : 14,
    borderRadius: isSmallScreen ? 8 : 16,
    backgroundColor: '#e9ecef',
    marginHorizontal: isSmallScreen ? 2 : 4,
    flexDirection: 'row',
    minWidth: isSmallScreen ? 60 : 85,
    justifyContent: 'center',
  },
  fieldToggleButtonActive: {
    backgroundColor: '#667eea',
  },
  fieldToggleButtonText: {
    fontSize: isSmallScreen ? 9 : 12,
    color: '#666666',
    marginLeft: isSmallScreen ? 3 : 6,
    fontWeight: '500',
  },
  fieldToggleButtonTextActive: {
    color: '#ffffff',
  },
  // Templates Section
  templatesSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: isTablet ? 16 : isLandscape ? 12 : isUltraSmallScreen ? 6 : isSmallScreen ? 8 : 12,
    paddingHorizontal: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
    paddingVertical: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 3 : isSmallScreen ? 4 : 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 5 : 10,
    marginHorizontal: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
  },
  templatesHeader: {
    alignItems: 'center',
    marginBottom: isUltraSmallScreen ? 0 : isSmallScreen ? 0 : 1,
  },
  templatesTitle: {
    fontSize: isSmallScreen ? 11 : 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 0,
    lineHeight: isUltraSmallScreen ? 12 : isSmallScreen ? 13 : 16,
  },
  templatesSubtitle: {
    fontSize: isSmallScreen ? 8 : 10,
    color: '#666666',
    marginTop: 1,
  },
  templatesContent: {
    height: isTablet ? 70 : isLandscape ? 65 : isUltraSmallScreen ? 55 : isSmallScreen ? 60 : 65,
  },
  templatesScrollContent: {
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  templateButton: {
    alignItems: 'center',
    marginHorizontal: isUltraSmallScreen ? 2 : isSmallScreen ? 4 : 8,
    minWidth: isUltraSmallScreen ? 50 : isSmallScreen ? 55 : 80,
  },
  templateButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 12,
    padding: isUltraSmallScreen ? 2 : isSmallScreen ? 4 : 8,
  },
  templatePreview: {
    width: isUltraSmallScreen ? 36 : getResponsiveButtonSize(),
    height: isUltraSmallScreen ? 36 : getResponsiveButtonSize(),
    borderRadius: isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isUltraSmallScreen ? 2 : isSmallScreen ? 4 : 8,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'hidden',
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
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  templateText: {
    fontSize: isUltraSmallScreen ? 7 : isSmallScreen ? 8 : 10,
    color: '#666666',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: isUltraSmallScreen ? 8 : isSmallScreen ? 9 : 12,
  },
  templateTextActive: {
    color: '#667eea',
    fontWeight: '700',
  },

  frameIntegrated: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 2, // Above video backdrop, below layers
  },

  // Frames Section Styles
  framesSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: isTablet ? 16 : isLandscape ? 12 : isUltraSmallScreen ? 6 : isSmallScreen ? 8 : 12,
    paddingHorizontal: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
    paddingVertical: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 3 : isSmallScreen ? 4 : 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 5 : 10,
    marginHorizontal: isTablet ? 12 : isLandscape ? 8 : isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 8,
  },
  framesHeader: {
    alignItems: 'center',
    marginBottom: isUltraSmallScreen ? 0 : isSmallScreen ? 0 : 1,
  },
  framesTitle: {
    fontSize: isSmallScreen ? 11 : 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 0,
    lineHeight: isUltraSmallScreen ? 12 : isSmallScreen ? 13 : 16,
  },
  framesSubtitle: {
    fontSize: isSmallScreen ? 8 : 10,
    color: '#666666',
    marginTop: 1,
  },
  framesContent: {
    height: isTablet ? 70 : isLandscape ? 65 : isUltraSmallScreen ? 55 : isSmallScreen ? 60 : 65,
  },
  framesScrollContent: {
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  frameButton: {
    alignItems: 'center',
    marginHorizontal: isSmallScreen ? 4 : 8,
    minWidth: isSmallScreen ? 55 : 80,
  },
  frameButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: isSmallScreen ? 6 : 12,
    padding: isSmallScreen ? 4 : 8,
  },
  framePreview: {
    width: (() => {
      const isLandscape = screenWidth > screenHeight;
      const isTablet = Math.min(screenWidth, screenHeight) >= 768;
      if (isLandscape) {
        return Math.max(49, (isTablet ? 80 : 70) * 0.7);
      }
      return Math.max(42, (screenWidth < 360 ? 60 : screenWidth >= 360 && screenWidth < 375 ? 65 : screenWidth >= 375 && screenWidth < 414 ? 70 : screenWidth >= 414 && screenWidth < 480 ? 75 : 80) * 0.7);
    })(),
    height: (() => {
      const isLandscape = screenWidth > screenHeight;
      const isTablet = Math.min(screenWidth, screenHeight) >= 768;
      if (isLandscape) {
        return Math.max(49, (isTablet ? 80 : 70) * 0.7);
      }
      return Math.max(42, (screenWidth < 360 ? 60 : screenWidth >= 360 && screenWidth < 375 ? 65 : screenWidth >= 375 && screenWidth < 414 ? 70 : screenWidth >= 414 && screenWidth < 480 ? 75 : 80) * 0.7);
    })(),
    borderRadius: isSmallScreen ? 6 : 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 4 : 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  framePreviewInner: {
    width: 50,
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  frameText: {
    fontSize: isUltraSmallScreen ? 7 : isSmallScreen ? 8 : 10,
    color: '#666666',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: isUltraSmallScreen ? 8 : isSmallScreen ? 9 : 12,
  },

  // Header Button Styles
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Math.max(8, screenWidth * 0.02),
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Processing Options Modal Styles
  processingOptionsContainer: {
    padding: 20,
  },
  processingOptionsSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  processingOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  processingOptionText: {
    marginLeft: 15,
    flex: 1,
  },
  processingOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },
  processingOptionDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },

  // Template Preview Styles
  businessTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  businessTemplateStyle: {
    backgroundColor: 'rgba(102, 126, 234, 0.8)',
  },
  eventTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  eventTemplateStyle: {
    backgroundColor: 'rgba(249, 115, 22, 0.8)',
  },
  restaurantTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  restaurantTemplateStyle: {
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
  },
  fashionTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  fashionTemplateStyle: {
    backgroundColor: 'rgba(236, 72, 153, 0.8)',
  },
  realEstateTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  realEstateTemplateStyle: {
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
  },
  educationTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  educationTemplateStyle: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
  },
  healthcareTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  healthcareTemplateStyle: {
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
  },
  fitnessTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  fitnessTemplateStyle: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  weddingTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  weddingTemplateStyle: {
    backgroundColor: 'rgba(251, 191, 36, 0.8)',
  },
  birthdayTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  birthdayTemplateStyle: {
    backgroundColor: 'rgba(244, 114, 182, 0.8)',
  },
  corporateTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  corporateTemplateStyle: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
  },
  creativeTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  creativeTemplateStyle: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  luxuryTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  luxuryTemplateStyle: {
    backgroundColor: 'rgba(212, 175, 55, 0.8)',
  },
  vintageTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  vintageTemplateStyle: {
    backgroundColor: 'rgba(120, 113, 108, 0.8)',
  },
  retroTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  retroTemplateStyle: {
    backgroundColor: 'rgba(251, 146, 60, 0.8)',
  },
  techTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  techTemplateStyle: {
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
  },
  oceanTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  oceanTemplateStyle: {
    backgroundColor: 'rgba(6, 182, 212, 0.8)',
  },
  sunsetTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  sunsetTemplateStyle: {
    backgroundColor: 'rgba(245, 158, 11, 0.8)',
  },
  artisticTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  artisticTemplateStyle: {
    backgroundColor: 'rgba(168, 85, 247, 0.8)',
  },
  ombreSunsetTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombreOceanTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombrePurpleTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombreForestTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombreFireTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombreNightTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombreTropicalTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombreAutumnTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombreRoseTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ombreGalaxyTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  minimalTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  minimalTemplateStyle: {
    backgroundColor: 'rgba(204, 204, 204, 0.8)',
  },
  elegantTemplatePreview: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  elegantTemplateStyle: {
    backgroundColor: 'rgba(212, 175, 55, 0.8)',
  },
});

export default VideoEditorScreen;

