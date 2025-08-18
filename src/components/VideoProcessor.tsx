import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import videoProcessingService, { VideoLayer, VideoProcessingOptions } from '../services/videoProcessingService';
import ViewShot from 'react-native-view-shot';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoProcessorProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (processedVideoPath: string) => void;
  layers: VideoLayer[];
  selectedVideoUri: string;
  selectedLanguage: string;
  selectedTemplateId: string;
  selectedProfile: any;
  videoCanvasWidth: number;
  videoCanvasHeight: number;
  isSubscribed: boolean;
  overlayImageUri?: string; // transparent PNG captured from editor
}

const VideoProcessor: React.FC<VideoProcessorProps> = ({
  visible,
  onClose,
  onComplete,
  layers,
  selectedVideoUri,
  selectedLanguage,
  selectedTemplateId,
  selectedProfile,
  videoCanvasWidth,
  videoCanvasHeight,
  isSubscribed,
  overlayImageUri
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<ViewShot>(null);

  const processVideo = useCallback(async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setProgress(0);
      setCurrentStep('Initializing...');

      // Step 1: Request permissions
      setCurrentStep('Checking permissions...');
      const hasPermission = await videoProcessingService.requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is required to process videos.');
        setIsProcessing(false);
        return;
      }
      setProgress(10);

      // Step 2: Use provided overlayImageUri if available, else attempt local capture
      let canvasImageUri = null as string | null;
      if (overlayImageUri) {
        canvasImageUri = overlayImageUri;
        console.log('Using provided overlays PNG:', overlayImageUri);
      } else if (!selectedVideoUri.startsWith('http')) {
        setCurrentStep('Capturing video canvas...');
        if (canvasRef.current && canvasRef.current.capture) {
          try {
            canvasImageUri = await canvasRef.current.capture();
            console.log('Canvas captured successfully:', canvasImageUri);
          } catch (captureError) {
            console.error('Failed to capture canvas:', captureError);
            Alert.alert('Capture Error', 'Failed to capture video canvas. Processing will continue without canvas overlay.');
          }
        }
      } else {
        setCurrentStep('Processing remote video...');
        console.log('Skipping canvas capture for remote video');
      }
      setProgress(20);

      // Step 3: Process video with overlays for download
      setCurrentStep('Processing video with embedded overlays...');
      
      // Set up progress tracking
      let currentProgress = 20;
      const progressInterval = setInterval(() => {
        currentProgress += 1;
        if (currentProgress < 80) {
          setProgress(currentProgress);
        }
      }, 50);

      // Use the new processVideoForDownload method for better embedding
      const processedVideoPath = await videoProcessingService.processVideoForDownload(
        selectedVideoUri,
        layers,
        {
          addWatermark: !isSubscribed,
          canvasImage: canvasImageUri || undefined,
          quality: 'high',
          outputFormat: 'mp4',
          embedOverlays: true // Ensure overlays are embedded for download
        }
      );

      clearInterval(progressInterval);
      setProgress(90);

      // Step 4: Finalize
      setCurrentStep('Finalizing...');
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(100);

      // Complete
      setCurrentStep('Complete!');
      setTimeout(() => {
        onComplete(processedVideoPath);
        setIsProcessing(false);
        setProgress(0);
        setCurrentStep('');
      }, 1000);

    } catch (error) {
      console.error('Video processing failed:', error);
      Alert.alert('Processing Error', 'Failed to process video. Please try again.');
      setIsProcessing(false);
      setProgress(0);
      setCurrentStep('');
    }
  }, [selectedVideoUri, layers, isSubscribed, isProcessing, onComplete, overlayImageUri]);

  // Start processing when modal becomes visible
  React.useEffect(() => {
    if (visible && !isProcessing) {
      processVideo();
    }
  }, [visible, isProcessing, processVideo]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.gradientBackground}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Video Processing</Text>
              <Text style={styles.subtitle}>Creating your video with embedded overlays</Text>
            </View>

            {/* Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${progress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
              
              <Text style={styles.stepText}>{currentStep}</Text>
              
              {isProcessing && (
                <ActivityIndicator 
                  size="large" 
                  color="#ffffff" 
                  style={styles.spinner}
                />
              )}
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Icon name="video-library" size={20} color="#ffffff" />
                <Text style={styles.infoText}>Processing {layers.length} overlays</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="high-quality" size={20} color="#ffffff" />
                <Text style={styles.infoText}>High quality output</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="download" size={20} color="#ffffff" />
                <Text style={styles.infoText}>Embedding overlays for download</Text>
              </View>
              
              {!isSubscribed && (
                <View style={styles.infoItem}>
                  <Icon name="copyright" size={20} color="#ffffff" />
                  <Text style={styles.infoText}>Adding watermark</Text>
                </View>
              )}
            </View>

            {/* Cancel Button */}
            {isProcessing && (
              <View style={styles.buttonContainer}>
                <Text style={styles.cancelText}>
                  Please wait while we process your video...
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  gradientBackground: {
    padding: 30,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 15,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  stepText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 15,
  },
  spinner: {
    marginTop: 10,
  },
  infoSection: {
    width: '100%',
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 10,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VideoProcessor;
