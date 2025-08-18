import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/AppNavigator';
import GreetingTemplateCard from '../components/GreetingTemplateCard';
import greetingTemplatesService, { GreetingTemplate, GreetingCategory } from '../services/greetingTemplates';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import responsiveUtils, { 
  responsiveSpacing, 
  responsiveFontSize, 
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

// Using centralized responsive utilities
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GreetingTemplatesScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const { isSubscribed } = useSubscription();
  const insets = useSafeAreaInsets();

  // Get responsive values - memoized to prevent unnecessary re-renders
  const gridColumns = responsiveGrid.columns;

  // State
  const [categories, setCategories] = useState<GreetingCategory[]>([]);
  const [allTemplates, setAllTemplates] = useState<GreetingTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<GreetingTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Memoized data fetching functions
  const fetchData = useCallback(async () => {
    try {
      const [categoriesData, templatesData] = await Promise.all([
        greetingTemplatesService.getCategories(),
        greetingTemplatesService.getTemplates(),
      ]);
      setCategories(categoriesData);
      setAllTemplates(templatesData);
      setFilteredTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load greeting templates. Please try again.');
    }
  }, []);

  // Client-side filtering for instant category switching
  const filterTemplatesByCategory = useCallback((categoryId: string, templates: GreetingTemplate[]) => {
    if (categoryId === 'all') {
      return templates;
    }
    // Filter by category ID and also by category name for better matching
    return templates.filter(template => 
      template.categoryId === categoryId || 
      template.category?.toLowerCase().includes(categoryId.toLowerCase())
    );
  }, []);

  // Optimized search functionality with debouncing
  const searchTemplates = useCallback(async (query: string) => {
    if (!query.trim()) {
      // If no search query, show templates filtered by current category
      const categoryFiltered = filterTemplatesByCategory(selectedCategory, allTemplates);
      setFilteredTemplates(categoryFiltered);
      return;
    }

    try {
      const results = await greetingTemplatesService.searchTemplates(query);
      setFilteredTemplates(results);
    } catch (error) {
      console.error('Error searching templates:', error);
    }
  }, [allTemplates, selectedCategory, filterTemplatesByCategory]);

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimized search effect with better debouncing
  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        searchTemplates(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      // If no search query, filter by current category
      const categoryFiltered = filterTemplatesByCategory(selectedCategory, allTemplates);
      setFilteredTemplates(categoryFiltered);
    }
  }, [searchQuery, searchTemplates, selectedCategory, allTemplates, filterTemplatesByCategory]);

  // Instant category switching - no API calls
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
    
    // Instant client-side filtering
    const categoryFiltered = filterTemplatesByCategory(categoryId, allTemplates);
    setFilteredTemplates(categoryFiltered);
  }, [filterTemplatesByCategory, allTemplates]);

  const handleTemplatePress = useCallback((template: GreetingTemplate) => {
    if (template.isPremium && !isSubscribed) {
      Alert.alert(
        'Premium Template',
        'This template requires a premium subscription. Would you like to upgrade?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }

    navigation.navigate('PosterEditor', {
      selectedImage: {
        uri: template.thumbnail,
        title: template.name,
        description: `${template.category} • ${template.likes} likes`,
      },
      selectedLanguage: 'English',
      selectedTemplateId: template.id,
    });
  }, [isSubscribed, navigation]);

  const handleLike = useCallback(async (templateId: string) => {
    try {
      const isLiked = await greetingTemplatesService.toggleLike(templateId);
      
      // Update both allTemplates and filteredTemplates
      const updateTemplate = (template: GreetingTemplate) => 
        template.id === templateId 
          ? { ...template, isLiked, likes: isLiked ? template.likes + 1 : template.likes - 1 }
          : template;

      setAllTemplates(prev => prev.map(updateTemplate));
      setFilteredTemplates(prev => prev.map(updateTemplate));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Memoized render functions with optimized dependencies
  const renderCategoryTab = useCallback(({ item }: { item: GreetingCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        {
          backgroundColor: selectedCategory === item.id ? item.color : theme.colors.surface,
          borderColor: theme.colors.border,
          paddingVertical: responsiveSpacing.sm,
          paddingHorizontal: responsiveSpacing.md,
          borderRadius: isTablet ? 28 : 24,
          gap: responsiveSpacing.xs,
          minWidth: isTablet ? (isLandscape ? 120 : 100) : 80,
          minHeight: isTablet ? 52 : 44,
        }
      ]}
      onPress={() => handleCategorySelect(item.id)}
      activeOpacity={0.7}
    >
      <Icon
        name={item.icon}
        size={isTablet ? 24 : 20}
        color={selectedCategory === item.id ? '#FFFFFF' : theme.colors.text}
      />
      <Text
        style={[
          styles.categoryTabText,
          {
            color: selectedCategory === item.id ? '#FFFFFF' : theme.colors.text,
            fontSize: responsiveText.caption,
          }
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  ), [selectedCategory, theme.colors.surface, theme.colors.border, theme.colors.text, handleCategorySelect, responsiveSpacing, isTablet, isLandscape, responsiveText.caption]);

  // Optimized template card renderer
  const renderTemplateCard = useCallback(({ item }: { item: GreetingTemplate }) => (
    <GreetingTemplateCard
      template={item}
      onPress={handleTemplatePress}
      onLike={handleLike}
    />
  ), [handleTemplatePress, handleLike]);

  const renderEmptyState = useCallback(() => (
    <View style={[styles.emptyContainer, { paddingHorizontal: responsiveSpacing.lg }]}>
      <Icon name="sentiment-dissatisfied" size={isTablet ? 80 : 64} color={theme.colors.textSecondary} />
      <Text style={[
        styles.emptyTitle, 
        { 
          color: theme.colors.text,
          fontSize: responsiveText.subheading,
          marginTop: responsiveSpacing.md,
          marginBottom: responsiveSpacing.sm,
        }
      ]}>
        No templates found
      </Text>
      <Text style={[
        styles.emptySubtitle, 
        { 
          color: theme.colors.textSecondary,
          fontSize: responsiveText.body,
          lineHeight: isTablet ? 24 : 20,
        }
      ]}>
        {searchQuery ? 'Try adjusting your search terms' : 'Check back later for new templates'}
      </Text>
    </View>
  ), [searchQuery, theme.colors.text, theme.colors.textSecondary, responsiveSpacing, isTablet, responsiveText]);

  // Memoized key extractors and other optimizations
  const keyExtractor = useCallback((item: GreetingTemplate) => item.id, []);
  const categoryKeyExtractor = useCallback((item: GreetingCategory) => item.id, []);

  // Memoized FlatList props for better performance
  const flatListProps = useMemo(() => ({
    data: filteredTemplates,
    renderItem: renderTemplateCard,
    keyExtractor,
    numColumns: gridColumns,
    columnWrapperStyle: {
      justifyContent: 'flex-start' as const,
      gap: responsiveSpacing.sm,
      marginBottom: responsiveSpacing.md,
    },
    contentContainerStyle: {
      paddingHorizontal: responsiveSpacing.md,
      paddingBottom: responsiveSpacing.lg,
    },
    showsVerticalScrollIndicator: false,
    removeClippedSubviews: true,
    maxToRenderPerBatch: isTablet ? 8 : 6,
    windowSize: isTablet ? 10 : 8,
    initialNumToRender: isTablet ? 8 : 6,
    updateCellsBatchingPeriod: 50,
    getItemLayout: undefined,
  }), [filteredTemplates, renderTemplateCard, keyExtractor, gridColumns, responsiveSpacing, isTablet]);

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
            paddingBottom: responsiveSpacing.md,
            paddingHorizontal: responsiveSpacing.md,
          }
        ]}>
          <View style={[
            styles.headerContent, 
            { paddingHorizontal: responsiveSpacing.sm }
          ]}>
            <Text style={[
              styles.headerTitle,
              { fontSize: responsiveText.subheading }
            ]}>Greeting Templates</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[
          styles.searchContainer, 
          { 
            marginHorizontal: responsiveSpacing.md,
            marginVertical: responsiveSpacing.sm,
          }
        ]}>
          <View style={[
            styles.searchBar, 
            { 
              backgroundColor: theme.colors.cardBackground,
              paddingHorizontal: responsiveSpacing.md,
              paddingVertical: responsiveSpacing.sm,
              borderRadius: isTablet ? 20 : 16,
              minHeight: isTablet ? 56 : 48,
            }
          ]}>
            <Icon name="search" size={isTablet ? 24 : 20} color={theme.colors.textSecondary} />
            <TextInput
              style={[
                styles.searchInput, 
                { 
                  color: theme.colors.text,
                  marginLeft: responsiveSpacing.sm,
                  fontSize: responsiveText.body,
                  minHeight: isTablet ? 48 : 40,
                }
              ]}
              placeholder="Search greeting templates..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="clear" size={isTablet ? 24 : 20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        <View style={[styles.categoriesContainer, { marginBottom: responsiveSpacing.sm }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.categoriesScroll, 
              { paddingHorizontal: responsiveSpacing.md, gap: responsiveSpacing.sm }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.categoryTab,
                {
                  backgroundColor: selectedCategory === 'all' ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                  paddingVertical: responsiveSpacing.sm,
                  paddingHorizontal: responsiveSpacing.md,
                  borderRadius: isTablet ? 28 : 24,
                  gap: responsiveSpacing.xs,
                  minWidth: isTablet ? (isLandscape ? 120 : 100) : 80,
                  minHeight: isTablet ? 52 : 44,
                }
              ]}
              onPress={() => handleCategorySelect('all')}
              activeOpacity={0.7}
            >
              <Icon
                name="apps"
                size={isTablet ? 24 : 20}
                color={selectedCategory === 'all' ? '#FFFFFF' : theme.colors.text}
              />
              <Text
                style={[
                  styles.categoryTabText,
                  {
                    color: selectedCategory === 'all' ? '#FFFFFF' : theme.colors.text,
                    fontSize: responsiveText.caption,
                  }
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <View key={category.id}>
                {renderCategoryTab({ item: category })}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Templates Grid - Optimized FlatList */}
        <FlatList
          {...flatListProps}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
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
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    minHeight: 40,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    minWidth: 80,
    justifyContent: 'center',
    minHeight: 44,
  },
  categoryTabText: {
    fontWeight: '600',
  },
  templatesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  templateRow: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GreetingTemplatesScreen;
