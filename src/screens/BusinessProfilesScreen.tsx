import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import businessProfileService from '../services/businessProfile';
import BusinessProfileForm from '../components/BusinessProfileForm';
import BottomSheet from '../components/BottomSheet';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const BusinessProfilesScreen: React.FC = () => {
  const { isDarkMode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Memoized mock data for immediate loading
  const mockProfiles = useMemo(() => [
    {
      id: '1',
      name: 'Creative Events Studio',
      category: 'Event Planning',
      rating: 4.8,
      reviewCount: 156,
      description: 'Professional event planning and management services for all occasions.',
      phone: '+1 (555) 123-4567',
      email: 'info@creativeevents.com',
      address: '123 Main Street, City, State 12345',
      services: ['Wedding Planning', 'Corporate Events', 'Birthday Parties', 'Anniversary Celebrations'],
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=200&fit=crop',
    },
    {
      id: '2',
      name: 'Elite Marketing Solutions',
      category: 'Marketing',
      rating: 4.9,
      reviewCount: 234,
      description: 'Comprehensive marketing solutions for businesses of all sizes.',
      phone: '+1 (555) 987-6543',
      email: 'contact@elitemarketing.com',
      address: '456 Business Ave, Downtown, State 54321',
      services: ['Digital Marketing', 'Social Media Management', 'Content Creation', 'Brand Strategy'],
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
    },
    {
      id: '3',
      name: 'Premier Catering Services',
      category: 'Catering',
      rating: 4.7,
      reviewCount: 89,
      description: 'Exquisite catering services for weddings, corporate events, and special occasions.',
      phone: '+1 (555) 456-7890',
      email: 'info@premiercatering.com',
      address: '789 Food Court, Culinary District, State 67890',
      services: ['Wedding Catering', 'Corporate Catering', 'Private Parties', 'Menu Planning'],
      imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=200&fit=crop',
    },
  ], []);

  const loadBusinessProfiles = useCallback(async () => {
    setLoading(true);
    try {
      // Use mock data immediately for better performance
      setProfiles(mockProfiles);
      
      // Try API call in background
      setTimeout(async () => {
        try {
          const data = await businessProfileService.getBusinessProfiles();
          setProfiles(data);
        } catch (error) {
          console.log('Using mock data due to API error:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Error loading profiles:', error);
      setProfiles(mockProfiles);
    } finally {
      setLoading(false);
    }
  }, [mockProfiles]);

  useEffect(() => {
    loadBusinessProfiles();
  }, [loadBusinessProfiles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBusinessProfiles();
    setRefreshing(false);
  }, [loadBusinessProfiles]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadBusinessProfiles();
      return;
    }

    // Use local search immediately for better performance
    const filtered = mockProfiles.filter(profile =>
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setProfiles(filtered);

    // Try API search in background
    setTimeout(async () => {
      try {
        const results = await businessProfileService.searchBusinessProfiles(searchQuery);
        setProfiles(results);
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 100);
  }, [searchQuery, loadBusinessProfiles, mockProfiles]);

  const handleDeleteProfile = useCallback(async (profileId: string) => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this business profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await businessProfileService.deleteBusinessProfile(profileId);
              setProfiles(prev => prev.filter(p => p.id !== profileId));
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            }
          },
        },
      ]
    );
  }, []);

  const handleEditProfile = useCallback((profile: any) => {
    setEditingProfile(profile);
    setShowForm(true);
  }, []);

  const handleAddProfile = useCallback(() => {
    setEditingProfile(null);
    setShowBottomSheet(true);
  }, []);

  const handleFormSubmit = useCallback(async (formData: any) => {
    setFormLoading(true);
    try {
      if (editingProfile) {
        await businessProfileService.updateBusinessProfile(editingProfile.id, formData);
        setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...p, ...formData } : p));
      } else {
        const newProfile = await businessProfileService.createBusinessProfile(formData);
        setProfiles(prev => [...prev, newProfile]);
      }
      setShowForm(false);
      setShowBottomSheet(false);
      setEditingProfile(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setFormLoading(false);
    }
  }, [editingProfile]);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setShowBottomSheet(false);
    setEditingProfile(null);
  }, []);

  const renderBusinessCard = useCallback(({ item }: { item: any }) => (
    <View style={[styles.businessCard, { backgroundColor: theme.colors.cardBackground }]}>
      <View style={styles.cardHeader}>
        <View style={styles.businessInfo}>
          <Text style={[styles.businessName, { color: theme.colors.text }]}>
            {item.name || 'Business Name'}
          </Text>
          <Text style={[styles.businessCategory, { color: theme.colors.primary }]}>
            {item.category || 'Category'}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={[styles.rating, { color: theme.colors.text }]}>
              {item.rating || 0} ★
            </Text>
            <Text style={[styles.reviewCount, { color: theme.colors.textSecondary }]}>
              ({item.reviewCount || 0} reviews)
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${theme.colors.primary}20` }]}
            onPress={() => handleEditProfile(item)}
          >
            <Icon name="edit" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${theme.colors.error}20` }]}
            onPress={() => handleDeleteProfile(item.id)}
          >
            <Icon name="delete" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        {item.description || 'No description available'}
      </Text>

      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Icon name="phone" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.contactText, { color: theme.colors.textSecondary }]}>
            {item.phone || 'No phone'}
          </Text>
        </View>
        <View style={styles.contactItem}>
          <Icon name="email" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.contactText, { color: theme.colors.textSecondary }]}>
            {item.email || 'No email'}
          </Text>
        </View>
      </View>

      <View style={styles.servicesContainer}>
        <Text style={[styles.servicesTitle, { color: theme.colors.text }]}>Services:</Text>
        <View style={styles.servicesList}>
          {(item.services || []).slice(0, 3).map((service: string, index: number) => (
            <View key={`${item.id}-service-${index}-${service}`} style={[styles.serviceTag, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Text style={[styles.serviceText, { color: theme.colors.primary }]}>{service}</Text>
            </View>
          ))}
          {(item.services || []).length > 3 && (
            <View key={`${item.id}-more-services`} style={[styles.serviceTag, { backgroundColor: `${theme.colors.textSecondary}20` }]}>
              <Text style={[styles.serviceText, { color: theme.colors.textSecondary }]}>
                +{(item.services || []).length - 3} more
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  ), [theme, handleEditProfile, handleDeleteProfile]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar 
        barStyle="light-content"
        backgroundColor="transparent" 
        translucent 
      />
      
      <LinearGradient
        colors={theme.colors.gradient}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Business Profiles</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.cardBackground }]}
            onPress={handleAddProfile}
          >
            <Icon name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.cardBackground }]}>
            <Icon name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search business profiles..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="clear" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Business Profiles List */}
        <FlatList
          data={profiles}
          renderItem={renderBusinessCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
        />

        {/* Business Profile Form Modal */}
        <BusinessProfileForm
          visible={showForm}
          profile={editingProfile}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
          loading={formLoading}
        />

        {/* Bottom Sheet for Add Profile */}
        <BottomSheet
          title="Add Business Profile"
          visible={showBottomSheet}
          onClose={handleFormClose}
        >
          <BusinessProfileForm
            visible={showBottomSheet}
            profile={null}
            onSubmit={handleFormSubmit}
            onClose={handleFormClose}
            loading={formLoading}
          />
        </BottomSheet>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.05,
    paddingTop: screenHeight * 0.02,
    paddingBottom: screenHeight * 0.02,
  },
  headerTitle: {
    fontSize: Math.min(screenWidth * 0.06, 24),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    width: screenWidth * 0.1,
    height: screenWidth * 0.1,
    borderRadius: screenWidth * 0.05,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    paddingHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.02,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.012,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: screenWidth * 0.03,
    fontSize: Math.min(screenWidth * 0.04, 16),
  },
  listContainer: {
    paddingHorizontal: screenWidth * 0.05,
    paddingBottom: 100, // Add padding to account for tab bar
  },
  businessCard: {
    borderRadius: 15,
    padding: screenWidth * 0.04,
    marginBottom: screenHeight * 0.02,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: screenHeight * 0.015,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: 'bold',
    marginBottom: screenHeight * 0.005,
  },
  businessCategory: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
    marginBottom: screenHeight * 0.005,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
    marginRight: screenWidth * 0.01,
  },
  reviewCount: {
    fontSize: Math.min(screenWidth * 0.03, 12),
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: screenWidth * 0.08,
    height: screenWidth * 0.08,
    borderRadius: screenWidth * 0.04,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: screenWidth * 0.02,
  },
  description: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    lineHeight: 20,
    marginBottom: screenHeight * 0.015,
  },
  contactInfo: {
    marginBottom: screenHeight * 0.015,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.005,
  },
  contactText: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    marginLeft: screenWidth * 0.02,
  },
  servicesContainer: {
    marginTop: screenHeight * 0.01,
  },
  servicesTitle: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
    marginBottom: screenHeight * 0.008,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceTag: {
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.005,
    borderRadius: 15,
    marginRight: screenWidth * 0.02,
    marginBottom: screenHeight * 0.005,
  },
  serviceText: {
    fontSize: Math.min(screenWidth * 0.025, 10),
    fontWeight: '500',
  },
});

export default BusinessProfilesScreen; 