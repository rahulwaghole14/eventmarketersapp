import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { useTheme } from '../context/ThemeContext';
import authService from '../services/auth';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive design helpers
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414;
const isTablet = screenWidth >= 768;
const isLandscape = screenWidth > screenHeight;

// Create a stable FloatingInput component outside the main component
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
  autoCapitalize = 'words'
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
  autoCapitalize?: 'words' | 'none';
}) => (
  <View style={styles.inputContainer}>
    <TextInput
      style={[
        styles.input,
        { 
          backgroundColor: theme.colors.inputBackground,
          color: theme.colors.text,
          borderColor: theme.colors.border
        },
        focusedField === field && [styles.inputFocused, { borderColor: theme.colors.primary }],
        multiline && styles.multilineInput
      ]}
              value={value}
      onChangeText={onChangeText}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField(null)}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textSecondary}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        blurOnSubmit={false}
        returnKeyType="next"
        autoCorrect={false}
        spellCheck={false}
        textContentType="none"
    />
  </View>
));

const RegistrationScreen: React.FC = ({ navigation }: any) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    address: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    companyLogo: '',
    password: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    'Event Planners',
    'Decorators',
    'Sound Suppliers',
    'Light Suppliers',
    'Video Services',
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };



  const handleImagePicker = (type: 'camera' | 'gallery') => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8 as const,
    };

    if (type === 'camera') {
      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorCode) {
          Alert.alert('Error', 'Failed to take photo');
        } else if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setLogoImage(asset.uri || null);
          setFormData(prev => ({
            ...prev,
            companyLogo: asset.uri || '',
          }));
        }
      });
    } else {
      launchImageLibrary(options, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          Alert.alert('Error', 'Failed to pick image');
        } else if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setLogoImage(asset.uri || null);
          setFormData(prev => ({
            ...prev,
            companyLogo: asset.uri || '',
          }));
        }
      });
    }
  };

  const handleImagePickerWithClose = (type: 'camera' | 'gallery') => {
    handleImagePicker(type);
    setShowUploadModal(false);
  };

  const handleRegister = async () => {
    // Basic validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    if (!formData.category.trim()) {
      Alert.alert('Error', 'Business category is required');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Address is required');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    if (!formData.password || !formData.confirmPassword) {
      Alert.alert('Error', 'Password fields are required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await authService.registerUser({
        companyName: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      Alert.alert('Success', 'Registration successful! Please sign in.');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <LinearGradient
        colors={theme.colors.gradient}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Business Registration</Text>
            <TouchableOpacity 
              onPress={handleRegister} 
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>REGISTER</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            {/* Company Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Information</Text>
              
              <FloatingInput
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                field="name"
                placeholder="Enter company name"
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                theme={theme}
              />

              <FloatingInput
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                field="description"
                placeholder="Enter company description"
                multiline
                numberOfLines={3}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                theme={theme}
              />

              {/* Company Logo Upload */}
              <View style={styles.inputContainer}>
                <Text style={styles.sectionTitle}>
                  Company Logo
                </Text>
                <View style={[
                  styles.logoUploadContainer,
                  { 
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border
                  },
                  focusedField === 'logo' && [styles.inputFocused, { borderColor: theme.colors.primary }]
                ]}>
                  {logoImage ? (
                    <View style={styles.logoPreviewContainer}>
                      <View style={styles.logoPreviewWrapper}>
                        <Image source={{ uri: logoImage }} style={styles.logoPreview} />
                        <View style={styles.logoOverlay}>
                          <Icon name="photo" size={24} color="#ffffff" />
                        </View>
                      </View>
                      <View style={styles.logoActionButtons}>
                        <TouchableOpacity 
                          style={styles.logoActionButton}
                          onPress={() => setShowUploadModal(true)}
                        >
                          <Icon name="edit" size={16} color="#ffffff" style={styles.buttonIcon} />
                          <Text style={styles.logoActionButtonText}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.logoActionButton, styles.removeLogoButton]}
                          onPress={() => {
                            setLogoImage(null);
                            setFormData(prev => ({ ...prev, companyLogo: '' }));
                          }}
                        >
                          <Icon name="delete" size={16} color="#ffffff" style={styles.buttonIcon} />
                          <Text style={styles.logoActionButtonText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <TouchableOpacity 
                        style={styles.uploadAreaButton}
                        onPress={() => setShowUploadModal(true)}
                      >
                        <View style={styles.logoIconContainer}>
                          <Icon name="add-a-photo" size={24} color="#667eea" />
                        </View>
                        <Text style={[styles.logoPlaceholderTitle, { color: theme.colors.text }]}>Upload Company Logo</Text>
                        <Text style={[styles.logoPlaceholderSubtext, { color: theme.colors.textSecondary }]}>Tap to select from gallery or take a photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.sectionTitle}>
                  Business Category *
                </Text>
                <View style={[
                  styles.pickerContainer,
                  { 
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border
                  },
                  focusedField === 'category' && [styles.inputFocused, { borderColor: theme.colors.primary }]
                ]}>
                  <Text style={[styles.pickerText, { color: formData.category ? theme.colors.text : theme.colors.textSecondary }]}>
                    {formData.category || 'Select business category'}
                  </Text>
                </View>
                <View style={styles.categoryOptions}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        { backgroundColor: 'rgba(255,255,255,0.2)' },
                        formData.category === category && [styles.categoryOptionSelected, { backgroundColor: theme.colors.primary }]
                      ]}
                      onPress={() => handleInputChange('category', category)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        { color: formData.category === category ? '#ffffff' : '#ffffff' },
                        formData.category === category && [styles.categoryOptionTextSelected, { color: '#ffffff' }]
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>


            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <FloatingInput
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                field="phone"
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                theme={theme}
              />

                <FloatingInput
                value={formData.alternatePhone || ''}
                onChangeText={(value) => handleInputChange('alternatePhone', value)}
                field="alternatePhone"
                placeholder="Enter alternate phone number"
                keyboardType="phone-pad"
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  theme={theme}
                />

                <FloatingInput
                  value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                  field="email"
                placeholder="Enter email address"
                keyboardType="email-address"
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                theme={theme}
              />

              <FloatingInput
                value={formData.website || ''}
                onChangeText={(value) => handleInputChange('website', value)}
                field="website"
                placeholder="Enter company website URL"
                keyboardType="url"
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                theme={theme}
              />

              <FloatingInput
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                field="address"
                placeholder="Enter company address"
                multiline
                numberOfLines={2}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                theme={theme}
              />
            </View>

            

            {/* Account Security */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Security</Text>
              
              <FloatingInput
                  value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                  field="password"
                placeholder="Enter password"
                secureTextEntry={true}
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  theme={theme}
                  autoCapitalize="none"
                />

                <FloatingInput
                  value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  field="confirmPassword"
                placeholder="Confirm password"
                secureTextEntry={true}
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  theme={theme}
                  autoCapitalize="none"
                />
            </View>

                        {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: 'rgba(255,255,255,0.8)' }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.footerLink, { color: '#ffffff' }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Bottom Spacer for Navigation */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
                   </KeyboardAvoidingView>
        </LinearGradient>

      {/* Upload Options Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUploadModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping inside modal
          >
            <View style={[styles.uploadModalContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.uploadModalHeader}>
                <Text style={[styles.uploadModalTitle, { color: theme.colors.text }]}>Upload Company Logo</Text>
                <TouchableOpacity 
                  style={[styles.closeModalButton, { backgroundColor: theme.colors.inputBackground }]}
                  onPress={() => setShowUploadModal(false)}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={Math.min(screenWidth * 0.06, 24)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.uploadModalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={[styles.uploadModalSubtitle, { color: theme.colors.textSecondary }]}>
                  Choose how you want to add your company logo
                </Text>
                
                <View style={styles.uploadModalOptions}>
                  <TouchableOpacity 
                    style={[styles.uploadModalOption, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
                    onPress={() => handleImagePickerWithClose('gallery')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.uploadModalOptionIcon, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <Icon name="photo-library" size={Math.min(screenWidth * 0.07, 28)} color={theme.colors.primary} />
                    </View>
                    <View style={styles.uploadModalOptionContent}>
                      <Text style={[styles.uploadModalOptionTitle, { color: theme.colors.text }]}>Gallery</Text>
                      <Text style={[styles.uploadModalOptionSubtitle, { color: theme.colors.textSecondary }]}>Choose from your photos</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.uploadModalOption, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
                    onPress={() => handleImagePickerWithClose('camera')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.uploadModalOptionIcon, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <Icon name="camera-alt" size={Math.min(screenWidth * 0.07, 28)} color={theme.colors.primary} />
                    </View>
                    <View style={styles.uploadModalOptionContent}>
                      <Text style={[styles.uploadModalOptionTitle, { color: theme.colors.text }]}>Camera</Text>
                      <Text style={[styles.uploadModalOptionSubtitle, { color: theme.colors.textSecondary }]}>Take a new photo</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              
              <TouchableOpacity 
                style={[styles.cancelModalButton, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={[styles.cancelModalText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: isTablet ? screenHeight * 0.04 : screenHeight * 0.06,
    paddingHorizontal: isTablet ? screenWidth * 0.03 : screenWidth * 0.05,
    paddingBottom: isTablet ? screenHeight * 0.015 : screenHeight * 0.02,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: isTablet ? screenWidth * 0.025 : screenWidth * 0.04,
    paddingVertical: isTablet ? screenHeight * 0.008 : screenHeight * 0.01,
    borderRadius: isTablet ? 16 : 20,
  },
  closeButtonText: {
    fontSize: isTablet ? 14 : Math.min(screenWidth * 0.03, 12),
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: isTablet ? 24 : Math.min(screenWidth * 0.05, 20),
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: isTablet ? screenWidth * 0.025 : screenWidth * 0.04,
    paddingVertical: isTablet ? screenHeight * 0.008 : screenHeight * 0.01,
    borderRadius: isTablet ? 16 : 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: isTablet ? 14 : Math.min(screenWidth * 0.03, 12),
  },
  content: {
    flex: 1,
    paddingHorizontal: isTablet ? screenWidth * 0.03 : screenWidth * 0.05,
  },
  scrollContent: {
    paddingBottom: isTablet ? screenHeight * 0.08 : screenHeight * 0.12,
    flexGrow: 1,
  },
  section: {
    marginBottom: isTablet ? screenHeight * 0.025 : screenHeight * 0.03,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : Math.min(screenWidth * 0.045, 18),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: isTablet ? screenHeight * 0.015 : screenHeight * 0.02,
  },
  inputContainer: {
    marginBottom: isTablet ? screenHeight * 0.015 : screenHeight * 0.02,
  },
  input: {
    borderRadius: isTablet ? 16 : 12,
    paddingHorizontal: isTablet ? screenWidth * 0.025 : screenWidth * 0.04,
    paddingVertical: isTablet ? screenHeight * 0.012 : screenHeight * 0.015,
    fontSize: isTablet ? 18 : Math.min(screenWidth * 0.04, 16),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    minHeight: isTablet ? 56 : 48,
  },
  inputFocused: {
    borderWidth: 2,
  },
  multilineInput: {
    minHeight: isTablet ? screenHeight * 0.06 : screenHeight * 0.08,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderRadius: isTablet ? 16 : 12,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.015,
    paddingTop: screenHeight * 0.025,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  pickerText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
  },
  categoryOptions: {
    marginTop: screenHeight * 0.01,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryOption: {
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.006,
    borderRadius: 15,
    marginRight: screenWidth * 0.02,
    marginBottom: screenHeight * 0.008,
  },
  categoryOptionSelected: {
    // backgroundColor will be set dynamically
  },
  categoryOptionText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
  },
  categoryOptionTextSelected: {
    fontWeight: '600',
  },

  logoUploadContainer: {
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? screenWidth * 0.025 : screenWidth * 0.04,
    borderWidth: 2,
    borderStyle: 'dashed',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isTablet ? screenHeight * 0.08 : screenHeight * 0.12,
    position: 'relative',
  },
  logoPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: screenWidth * 0.02,
  },
  logoPreviewWrapper: {
    position: 'relative',
    marginBottom: screenHeight * 0.02,
  },
  logoPreview: {
    width: isTablet ? screenWidth * 0.15 : screenWidth * 0.2,
    height: isTablet ? screenWidth * 0.15 : screenWidth * 0.2,
    borderRadius: isTablet ? 20 : 16,
    borderWidth: 3,
    borderColor: '#667eea',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoActionButtons: {
    flexDirection: 'row',
    gap: screenWidth * 0.025,
  },
  logoActionButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: isTablet ? screenWidth * 0.025 : screenWidth * 0.04,
    paddingVertical: isTablet ? screenHeight * 0.008 : screenHeight * 0.01,
    borderRadius: isTablet ? 20 : 25,
    minWidth: isTablet ? screenWidth * 0.12 : screenWidth * 0.14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoActionButtonText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: screenWidth * 0.015,
  },
  removeLogoButton: {
    backgroundColor: '#ff4757',
    shadowColor: '#ff4757',
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: screenWidth * 0.04,
    width: '100%',
  },
  logoIconContainer: {
    width: isTablet ? screenWidth * 0.08 : screenWidth * 0.1,
    height: isTablet ? screenWidth * 0.08 : screenWidth * 0.1,
    borderRadius: isTablet ? screenWidth * 0.04 : screenWidth * 0.05,
    backgroundColor: '#f8faff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTablet ? screenHeight * 0.01 : screenHeight * 0.015,
    borderWidth: 2,
    borderColor: '#e8f2ff',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoPlaceholderTitle: {
    fontSize: isTablet ? 18 : Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
    marginBottom: isTablet ? screenHeight * 0.004 : screenHeight * 0.005,
    textAlign: 'center',
  },
  logoPlaceholderSubtext: {
    fontSize: isTablet ? 15 : Math.min(screenWidth * 0.032, 13),
    marginBottom: 0,
    textAlign: 'center',
    lineHeight: isTablet ? 18 : 16,
  },
  uploadAreaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: screenWidth * 0.03,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTablet ? screenHeight * 0.03 : screenHeight * 0.04,
    paddingBottom: isTablet ? screenHeight * 0.02 : screenHeight * 0.03,
    paddingTop: screenHeight * 0.02,
  },
  footerText: {
    fontSize: isTablet ? 16 : Math.min(screenWidth * 0.035, 14),
  },
  footerLink: {
    fontSize: isTablet ? 16 : Math.min(screenWidth * 0.035, 14),
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Math.min(screenWidth * 0.05, 20),
  },
  uploadModalContainer: {
    borderRadius: isTablet ? 28 : Math.min(screenWidth * 0.06, 24),
    padding: isTablet ? 32 : Math.min(screenWidth * 0.06, 24),
    width: '100%',
    maxWidth: isTablet ? 500 : Math.min(screenWidth * 0.9, 420),
    minWidth: isTablet ? 400 : Math.min(screenWidth * 0.8, 320),
    maxHeight: screenHeight * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 25,
    position: 'relative',
  },
  uploadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 24 : Math.min(screenHeight * 0.025, 20),
    paddingBottom: isTablet ? 16 : Math.min(screenHeight * 0.015, 12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  uploadModalTitle: {
    fontSize: isTablet ? 26 : Math.min(screenWidth * 0.055, 22),
    fontWeight: '700',
    flex: 1,
    marginRight: isTablet ? 16 : Math.min(screenWidth * 0.03, 12),
  },
  closeModalButton: {
    width: isTablet ? 40 : Math.min(screenWidth * 0.08, 32),
    height: isTablet ? 40 : Math.min(screenWidth * 0.08, 32),
    borderRadius: isTablet ? 20 : Math.min(screenWidth * 0.04, 16),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadModalSubtitle: {
    fontSize: isTablet ? 18 : Math.min(screenWidth * 0.04, 16),
    marginBottom: isTablet ? 32 : Math.min(screenHeight * 0.035, 28),
    lineHeight: isTablet ? 24 : Math.min(screenWidth * 0.05, 20),
    opacity: 0.8,
  },
  uploadModalScrollContent: {
    paddingBottom: isTablet ? 20 : Math.min(screenHeight * 0.02, 16),
  },
  uploadModalOptions: {
    gap: isTablet ? 24 : Math.min(screenHeight * 0.025, 20),
    marginBottom: isTablet ? 32 : Math.min(screenHeight * 0.035, 28),
  },
  uploadModalOption: {
    borderRadius: isTablet ? 20 : Math.min(screenWidth * 0.04, 16),
    padding: isTablet ? 24 : Math.min(screenWidth * 0.05, 20),
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: isTablet ? 72 : Math.min(screenHeight * 0.08, 64),
    transform: [{ scale: 1 }],
  },
  uploadModalOptionIcon: {
    width: isTablet ? 56 : Math.min(screenWidth * 0.12, 48),
    height: isTablet ? 56 : Math.min(screenWidth * 0.12, 48),
    borderRadius: isTablet ? 28 : Math.min(screenWidth * 0.06, 24),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isTablet ? 20 : Math.min(screenWidth * 0.04, 16),
    borderWidth: 1,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadModalOptionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  uploadModalOptionTitle: {
    fontSize: isTablet ? 20 : Math.min(screenWidth * 0.045, 18),
    fontWeight: '600',
    marginBottom: isTablet ? 6 : Math.min(screenHeight * 0.005, 4),
  },
  uploadModalOptionSubtitle: {
    fontSize: isTablet ? 17 : Math.min(screenWidth * 0.038, 15),
    opacity: 0.7,
    lineHeight: isTablet ? 22 : Math.min(screenWidth * 0.045, 18),
  },
  cancelModalButton: {
    borderRadius: isTablet ? 16 : Math.min(screenWidth * 0.03, 12),
    paddingVertical: isTablet ? 18 : Math.min(screenHeight * 0.018, 14),
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelModalText: {
    fontSize: isTablet ? 19 : Math.min(screenWidth * 0.042, 17),
    fontWeight: '600',
  },
  bottomSpacer: {
    height: isTablet ? screenHeight * 0.04 : screenHeight * 0.06,
  },
});

export default RegistrationScreen; 