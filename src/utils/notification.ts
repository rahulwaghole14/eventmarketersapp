import { NativeModules, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { LocalNotificationModule } = NativeModules;

/**
 * Utility to request notification permission and show a local heads-up floating notification.
 * Clicking the notification will open the downloaded file directly.
 * 
 * @param title Title of the notification (e.g. "Download completed")
 * @param body Subtext description (e.g. "Your video has been saved to your gallery.")
 * @param filePath Local path to the downloaded file
 * @param mimeType MIME type of the file (e.g. "image/*" or "video/*")
 */
export const showDownloadNotification = async (
  title: string,
  body: string,
  filePath: string,
  mimeType: string
) => {
  if (Platform.OS === 'android') {
    try {
      // Android 13+ (API 33) requires runtime POST_NOTIFICATIONS permission
      if (Platform.Version >= 33) {
        if ((await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS)) !== RESULTS.GRANTED) {
          console.log('[NOTIFICATION] Requesting POST_NOTIFICATIONS permission...');
          const result = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
          if (result !== RESULTS.GRANTED) {
            console.log('[NOTIFICATION] Permission denied, cannot show notification');
            return;
          }
        }
      }

      if (LocalNotificationModule) {
        LocalNotificationModule.showDownloadCompleteNotification(title, body, filePath, mimeType);
        console.log('[NOTIFICATION] Triggered native local notification for path:', filePath);
      } else {
        console.warn('[NOTIFICATION] LocalNotificationModule is not linked or available');
      }
    } catch (error) {
      console.error('[NOTIFICATION] Failed to trigger notification:', error);
    }
  } else {
    // Fallback/No-op for iOS since iOS notification implementation relies on standard APNs or Notifee
    console.log('[NOTIFICATION] Local notifications are only supported on Android in this flow.');
  }
};
