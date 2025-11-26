import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import EnhancedVideoProcessingService, {
  VideoCanvas,
  VideoProcessingOptions,
  ProcessingProgress,
} from '../services/enhancedVideoProcessingService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoProcessingModalProps {
  visible: boolean;
  onClose: () => void;
  canvas: VideoCanvas;
  onVideoGenerated: (videoPath: string) => void;
}

const VideoProcessingModal: React.FC<VideoProcessingModalProps> = ({
  visible,
  onClose,
  canvas,
  onVideoGenerated,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    progress: 0,
    currentStep: '',
    estimatedTimeRemaining: 0,
    isComplete: false,
  });
  const [processingOptions, setProcessingOptions] = useState<VideoProcessingOptions>({
    outputFormat: 'mp4',
    quality: 'high',
    resolution: '1080p',
    bitrate: 2000,
    audioBitrate: 128,
  });

  const videoService = EnhancedVideoProcessingService.getInstance();

  const handleStartProcessing = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setProgress({
      progress: 0,
      currentStep: 'Starting...',
      estimatedTimeRemaining: 0,
      isComplete: false,
    });

    try {
      console.log('🎬 Starting video processing for canvas:', canvas.name);
      
      const outputPath = await videoService.processVideoCanvas(
        canvas,
        processingOptions,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      console.log('✅ Video processing completed:', outputPath);
      
      Alert.alert(
        'Success!',
        'Your video has been generated successfully!',
        [
          {
            text: 'View Video',
            onPress: () => {
              onVideoGenerated(outputPath);
              onClose();
            },
          },
          {
            text: 'OK',
            onPress: onClose,
          },
        ]
      );

    } catch (error) {
      console.error('❌ Video processing failed:', error);
      Alert.alert(
        'Processing Failed',
        `Failed to generate video: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, canvas, processingOptions, videoService, onVideoGenerated, onClose]);

  const handleCancelProcessing = useCallback(async () => {
    try {
      await videoService.cancelProcessing();
      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error('❌ Error cancelling processing:', error);
    }
  }, [videoService, onClose]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Generate Video</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.content}>
            {/* Canvas Info */}
            <View style={styles.canvasInfo}>
              <Text style={styles.canvasName}>{canvas.name}</Text>
              <Text style={styles.canvasDetails}>
                {canvas.layers.length} layers • {canvas.duration}s • {canvas.width}x{canvas.height}
              </Text>
            </View>

            {/* Processing Options */}
            {!isProcessing && (
              <View style={styles.optionsContainer}>
                <Text style={styles.optionsTitle}>Processing Options</Text>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Quality:</Text>
                  <View style={styles.optionButtons}>
                    {['low', 'medium', 'high', 'ultra'].map((quality) => (
                      <TouchableOpacity
                        key={quality}
                        style={[
                          styles.optionButton,
                          processingOptions.quality === quality && styles.optionButtonActive,
                        ]}
                        onPress={() => setProcessingOptions(prev => ({ ...prev, quality: quality as any }))}
                      >
                        <Text style={[
                          styles.optionButtonText,
                          processingOptions.quality === quality && styles.optionButtonTextActive,
                        ]}>
                          {quality.charAt(0).toUpperCase() + quality.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Resolution:</Text>
                  <View style={styles.optionButtons}>
                    {['720p', '1080p', '4k'].map((resolution) => (
                      <TouchableOpacity
                        key={resolution}
                        style={[
                          styles.optionButton,
                          processingOptions.resolution === resolution && styles.optionButtonActive,
                        ]}
                        onPress={() => setProcessingOptions(prev => ({ ...prev, resolution: resolution as any }))}
                      >
                        <Text style={[
                          styles.optionButtonText,
                          processingOptions.resolution === resolution && styles.optionButtonTextActive,
                        ]}>
                          {resolution}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Format:</Text>
                  <View style={styles.optionButtons}>
                    {['mp4', 'mov', 'avi'].map((format) => (
                      <TouchableOpacity
                        key={format}
                        style={[
                          styles.optionButton,
                          processingOptions.outputFormat === format && styles.optionButtonActive,
                        ]}
                        onPress={() => setProcessingOptions(prev => ({ ...prev, outputFormat: format as any }))}
                      >
                        <Text style={[
                          styles.optionButtonText,
                          processingOptions.outputFormat === format && styles.optionButtonTextActive,
                        ]}>
                          {format.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressTitle}>Processing Video...</Text>
                
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress.progress}%` }]} />
                </View>
                
                <Text style={styles.progressText}>
                  {progress.progress.toFixed(1)}% Complete
                </Text>
                
                <Text style={styles.progressStep}>
                  {progress.currentStep}
                </Text>
                
                {progress.estimatedTimeRemaining > 0 && (
                  <Text style={styles.progressTime}>
                    Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
                  </Text>
                )}

                <ActivityIndicator size="large" color="#667eea" style={styles.loader} />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {!isProcessing ? (
                <>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleStartProcessing}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.generateButtonGradient}
                    >
                      <Icon name="play-arrow" size={20} color="#ffffff" />
                      <Text style={styles.generateButtonText}>Generate Video</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelProcessing}
                >
                  <Text style={styles.cancelButtonText}>Cancel Processing</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  canvasInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  canvasName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  canvasDetails: {
    fontSize: 14,
    color: '#666666',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  optionLabel: {
    fontSize: 14,
    color: '#666666',
    width: 80,
  },
  optionButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#ffffff',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  progressStep: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 5,
  },
  progressTime: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 15,
  },
  loader: {
    marginTop: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  generateButton: {
    flex: 2,
    borderRadius: 25,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  generateButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default VideoProcessingModal;
