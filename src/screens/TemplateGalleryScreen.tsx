import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/AppNavigator';

import TemplateCard from '../components/TemplateCard';
import templateService, { Template, TemplateFilters } from '../services/templates';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive design helpers
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414;

// Responsive spacing and sizing
const responsiveSpacing = {
  xs: isSmallScreen ? 8 : isMediumScreen ? 12 : 16,
  sm: isSmallScreen ? 12 : isMediumScreen ? 16 : 20,
  md: isSmallScreen ? 16 : isMediumScreen ? 20 : 24,
  lg: isSmallScreen ? 20 : isMediumScreen ? 24 : 32,
  xl: isSmallScreen ? 24 : isMediumScreen ? 32 : 40,
};

const responsiveFontSize = {
  xs: isSmallScreen ? 10 : isMediumScreen ? 12 : 14,
  sm: isSmallScreen ? 12 : isMediumScreen ? 14 : 16,
  md: isSmallScreen ? 14 : isMediumScreen ? 16 : 18,
  lg: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
  xl: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
  xxl: isSmallScreen ? 20 : isMediumScreen ? 22 : 24,
  xxxl: isSmallScreen ? 24 : isMediumScreen ? 28 : 32,
};

const TemplateGalleryScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const { isSubscribed } = useSubscription();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [selectedPremiumTemplate, setSelectedPremiumTemplate] = useState<Template | null>(null);

  // Filter configurations
  const categoryFilters = [
    { id: 'all', label: 'All Templates', value: 'all', icon: 'apps' },
    { id: 'free', label: 'Free', value: 'free', icon: 'favorite' },
    { id: 'premium', label: 'Premium', value: 'premium', icon: 'star' },
  ];

  const languageFilters = [
    { id: 'all', label: 'All Languages', value: '', icon: 'language' },
    { id: 'english', label: 'English', value: 'English', icon: 'translate' },
    { id: 'marathi', label: 'Marathi', value: 'Marathi', icon: 'translate' },
    { id: 'hindi', label: 'Hindi', value: 'Hindi', icon: 'translate' },
  ];

  // Fetch templates
  const fetchTemplates = useCallback(async (filters?: TemplateFilters) => {
    try {
      setLoading(true);
      const data = await templateService.getTemplates(filters);
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      Alert.alert('Error', 'Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);



  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = templates;

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Apply language filter
    if (selectedLanguage) {
      filtered = filtered.filter(template => 
        template.language.toLowerCase() === selectedLanguage.toLowerCase()
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, selectedLanguage, searchQuery]);

  // Handle filter changes
  const handleCategoryFilter = (value: string) => {
    setSelectedCategory(value);
  };

  const handleLanguageFilter = (value: string) => {
    setSelectedLanguage(value);
  };

  // Handle template selection
  const handleTemplatePress = (template: Template) => {
    // Check if template is premium and user is not subscribed
    if (template.category === 'premium' && !isSubscribed) {
      setSelectedPremiumTemplate(template);
      setUpgradeModalVisible(true);
      return;
    }

    // Navigate to PosterEditor screen with template data
    navigation.navigate('PosterEditor', {
      selectedImage: {
        uri: template.imageUrl,
        title: template.title,
        description: template.description,
      },
      selectedLanguage: template.language,
      selectedTemplateId: template.id,
    });
  };

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    templateService.clearCache(); // Clear cache on refresh
    await fetchTemplates();
    setRefreshing(false);
  }, [fetchTemplates]);

  // Initialize data
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Render template item
  const renderTemplateItem = useCallback(({ item }: { item: Template }) => (
    <TemplateCard template={item} onPress={handleTemplatePress} />
  ), [handleTemplatePress]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Template) => item.id, []);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="search-off" size={48} color="#ffffff" />
      </View>
      <Text style={styles.emptyTitle}>No templates found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your filters or search terms to find what you're looking for
      </Text>
    </View>
  );

  // Render upgrade modal
  const renderUpgradeModal = () => (
    <Modal
      visible={upgradeModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setUpgradeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.upgradeModalContent, { backgroundColor: theme.colors.cardBackground }]}>
          {/* Premium Badge */}
          <View style={styles.premiumBadge}>
            <Icon name="star" size={24} color="#FFD700" />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>

          {/* Modal Header */}
          <View style={styles.upgradeModalHeader}>
            <Text style={[styles.upgradeModalTitle, { color: theme.colors.text }]}>
              Unlock Premium Template
            </Text>
            <Text style={[styles.upgradeModalSubtitle, { color: theme.colors.textSecondary }]}>
              Get access to this exclusive template and all premium features
            </Text>
          </View>

          {/* Template Preview */}
          {selectedPremiumTemplate && (
            <View style={styles.templatePreview}>
              <Image 
                source={{ uri: selectedPremiumTemplate.imageUrl }} 
                style={styles.templatePreviewImage}
                resizeMode="cover"
              />
              <View style={styles.templatePreviewOverlay}>
                <Text style={styles.templatePreviewTitle}>{selectedPremiumTemplate.title}</Text>
                <Text style={styles.templatePreviewDescription}>{selectedPremiumTemplate.description}</Text>
              </View>
            </View>
          )}

          {/* Features List */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={[styles.featureText, { color: theme.colors.text }]}>
                Access to all premium templates
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={[styles.featureText, { color: theme.colors.text }]}>
                No watermarks on final designs
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={[styles.featureText, { color: theme.colors.text }]}>
                Priority customer support
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={[styles.featureText, { color: theme.colors.text }]}>
                Advanced editing features
              </Text>
            </View>
          </View>

          {/* Modal Footer */}
          <View style={styles.upgradeModalFooter}>
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={() => setUpgradeModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                setUpgradeModalVisible(false);
                navigation.navigate('Subscription');
              }}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.upgradeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="star" size={16} color="#ffffff" style={styles.upgradeButtonIcon} />
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.cardBackground }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Filter Templates</Text>
            <TouchableOpacity 
              onPress={() => setFilterModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Category Section */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Icon name="category" size={20} color={theme.colors.primary} />
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Category</Text>
              </View>
              <View style={styles.filterOptions}>
                {categoryFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: selectedCategory === filter.value 
                          ? theme.colors.primary 
                          : theme.colors.inputBackground,
                        borderColor: selectedCategory === filter.value 
                          ? theme.colors.primary 
                          : theme.colors.border
                      }
                    ]}
                    onPress={() => handleCategoryFilter(filter.value)}
                  >
                    <Icon 
                      name={filter.icon} 
                      size={16} 
                      color={selectedCategory === filter.value ? '#ffffff' : theme.colors.primary} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      { 
                        color: selectedCategory === filter.value 
                          ? '#ffffff' 
                          : theme.colors.text 
                      }
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Language Section */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Icon name="translate" size={20} color={theme.colors.primary} />
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Language</Text>
              </View>
              <View style={styles.filterOptions}>
                {languageFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: selectedLanguage === filter.value 
                          ? theme.colors.primary 
                          : theme.colors.inputBackground,
                        borderColor: selectedLanguage === filter.value 
                          ? theme.colors.primary 
                          : theme.colors.border
                      }
                    ]}
                    onPress={() => handleLanguageFilter(filter.value)}
                  >
                    <Icon 
                      name={filter.icon} 
                      size={16} 
                      color={selectedLanguage === filter.value ? '#ffffff' : theme.colors.primary} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      { 
                        color: selectedLanguage === filter.value 
                          ? '#ffffff' 
                          : theme.colors.text 
                      }
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.resetButton, { borderColor: theme.colors.border }]}
              onPress={() => {
                setSelectedCategory('all');
                setSelectedLanguage('');
              }}
            >
              <Text style={[styles.resetButtonText, { color: theme.colors.textSecondary }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={theme.colors.gradient}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

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
        <View style={[styles.header, { paddingTop: insets.top + responsiveSpacing.sm }]}>
          <View style={styles.headerTop}>
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>Template Gallery</Text>
              <Text style={styles.userName}>Professional designs for your next project</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.notificationButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => setFilterModalVisible(true)}
              >
                <Text style={styles.notificationButtonText}>FILTER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#ffffff']}
              tintColor="#ffffff"
            />
          }
          removeClippedSubviews={true}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          bounces={true}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: theme.colors.cardBackground }]}>
              <Icon name="search" size={16} color={theme.colors.primary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search templates..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results Header */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {filteredTemplates.length} {filteredTemplates.length === 1 ? 'Template' : 'Templates'} Found
            </Text>
            {searchQuery && (
              <Text style={styles.searchQueryText}>
                for "{searchQuery}"
              </Text>
            )}
          </View>

          {/* Templates Grid */}
          <View style={styles.templatesSection}>
            <FlatList
              data={filteredTemplates}
              renderItem={renderTemplateItem}
              keyExtractor={keyExtractor}
              numColumns={2}
              columnWrapperStyle={styles.templateRow}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              removeClippedSubviews={true}
              maxToRenderPerBatch={6}
              windowSize={10}
              initialNumToRender={4}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={renderEmptyState}
            />
          </View>
        </ScrollView>

                 {/* Filter Modal */}
         {renderFilterModal()}
         
         {/* Upgrade Modal */}
         {renderUpgradeModal()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  header: {
    paddingTop: 0,
    paddingHorizontal: screenWidth * 0.05,
    paddingBottom: screenHeight * 0.02,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: '#ffffff',
    opacity: 0.8,
  },
  userName: {
    fontSize: Math.min(screenWidth * 0.06, 24),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  notificationButton: {
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.008,
    borderRadius: 15,
  },
  notificationButtonText: {
    fontSize: Math.min(screenWidth * 0.025, 10),
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchContainer: {
    paddingHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.02,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.012,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIcon: {
    marginRight: screenWidth * 0.025,
  },
  searchInput: {
    flex: 1,
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '500',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.02,
  },
  resultsTitle: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchQueryText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  templatesSection: {
    paddingBottom: screenHeight * 0.05,
    paddingHorizontal: screenWidth * 0.02,
  },
  templateRow: {
    justifyContent: 'space-between',
    paddingHorizontal: screenWidth * 0.03,
    marginBottom: screenHeight * 0.02,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    minWidth: 120,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
     applyButtonText: {
     fontSize: 16,
     fontWeight: '600',
     color: '#ffffff',
   },
   // Upgrade Modal Styles
   upgradeModalContent: {
     margin: 20,
     borderRadius: 24,
     padding: 24,
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 8,
     },
     shadowOpacity: 0.25,
     shadowRadius: 16,
     elevation: 20,
     maxHeight: screenHeight * 0.85,
   },
   premiumBadge: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: 'rgba(255, 215, 0, 0.1)',
     paddingHorizontal: 16,
     paddingVertical: 8,
     borderRadius: 20,
     alignSelf: 'center',
     marginBottom: 20,
   },
   premiumBadgeText: {
     fontSize: 12,
     fontWeight: '700',
     color: '#FFD700',
     marginLeft: 6,
     letterSpacing: 1,
   },
   upgradeModalHeader: {
     alignItems: 'center',
     marginBottom: 24,
   },
   upgradeModalTitle: {
     fontSize: 24,
     fontWeight: '700',
     textAlign: 'center',
     marginBottom: 8,
   },
   upgradeModalSubtitle: {
     fontSize: 16,
     textAlign: 'center',
     lineHeight: 22,
   },
   templatePreview: {
     height: 120,
     borderRadius: 16,
     overflow: 'hidden',
     marginBottom: 24,
     position: 'relative',
   },
   templatePreviewImage: {
     width: '100%',
     height: '100%',
   },
   templatePreviewOverlay: {
     position: 'absolute',
     bottom: 0,
     left: 0,
     right: 0,
     backgroundColor: 'rgba(0, 0, 0, 0.7)',
     padding: 16,
   },
   templatePreviewTitle: {
     fontSize: 16,
     fontWeight: '600',
     color: '#ffffff',
     marginBottom: 4,
   },
   templatePreviewDescription: {
     fontSize: 14,
     color: 'rgba(255, 255, 255, 0.8)',
   },
   featuresList: {
     marginBottom: 24,
   },
   featureItem: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 12,
   },
   featureText: {
     fontSize: 16,
     marginLeft: 12,
     flex: 1,
   },
   upgradeModalFooter: {
     flexDirection: 'row',
     gap: 12,
   },
   cancelButton: {
     flex: 1,
     paddingVertical: 16,
     borderRadius: 12,
     borderWidth: 1,
     alignItems: 'center',
   },
   cancelButtonText: {
     fontSize: 16,
     fontWeight: '600',
   },
   upgradeButton: {
     flex: 2,
     borderRadius: 12,
     overflow: 'hidden',
   },
   upgradeButtonGradient: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 16,
   },
   upgradeButtonIcon: {
     marginRight: 8,
   },
   upgradeButtonText: {
     fontSize: 16,
     fontWeight: '700',
     color: '#ffffff',
   },
 });

export default TemplateGalleryScreen; 