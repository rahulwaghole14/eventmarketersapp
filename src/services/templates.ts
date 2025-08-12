import api from './api';

export interface Template {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: 'free' | 'premium';
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFilters {
  category?: 'free' | 'premium' | 'all';
  language?: string;
  search?: string;
}

class TemplateService {
  private cache: { [key: string]: { data: any; timestamp: number } } = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(key: string): boolean {
    const cached = this.cache[key];
    return cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION;
  }
  // Fetch all templates with optional filtering
  async getTemplates(filters?: TemplateFilters): Promise<Template[]> {
    const cacheKey = `templates_${JSON.stringify(filters || {})}`;
    
    // Check cache first (only for no filters or simple filters)
    if (!filters || (Object.keys(filters).length === 0) || 
        (filters.category === 'all' && !filters.language && !filters.search)) {
      if (this.isCacheValid(cacheKey)) {
        return this.cache[cacheKey].data;
      }
    }
    
    try {
      const params = new URLSearchParams();
      
      if (filters?.category && filters.category !== 'all') {
        params.append('category', filters.category);
      }
      
      if (filters?.language) {
        params.append('language', filters.language);
      }
      
      if (filters?.search) {
        params.append('search', filters.search);
      }
      
      const response = await api.get(`/templates?${params.toString()}`);
      const data = response.data;
      
      // Cache the result
      this.cache[cacheKey] = { data, timestamp: Date.now() };
      
      return data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Return mock data for development
      return this.getMockTemplates(filters);
    }
  }

  // Get template by ID
  async getTemplateById(id: string): Promise<Template | null> {
    try {
      const response = await api.get(`/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  // Get available languages for filtering
  async getAvailableLanguages(): Promise<string[]> {
    try {
      const response = await api.get('/templates/languages');
      return response.data;
    } catch (error) {
      console.error('Error fetching languages:', error);
      return ['English', 'Spanish', 'French', 'German', 'Italian'];
    }
  }

  // Mock data for development
  private getMockTemplates(filters?: TemplateFilters): Template[] {
    const mockTemplates: Template[] = [
      {
        id: '1',
        title: 'Modern Event Flyer',
        description: 'Clean and professional event flyer template with modern design elements',
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=400&fit=crop',
        category: 'free',
        language: 'English',
        tags: ['flyer', 'event', 'modern'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Premium Business Card',
        description: 'Elegant business card design for professionals and executives',
        imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=400&fit=crop',
        category: 'premium',
        language: 'English',
        tags: ['business', 'card', 'premium'],
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
      {
        id: '3',
        title: 'Social Media Post',
        description: 'Eye-catching social media template for brand promotion',
        imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=400&fit=crop',
        category: 'free',
        language: 'Spanish',
        tags: ['social', 'media', 'post'],
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      },
      {
        id: '4',
        title: 'Wedding Invitation',
        description: 'Beautiful wedding invitation template with elegant typography',
        imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=400&fit=crop',
        category: 'premium',
        language: 'English',
        tags: ['wedding', 'invitation', 'elegant'],
        createdAt: '2024-01-04T00:00:00Z',
        updatedAt: '2024-01-04T00:00:00Z',
      },
      {
        id: '5',
        title: 'Restaurant Menu',
        description: 'Professional restaurant menu template with food photography',
        imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=400&fit=crop',
        category: 'free',
        language: 'French',
        tags: ['restaurant', 'menu', 'food'],
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-05T00:00:00Z',
      },
      {
        id: '6',
        title: 'Product Catalog',
        description: 'Comprehensive product catalog template for retail businesses',
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=400&fit=crop',
        category: 'premium',
        language: 'German',
        tags: ['product', 'catalog', 'retail'],
        createdAt: '2024-01-06T00:00:00Z',
        updatedAt: '2024-01-06T00:00:00Z',
      },
      {
        id: '7',
        title: 'Conference Banner',
        description: 'Professional conference banner template for corporate events',
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=400&fit=crop',
        category: 'free',
        language: 'English',
        tags: ['conference', 'banner', 'corporate'],
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
      },
      {
        id: '8',
        title: 'Real Estate Flyer',
        description: 'Attractive real estate flyer template for property listings',
        imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&h=400&fit=crop',
        category: 'premium',
        language: 'English',
        tags: ['real estate', 'property', 'listing'],
        createdAt: '2024-01-08T00:00:00Z',
        updatedAt: '2024-01-08T00:00:00Z',
      },
      {
        id: '9',
        title: 'Music Festival Poster',
        description: 'Vibrant music festival poster template with dynamic design',
        imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=400&fit=crop',
        category: 'free',
        language: 'Spanish',
        tags: ['music', 'festival', 'poster'],
        createdAt: '2024-01-09T00:00:00Z',
        updatedAt: '2024-01-09T00:00:00Z',
      },
      {
        id: '10',
        title: 'Corporate Presentation',
        description: 'Professional corporate presentation template for business meetings',
        imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=300&h=400&fit=crop',
        category: 'premium',
        language: 'English',
        tags: ['corporate', 'presentation', 'business'],
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
      },
      {
        id: '11',
        title: 'Birthday Party Invitation',
        description: 'Fun and colorful birthday party invitation template',
        imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300&h=400&fit=crop',
        category: 'free',
        language: 'French',
        tags: ['birthday', 'party', 'invitation'],
        createdAt: '2024-01-11T00:00:00Z',
        updatedAt: '2024-01-11T00:00:00Z',
      },
      {
        id: '12',
        title: 'Luxury Brand Brochure',
        description: 'Premium luxury brand brochure template with sophisticated design',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=400&fit=crop',
        category: 'premium',
        language: 'Italian',
        tags: ['luxury', 'brand', 'brochure'],
        createdAt: '2024-01-12T00:00:00Z',
        updatedAt: '2024-01-12T00:00:00Z',
      },
    ];

    // Apply filters
    let filteredTemplates = mockTemplates;

    if (filters?.category && filters.category !== 'all') {
      filteredTemplates = filteredTemplates.filter(
        template => template.category === filters.category
      );
    }

    if (filters?.language) {
      filteredTemplates = filteredTemplates.filter(
        template => template.language.toLowerCase().includes(filters.language!.toLowerCase())
      );
    }

    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(
        template =>
          template.title.toLowerCase().includes(searchTerm) ||
          template.description.toLowerCase().includes(searchTerm) ||
          template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    return filteredTemplates;
  }

  // Clear cache method
  clearCache(): void {
    this.cache = {};
  }
}

export default new TemplateService(); 