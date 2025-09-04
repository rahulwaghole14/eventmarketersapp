import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  Dimensions,
  Animated,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import Video from 'react-native-video';

// Enhanced responsive design helpers
const getResponsiveValues = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Determine screen size category
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  const isLargeScreen = screenWidth >= 414 && screenWidth < 768;
  const isTablet = screenWidth >= 768;
  
  // Determine orientation
  const isLandscape = screenWidth > screenHeight;
  
  // Responsive spacing
  const responsiveSpacing = {
    xs: isSmallScreen ? 6 : isMediumScreen ? 8 : isLargeScreen ? 10 : isTablet ? 12 : 16,
    sm: isSmallScreen ? 8 : isMediumScreen ? 12 : isLargeScreen ? 14 : isTablet ? 16 : 20,
    md: isSmallScreen ? 12 : isMediumScreen ? 16 : isLargeScreen ? 18 : isTablet ? 20 : 24,
    lg: isSmallScreen ? 16 : isMediumScreen ? 20 : isLargeScreen ? 22 : isTablet ? 24 : 32,
    xl: isSmallScreen ? 20 : isMediumScreen ? 24 : isLargeScreen ? 26 : isTablet ? 28 : 40,
  };
  
  // Responsive font sizes
  const responsiveFontSize = {
    xs: isSmallScreen ? 9 : isMediumScreen ? 10 : isLargeScreen ? 11 : isTablet ? 12 : 14,
    sm: isSmallScreen ? 11 : isMediumScreen ? 12 : isLargeScreen ? 13 : isTablet ? 14 : 16,
    md: isSmallScreen ? 13 : isMediumScreen ? 14 : isLargeScreen ? 15 : isTablet ? 16 : 18,
    lg: isSmallScreen ? 15 : isMediumScreen ? 16 : isLargeScreen ? 17 : isTablet ? 18 : 20,
    xl: isSmallScreen ? 17 : isMediumScreen ? 18 : isLargeScreen ? 19 : isTablet ? 20 : 22,
    xxl: isSmallScreen ? 19 : isMediumScreen ? 20 : isLargeScreen ? 21 : isTablet ? 22 : 24,
    xxxl: isSmallScreen ? 22 : isMediumScreen ? 24 : isLargeScreen ? 26 : isTablet ? 28 : 32,
  };
  
  // Responsive card dimensions
  const cardHeight = isSmallScreen ? screenHeight * 0.12 : 
                    isMediumScreen ? screenHeight * 0.13 : 
                    isLargeScreen ? screenHeight * 0.14 : 
                    isTablet ? screenHeight * 0.16 : screenHeight * 0.15;
  
  // Grid columns based on screen size
  const gridColumns = isTablet ? (isLandscape ? 4 : 3) : 2;
  
  // Card width calculation
  const cardWidth = (screenWidth - (responsiveSpacing.md * 2) - (responsiveSpacing.sm * (gridColumns - 1))) / gridColumns;
  
  return {
    responsiveSpacing,
    responsiveFontSize,
    cardHeight,
    cardWidth,
    gridColumns,
    isTablet,
    isLandscape,
    screenWidth,
    screenHeight,
  };
};

interface LikedItem {
  id: string;
  name: string;
  thumbnail: string;
  type: 'poster' | 'video' | 'template' | 'greeting';
  category?: string;
  likes: number;
  downloads?: number;
  videoUrl?: string;
}

const LikedItemsScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('all');
  
  // Get responsive values - memoized to prevent unnecessary re-renders
  const responsiveValues = useMemo(() => getResponsiveValues(), []);
  const { responsiveSpacing, responsiveFontSize, cardHeight, cardWidth, gridColumns, isTablet, isLandscape } = responsiveValues;

  // Mock data for liked items
  const mockLikedItems: LikedItem[] = useMemo(() => [
    // Liked Posters
    {
      id: 'poster-1',
      name: 'Wedding Invitation',
      thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
      type: 'poster',
      category: 'Wedding',
      likes: 156,
      downloads: 89,
    },
    {
      id: 'poster-2',
      name: 'Corporate Event',
      thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
      type: 'poster',
      category: 'Corporate',
      likes: 234,
      downloads: 167,
    },
    // Liked Videos
    {
      id: 'video-1',
      name: 'Event Promo Video',
      thumbnail: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
      type: 'video',
      category: 'Promo',
      likes: 189,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    },
    {
      id: 'video-2',
      name: 'Wedding Highlight',
      thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop',
      type: 'video',
      category: 'Wedding',
      likes: 145,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    },
    // Liked Templates
    {
      id: 'template-1',
      name: 'Birthday Template',
      thumbnail: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
      type: 'template',
      category: 'Birthday',
      likes: 178,
      downloads: 123,
    },
    {
      id: 'template-2',
      name: 'Conference Template',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
      type: 'template',
      category: 'Conference',
      likes: 203,
      downloads: 134,
    },
    // Liked Greetings
    {
      id: 'greeting-1',
      name: 'Festival Greeting',
      thumbnail: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=300&h=200&fit=crop',
      type: 'greeting',
      category: 'Festival',
      likes: 167,
      downloads: 98,
    },
    {
      id: 'greeting-2',
      name: 'Business Greeting',
      thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop',
      type: 'greeting',
      category: 'Business',
      likes: 145,
      downloads: 76,
    },
  ], []);

  const tabs = useMemo(() => [
    { id: 'all', label: 'All', icon: 'favorite' },
    { id: 'poster', label: 'Posters', icon: 'image' },
    { id: 'video', label: 'Videos', icon: 'video-library' },
    { id: 'template', label: 'Templates', icon: 'dashboard' },
    { id: 'greeting', label: 'Greetings', icon: 'celebration' },
  ], []);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') {
      return mockLikedItems;
    }
    return mockLikedItems.filter(item => item.type === activeTab);
  }, [mockLikedItems, activeTab]);

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleItemPress = (item: LikedItem) => {
    // Navigate based on item type
    switch (item.type) {
      case 'poster':
        (navigation as any).navigate('PosterEditor', { 
          selectedImage: { uri: item.thumbnail },
          selectedLanguage: 'english',
          selectedTemplateId: item.id
        });
        break;
      case 'video':
        (navigation as any).navigate('VideoEditor', { 
          selectedVideo: { uri: item.videoUrl },
          selectedLanguage: 'english',
          selectedTemplateId: item.id
        });
        break;
      case 'template':
        (navigation as any).navigate('PosterEditor', { 
          selectedImage: { uri: item.thumbnail },
          selectedLanguage: 'english',
          selectedTemplateId: item.id
        });
        break;
      case 'greeting':
        (navigation as any).navigate('GreetingEditor', { 
          template: { uri: item.thumbnail, id: item.id }
        });
        break;
    }
  };

  const renderTab = useCallback(({ item }: { item: { id: string; label: string; icon: string } }) => (
    <TouchableOpacity
      style={[
        styles.tab,
        { 
          backgroundColor: activeTab === item.id ? theme.colors.cardBackground : 'rgba(255,255,255,0.2)',
          paddingHorizontal: responsiveSpacing.md,
          paddingVertical: responsiveSpacing.sm,
          marginRight: responsiveSpacing.sm,
          borderRadius: isTablet ? 24 : 20,
          gap: isTablet ? 8 : 6,
        }
      ]}
      onPress={() => handleTabPress(item.id)}
    >
      <Icon 
        name={item.icon} 
        size={isTablet ? 18 : 16} 
        color={activeTab === item.id ? theme.colors.primary : '#ffffff'} 
      />
      <Text style={[
        styles.tabText,
        { 
          color: activeTab === item.id ? theme.colors.primary : '#ffffff',
          fontSize: responsiveFontSize.sm,
        }
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  ), [activeTab, theme.colors.cardBackground, theme.colors.primary, responsiveSpacing, isTablet, responsiveFontSize.sm, handleTabPress]);

  const renderItem = useCallback(({ item }: { item: LikedItem }) => {
    const scaleAnim = new Animated.Value(1);

    const handlePressIn = () => {
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => handleItemPress(item)}
        style={[styles.itemCardWrapper, { width: cardWidth }]}
      >
        <Animated.View 
          style={[
            styles.itemCard, 
            { 
              backgroundColor: theme.colors.cardBackground,
              transform: [{ scale: scaleAnim }],
              borderRadius: isTablet ? 16 : 12,
            }
          ]}
        >
          <View style={[styles.itemImageContainer, { height: cardHeight }]}>
            {item.type === 'video' ? (
              <Video
                source={{ uri: item.videoUrl }}
                style={styles.itemImage}
                resizeMode="cover"
                repeat={true}
                paused={true}
                muted={true}
              />
            ) : (
              <Image source={{ uri: item.thumbnail }} style={styles.itemImage} />
            )}
            
            {/* Type Badge */}
            <View style={[
              styles.typeBadge, 
              { 
                backgroundColor: getTypeColor(item.type),
                paddingHorizontal: isTablet ? 8 : 6,
                paddingVertical: isTablet ? 4 : 2,
                borderRadius: isTablet ? 10 : 8,
              }
            ]}>
              <Icon name={getTypeIcon(item.type)} size={isTablet ? 14 : 12} color="#ffffff" />
            </View>

            {/* Video Play Overlay */}
            {item.type === 'video' && (
              <View style={styles.videoPlayOverlay}>
                <Icon name="play-arrow" size={isTablet ? 32 : 24} color="#ffffff" />
              </View>
            )}
          </View>

          <View style={[styles.itemInfo, { padding: responsiveSpacing.sm }]}>
            <Text style={[
              styles.itemName, 
              { 
                color: theme.colors.text,
                fontSize: responsiveFontSize.sm,
                marginBottom: 2,
              }
            ]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.category && (
              <Text style={[
                styles.itemCategory, 
                { 
                  color: theme.colors.textSecondary,
                  fontSize: responsiveFontSize.xs,
                  marginBottom: responsiveSpacing.xs,
                }
              ]}>
                {item.category}
              </Text>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }, [cardWidth, theme.colors.cardBackground, isTablet, cardHeight, responsiveSpacing, responsiveFontSize, handleItemPress]);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'poster': return '#667eea';
      case 'video': return '#e74c3c';
      case 'template': return '#28a745';
      case 'greeting': return '#ffc107';
      default: return '#6c757d';
    }
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'poster': return 'image';
      case 'video': return 'video-library';
      case 'template': return 'dashboard';
      case 'greeting': return 'celebration';
      default: return 'favorite';
    }
  }, []);

  const keyExtractor = useCallback((item: LikedItem) => item.id, []);
  const tabKeyExtractor = useCallback((item: { id: string; label: string; icon: string }) => item.id, []);

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar 
        barStyle="light-content"
        backgroundColor="transparent" 
        translucent={true}
      />
      
      <LinearGradient
        colors={theme.colors.gradient}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={[
          styles.header, 
          { 
            paddingTop: insets.top + responsiveSpacing.sm,
            paddingHorizontal: responsiveSpacing.md,
            paddingBottom: responsiveSpacing.sm,
          }
        ]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={isTablet ? 28 : 24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={[
            styles.headerTitle,
            { fontSize: responsiveFontSize.lg }
          ]}>Liked Items</Text>
          <View style={[styles.headerRight, { width: isTablet ? 48 : 40 }]} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { marginBottom: responsiveSpacing.sm }]}>
          <FlatList
            data={tabs}
            renderItem={renderTab}
            keyExtractor={tabKeyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.tabsList, { paddingHorizontal: responsiveSpacing.md }]}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {filteredItems.length > 0 ? (
            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={gridColumns}
              columnWrapperStyle={[
                styles.itemRow, 
                { 
                  justifyContent: 'flex-start',
                  marginBottom: responsiveSpacing.md,
                  gap: responsiveSpacing.sm,
                }
              ]}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.itemsList, 
                { 
                  paddingHorizontal: responsiveSpacing.md,
                  paddingBottom: 100,
                }
              ]}
            />
          ) : (
            <View style={[styles.emptyState, { paddingHorizontal: responsiveSpacing.xl }]}>
              <Icon name="favorite-border" size={isTablet ? 80 : 64} color="rgba(255,255,255,0.5)" />
              <Text style={[
                styles.emptyStateTitle,
                { 
                  fontSize: responsiveFontSize.lg,
                  marginTop: responsiveSpacing.md,
                  marginBottom: responsiveSpacing.sm,
                }
              ]}>No Liked Items</Text>
              <Text style={[
                styles.emptyStateSubtitle,
                { 
                  fontSize: responsiveFontSize.sm,
                  lineHeight: isTablet ? 24 : 20,
                }
              ]}>
                {activeTab === 'all' 
                  ? "You haven't liked any items yet"
                  : `You haven't liked any ${activeTab}s yet`
                }
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsList: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  itemsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  itemRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemCardWrapper: {
    // Width will be set dynamically
  },
  itemCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  itemCategory: {
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LikedItemsScreen;
