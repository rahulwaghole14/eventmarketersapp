import { Platform, PermissionsAndroid, Alert } from 'react-native';
import RNFS from 'react-native-fs';

export interface VideoLayer {
  id: string;
  type: 'text' | 'image' | 'logo';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: any;
  // Optional field mapping used for visibility toggles and frame-generated content
  fieldType?: string;
}

export interface VideoProcessingOptions {
  addWatermark?: boolean;
  compress?: boolean;
  trim?: { start: number; end: number };
  addAudio?: string;
  canvasImage?: string;
}

class VideoProcessingService {
  /**
   * Request storage permissions for Android
   */
  async requestStoragePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to storage to save videos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Storage permission request failed:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }

  /**
   * Get the output directory for processed videos
   */
  getOutputDirectory(): string {
    if (Platform.OS === 'android') {
      return `${RNFS.ExternalDirectoryPath}/EventMarketers/Videos`;
    } else {
      return `${RNFS.DocumentDirectoryPath}/EventMarketers/Videos`;
    }
  }

  /**
   * Ensure the output directory exists
   */
  async ensureOutputDirectory(): Promise<void> {
    const outputDir = this.getOutputDirectory();
    const exists = await RNFS.exists(outputDir);
    if (!exists) {
      await RNFS.mkdir(outputDir);
    }
  }

  /**
   * Generate a unique filename for the output video
   */
  generateOutputFilename(): string {
    const timestamp = new Date().getTime();
    return `processed_video_${timestamp}.mp4`;
  }

  /**
   * Process video with overlays (enhanced version with canvas capture)
   */
  async processVideoWithOverlays(
    videoUri: string,
    layers: VideoLayer[],
    options: VideoProcessingOptions = {}
  ): Promise<string> {
    try {
      console.log('Starting video processing with overlays...');
      console.log('Video URI:', videoUri);
      console.log('Layers:', layers);
      console.log('Options:', options);

      // Ensure output directory exists
      await this.ensureOutputDirectory();

      // Generate output filename
      const outputFilename = this.generateOutputFilename();
      const outputPath = `${this.getOutputDirectory()}/${outputFilename}`;

      // If canvas image is provided, use it for overlay processing
      if (options.canvasImage) {
        console.log('Canvas image provided for overlay processing');
        console.log('Canvas image path:', options.canvasImage);
        
        // In a full implementation, you would:
        // 1. Use the canvas image as an overlay on the video
        // 2. Apply the overlay using a video processing library
        // 3. Add watermark if required
        // 4. Compress and optimize the final video
        
        // For now, we'll simulate the processing
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
        
        try {
          // For now, return the original video URI so layers can be rendered
          // In a full implementation, you would process the video with the canvas overlay
          console.log('Canvas overlay processing not implemented yet, returning original URI for layer rendering');
          return videoUri;
        } catch (copyError) {
          console.log('Could not process video with overlay, returning original URI');
          return videoUri;
        }
      } else {
        // No canvas image provided, use layer-based processing
        console.log('Processing video with layer-based overlays');
        
        // Prepare overlays for processing
        const preparedOverlays = this.prepareOverlays(layers);
        console.log('Prepared overlays:', preparedOverlays);
        
        // In a full implementation, you would:
        // 1. Convert layers to video overlays
        // 2. Apply overlays to the video
        // 3. Add watermark if required
        // 4. Compress and optimize the final video
        
        // For now, return the original video URI so layers can be rendered
        // In a full implementation, you would process the video with layer overlays
        console.log('Layer overlay processing not implemented yet, returning original URI for layer rendering');
        return videoUri;
      }
    } catch (error) {
      console.error('Video processing failed:', error);
      throw new Error('Video processing failed: ' + (error as Error).message);
    }
  }

  /**
   * Prepare overlays for processing (placeholder)
   */
  private prepareOverlays(layers: VideoLayer[]): any[] {
    return layers.map(layer => ({
      type: layer.type,
      content: layer.content,
      position: layer.position,
      size: layer.size,
      style: layer.style
    }));
  }

  /**
   * Prepare watermark for processing (placeholder)
   */
  private prepareWatermark(): any {
    return {
      text: 'Made with EventMarketers',
      position: { x: 0.8, y: 0.9 }, // Bottom right corner
      style: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)'
      }
    };
  }

  /**
   * Get video information (placeholder)
   */
  async getVideoInfo(videoUri: string): Promise<any> {
    try {
      const stats = await RNFS.stat(videoUri);
      return {
        duration: 0, // Would be extracted from video metadata
        size: stats.size,
        path: videoUri,
        width: 1920, // Placeholder
        height: 1080 // Placeholder
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      throw error;
    }
  }

  /**
   * Compress video (placeholder)
   */
  async compressVideo(videoUri: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    console.log(`Compressing video with ${quality} quality (placeholder)`);
    // In a real implementation, this would use a video compression library
    return videoUri;
  }

  /**
   * Trim video (placeholder)
   */
  async trimVideo(videoUri: string, start: number, end: number): Promise<string> {
    console.log(`Trimming video from ${start}s to ${end}s (placeholder)`);
    // In a real implementation, this would use a video trimming library
    return videoUri;
  }

  /**
   * Add audio to video (placeholder)
   */
  async addAudioToVideo(videoUri: string, audioUri: string): Promise<string> {
    console.log('Adding audio to video (placeholder)');
    // In a real implementation, this would use a video processing library
    return videoUri;
  }

  /**
   * Save video to gallery
   */
  async saveToGallery(videoUri: string): Promise<boolean> {
    try {
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save videos.');
        return false;
      }

      if (Platform.OS === 'android') {
        // For Android, copy to Pictures directory
        const fileName = `EventMarketers_${new Date().getTime()}.mp4`;
        const destPath = `${RNFS.PicturesDirectoryPath}/${fileName}`;
        
        await RNFS.copyFile(videoUri, destPath);
        console.log('Video saved to gallery:', destPath);
        
        Alert.alert('Success', 'Video saved to gallery successfully!');
        return true;
      } else {
        // For iOS, we'll use the share sheet approach
        console.log('iOS video save - would use share sheet');
        Alert.alert('Success', 'Video processing completed! Use share button to save.');
        return true;
      }
    } catch (error) {
      console.error('Failed to save video to gallery:', error);
      Alert.alert('Error', 'Failed to save video to gallery: ' + (error as Error).message);
      return false;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const outputDir = this.getOutputDirectory();
      const files = await RNFS.readDir(outputDir);
      
      const now = new Date().getTime();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago
      
      for (const file of files) {
        if (file.isFile()) {
          const stats = await RNFS.stat(file.path);
          if (stats.mtime && typeof stats.mtime === 'number' && stats.mtime < oneHourAgo) {
            await RNFS.unlink(file.path);
            console.log('Cleaned up old file:', file.path);
          }
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export default new VideoProcessingService();
