import React, { useState, useRef } from 'react';
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
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/AppNavigator';
import { useSubscription } from '../contexts/SubscriptionContext';
import Watermark from '../components/Watermark';
import videoProcessingService from '../services/videoProcessingService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    };
  };
}

const VideoPreviewScreen: React.FC<VideoPreviewScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { selectedVideo, selectedLanguage, selectedTemplateId, layers, selectedProfile, processedVideoPath } = route.params;
  const { isSubscribed } = useSubscription();

  // Video state
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [actionType, setActionType] = useState<'share' | 'download' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const videoRef = useRef<any>(null);

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

  // Navigation
  const handleBackToEditor = () => {
    navigation.goBack();
  };

  // Share functionality
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this amazing video: ${selectedVideo.title || 'Event Video'}`,
        url: selectedVideo.uri, // Note: This might not work on all platforms
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
      console.error('Error sharing video:', error);
      Alert.alert('Error', 'Failed to share video. Please try again.');
    }
  };

  // Download functionality using video processing service
  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Use the processed video path if available, otherwise use original
      const videoPath = processedVideoPath || selectedVideo.uri;

      // Request storage permission
      const hasPermission = await videoProcessingService.requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is required to save videos.');
        setIsDownloading(false);
        return;
      }

      // Save video to gallery
      const success = await videoProcessingService.saveToGallery(videoPath);

      if (success) {
        Alert.alert(
          'Success',
          'Video has been saved to your gallery successfully!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to save video to gallery. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      Alert.alert('Error', 'Failed to download video. Please try again.');
    } finally {
      setIsDownloading(false);
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

  // Render video layers
  const renderLayer = (layer: any) => {
    return (
      <View
        key={layer.id}
        style={[
          styles.layer,
          {
            position: 'absolute',
            left: layer.position.x,
            top: layer.position.y,
            width: layer.size.width,
            height: layer.size.height,
            zIndex: layer.zIndex,
            transform: [{ rotate: `${layer.rotation}deg` }],
          },
        ]}
      >
        {layer.type === 'text' && (
          <Text style={[styles.layerText, layer.style]}>
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
      </View>
    );
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: '#000000' }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar 
        barStyle="light-content"
        backgroundColor="transparent" 
        translucent 
      />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientBackground}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToEditor}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Video Preview</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
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
          <Watermark isSubscribed={isSubscribed} />
          
          {/* Play/Pause Overlay */}
          <TouchableOpacity 
            style={styles.playOverlay} 
            onPress={toggleVideoPlayback}
            activeOpacity={0.8}
          >
            <View style={styles.playButton}>
              <Icon 
                name={isVideoPlaying ? 'pause' : 'play-arrow'} 
                size={48} 
                color="#ffffff" 
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>
            {selectedVideo.title || 'Event Video'}
          </Text>
          <Text style={styles.videoDescription}>
            {selectedVideo.description || 'Custom video with overlays'}
          </Text>
          <Text style={styles.videoStats}>
            Duration: {Math.floor(videoDuration)}s | Language: {selectedLanguage}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleActionPress('share')}
            disabled={isDownloading}
          >
            <Icon name="share" size={24} color="#ffffff" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, isDownloading && styles.actionButtonDisabled]} 
            onPress={() => handleActionPress('download')}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <View style={styles.downloadingContainer}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.downloadingText}>Saving...</Text>
              </View>
            ) : (
              <>
                <Icon name="download" size={24} color="#ffffff" />
                <Text style={styles.actionButtonText}>Download</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Edit Button */}
        <TouchableOpacity 
          style={[
            styles.editButton,
            {
              marginBottom: Math.max(insets.bottom + 20, 40),
              paddingVertical: Math.max(12, screenHeight * 0.015),
              paddingHorizontal: Math.max(20, screenWidth * 0.05),
            }
          ]} 
          onPress={handleBackToEditor}
        >
          <Icon name="edit" size={20} color="#667eea" />
          <Text style={[
            styles.editButtonText,
            { fontSize: Math.max(14, Math.min(18, screenWidth * 0.04)) }
          ]}>Back to Editor</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmationModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelAction}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'share' ? 'Share Video' : 'Download Video'}
            </Text>
            <Text style={styles.modalMessage}>
              {actionType === 'share' 
                ? 'Share this video with your friends and followers?' 
                : 'Download this video to your device gallery?'
              }
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
                  {actionType === 'share' ? 'Share' : 'Download'}
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
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
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
  headerSpacer: {
    width: 44,
  },
  videoContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  layer: {
    position: 'absolute',
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
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    padding: 20,
  },
  videoInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  videoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  videoDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  videoStats: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 120,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  downloadingContainer: {
    alignItems: 'center',
  },
  downloadingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minHeight: 48,
  },
  editButtonText: {
    color: '#667eea',
    fontSize: Math.max(14, Math.min(18, screenWidth * 0.04)),
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333333',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666666',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
    minWidth: 100,
  },
  modalButtonPrimary: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  modalButtonText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default VideoPreviewScreen;
