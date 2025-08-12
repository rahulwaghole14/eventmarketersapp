import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { BusinessProfile, CreateBusinessProfileData } from '../services/businessProfile';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
      autoCapitalize={field === 'email' ? 'none' : 'words'}
      blurOnSubmit={false}
      returnKeyType="next"
      autoCorrect={false}
      spellCheck={false}
      textContentType="none"
    />
  </View>
));

interface BusinessProfileFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBusinessProfileData) => void;
  profile?: BusinessProfile | null;
  loading?: boolean;
}

const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  visible,
  onClose,
  onSubmit,
  profile,
  loading = false,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [formData, setFormData] = useState<CreateBusinessProfileData>({
    name: '',
    description: '',
    category: '',
    address: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    companyLogo: '',
    services: [],
    workingHours: {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true },
      wednesday: { open: '09:00', close: '18:00', isOpen: true },
      thursday: { open: '09:00', close: '18:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '10:00', close: '16:00', isOpen: true },
      sunday: { open: '00:00', close: '00:00', isOpen: false },
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
    },
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [newService, setNewService] = useState('');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const categories = [
    'Event Planners',
    'Decorators',
    'Sound Suppliers',
    'Light Suppliers',
  ];

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        description: profile.description,
        category: profile.category,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        website: profile.website || '',
        services: profile.services,
        workingHours: profile.workingHours,
        socialMedia: profile.socialMedia || {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
        },
      });
    } else {
      // Reset form for new profile
      setFormData({
        name: '',
        description: '',
        category: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        services: [],
        workingHours: {
          monday: { open: '09:00', close: '18:00', isOpen: true },
          tuesday: { open: '09:00', close: '18:00', isOpen: true },
          wednesday: { open: '09:00', close: '18:00', isOpen: true },
          thursday: { open: '09:00', close: '18:00', isOpen: true },
          friday: { open: '09:00', close: '18:00', isOpen: true },
          saturday: { open: '10:00', close: '16:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        socialMedia: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
        },
      });
    }
  }, [profile, visible]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value,
      },
    }));
  };

  const addService = () => {
    if (newService.trim()) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()],
      }));
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
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

  const showImagePickerOptions = () => {
    Alert.alert(
      'Upload Company Logo',
      'Choose how you want to add your company logo',
      [
        {
          text: 'Take Photo',
          onPress: () => handleImagePicker('camera'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => handleImagePicker('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleUploadAreaClick = () => {
    setShowUploadModal(true);
  };

  const handleImagePickerWithClose = (type: 'camera' | 'gallery') => {
    handleImagePicker(type);
    setShowUploadModal(false);
  };

  const handleSubmit = () => {
    // Validation
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

    onSubmit(formData);
  };

  

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <LinearGradient
          colors={theme.colors.gradient}
          style={styles.gradientBackground}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {profile ? 'Edit Business Profile' : 'Business Registration'}
            </Text>
            <TouchableOpacity 
              onPress={handleSubmit} 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>{profile ? 'SAVE' : 'REGISTER'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
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
                          onPress={showImagePickerOptions}
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
                         onPress={handleUploadAreaClick}
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
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>

    {/* Upload Options Modal */}
    <Modal
      visible={showUploadModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowUploadModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.uploadModalContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.uploadModalHeader}>
            <Text style={[styles.uploadModalTitle, { color: theme.colors.text }]}>Upload Company Logo</Text>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowUploadModal(false)}
            >
              <Icon name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.uploadModalSubtitle, { color: theme.colors.textSecondary }]}>
            Choose how you want to add your company logo
          </Text>
          
          <View style={styles.uploadModalOptions}>
            <TouchableOpacity 
              style={[styles.uploadModalOption, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
              onPress={() => handleImagePickerWithClose('gallery')}
            >
              <View style={[styles.uploadModalOptionIcon, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Icon name="photo-library" size={28} color={theme.colors.primary} />
              </View>
              <Text style={[styles.uploadModalOptionTitle, { color: theme.colors.text }]}>Gallery</Text>
              <Text style={[styles.uploadModalOptionSubtitle, { color: theme.colors.textSecondary }]}>Choose from your photos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.uploadModalOption, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
              onPress={() => handleImagePickerWithClose('camera')}
            >
              <View style={[styles.uploadModalOptionIcon, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Icon name="camera-alt" size={28} color={theme.colors.primary} />
              </View>
              <Text style={[styles.uploadModalOptionTitle, { color: theme.colors.text }]}>Camera</Text>
              <Text style={[styles.uploadModalOptionSubtitle, { color: theme.colors.textSecondary }]}>Take a new photo</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.cancelModalButton, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
            onPress={() => setShowUploadModal(false)}
          >
            <Text style={[styles.cancelModalText, { color: theme.colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>
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
    paddingTop: screenHeight * 0.06,
    paddingHorizontal: screenWidth * 0.05,
    paddingBottom: screenHeight * 0.02,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.01,
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: Math.min(screenWidth * 0.05, 20),
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.01,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: Math.min(screenWidth * 0.03, 12),
  },
  content: {
    flex: 1,
    paddingHorizontal: screenWidth * 0.05,
  },
  section: {
    marginBottom: screenHeight * 0.03,
  },
  sectionTitle: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: screenHeight * 0.02,
  },
  inputContainer: {
    marginBottom: screenHeight * 0.02,
  },

  input: {
    borderRadius: 12,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.015,
    fontSize: Math.min(screenWidth * 0.04, 16),
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
  inputFocused: {
    borderWidth: 2,
  },
  multilineInput: {
    minHeight: screenHeight * 0.08,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderRadius: 12,
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
  servicesInput: {
    flexDirection: 'row',
    marginBottom: screenHeight * 0.015,
  },
  serviceInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.012,
    fontSize: Math.min(screenWidth * 0.04, 16),
    color: '#333333',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: screenWidth * 0.025,
  },
  addServiceButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.012,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addServiceButtonText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: '#ffffff',
    fontWeight: 'bold',
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceTag: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.006,
    borderRadius: 15,
    marginRight: screenWidth * 0.02,
    marginBottom: screenHeight * 0.008,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  serviceTagText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: '#333',
    marginRight: screenWidth * 0.015,
  },
  removeServiceText: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    color: '#ff4444',
    fontWeight: 'bold',
  },
  logoUploadContainer: {
    borderRadius: 16,
    padding: screenWidth * 0.04,
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
    minHeight: screenHeight * 0.12,
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
    width: screenWidth * 0.2,
    height: screenWidth * 0.2,
    borderRadius: 16,
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
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.01,
    borderRadius: 25,
    minWidth: screenWidth * 0.14,
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
    width: screenWidth * 0.1,
    height: screenWidth * 0.1,
    borderRadius: screenWidth * 0.05,
    backgroundColor: '#f8faff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: screenHeight * 0.015,
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
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
    marginBottom: screenHeight * 0.005,
    textAlign: 'center',
  },
  logoPlaceholderSubtext: {
    fontSize: Math.min(screenWidth * 0.032, 13),
    marginBottom: 0,
    textAlign: 'center',
    lineHeight: 16,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: screenWidth * 0.04,
    marginTop: screenHeight * 0.01,
  },
  uploadOption: {
    backgroundColor: '#ffffff',
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.015,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: screenWidth * 0.18,
    borderWidth: 2,
    borderColor: '#e8f2ff',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadOptionIconContainer: {
    width: screenWidth * 0.08,
    height: screenWidth * 0.08,
    borderRadius: screenWidth * 0.04,
    backgroundColor: '#f8faff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: screenHeight * 0.008,
    borderWidth: 1,
    borderColor: '#e8f2ff',
  },
  uploadOptionText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: '#2c3e50',
    fontWeight: '600',
  },
  uploadAreaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: screenWidth * 0.03,
  },
  cancelUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.008,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: screenHeight * 0.015,
  },
  cancelUploadText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: '#7f8c8d',
    fontWeight: '500',
    marginLeft: screenWidth * 0.01,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadModalContainer: {
    borderRadius: 24,
    padding: screenWidth * 0.06,
    width: screenWidth * 0.85,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  uploadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: screenHeight * 0.02,
  },
  uploadModalTitle: {
    fontSize: Math.min(screenWidth * 0.05, 20),
    fontWeight: '700',
  },
  closeModalButton: {
    padding: screenWidth * 0.01,
  },
  uploadModalSubtitle: {
    fontSize: Math.min(screenWidth * 0.038, 15),
    marginBottom: screenHeight * 0.03,
    lineHeight: 20,
  },
  uploadModalOptions: {
    gap: screenHeight * 0.02,
    marginBottom: screenHeight * 0.03,
  },
  uploadModalOption: {
    borderRadius: 16,
    padding: screenWidth * 0.05,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadModalOptionIcon: {
    width: screenWidth * 0.12,
    height: screenWidth * 0.12,
    borderRadius: screenWidth * 0.06,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: screenWidth * 0.04,
    borderWidth: 1,
  },
  uploadModalOptionTitle: {
    fontSize: Math.min(screenWidth * 0.042, 17),
    fontWeight: '600',
    marginBottom: screenHeight * 0.002,
  },
  uploadModalOptionSubtitle: {
    fontSize: Math.min(screenWidth * 0.035, 14),
  },
  cancelModalButton: {
    borderRadius: 12,
    paddingVertical: screenHeight * 0.015,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelModalText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
  },
});

export default BusinessProfileForm; 