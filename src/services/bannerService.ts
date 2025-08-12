import api from './api';

export interface Template {
  id: string;
  name: string;
  type: 'daily' | 'festival' | 'special';
  thumbnail: string;
  preview: string;
  category: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  name: string;
  templateId: string;
  template: Template;
  customizations: {
    text: string;
    colors: string[];
    fonts: string;
    images: string[];
    layout: string;
  };
  status: 'draft' | 'published' | 'archived';
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerData {
  name: string;
  templateId: string;
  customizations: {
    text: string;
    colors: string[];
    fonts: string;
    images: string[];
    layout: string;
  };
}

class BannerService {
  // Get all templates
  async getTemplates(type?: 'daily' | 'festival' | 'special'): Promise<Template[]> {
    try {
      const params = type ? `?type=${type}` : '';
      const response = await api.get(`/templates${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Return mock data as fallback
      return this.getMockTemplates();
    }
  }

  // Get single template
  async getTemplate(id: string): Promise<Template> {
    try {
      const response = await api.get(`/template/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }

  // Create new banner
  async createBanner(data: CreateBannerData): Promise<Banner> {
    try {
      const response = await api.post('/banner/create', data);
      return response.data;
    } catch (error) {
      console.error('Error creating banner:', error);
      throw error;
    }
  }

  // Update banner
  async updateBanner(id: string, data: Partial<CreateBannerData>): Promise<Banner> {
    try {
      const response = await api.put(`/banner/${id}/update`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating banner:', error);
      throw error;
    }
  }

  // Get user's banners
  async getMyBanners(): Promise<Banner[]> {
    try {
      const response = await api.get('/banner/mine');
      return response.data;
    } catch (error) {
      console.error('Error fetching user banners:', error);
      // Return mock data as fallback
      return this.getMockBanners();
    }
  }

  // Get banner details
  async getBanner(id: string): Promise<Banner> {
    try {
      const response = await api.get(`/banner/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching banner:', error);
      throw error;
    }
  }

  // Delete banner
  async deleteBanner(id: string): Promise<void> {
    try {
      await api.delete(`/banner/${id}`);
    } catch (error) {
      console.error('Error deleting banner:', error);
      throw error;
    }
  }

  // Get mock templates for development
  private getMockTemplates(): Template[] {
    return [
      {
        id: '1',
        name: 'Modern Business Card',
        type: 'daily',
        thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
        preview: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
        category: 'Business',
        tags: ['professional', 'modern', 'clean'],
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
      },
      {
        id: '2',
        name: 'Festive Celebration',
        type: 'festival',
        thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&h=200&fit=crop',
        preview: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop',
        category: 'Celebration',
        tags: ['festive', 'colorful', 'party'],
        isActive: true,
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-18T16:45:00Z',
      },
      {
        id: '3',
        name: 'Special Offer',
        type: 'special',
        thumbnail: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=200&fit=crop',
        preview: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&h=400&fit=crop',
        category: 'Marketing',
        tags: ['offer', 'discount', 'promotion'],
        isActive: true,
        createdAt: '2024-01-05T12:00:00Z',
        updatedAt: '2024-01-22T11:20:00Z',
      },
    ];
  }

  // Get mock banners for development
  private getMockBanners(): Banner[] {
    return [
      {
        id: '1',
        name: 'My Business Card',
        templateId: '1',
        template: this.getMockTemplates()[0],
        customizations: {
          text: 'Tech Solutions Inc.',
          colors: ['#667eea', '#764ba2'],
          fonts: 'Arial',
          images: [],
          layout: 'centered',
        },
        status: 'published',
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
      },
      {
        id: '2',
        name: 'Holiday Greeting',
        templateId: '2',
        template: this.getMockTemplates()[1],
        customizations: {
          text: 'Happy Holidays!',
          colors: ['#ff6b6b', '#4ecdc4'],
          fonts: 'Comic Sans',
          images: [],
          layout: 'centered',
        },
        status: 'draft',
        imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop',
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-18T16:45:00Z',
      },
    ];
  }
}

export default new BannerService(); 