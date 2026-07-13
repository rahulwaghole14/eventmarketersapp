import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'expiry' | 'general';
  businessProfileId?: string;
}

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('@in_app_notifications');
      if (stored) {
        const parsed = JSON.parse(stored) as InAppNotification[];
        // Sort by date descending (newest first)
        parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotifications(parsed);
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const stored = await AsyncStorage.getItem('@in_app_notifications');
      if (stored) {
        const parsed = JSON.parse(stored) as InAppNotification[];
        const updated = parsed.map(n => ({ ...n, read: true }));
        await AsyncStorage.setItem('@in_app_notifications', JSON.stringify(updated));
        setNotifications(updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
    }
  };



  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 1200); // Soft fade-out delay for unread indicator
      return () => clearTimeout(timer);
    }, [])
  );

  const handleNotificationPress = (notification: InAppNotification) => {
    if (notification.type === 'expiry') {
      navigation.navigate('Subscription' as any, { businessProfileId: notification.businessProfileId });
    }
  };

  const formatNotificationTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return '';
    }
  };

  const renderItem = ({ item }: { item: InAppNotification }) => {
    const isExpiry = item.type === 'expiry';
    const cardBorderColor = theme.colors.primary;
    const cardBgColor = isExpiry 
      ? (isDarkMode ? 'rgba(139, 157, 255, 0.08)' : 'rgba(102, 126, 234, 0.04)')
      : theme.colors.cardBackground;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          {
            backgroundColor: cardBgColor,
            borderColor: item.read ? 'rgba(0,0,0,0.05)' : `${cardBorderColor}40`,
            borderLeftColor: cardBorderColor,
            borderLeftWidth: 4,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          {/* Status Icon Wrapper */}
          <View style={[styles.iconContainer, { backgroundColor: isExpiry ? (isDarkMode ? 'rgba(139, 157, 255, 0.15)' : 'rgba(102, 126, 234, 0.10)') : `${theme.colors.primary}12` }]}>
            <Icon 
              name={isExpiry ? 'schedule' : 'notifications'} 
              size={20} 
              color={theme.colors.primary} 
            />
          </View>

          {/* Text Info Container */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  { 
                    color: theme.colors.text, 
                    fontWeight: item.read ? '600' : 'bold',
                    fontSize: moderateScale(14),
                  },
                ]}
              >
                {item.title}
              </Text>
              {!item.read && (
                <View style={[styles.unreadDot, { backgroundColor: cardBorderColor }]} />
              )}
            </View>

            <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]}>
              {item.message}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
                {formatNotificationTime(item.date)}
              </Text>

              {/* Interactive Renew CTA inside Expiry warning card */}
              {isExpiry && (
                <TouchableOpacity
                  style={styles.renewCTA}
                  onPress={() => navigation.navigate('Subscription' as any, { businessProfileId: item.businessProfileId })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.renewCTAText, { color: theme.colors.primary }]}>RENEW NOW</Text>
                  <Icon name="chevron-right" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      {/* Header Container */}
      <View
        style={[
          styles.header,
          { 
            paddingTop: insets.top + 10,
            backgroundColor: theme.colors.cardBackground,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)'
          }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View style={[styles.backButtonCircle, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <Icon name="arrow-back" size={22} color={theme.colors.text} />
            </View>
          </TouchableOpacity>

          <View style={styles.titleContainer} pointerEvents="none">
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
          </View>

          <View style={styles.clearPlaceholder} />
        </View>
      </View>

      {/* Notifications Body Content */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconOutline, { borderColor: `${theme.colors.textSecondary}25` }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: isDarkMode ? '#1f0d3d' : '#f5f5f5' }]}>
              <Icon name="notifications-none" size={48} color={`${theme.colors.textSecondary}65`} />
            </View>
          </View>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            All caught up!
          </Text>
          <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
            Alerts regarding plan expirations and updates will appear here.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    position: 'relative',
    height: 48,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backButton: {
    padding: 2,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  clearPlaceholder: {
    width: 36,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  notificationCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: moderateScale(12),
    lineHeight: 18,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  notificationTime: {
    fontSize: moderateScale(10),
    fontWeight: '500',
  },
  renewCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  renewCTAText: {
    fontSize: moderateScale(11),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconOutline: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconBg: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyText: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: moderateScale(13),
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationScreen;
