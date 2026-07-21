import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { moderateScale } from '../utils/responsiveUtils';
import businessCategoriesService, { BusinessCategory } from '../services/businessCategoriesService';

const CategorySelectionScreen: React.FC = ({ navigation }: any) => {
  const { theme, isDarkMode } = useTheme();

  // Dynamic dimensions for foldable device compatibility
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;

  const styles = useMemo(() => getStyles(screenWidth, screenHeight, theme), [screenWidth, screenHeight, theme]);

  // Category Selection States
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [subcategories, setSubcategories] = useState<BusinessCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      console.log('📡 [CATEGORY SELECTION] Fetching business categories...');
      const response = await businessCategoriesService.getBusinessCategories();

      if (response.success && response.categories && response.categories.length > 0) {
        const uniqueParentCategories = new Set<string>();
        response.categories.forEach((category: any) => {
          if (category.parentCategoryName && category.parentCategoryName.trim() !== '') {
            uniqueParentCategories.add(category.parentCategoryName.trim());
          }
        });

        const businessCategories = Array.from(uniqueParentCategories).map((parentName, index) => ({
          id: `parent-${index}`,
          name: parentName,
          description: `${parentName} business category`,
          icon: '📄',
          parentCategoryName: undefined
        }));

        setCategories(businessCategories);
      } else {
        setCategories([]);
      }
    } catch (error: any) {
      console.error('❌ [CATEGORY SELECTION] Error fetching categories:', error);
      setCategories([]);
      Alert.alert(
        'Connection Error',
        'Failed to load business categories. Please check your network connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchCategories() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Load Business Categories on Mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch Subcategories
  const fetchSubcategories = async (selectedBusinessCategory: string) => {
    try {
      setIsLoadingSubcategories(true);
      const response = await businessCategoriesService.getBusinessCategories();

      if (response.success && response.categories && response.categories.length > 0) {
        const categorySubcategories = response.categories.filter((category: any) => {
          const parentCategoryName = category.parentCategoryName?.trim().toLowerCase() || '';
          const selectedCategoryLower = selectedBusinessCategory.trim().toLowerCase();
          return parentCategoryName === selectedCategoryLower;
        });

        setSubcategories(categorySubcategories);
      } else {
        setSubcategories([]);
      }
    } catch (error: any) {
      console.error('❌ [CATEGORY SELECTION] Error fetching subcategories:', error);
      setSubcategories([]);
      Alert.alert(
        'Connection Error',
        'Failed to load subcategories. Please check your network connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchSubcategories(selectedBusinessCategory) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsLoadingSubcategories(false);
    }
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedSubcategory('');
    fetchSubcategories(categoryName);
  };

  const handleNext = async () => {
    if (!selectedCategory) {
      Alert.alert('Selection Required', 'Please select a business category to continue.');
      return;
    }
    if (subcategories.length > 0 && !selectedSubcategory) {
      Alert.alert('Selection Required', 'Please select a subcategory to continue.');
      return;
    }

    try {
      await AsyncStorage.setItem('registration_step', 'BusinessProfileCreation');
      await AsyncStorage.setItem('registration_category', selectedCategory);
      await AsyncStorage.setItem('registration_subCategory', selectedSubcategory);
    } catch (err) {
      console.error('Failed to save category selection progress:', err);
    }

    navigation.navigate('BusinessProfileCreation', {
      category: selectedCategory,
      subCategory: selectedSubcategory,
    });
  };

  // Step Indicators (Step 2 Active)
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        {/* Step 1 */}
        <View style={styles.stepWrapper}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
          ]}>
            <Icon name="check" size={16} color="#ffffff" />
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>Verify</Text>
        </View>

        <View style={[styles.stepLine, { backgroundColor: '#4CAF50' }]} />

        {/* Step 2 */}
        <View style={styles.stepWrapper}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
          ]}>
            <Text style={[styles.stepNumber, { color: '#ffffff' }]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.primary }]}>Category</Text>
        </View>

        <View style={[styles.stepLine, { backgroundColor: theme.colors.border }]} />

        {/* Step 3 */}
        <View style={styles.stepWrapper}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }
          ]}>
            <Text style={[styles.stepNumber, { color: theme.colors.textSecondary }]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>Profile</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient colors={theme.colors.gradient} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Image source={require('../assets/MainLogo/main_logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: theme.colors.text }]}>Business Category</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Tell us about your business industry</Text>
          </View>

          <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
            {/* Step indicator */}
            {renderStepIndicator()}

            {/* Step 2 Content */}
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Select Business Category</Text>
              <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                Choose the category and subcategory that represents your business area.
              </Text>

              <View style={styles.categorySection}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Primary Category <Text style={styles.redAsteriskText}>*</Text></Text>
                {isLoadingCategories ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 15 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id || category.name}
                        style={[
                          styles.categoryOption,
                          {
                            backgroundColor: selectedCategory === category.name
                              ? theme.colors.primary
                              : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(102,126,234,0.1)'),
                            borderColor: selectedCategory === category.name
                              ? theme.colors.primary
                              : (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(102,126,234,0.3)'),
                          }
                        ]}
                        onPress={() => handleCategorySelect(category.name)}
                      >
                        <Text style={[
                          styles.categoryOptionText,
                          { color: selectedCategory === category.name ? '#ffffff' : (isDarkMode ? '#ffffff' : theme.colors.primary) }
                        ]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {selectedCategory && subcategories.length > 0 && (
                <View style={[styles.categorySection, { marginTop: 15 }]}>
                  <Text style={[styles.categoryLabel, { color: theme.colors.text }]}>Subcategory <Text style={styles.redAsteriskText}>*</Text></Text>
                  {isLoadingSubcategories ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 15 }} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
                      {subcategories.map((sub) => (
                        <TouchableOpacity
                          key={sub.id || sub.name}
                          style={[
                            styles.categoryOption,
                            {
                              backgroundColor: selectedSubcategory === sub.name
                                ? theme.colors.primary
                                : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(102,126,234,0.1)'),
                              borderColor: selectedSubcategory === sub.name
                                ? theme.colors.primary
                                : (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(102,126,234,0.3)'),
                            }
                          ]}
                          onPress={() => setSelectedSubcategory(sub.name)}
                        >
                          <Text style={[
                            styles.categoryOptionText,
                            { color: selectedSubcategory === sub.name ? '#ffffff' : (isDarkMode ? '#ffffff' : theme.colors.primary) }
                          ]}>
                            {sub.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: moderateScale(10), marginTop: moderateScale(30) }}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.colors.border, flex: 1 }]}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary, flex: 1 }]}
                  onPress={handleNext}
                >
                  <Text style={styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const getStyles = (screenWidth: number, screenHeight: number, theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: moderateScale(25),
  },
  header: {
    alignItems: 'center',
    paddingVertical: moderateScale(30),
  },
  logo: {
    width: moderateScale(90),
    height: moderateScale(90),
    marginBottom: moderateScale(10),
  },
  title: {
    fontSize: moderateScale(26),
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(14),
    textAlign: 'center',
    opacity: 0.85,
    marginTop: moderateScale(5),
  },
  formContainer: {
    marginHorizontal: moderateScale(16),
    borderRadius: moderateScale(24),
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(25),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(10),
    marginBottom: moderateScale(30),
    marginTop: moderateScale(10),
  },
  stepWrapper: {
    alignItems: 'center',
    width: moderateScale(60),
  },
  stepCircle: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: moderateScale(11),
    marginTop: moderateScale(6),
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: moderateScale(2),
    alignSelf: 'center',
    marginBottom: moderateScale(20),
  },
  stepContent: {
    width: '100%',
  },
  stepTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    marginBottom: moderateScale(8),
  },
  stepSubtitle: {
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
    marginBottom: moderateScale(25),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: moderateScale(8),
  },
  categoryLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: moderateScale(8),
  },
  redAsteriskText: {
    color: '#E53E3E',
  },
  categorySection: {
    width: '100%',
  },
  categoryScrollContent: {
    paddingVertical: moderateScale(10),
    gap: moderateScale(10),
  },
  categoryOption: {
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(20),
    borderWidth: 1.5,
    marginRight: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOptionText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  primaryButton: {
    height: moderateScale(50),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  secondaryButton: {
    height: moderateScale(50),
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
});

export default CategorySelectionScreen;
