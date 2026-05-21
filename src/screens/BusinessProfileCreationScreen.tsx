import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import authService from '../services/auth';
import businessProfileService from '../services/businessProfile';
import ImagePickerModal from '../components/ImagePickerModal';
import { getUserFriendlyError } from '../utils/errorHandler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Stable FloatingInput component
const FloatingInput = React.memo(({
  value,
  onChangeText,
  field,
  placeholder,
  focusedField,
  setFocusedField,
  theme,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  hasError = false,
  inputRef,
  returnKeyType = 'next',
  onSubmitEditing,
  blurOnSubmit = false,
  autoCapitalize = 'sentences',
  autoCorrect = true,
}: {
  value: string;
  onChangeText: (text: string) => void;
  field: string;
  placeholder: string;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  theme: any;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
  secureTextEntry?: boolean;
  hasError?: boolean;
  inputRef?: (ref: any) => void;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            borderColor: hasError ? theme.colors.error : (focusedField === field ? theme.colors.primary : theme.colors.border),
            backgroundColor: theme.colors.inputBackground,
          },
          multiline && styles.multilineInput
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField(null)}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={numberOfLines}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        placeholderTextColor={theme.colors.textSecondary}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
      />
    </View>
  );
});

const BusinessProfileCreationScreen: React.FC = ({ navigation, route }: any) => {
  const { theme } = useTheme();
  
  // Category / Subcategory from route params or fallback to storage
  const [category, setCategory] = useState(route.params?.category || '');
  const [subCategory, setSubCategory] = useState(route.params?.subCategory || '');

  // Form Fields
  const [phone, setPhone] = useState('');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState({
    companyName: '',
    description: '',
    address: '',
    email: '',
    alternatePhone: '',
    website: '',
  });

  // State Management
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Modals / Animation States
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const modalAnimation = useRef(new Animated.Value(0)).current;

  // Retrieve Phone, Category, and Subcategory from storage on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const userJson = await AsyncStorage.getItem('currentUser');
        if (userJson) {
          const user = JSON.parse(userJson);
          setPhone(user.phoneNumber || user.phone || '');
        }

        // If categories are empty, attempt to load them from AsyncStorage
        if (!category) {
          const savedCat = await AsyncStorage.getItem('registration_category');
          const savedSubCat = await AsyncStorage.getItem('registration_subCategory');
          if (savedCat) setCategory(savedCat);
          if (savedSubCat) setSubCategory(savedSubCat || '');
        }
      } catch (error) {
        console.error('Failed to load saved wizard data from storage:', error);
      }
    };
    loadSavedData();
  }, []);

  const handleInputChange = (field: keyof typeof businessProfile, value: string) => {
    setBusinessProfile(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!businessProfile.companyName.trim()) {
      errors.companyName = 'Company name is required';
    } else if (!/^[a-zA-Z0-9\s]+$/.test(businessProfile.companyName.trim())) {
      errors.companyName = 'Company name can only contain letters, numbers, and spaces';
    }

    // if (!businessProfile.address.trim()) {
    //   errors.address = 'Company address is required';
    // }

    if (businessProfile.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessProfile.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCompleteRegistration = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      console.log('Submitting Business Profile Creation data...');
      
      const profileData = {
        name: businessProfile.companyName.trim(),
        description: businessProfile.description.trim(),
        category: category,
        businessSubcategory: subCategory || undefined,
        address: businessProfile.address.trim(),
        phone: phone.trim(),
        alternatePhone: businessProfile.alternatePhone.trim() || undefined,
        email: businessProfile.email.trim(),
        website: businessProfile.website.trim() || undefined,
        companyLogo: logoImage || undefined,
      };

      // Calls business profile creation (auto uploads the logo if present)
      await businessProfileService.createBusinessProfile(profileData);

      // Fetch the updated user profile from backend
      console.log('Fetching fresh updated profile details...');
      const freshUser = await authService.getUserProfile();

      // Clear registration wizard progress from AsyncStorage
      try {
        await AsyncStorage.multiRemove([
          'registration_step',
          'registration_phone',
          'registration_category',
          'registration_subCategory'
        ]);
      } catch (err) {
        console.error('Failed to clear registration wizard keys:', err);
      }

      // Trigger global auth context switch to transition navigation state
      console.log('Completing registration. Activating main stack.');
      authService.setCurrentUser(freshUser);

    } catch (error: any) {
      console.error('Registration Complete Error:', error);
      const message = getUserFriendlyError(error);
      setErrorMessage(message || 'Failed to complete profile creation.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePickerPress = () => {
    setShowImagePickerModal(true);
  };

  const handleImageSelected = (imageUri: string) => {
    setLogoImage(imageUri);
    setShowImagePickerModal(false);
  };

  const hideModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowErrorModal(false);
    });
  };

  const showModal = () => {
    setShowErrorModal(true);
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (showErrorModal) {
      showModal();
    }
  }, [showErrorModal]);

  // Step Indicators (Step 3 Active)
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
            { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
          ]}>
            <Icon name="check" size={16} color="#ffffff" />
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>Category</Text>
        </View>

        <View style={[styles.stepLine, { backgroundColor: '#4CAF50' }]} />

        {/* Step 3 */}
        <View style={styles.stepWrapper}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
          ]}>
            <Text style={[styles.stepNumber, { color: '#ffffff' }]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.primary }]}>Profile</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={theme.colors.gradient} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Image source={require('../assets/MainLogo/main_logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={[styles.title, { color: '#ffffff' }]}>Business Profile</Text>
              <Text style={[styles.subtitle, { color: '#ffffff' }]}>Setup your business information</Text>
            </View>

            <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Step indicator */}
              {renderStepIndicator()}

              {/* Step 3 Content */}
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Business Profile</Text>
                <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                  Provide your company details and logo to complete registration.
                </Text>

                {/* Logo Selection */}
                <View style={styles.logoSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Company Logo</Text>
                  {logoImage ? (
                    <View style={styles.logoContainer}>
                      <Image source={{ uri: logoImage }} style={styles.logoImage} resizeMode="cover" />
                      <View style={styles.logoActionButtons}>
                        <TouchableOpacity style={styles.logoActionButton} onPress={handleImagePickerPress}>
                          <Icon name="edit" size={16} color="#ffffff" style={styles.buttonIcon} />
                          <Text style={styles.logoActionButtonText}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.logoActionButton, styles.removeLogoButton]} onPress={() => setLogoImage(null)}>
                          <Icon name="delete" size={16} color="#ffffff" style={styles.buttonIcon} />
                          <Text style={styles.logoActionButtonText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <TouchableOpacity style={styles.uploadAreaButton} onPress={handleImagePickerPress}>
                        <Icon name="add-a-photo" size={24} color="#667eea" />
                        <Text style={[styles.logoPlaceholderTitle, { color: theme.colors.text }]}>Upload Company Logo</Text>
                        <Text style={[styles.logoPlaceholderSubtext, { color: theme.colors.textSecondary }]}>Tap to select from gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Fields */}
                <View style={styles.section}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Company Name <Text style={styles.redAsteriskText}>*</Text></Text>
                  <FloatingInput
                    value={businessProfile.companyName}
                    onChangeText={(val) => handleInputChange('companyName', val)}
                    field="companyName"
                    placeholder="Enter company name"
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    theme={theme}
                    hasError={!!validationErrors.companyName}
                  />
                  {validationErrors.companyName && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{validationErrors.companyName}</Text>
                  )}

                  <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 15 }]}>Business Email (Optional)</Text>
                  <FloatingInput
                    value={businessProfile.email}
                    onChangeText={(val) => handleInputChange('email', val)}
                    field="email"
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    theme={theme}
                    hasError={!!validationErrors.email}
                  />
                  {validationErrors.email && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{validationErrors.email}</Text>
                  )}

                  {/* 
                  <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 15 }]}>Business Phone (Verified)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textSecondary, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
                    value={phone}
                    editable={false}
                  />

                  <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 15 }]}>Alternate Phone (Optional)</Text>
                  <FloatingInput
                    value={businessProfile.alternatePhone}
                    onChangeText={(val) => handleInputChange('alternatePhone', val)}
                    field="alternatePhone"
                    placeholder="Enter alternate phone number"
                    keyboardType="phone-pad"
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    theme={theme}
                  />

                  <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 15 }]}>Company Address <Text style={styles.redAsteriskText}>*</Text></Text>
                  <FloatingInput
                    value={businessProfile.address}
                    onChangeText={(val) => handleInputChange('address', val)}
                    field="address"
                    placeholder="Enter company address"
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    theme={theme}
                    hasError={!!validationErrors.address}
                  />
                  {validationErrors.address && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{validationErrors.address}</Text>
                  )}

                  <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 15 }]}>Company Website (Optional)</Text>
                  <FloatingInput
                    value={businessProfile.website}
                    onChangeText={(val) => handleInputChange('website', val)}
                    field="website"
                    placeholder="https://example.com"
                    keyboardType="url"
                    autoCapitalize="none"
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    theme={theme}
                  />

                  <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 15 }]}>Company Description (Optional)</Text>
                  <FloatingInput
                    value={businessProfile.description}
                    onChangeText={(val) => handleInputChange('description', val)}
                    field="description"
                    placeholder="Enter description"
                    multiline={true}
                    numberOfLines={3}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    theme={theme}
                  />
                  */}
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: theme.colors.border, flex: 1 }]}
                    onPress={() => navigation.goBack()}
                    disabled={isLoading}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary, flex: 1.5 }]}
                    onPress={handleCompleteRegistration}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Complete Registration</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Error Modal */}
      <Modal visible={showErrorModal} transparent={true} animationType="fade" onRequestClose={hideModal} statusBarTranslucent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={hideModal}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalIconContainer}>
                <Icon name="error-outline" size={40} color={theme.colors.error} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Registration Error</Text>
              <View style={styles.modalContent}>
                <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>{errorMessage}</Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.primary }]} onPress={hideModal}>
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Image Picker Modal */}
      <ImagePickerModal
        visible={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onImageSelected={handleImageSelected}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 25,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.85,
    marginTop: 5,
  },
  formContainer: {
    marginHorizontal: 16,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 25,
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
    paddingHorizontal: 10,
    marginBottom: 30,
    marginTop: 10,
  },
  stepWrapper: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  stepContent: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 25,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  redAsteriskText: {
    color: '#E53E3E',
  },
  errorText: {
    fontSize: 12,
    color: '#E53E3E',
    marginTop: 4,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  logoActionButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  logoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3182CE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeLogoButton: {
    backgroundColor: '#E53E3E',
  },
  buttonIcon: {
    marginRight: 4,
  },
  logoActionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadAreaButton: {
    alignItems: 'center',
  },
  logoPlaceholderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  logoPlaceholderSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.85,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalContent: {
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    width: '100%',
  },
  modalButton: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    width: '100%',
  },
});

export default BusinessProfileCreationScreen;
