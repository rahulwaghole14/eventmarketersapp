import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/AppNavigator';
import dashboardService, { Banner, Template, Category } from '../services/dashboard';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HomeScreen: React.FC = React.memo(() => {
  const { isDarkMode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(0);
  const [disableBackgroundUpdates, setDisableBackgroundUpdates] = useState(false);
  const [isUpcomingEventsModalVisible, setIsUpcomingEventsModalVisible] = useState(false);
  const [isImagePreviewModalVisible, setIsImagePreviewModalVisible] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState<{
    uri: string;
    title?: string;
    description?: string;
  } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Language options
  const languages = [
    { id: 'english', name: 'English', code: 'EN' },
    { id: 'marathi', name: 'Marathi', code: 'MR' },
    { id: 'hindi', name: 'Hindi', code: 'HI' },
  ];

  // Language-specific images for each template
  const languageSpecificImages = useMemo(() => ({
    '1': {
      english: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
    },
    '2': {
      english: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
    },
    '3': {
      english: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
    },
    '4': {
      english: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop',
    },
    '5': {
      english: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=300&h=200&fit=crop',
    },
    '6': {
      english: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
    },
    '7': {
      english: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop',
    },
    '8': {
      english: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
    },
    '9': {
      english: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=300&h=200&fit=crop',
    },
    '10': {
      english: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
    },
    '11': {
      english: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop',
    },
    '12': {
      english: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
      marathi: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=300&h=200&fit=crop',
      hindi: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=200&fit=crop',
    },
  }), []);

  // Memoized mock data to prevent recreation on every render
  const mockBanners: Banner[] = useMemo(() => [
    {
      id: '1',
      title: 'Professional Event Planning',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
      link: '#',
    },
    {
      id: '2',
      title: 'Creative Decorations',
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=200&fit=crop',
      link: '#',
    },
    {
      id: '3',
      title: 'Sound & Light Solutions',
      imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=200&fit=crop',
      link: '#',
    },
  ], []);

  const mockTemplates: Template[] = useMemo(() => [
    {
      id: '1',
      name: 'Wedding Planning',
      thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
      category: 'Event Planners',
      likes: 156,
      downloads: 89,
      isLiked: false,
      isDownloaded: false,
    },
    {
      id: '2',
      name: 'Corporate Event Setup',
      thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
      category: 'Event Planners',
      likes: 234,
      downloads: 167,
      isLiked: true,
      isDownloaded: false,
    },
    {
      id: '3',
      name: 'Birthday Celebration',
      thumbnail: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
      category: 'Event Planners',
      likes: 89,
      downloads: 45,
      isLiked: false,
      isDownloaded: true,
    },
    {
      id: '4',
      name: 'Floral Decorations',
      thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop',
      category: 'Decorators',
      likes: 312,
      downloads: 198,
      isLiked: false,
      isDownloaded: false,
    },
    {
      id: '5',
      name: 'Balloon Arrangements',
      thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
      category: 'Decorators',
      likes: 178,
      downloads: 123,
      isLiked: true,
      isDownloaded: false,
    },
    {
      id: '6',
      name: 'Table Settings',
      thumbnail: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
      category: 'Decorators',
      likes: 145,
      downloads: 87,
      isLiked: false,
      isDownloaded: false,
    },
    {
      id: '7',
      name: 'Stage Lighting',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
      category: 'Light Suppliers',
      likes: 203,
      downloads: 134,
      isLiked: false,
      isDownloaded: false,
    },
    {
      id: '8',
      name: 'Sound System Setup',
      thumbnail: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=300&h=200&fit=crop',
      category: 'Sound Suppliers',
      likes: 167,
      downloads: 98,
      isLiked: true,
      isDownloaded: false,
    },
    {
      id: '9',
      name: 'DJ Equipment',
      thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop',
      category: 'Sound Suppliers',
      likes: 145,
      downloads: 76,
      isLiked: false,
      isDownloaded: true,
    },
    {
      id: '10',
      name: 'LED Displays',
      thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=200&fit=crop',
      category: 'Light Suppliers',
      likes: 189,
      downloads: 112,
      isLiked: false,
      isDownloaded: false,
    },
    {
      id: '11',
      name: 'Conference Setup',
      thumbnail: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=300&h=200&fit=crop',
      category: 'Event Planners',
      likes: 234,
      downloads: 156,
      isLiked: true,
      isDownloaded: false,
    },
    {
      id: '12',
      name: 'Wedding Decor',
      thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
      category: 'Decorators',
      likes: 178,
      downloads: 89,
      isLiked: false,
      isDownloaded: false,
    },
    // Video templates
    {
      id: 'video-1',
      name: 'Event Promo Video',
      thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
      category: 'Video',
      likes: 234,
      downloads: 156,
      isLiked: false,
      isDownloaded: false,
    },
    {
      id: 'video-2',
      name: 'Wedding Highlight Video',
      thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
      category: 'Video',
      likes: 189,
      downloads: 123,
      isLiked: false,
      isDownloaded: false,
    },
    {
      id: 'video-3',
      name: 'Corporate Event Video',
      thumbnail: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
      category: 'Video',
      likes: 167,
      downloads: 98,
      isLiked: false,
      isDownloaded: false,
    },
  ], []);

  const mockCategories: Category[] = useMemo(() => [
    { id: 'all', name: 'All' },
    { id: 'event-planners', name: 'Event Planners' },
    { id: 'decorators', name: 'Decorators' },
    { id: 'sound-suppliers', name: 'Sound Suppliers' },
    { id: 'light-suppliers', name: 'Light Suppliers' },
    { id: 'video', name: 'Video' },
  ], []);



  const mockUpcomingEvents = useMemo(() => [
    {
      id: '1',
      title: 'Tech Conference 2024',
      date: 'Dec 15, 2024',
      time: '9:00 AM',
      location: 'Convention Center',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=150&fit=crop',
      attendees: 250,
      category: 'Conference',
    },
    {
      id: '2',
      title: 'Wedding Expo',
      date: 'Dec 20, 2024',
      time: '2:00 PM',
      location: 'Grand Hotel',
      imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=150&fit=crop',
      attendees: 180,
      category: 'Wedding',
    },
    {
      id: '3',
      title: 'Corporate Gala',
      date: 'Dec 25, 2024',
      time: '7:00 PM',
      location: 'Business Center',
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=150&fit=crop',
      attendees: 120,
      category: 'Corporate',
    },
    {
      id: '4',
      title: 'Music Festival',
      date: 'Dec 30, 2024',
      time: '6:00 PM',
      location: 'City Park',
      imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=150&fit=crop',
      attendees: 500,
      category: 'Festival',
    },
  ], []);



  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      const requestId = currentRequestId + 1;
      setCurrentRequestId(requestId);
      
      try {
        // Use mock data immediately for better performance
        setBanners(mockBanners);
        setTemplates(mockTemplates);
        setCategories(mockCategories);
        
        // Try API calls in background without blocking UI
        setTimeout(async () => {
          // Check if this is still the current request
          if (currentRequestId !== requestId) return;
          
          try {
            const [bannersData, templatesData, categoriesData] = await Promise.all([
              dashboardService.getBanners(),
              dashboardService.getTemplatesByTab(activeTab),
              dashboardService.getCategories(),
            ]);
            
            // Check if this is still the current request
            if (currentRequestId !== requestId) return;
            
            setBanners(bannersData);
            // Only update templates if background updates are enabled
            if (!disableBackgroundUpdates && !isSearching && selectedCategory === 'all') {
              setTemplates(templatesData);
            }
            setCategories(categoriesData);
          } catch (error) {
            console.log('API call failed, using mock data:', error);
          }
        }, 100);
      } catch (error) {
        console.log('Using mock data due to error:', error);
        setBanners(mockBanners);
        setTemplates(mockTemplates);
        setCategories(mockCategories);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const requestId = currentRequestId + 1;
    setCurrentRequestId(requestId);
    
    try {
      // Use mock data immediately for better performance
      setBanners(mockBanners);
      setTemplates(mockTemplates);
      setCategories(mockCategories);
      
      // Try API calls in background without blocking UI
      setTimeout(async () => {
        // Check if this is still the current request
        if (currentRequestId !== requestId) return;
        
        try {
          const [bannersData, templatesData, categoriesData] = await Promise.all([
            dashboardService.getBanners(),
            dashboardService.getTemplatesByTab(activeTab),
            dashboardService.getCategories(),
          ]);
          
          // Check if this is still the current request
          if (currentRequestId !== requestId) return;
          
          setBanners(bannersData);
          // Only update templates if background updates are enabled
          if (!disableBackgroundUpdates && !isSearching && selectedCategory === 'all') {
            setTemplates(templatesData);
          }
          setCategories(categoriesData);
        } catch (error) {
          console.log('API call failed, using mock data:', error);
        }
      }, 100);
    } catch (error) {
      console.log('Using mock data due to error:', error);
      setBanners(mockBanners);
      setTemplates(mockTemplates);
      setCategories(mockCategories);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, mockBanners, mockTemplates, mockCategories, currentRequestId, disableBackgroundUpdates, isSearching, selectedCategory]);

  const handleTabChange = useCallback(async (tab: string) => {
    setActiveTab(tab);
    setSelectedCategory('all'); // Reset category when changing tabs
    setIsSearching(false); // Reset search state
    setDisableBackgroundUpdates(false); // Re-enable background updates
    
    const requestId = currentRequestId + 1;
    setCurrentRequestId(requestId);
    
    // Use mock data immediately for better performance
    setTemplates(mockTemplates);
    
    // Try API call in background
    setTimeout(async () => {
      // Check if this is still the current request
      if (currentRequestId !== requestId) return;
      
      try {
        const templatesData = await dashboardService.getTemplatesByTab(tab);
        // Only update if this is still the current request and we're on the same tab
        if (currentRequestId === requestId && activeTab === tab) {
          setTemplates(templatesData);
        }
      } catch (error) {
        console.log('Using mock data for tab change:', error);
      }
    }, 100);
  }, [mockTemplates, currentRequestId, activeTab]);

  const handleLikeTemplate = useCallback(async (templateId: string) => {
    // Update local state immediately for better UX
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? { ...template, isLiked: !template.isLiked, likes: template.isLiked ? template.likes - 1 : template.likes + 1 }
        : template
    ));
    
    // Try API call in background
    setTimeout(async () => {
      try {
        await dashboardService.likeTemplate(templateId);
      } catch (error) {
        console.error('Error liking template:', error);
      }
    }, 100);
  }, []);

  const handleDownloadTemplate = useCallback(async (templateId: string) => {
    // Update local state immediately for better UX
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? { ...template, isDownloaded: true, downloads: template.downloads + 1 }
        : template
    ));
    
    // Try API call in background
    setTimeout(async () => {
      try {
        await dashboardService.downloadTemplate(templateId);
      } catch (error) {
        console.error('Error downloading template:', error);
      }
    }, 100);
  }, []);

  const handleSearch = useCallback(async () => {
    const requestId = currentRequestId + 1;
    setCurrentRequestId(requestId);
    
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setDisableBackgroundUpdates(false); // Re-enable background updates when clearing search
      // Reset to current tab and category state
      if (selectedCategory === 'all') {
        setTemplates(mockTemplates);
      } else {
        const filtered = mockTemplates.filter(template => {
          const categoryMap: { [key: string]: string } = {
            'event-planners': 'Event Planners',
            'decorators': 'Decorators',
            'sound-suppliers': 'Sound Suppliers',
            'light-suppliers': 'Light Suppliers'
          };
          return template.category === categoryMap[selectedCategory];
        });
        setTemplates(filtered);
      }
      
      // Try API call in background
      setTimeout(async () => {
        // Check if this is still the current request
        if (currentRequestId !== requestId) return;
        
        try {
          if (selectedCategory === 'all') {
            const templatesData = await dashboardService.getTemplatesByTab(activeTab);
            // Only update if this is still the current request
            if (currentRequestId === requestId) {
              setTemplates(templatesData);
            }
          } else {
            const results = await dashboardService.getTemplatesByCategory(selectedCategory);
            // Only update if this is still the current request
            if (currentRequestId === requestId) {
              setTemplates(results);
            }
          }
        } catch (error) {
          console.error('Search reset error:', error);
        }
      }, 100);
      return;
    }
    
    setIsSearching(true);
    setDisableBackgroundUpdates(true); // Disable background updates when searching
    // Use local search immediately for better performance
    const filtered = mockTemplates.filter(template => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setTemplates(filtered);
    
    // Try API search in background
    setTimeout(async () => {
      // Check if this is still the current request
      if (currentRequestId !== requestId) return;
      
      try {
        const results = await dashboardService.searchTemplates(searchQuery);
        // Only update if this is still the current request and we're still searching
        if (currentRequestId === requestId && isSearching) {
          setTemplates(results);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 100);
  }, [searchQuery, selectedCategory, activeTab, mockTemplates, currentRequestId, isSearching]);

  const handleCategorySelect = useCallback(async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsSearching(false); // Reset search state when selecting category
    setDisableBackgroundUpdates(true); // Disable background updates when user selects category
    
    const requestId = currentRequestId + 1;
    setCurrentRequestId(requestId);
    
    if (categoryId === 'all') {
      // Use mock data immediately for better performance
      setTemplates(mockTemplates);
      
      // Try API call in background
      setTimeout(async () => {
        // Check if this is still the current request
        if (currentRequestId !== requestId) return;
        
        try {
          const templatesData = await dashboardService.getTemplatesByTab(activeTab);
          // Only update if this is still the current request and we're on 'all' category
          if (currentRequestId === requestId && selectedCategory === 'all') {
            setTemplates(templatesData);
          }
        } catch (error) {
          console.log('Using mock data for all category:', error);
        }
      }, 100);
      return;
    }
    
    // Use local filtering immediately for better performance
    const filtered = mockTemplates.filter(template => {
      const categoryMap: { [key: string]: string } = {
        'event-planners': 'Event Planners',
        'decorators': 'Decorators',
        'sound-suppliers': 'Sound Suppliers',
        'light-suppliers': 'Light Suppliers',
        'video': 'Video'
      };
      return template.category === categoryMap[categoryId];
    });
    setTemplates(filtered);
    
    // Try API call in background
    setTimeout(async () => {
      // Check if this is still the current request
      if (currentRequestId !== requestId) return;
      
      try {
        const results = await dashboardService.getTemplatesByCategory(categoryId);
        // Only update if this is still the current request and we're on the same category
        if (currentRequestId === requestId && selectedCategory === categoryId) {
          setTemplates(results);
        }
      } catch (error) {
        console.error('Category filter error:', error);
      }
    }, 100);
  }, [activeTab, mockTemplates, currentRequestId, selectedCategory]);

  const openImagePreviewModal = useCallback((imageData: {
    uri: string;
    title?: string;
    description?: string;
  }) => {
    setSelectedImageData(imageData);
    setIsImagePreviewModalVisible(true);
  }, []);

  const handleTemplatePress = useCallback((template: Template) => {
    // Set the selected template ID for language-specific images
    setSelectedTemplateId(template.id);
    // Open image preview modal with selected image data
    openImagePreviewModal({
      uri: template.thumbnail,
      title: template.name,
      description: template.category,
    });
  }, [openImagePreviewModal]);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedTemplate(null);
  }, []);

  const handleViewAllUpcomingEvents = useCallback(() => {
    setIsUpcomingEventsModalVisible(true);
  }, []);

  const closeUpcomingEventsModal = useCallback(() => {
    setIsUpcomingEventsModalVisible(false);
  }, []);

  const closeImagePreviewModal = useCallback(() => {
    setIsImagePreviewModalVisible(false);
    setSelectedImageData(null);
    setSelectedLanguage('');
    setSelectedTemplateId('');
  }, []);

  const handleLanguageSelect = useCallback((languageId: string) => {
    setSelectedLanguage(languageId);
    
    // Update the displayed image based on selected language
    if (selectedTemplateId && selectedImageData) {
      const languageImages = languageSpecificImages[selectedTemplateId as keyof typeof languageSpecificImages];
      if (languageImages && languageImages[languageId as keyof typeof languageImages]) {
        setSelectedImageData({
          ...selectedImageData,
          uri: languageImages[languageId as keyof typeof languageImages],
        });
      }
    }
  }, [selectedTemplateId, selectedImageData, languageSpecificImages]);

  const handleNextButton = useCallback(() => {
    if (selectedLanguage && selectedImageData) {
      console.log('Selected language:', selectedLanguage);
      console.log('Selected image:', selectedImageData);
      closeImagePreviewModal();
      
      // Check if this is a video template
      const isVideoTemplate = selectedTemplateId.startsWith('video-');
      
      if (isVideoTemplate) {
        // Navigate to VideoEditor with selected data
        navigation.navigate('VideoEditor', {
          selectedVideo: selectedImageData,
          selectedLanguage: selectedLanguage,
          selectedTemplateId: selectedTemplateId,
        });
      } else {
        // Navigate to PosterEditor with selected data
        navigation.navigate('PosterEditor', {
          selectedImage: selectedImageData,
          selectedLanguage: selectedLanguage,
          selectedTemplateId: selectedTemplateId,
        });
      }
    }
  }, [selectedLanguage, selectedImageData, selectedTemplateId, closeImagePreviewModal, navigation]);

  // Memoized render functions to prevent unnecessary re-renders
  const renderBanner = useCallback(({ item }: { item: Banner }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.bannerContainerWrapper}
        onPress={() => {
          setSelectedTemplateId('1'); // Use template 1 for banners
          openImagePreviewModal({
            uri: item.imageUrl,
            title: item.title,
            description: 'Featured Banner',
          });
        }}
      >
                 <View style={styles.bannerContainer}>
           <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} />
           <LinearGradient
             colors={['transparent', 'rgba(0,0,0,0.7)']}
             style={styles.bannerOverlay}
           />
           <View style={styles.bannerContent}>
             <Text style={styles.bannerTitle}>{item.title}</Text>
             <TouchableOpacity 
               style={[styles.bannerButton, { backgroundColor: theme.colors.cardBackground }]}
               onPress={() => {
                 setSelectedTemplateId('1'); // Use template 1 for banners
                 openImagePreviewModal({
                   uri: item.imageUrl,
                   title: item.title,
                   description: 'Featured Banner',
                 });
               }}
             >
               <Text style={[styles.bannerButtonText, { color: theme.colors.primary }]}>EXPLORE</Text>
             </TouchableOpacity>
           </View>
         </View>
      </TouchableOpacity>
    );
  }, [theme, navigation, openImagePreviewModal]);

                                       

  const renderCategory = useCallback(({ item }: { item: Category }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleCategorySelect(item.id)}
        style={styles.categoryChipWrapper}
      >
                 <View
           style={[
             styles.categoryChip,
             { 
               backgroundColor: selectedCategory === item.id ? theme.colors.cardBackground : 'rgba(255,255,255,0.2)',
             }
           ]}
         >
           <Text style={[
             styles.categoryChipText,
             { color: selectedCategory === item.id ? theme.colors.primary : '#ffffff' }
           ]}>
             {item.name}
           </Text>
         </View>
       </TouchableOpacity>
     );
   }, [selectedCategory, handleCategorySelect, theme]);

  const renderTemplate = useCallback(({ item }: { item: Template }) => {
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

    const handleCardPress = () => {
      handleTemplatePress(item);
    };

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleCardPress}
        style={styles.templateCardWrapper}
      >
        <Animated.View 
          style={[
            styles.templateCard, 
            { 
              backgroundColor: theme.colors.cardBackground,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={styles.templateImageContainer}>
            <Image source={{ uri: item.thumbnail }} style={styles.templateImage} />
            <View style={styles.templateActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: item.isLiked ? theme.colors.primary : theme.colors.cardBackground }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleLikeTemplate(item.id);
                }}
              >
                <Text style={[styles.actionButtonText, { color: item.isLiked ? '#ffffff' : theme.colors.text }]}>LIKE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: item.isDownloaded ? theme.colors.primary : theme.colors.cardBackground }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDownloadTemplate(item.id);
                }}
              >
                <Text style={[styles.actionButtonText, { color: item.isDownloaded ? '#ffffff' : theme.colors.text }]}>DOWNLOAD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }, [handleLikeTemplate, handleDownloadTemplate, handleTemplatePress, theme]);

  // Memoized key extractors
  const keyExtractor = useCallback((item: any) => item.id, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={theme.colors.gradient}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
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
          <View style={styles.headerTop}>
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>Welcome back</Text>
              <Text style={styles.userName}>Event Marketer</Text>
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          removeClippedSubviews={true}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          bounces={true}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: theme.colors.cardBackground }]}>
              <Text style={[styles.searchIcon, { color: theme.colors.primary }]}>SEARCH</Text>
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search event services..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={[styles.clearIcon, { color: theme.colors.textSecondary }]}>CLEAR</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: activeTab === 'trending' ? theme.colors.cardBackground : 'rgba(255,255,255,0.2)' }
              ]}
              onPress={() => handleTabChange('trending')}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'trending' ? theme.colors.primary : '#ffffff' }
              ]}>
                TRENDING
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: activeTab === 'festival' ? theme.colors.cardBackground : 'rgba(255,255,255,0.2)' }
              ]}
              onPress={() => handleTabChange('festival')}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'festival' ? theme.colors.primary : '#ffffff' }
              ]}>
                FESTIVAL
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: activeTab === 'video' ? theme.colors.cardBackground : 'rgba(255,255,255,0.2)' }
              ]}
              onPress={() => handleTabChange('video')}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'video' ? theme.colors.primary : '#ffffff' }
              ]}>
                VIDEO
              </Text>
            </TouchableOpacity>
          </View>

          {/* Banner Carousel */}
          <View style={styles.bannerSection}>
            <Text style={styles.sectionTitle}>Featured Banners</Text>
            <FlatList
              data={banners}
              renderItem={renderBanner}
              keyExtractor={keyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bannerList}
              removeClippedSubviews={true}
              maxToRenderPerBatch={3}
              windowSize={5}
              nestedScrollEnabled={true}
              scrollEnabled={true}
            />
          </View>

                                {/* Upcoming Events */}
            <View style={styles.upcomingEventsSection}>
                             <View style={styles.sectionHeader}>
                 <Text style={styles.sectionTitle}>Upcoming Events</Text>
                 <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllUpcomingEvents}>
                   <Text style={styles.viewAllButtonText}>View All</Text>
                 </TouchableOpacity>
               </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.upcomingEventsList}
                nestedScrollEnabled={true}
              >
                {mockUpcomingEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    activeOpacity={0.8}
                    style={styles.upcomingEventCard}
                    onPress={() => {
                      setSelectedTemplateId('2'); // Use template 2 for upcoming events
                      openImagePreviewModal({
                        uri: event.imageUrl,
                        title: event.title,
                        description: `${event.category} • ${event.date} • ${event.location}`,
                      });
                    }}
                  >
                    <View style={styles.upcomingEventImageContainer}>
                      <Image source={{ uri: event.imageUrl }} style={styles.upcomingEventImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.upcomingEventOverlay}
                      />
                      <View style={styles.upcomingEventBadge}>
                        <Text style={styles.upcomingEventBadgeText}>{event.category}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

          {/* Categories */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={keyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
              removeClippedSubviews={true}
              maxToRenderPerBatch={7}
              windowSize={10}
              nestedScrollEnabled={true}
              scrollEnabled={true}
            />
          </View>

          {/* Templates Grid */}
          <View style={styles.templatesSection}>
            <Text style={styles.sectionTitle}>Event Services</Text>
            <FlatList
              data={templates}
              renderItem={renderTemplate}
              keyExtractor={keyExtractor}
              numColumns={3}
              columnWrapperStyle={styles.templateRow}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              removeClippedSubviews={true}
              maxToRenderPerBatch={6}
              windowSize={10}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
                 </ScrollView>
       </LinearGradient>

       {/* Template Preview Modal */}
       <Modal
         visible={isModalVisible}
         transparent={true}
         animationType="fade"
         onRequestClose={closeModal}
       >
         <View style={styles.modalOverlay}>
           <TouchableOpacity 
             style={styles.modalBackground} 
             activeOpacity={1} 
             onPress={closeModal}
           >
             <View style={styles.modalContent}>
               <TouchableOpacity 
                 style={styles.closeButton}
                 onPress={closeModal}
               >
                 <Text style={styles.closeButtonText}>✕</Text>
               </TouchableOpacity>
               {selectedTemplate && (
                 <>
                   <View style={styles.modalImageContainer}>
                     <Image 
                       source={{ uri: selectedTemplate.thumbnail }} 
                       style={styles.modalImage}
                       resizeMode="cover"
                     />
                     <LinearGradient
                       colors={['transparent', 'rgba(0,0,0,0.3)']}
                       style={styles.modalImageOverlay}
                     />
                   </View>
                   <View style={styles.modalInfoContainer}>
                     <View style={styles.modalHeader}>
                       <Text style={styles.modalTitle}>{selectedTemplate.name}</Text>
                       <Text style={styles.modalCategory}>{selectedTemplate.category}</Text>
                     </View>
                     <View style={styles.modalStats}>
                       <View style={styles.modalStat}>
                         <Text style={styles.modalStatLabel}>Likes</Text>
                         <Text style={styles.modalStatValue}>{selectedTemplate.likes}</Text>
                       </View>
                       <View style={styles.modalStat}>
                         <Text style={styles.modalStatLabel}>Downloads</Text>
                         <Text style={styles.modalStatValue}>{selectedTemplate.downloads}</Text>
                       </View>
                     </View>
                     <View style={styles.modalActions}>
                       <TouchableOpacity 
                         style={[
                           styles.modalActionButton, 
                           { backgroundColor: selectedTemplate.isLiked ? theme.colors.primary : theme.colors.cardBackground }
                         ]}
                         onPress={() => {
                           handleLikeTemplate(selectedTemplate.id);
                         }}
                       >
                         <Text style={[
                           styles.modalActionButtonText, 
                           { color: selectedTemplate.isLiked ? '#ffffff' : theme.colors.text }
                         ]}>
                           {selectedTemplate.isLiked ? 'LIKED' : 'LIKE'}
                         </Text>
                       </TouchableOpacity>
                       <TouchableOpacity 
                         style={[
                           styles.modalActionButton, 
                           { backgroundColor: selectedTemplate.isDownloaded ? theme.colors.primary : theme.colors.cardBackground }
                         ]}
                         onPress={() => {
                           handleDownloadTemplate(selectedTemplate.id);
                         }}
                       >
                         <Text style={[
                           styles.modalActionButtonText, 
                           { color: selectedTemplate.isDownloaded ? '#ffffff' : theme.colors.text }
                         ]}>
                           {selectedTemplate.isDownloaded ? 'DOWNLOADED' : 'DOWNLOAD'}
                         </Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 </>
               )}
             </View>
           </TouchableOpacity>
         </View>
               </Modal>

        {/* Upcoming Events Modal */}
        <Modal
          visible={isUpcomingEventsModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={closeUpcomingEventsModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.upcomingEventsModalContent}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.upcomingEventsModalGradient}
              >
                <View style={styles.upcomingEventsModalHeader}>
                  <View style={styles.upcomingEventsModalTitleContainer}>
                    <Text style={styles.upcomingEventsModalTitle}>All Upcoming Events</Text>
                    <Text style={styles.upcomingEventsModalSubtitle}>Discover amazing events happening soon</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.upcomingEventsCloseButton}
                    onPress={closeUpcomingEventsModal}
                  >
                    <Text style={styles.upcomingEventsCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
              <View style={styles.upcomingEventsModalBody}>
                <FlatList
                  data={mockUpcomingEvents}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={3}
                  columnWrapperStyle={styles.upcomingEventModalRow}
                  contentContainerStyle={styles.upcomingEventsModalScroll}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: event }) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.upcomingEventModalCard}
                      onPress={() => {
                        setSelectedTemplateId('2'); // Use template 2 for upcoming events
                        openImagePreviewModal({
                          uri: event.imageUrl,
                          title: event.title,
                          description: `${event.category} • ${event.date} • ${event.location}`,
                        });
                      }}
                    >
                      <View style={styles.upcomingEventModalImageContainer}>
                        <Image source={{ uri: event.imageUrl }} style={styles.upcomingEventModalImage} />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={styles.upcomingEventModalOverlay}
                        />
                        <View style={styles.upcomingEventModalBadge}>
                          <Text style={styles.upcomingEventModalBadgeText}>{event.category}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          visible={isImagePreviewModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeImagePreviewModal}
        >
          <View style={styles.imagePreviewModalOverlay}>
            <TouchableOpacity 
              style={styles.imagePreviewModalBackdrop} 
              activeOpacity={1} 
              onPress={closeImagePreviewModal}
            />
            
            <View style={styles.imagePreviewModalContent}>
              {/* Modal Header */}
              <View style={styles.imagePreviewModalHeader}>
                <View style={styles.imagePreviewModalHeaderLeft}>
                  <Text style={styles.imagePreviewModalTitle}>
                    {selectedImageData?.title || 'Image Preview'}
                  </Text>
                  {selectedImageData?.description && (
                    <Text style={styles.imagePreviewModalSubtitle}>
                      {selectedImageData.description}
                    </Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.imagePreviewModalCloseButton}
                  onPress={closeImagePreviewModal}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={24} color="#333333" />
                </TouchableOpacity>
              </View>

              {/* Image Section */}
              <View style={styles.imagePreviewModalImageContainer}>
                {selectedImageData && (
                  <>
                    {selectedLanguage ? (
                      // Show language-specific images grid
                      <View style={styles.languageImagesGrid}>
                        {languages.map((language) => {
                          const languageImages = languageSpecificImages[selectedTemplateId as keyof typeof languageSpecificImages];
                          const imageUri = languageImages ? languageImages[language.id as keyof typeof languageImages] : selectedImageData.uri;
                          return (
                            <TouchableOpacity
                              key={language.id}
                              style={[
                                styles.languageImageContainer,
                                selectedLanguage === language.id && styles.languageImageContainerSelected
                              ]}
                              onPress={() => handleLanguageSelect(language.id)}
                              activeOpacity={0.8}
                            >
                              <Image
                                source={{ 
                                  uri: imageUri,
                                  cache: 'force-cache'
                                }}
                                style={styles.languageImage}
                                resizeMode="cover"
                              />
                              <View style={styles.languageImageOverlay}>
                                <Text style={styles.languageImageLabel}>{language.name}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      // Show single image when no language is selected
                      <Image
                        source={{ 
                          uri: selectedImageData.uri,
                          cache: 'force-cache'
                        }}
                        style={styles.imagePreviewModalImage}
                        resizeMode="contain"
                      />
                    )}
                  </>
                )}
              </View>

              {/* Language Selection Buttons */}
              <View style={styles.languageSelectionContainer}>
                <Text style={styles.languageSelectionTitle}>
                  {selectedLanguage ? 'Language Variants' : 'Select Language'}
                </Text>
                <Text style={styles.languageSelectionSubtitle}>
                  {selectedLanguage 
                    ? 'Tap on any language to switch between variants' 
                    : 'Choose a language to see different image variants'
                  }
                </Text>
                <View style={styles.languageButtonsContainer}>
                  {languages.map((language) => (
                    <TouchableOpacity
                      key={language.id}
                      style={[
                        styles.languageButton,
                        selectedLanguage === language.id && styles.languageButtonSelected
                      ]}
                      onPress={() => handleLanguageSelect(language.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.languageButtonText,
                        selectedLanguage === language.id && styles.languageButtonTextSelected
                      ]}>
                        {language.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Next Button */}
              <View style={styles.nextButtonContainer}>
                <TouchableOpacity 
                  style={[
                    styles.nextButton,
                    !selectedLanguage && styles.nextButtonDisabled
                  ]}
                  onPress={handleNextButton}
                  disabled={!selectedLanguage}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={selectedLanguage ? ['#667eea', '#764ba2'] : ['#cccccc', '#999999']}
                    style={styles.nextButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon name="arrow-forward" size={18} color="#ffffff" />
                    <Text style={styles.nextButtonText}>Next</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  });

HomeScreen.displayName = 'HomeScreen';

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
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: 'rgba(255,255,255,0.8)',
    marginBottom: screenHeight * 0.005,
  },
  userName: {
    fontSize: Math.min(screenWidth * 0.05, 20),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Fixed padding for tab bar
  },
  searchContainer: {
    paddingHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.02,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.015,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  searchIcon: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    marginRight: screenWidth * 0.03,
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '500',
  },
  clearIcon: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    padding: 5,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: screenWidth * 0.05,
    marginBottom: screenHeight * 0.02,
  },
  tab: {
    flex: 1,
    paddingVertical: screenHeight * 0.012,
    paddingHorizontal: screenWidth * 0.01,
    marginHorizontal: screenWidth * 0.005,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: screenHeight * 0.045,
  },
  tabText: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: Math.min(screenWidth * 0.035, 14),
  },
  bannerSection: {
    marginBottom: screenHeight * 0.03,
  },
  sectionTitle: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.05,
  },
  bannerList: {
    paddingHorizontal: screenWidth * 0.05,
  },
  bannerContainerWrapper: {
    width: screenWidth * 0.8,
    marginRight: screenWidth * 0.03,
  },
  bannerContainer: {
    width: '100%',
    height: screenHeight * 0.15,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  bannerContent: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
  },
  bannerTitle: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  bannerButton: {
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.006,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    fontSize: Math.min(screenWidth * 0.03, 12),
    fontWeight: '600',
  },
     upcomingEventsSection: {
     marginBottom: screenHeight * 0.03,
   },
   sectionHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingHorizontal: screenWidth * 0.05,
     marginBottom: screenHeight * 0.015,
   },
   viewAllButton: {
     paddingHorizontal: screenWidth * 0.04,
     paddingVertical: screenHeight * 0.006,
     backgroundColor: 'rgba(255,255,255,0.2)',
     borderRadius: 15,
   },
   viewAllButtonText: {
     fontSize: Math.min(screenWidth * 0.03, 12),
     color: '#ffffff',
     fontWeight: '600',
   },
       upcomingEventsList: {
      paddingHorizontal: screenWidth * 0.05,
    },
                   upcomingEventCard: {
        width: (screenWidth - screenWidth * 0.2) / 3,
        marginRight: screenWidth * 0.03,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 15,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
      },
   upcomingEventImageContainer: {
     height: screenHeight * 0.12,
     position: 'relative',
   },
   upcomingEventImage: {
     width: '100%',
     height: '100%',
   },
   upcomingEventOverlay: {
     position: 'absolute',
     bottom: 0,
     left: 0,
     right: 0,
     height: 40,
   },
   upcomingEventBadge: {
     position: 'absolute',
     top: 8,
     left: 8,
     backgroundColor: 'rgba(0,0,0,0.7)',
     paddingHorizontal: 8,
     paddingVertical: 4,
     borderRadius: 12,
   },
   upcomingEventBadgeText: {
     fontSize: Math.min(screenWidth * 0.025, 10),
     color: '#ffffff',
     fontWeight: '600',
   },
  categoriesSection: {
    marginBottom: screenHeight * 0.03,
  },
  categoriesList: {
    paddingHorizontal: screenWidth * 0.05,
  },
  categoryChipWrapper: {
    marginRight: screenWidth * 0.02,
  },
  categoryChip: {
    paddingHorizontal: screenWidth * 0.04,
    paddingVertical: screenHeight * 0.008,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    fontWeight: '500',
  },
  templatesSection: {
    paddingBottom: screenHeight * 0.05,
  },
  templateRow: {
    justifyContent: 'space-between',
    paddingHorizontal: screenWidth * 0.03,
  },
  templateCardWrapper: {
    width: (screenWidth - screenWidth * 0.2) / 3,
    marginBottom: screenHeight * 0.02,
  },
  templateCard: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  templateImageContainer: {
    height: screenHeight * 0.15,
    position: 'relative',
  },
  templateImage: {
    width: '100%',
    height: '100%',
  },
  templateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  templateActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
  },
  actionButton: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 4,
  },
  actionButtonText: {
    fontSize: Math.min(screenWidth * 0.025, 10),
    fontWeight: '600',
  },
  templateInfo: {
    padding: screenWidth * 0.03,
  },
  templateName: {
    fontSize: Math.min(screenWidth * 0.032, 13),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: Math.min(screenWidth * 0.028, 11),
    marginBottom: 6,
  },
  templateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
     templateStat: {
     fontSize: Math.min(screenWidth * 0.023, 9),
   },
   modalOverlay: {
     flex: 1,
     backgroundColor: 'rgba(0, 0, 0, 0.8)',
     justifyContent: 'center',
     alignItems: 'center',
   },
   modalBackground: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
   },
   modalContent: {
     width: screenWidth * 0.9,
     height: screenHeight * 0.8,
     backgroundColor: '#ffffff',
     borderRadius: 20,
     overflow: 'hidden',
     position: 'relative',
   },
   closeButton: {
     position: 'absolute',
     top: 15,
     right: 15,
     width: 30,
     height: 30,
     borderRadius: 15,
     backgroundColor: 'rgba(0, 0, 0, 0.5)',
     justifyContent: 'center',
     alignItems: 'center',
     zIndex: 10,
   },
   closeButtonText: {
     color: '#ffffff',
     fontSize: 16,
     fontWeight: 'bold',
   },
   modalImageContainer: {
     height: screenHeight * 0.4,
     position: 'relative',
   },
   modalImage: {
     width: '100%',
     height: '100%',
   },
   modalImageOverlay: {
     position: 'absolute',
     bottom: 0,
     left: 0,
     right: 0,
     height: 60,
   },
   modalInfoContainer: {
     flex: 1,
     padding: screenWidth * 0.05,
   },
   modalHeader: {
     marginBottom: screenHeight * 0.02,
   },
   modalTitle: {
     fontSize: Math.min(screenWidth * 0.05, 20),
     fontWeight: 'bold',
     color: '#333333',
     marginBottom: 4,
   },
   modalCategory: {
     fontSize: Math.min(screenWidth * 0.035, 14),
     color: '#666666',
     fontWeight: '500',
   },
   modalStats: {
     flexDirection: 'row',
     justifyContent: 'space-around',
     marginBottom: screenHeight * 0.03,
     paddingVertical: screenHeight * 0.015,
     backgroundColor: '#f8f9fa',
     borderRadius: 15,
   },
   modalStat: {
     alignItems: 'center',
   },
   modalStatLabel: {
     fontSize: Math.min(screenWidth * 0.03, 12),
     color: '#666666',
     fontWeight: '500',
     marginBottom: 4,
   },
   modalStatValue: {
     fontSize: Math.min(screenWidth * 0.04, 16),
     fontWeight: 'bold',
     color: '#333333',
   },
   modalActions: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     gap: screenWidth * 0.03,
   },
   modalActionButton: {
     flex: 1,
     paddingVertical: screenHeight * 0.015,
     borderRadius: 15,
     alignItems: 'center',
     justifyContent: 'center',
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
   },
       modalActionButtonText: {
      fontSize: Math.min(screenWidth * 0.035, 14),
      fontWeight: '600',
    },
    // Upcoming Events Modal Styles
    upcomingEventsModalContent: {
      width: screenWidth * 0.95,
      height: screenHeight * 0.9,
      backgroundColor: '#ffffff',
      borderRadius: 25,
      overflow: 'hidden',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 20,
      },
      shadowOpacity: 0.3,
      shadowRadius: 25,
      elevation: 15,
    },
    upcomingEventsModalGradient: {
      paddingTop: screenHeight * 0.05,
      paddingBottom: screenHeight * 0.02,
    },
    upcomingEventsModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: screenWidth * 0.05,
    },
    upcomingEventsModalTitleContainer: {
      flex: 1,
      marginRight: screenWidth * 0.03,
    },
    upcomingEventsModalTitle: {
      fontSize: Math.min(screenWidth * 0.055, 22),
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: screenHeight * 0.005,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    upcomingEventsModalSubtitle: {
      fontSize: Math.min(screenWidth * 0.035, 14),
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500',
    },
    upcomingEventsCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    upcomingEventsCloseButtonText: {
      fontSize: 18,
      color: '#ffffff',
      fontWeight: 'bold',
    },
    upcomingEventsModalBody: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
    upcomingEventsModalScroll: {
      paddingHorizontal: screenWidth * 0.05,
      paddingTop: screenHeight * 0.03,
      paddingBottom: screenHeight * 0.05,
    },
    upcomingEventModalRow: {
      justifyContent: 'space-between',
      marginBottom: screenHeight * 0.025,
    },
    upcomingEventModalCard: {
      width: (screenWidth * 0.85 - screenWidth * 0.06) / 3,
      backgroundColor: '#ffffff',
      borderRadius: 18,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
    },
    upcomingEventModalImageContainer: {
      height: screenHeight * 0.12,
      position: 'relative',
    },
    upcomingEventModalImage: {
      width: '100%',
      height: '100%',
    },
    upcomingEventModalOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
    },
    upcomingEventModalBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    upcomingEventModalBadgeText: {
      fontSize: Math.min(screenWidth * 0.025, 10),
      color: '#ffffff',
      fontWeight: '600',
    },
    upcomingEventModalContent: {
      padding: screenWidth * 0.04,
    },
    upcomingEventModalTitle: {
      fontSize: Math.min(screenWidth * 0.04, 16),
      fontWeight: 'bold',
      color: '#333333',
      marginBottom: screenHeight * 0.01,
    },
    upcomingEventModalDetails: {
      gap: screenHeight * 0.005,
    },
    upcomingEventModalDetail: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    upcomingEventModalDetailLabel: {
      fontSize: Math.min(screenWidth * 0.035, 14),
      color: '#666666',
      fontWeight: '500',
    },
    // Image Preview Modal Styles
    imagePreviewModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePreviewModalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    imagePreviewModalContent: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      width: screenWidth * 0.95,
      maxHeight: screenHeight * 0.9,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 20,
    },
    imagePreviewModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    imagePreviewModalHeaderLeft: {
      flex: 1,
      marginRight: 10,
    },
    imagePreviewModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#333333',
      marginBottom: 8,
      lineHeight: 22,
    },
    imagePreviewModalSubtitle: {
      fontSize: 14,
      color: '#666666',
      lineHeight: 18,
    },
    imagePreviewModalCloseButton: {
      padding: 4,
    },
    imagePreviewModalImageContainer: {
      position: 'relative',
      height: screenHeight * 0.5,
      backgroundColor: '#f8f9fa',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    imagePreviewModalImage: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    imagePreviewModalActions: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    },
    imagePreviewModalActionButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    imagePreviewModalActionButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    imagePreviewModalActionButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    // Language Selection Styles
    languageSelectionContainer: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    },
    languageSelectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333333',
      marginBottom: 8,
      textAlign: 'center',
    },
    languageSelectionSubtitle: {
      fontSize: 12,
      color: '#666666',
      marginBottom: 15,
      textAlign: 'center',
      lineHeight: 16,
    },
    languageButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    languageButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: '#f8f9fa',
      borderWidth: 2,
      borderColor: '#e9ecef',
      alignItems: 'center',
      justifyContent: 'center',
    },
    languageButtonSelected: {
      backgroundColor: '#667eea',
      borderColor: '#667eea',
    },
    languageButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666666',
    },
    languageButtonTextSelected: {
      color: '#ffffff',
    },
    // Next Button Styles
    nextButtonContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    nextButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    nextButtonDisabled: {
      opacity: 0.6,
    },
    nextButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    nextButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    // Language Images Grid Styles
    languageImagesGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 10,
    },
    languageImageContainer: {
      flex: 1,
      height: screenHeight * 0.25,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#e9ecef',
    },
    languageImageContainerSelected: {
      borderColor: '#667eea',
      borderWidth: 3,
    },
    languageImage: {
      width: '100%',
      height: '100%',
    },
    languageImageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    languageImageLabel: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

export default HomeScreen; 