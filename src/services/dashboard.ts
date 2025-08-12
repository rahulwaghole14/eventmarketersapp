import api from './api';

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
}

export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  likes: number;
  downloads: number;
  isLiked: boolean;
  isDownloaded: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface DashboardData {
  banners: Banner[];
  templates: Template[];
  categories: Category[];
}

class DashboardService {
  // Get all banners with timeout handling
  async getBanners(): Promise<Banner[]> {
    try {
      const response = await api.get('/banners');
      return response.data;
    } catch (error) {
      console.log('Using mock banners due to API error:', error);
      return this.getMockBanners();
    }
  }

  // Get templates by tab with timeout handling
  async getTemplatesByTab(tab: string): Promise<Template[]> {
    try {
      const response = await api.get(`/templates?tab=${tab}`);
      return response.data;
    } catch (error) {
      console.log('Using mock templates due to API error:', error);
      return this.getMockTemplates();
    }
  }

  // Get all categories with timeout handling
  async getCategories(): Promise<Category[]> {
    try {
      const response = await api.get('/categories');
      return response.data;
    } catch (error) {
      console.log('Using mock categories due to API error:', error);
      return this.getMockCategories();
    }
  }

  // Search templates with timeout handling
  async searchTemplates(query: string): Promise<Template[]> {
    try {
      const response = await api.get(`/templates/search?q=${query}`);
      return response.data;
    } catch (error) {
      console.log('Using local search due to API error:', error);
      // Return empty array to trigger local search
      return [];
    }
  }

  // Get templates by category with timeout handling
  async getTemplatesByCategory(category: string): Promise<Template[]> {
    try {
      const response = await api.get(`/templates?category=${category}`);
      return response.data;
    } catch (error) {
      console.log('Using mock templates due to API error:', error);
      return this.getMockTemplates().filter(t => t.category.toLowerCase() === category.toLowerCase());
    }
  }

  // Like template with timeout handling
  async likeTemplate(templateId: string): Promise<void> {
    try {
      await api.post(`/templates/${templateId}/like`);
    } catch (error) {
      console.log('Like action failed, but UI updated:', error);
      // Don't throw error to prevent UI from reverting
    }
  }

  // Download template with timeout handling
  async downloadTemplate(templateId: string): Promise<void> {
    try {
      await api.post(`/templates/${templateId}/download`);
    } catch (error) {
      console.log('Download action failed, but UI updated:', error);
      // Don't throw error to prevent UI from reverting
    }
  }

  // Get dashboard data with timeout handling
  async getDashboardData(tab: string = 'trending'): Promise<DashboardData> {
    try {
      const [banners, templates, categories] = await Promise.all([
        this.getBanners(),
        this.getTemplatesByTab(tab),
        this.getCategories(),
      ]);
      
      return { banners, templates, categories };
    } catch (error) {
      console.log('Using mock dashboard data due to API error:', error);
      return {
        banners: this.getMockBanners(),
        templates: this.getMockTemplates(),
        categories: this.getMockCategories(),
      };
    }
  }

  // Mock data methods
  private getMockBanners(): Banner[] {
    return [
      {
        id: '1',
        title: 'Professional Business Solutions',
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
        link: '#',
      },
      {
        id: '2',
        title: 'Creative Design Templates',
        imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=200&fit=crop',
        link: '#',
      },
      {
        id: '3',
        title: 'Marketing Excellence',
        imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=200&fit=crop',
        link: '#',
      },
    ];
  }

  private getMockTemplates(): Template[] {
    return [
      {
        id: '1',
        name: 'Modern Business Card',
        thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
        category: 'Business',
        likes: 156,
        downloads: 89,
        isLiked: false,
        isDownloaded: false,
      },
      {
        id: '2',
        name: 'Festive Celebration',
        thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
        category: 'Celebration',
        likes: 234,
        downloads: 167,
        isLiked: true,
        isDownloaded: false,
      },
      {
        id: '3',
        name: 'Special Offer',
        thumbnail: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
        category: 'Marketing',
        likes: 89,
        downloads: 45,
        isLiked: false,
        isDownloaded: true,
      },
      {
        id: '4',
        name: 'Professional Portfolio',
        thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop',
        category: 'Portfolio',
        likes: 312,
        downloads: 198,
        isLiked: false,
        isDownloaded: false,
      },
      {
        id: '5',
        name: 'Event Invitation',
        thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=200&fit=crop',
        category: 'Events',
        likes: 178,
        downloads: 123,
        isLiked: true,
        isDownloaded: false,
      },
      {
        id: '6',
        name: 'Product Showcase',
        thumbnail: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
        category: 'Product',
        likes: 145,
        downloads: 87,
        isLiked: false,
        isDownloaded: false,
      },
    ];
  }

  private getMockCategories(): Category[] {
    return [
      { id: 'all', name: 'All' },
      { id: 'business', name: 'Business' },
      { id: 'celebration', name: 'Celebration' },
      { id: 'marketing', name: 'Marketing' },
      { id: 'portfolio', name: 'Portfolio' },
      { id: 'events', name: 'Events' },
      { id: 'product', name: 'Product' },
    ];
  }
}

export default new DashboardService(); 