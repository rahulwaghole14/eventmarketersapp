import api from './api';

export interface BusinessProfile {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  website?: string;
  logo?: string;
  companyLogo?: string;
  banner?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  services: string[];
  workingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessProfileData {
  name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  website?: string;
  companyLogo?: string;
  services: string[];
  workingHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

class BusinessProfileService {
  // Get all business profiles (adapted to use user profile)
  async getBusinessProfiles(): Promise<BusinessProfile[]> {
    try {
      // Since there's no specific business profiles endpoint, we'll use mock data
      // In a real implementation, you might store business profiles in user profile or create a separate endpoint
      const response = await api.get('/user/profile');
      // For now, return mock data as the API doesn't have business profiles endpoint
      return this.getMockProfiles();
    } catch (error) {
      console.error('Error fetching business profiles:', error);
      // Return mock data as fallback
      return this.getMockProfiles();
    }
  }

  // Get single business profile
  async getBusinessProfile(id: string): Promise<BusinessProfile> {
    try {
      // This would need a specific endpoint in your API
      const response = await api.get(`/user/profile`);
      // For now, return mock data
      const mockProfiles = this.getMockProfiles();
      return mockProfiles.find(p => p.id === id) || mockProfiles[0];
    } catch (error) {
      console.error('Error fetching business profile:', error);
      throw error;
    }
  }

  // Create new business profile (adapted to update user profile)
  async createBusinessProfile(data: CreateBusinessProfileData): Promise<BusinessProfile> {
    try {
      // Update user profile with business information
      const profileData = {
        name: data.name,
        description: data.description,
        category: data.category,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        businessData: {
          services: data.services,
          workingHours: data.workingHours,
          socialMedia: data.socialMedia,
        }
      };

      const response = await api.put('/user/profile', profileData);
      
      // Create a business profile object from the response
      const newProfile: BusinessProfile = {
        id: Date.now().toString(),
        name: data.name,
        description: data.description,
        category: data.category,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        services: data.services,
        workingHours: data.workingHours,
        socialMedia: data.socialMedia,
        logo: '',
        banner: '',
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return newProfile;
    } catch (error) {
      console.error('Error creating business profile:', error);
      throw error;
    }
  }

  // Update business profile
  async updateBusinessProfile(id: string, data: Partial<CreateBusinessProfileData>): Promise<BusinessProfile> {
    try {
      // Update user profile with business information
      const profileData = {
        name: data.name,
        description: data.description,
        category: data.category,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        businessData: {
          services: data.services,
          workingHours: data.workingHours,
          socialMedia: data.socialMedia,
        }
      };

      const response = await api.put('/user/profile', profileData);
      
      // Return updated profile
      const updatedProfile: BusinessProfile = {
        id,
        name: data.name || '',
        description: data.description || '',
        category: data.category || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website,
        services: data.services || [],
        workingHours: data.workingHours || {},
        socialMedia: data.socialMedia,
        logo: '',
        banner: '',
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return updatedProfile;
    } catch (error) {
      console.error('Error updating business profile:', error);
      throw error;
    }
  }

  // Delete business profile
  async deleteBusinessProfile(id: string): Promise<void> {
    try {
      // Since there's no specific business profile deletion endpoint,
      // we'll clear the business data from user profile
      const profileData = {
        businessData: null
      };
      await api.put('/user/profile', profileData);
    } catch (error) {
      console.error('Error deleting business profile:', error);
      throw error;
    }
  }

  // Upload image (logo or banner) using media upload endpoint
  async uploadImage(profileId: string, imageType: 'logo' | 'banner', imageUri: string): Promise<{ url: string }> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `${imageType}_${Date.now()}.jpg`,
      } as any);
      formData.append('type', imageType);

      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { url: response.data.url };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  // Search business profiles
  async searchBusinessProfiles(query: string): Promise<BusinessProfile[]> {
    try {
      // Since there's no search endpoint, we'll filter mock data
      const mockProfiles = this.getMockProfiles();
      return mockProfiles.filter(profile => 
        profile.name.toLowerCase().includes(query.toLowerCase()) ||
        profile.category.toLowerCase().includes(query.toLowerCase()) ||
        profile.description.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching business profiles:', error);
      throw error;
    }
  }

  // Get business profiles by category
  async getBusinessProfilesByCategory(category: string): Promise<BusinessProfile[]> {
    try {
      // Filter mock data by category
      const mockProfiles = this.getMockProfiles();
      return mockProfiles.filter(profile => 
        profile.category.toLowerCase() === category.toLowerCase()
      );
    } catch (error) {
      console.error('Error fetching business profiles by category:', error);
      throw error;
    }
  }

  // Verify business profile
  async verifyBusinessProfile(id: string): Promise<BusinessProfile> {
    try {
      // This would need a specific verification endpoint
      const mockProfiles = this.getMockProfiles();
      const profile = mockProfiles.find(p => p.id === id);
      if (profile) {
        profile.isVerified = true;
        profile.updatedAt = new Date().toISOString();
      }
      return profile || mockProfiles[0];
    } catch (error) {
      console.error('Error verifying business profile:', error);
      throw error;
    }
  }

  // Get mock profiles for development
  private getMockProfiles(): BusinessProfile[] {
    return [
      {
        id: '1',
        name: 'Tech Solutions Inc.',
        description: 'Leading technology solutions provider specializing in custom software development and digital transformation.',
        category: 'Technology',
        address: '123 Innovation Drive, Tech City, TC 12345',
        phone: '+1 (555) 123-4567',
        email: 'contact@techsolutions.com',
        website: 'https://techsolutions.com',
        logo: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop',
        banner: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop',
        socialMedia: {
          facebook: 'https://facebook.com/techsolutions',
          instagram: 'https://instagram.com/techsolutions',
          linkedin: 'https://linkedin.com/company/techsolutions',
        },
        services: ['Custom Software Development', 'Web Development', 'Mobile Apps', 'Cloud Solutions'],
        workingHours: {
          monday: { open: '09:00', close: '18:00', isOpen: true },
          tuesday: { open: '09:00', close: '18:00', isOpen: true },
          wednesday: { open: '09:00', close: '18:00', isOpen: true },
          thursday: { open: '09:00', close: '18:00', isOpen: true },
          friday: { open: '09:00', close: '18:00', isOpen: true },
          saturday: { open: '10:00', close: '16:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        rating: 4.8,
        reviewCount: 156,
        isVerified: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
      },
      {
        id: '2',
        name: 'Creative Design Studio',
        description: 'Award-winning design studio creating stunning visual experiences for brands worldwide.',
        category: 'Design',
        address: '456 Creative Avenue, Design District, DD 67890',
        phone: '+1 (555) 987-6543',
        email: 'hello@creativedesign.com',
        website: 'https://creativedesign.com',
        logo: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=200&h=200&fit=crop',
        banner: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=200&fit=crop',
        socialMedia: {
          instagram: 'https://instagram.com/creativedesign',
          twitter: 'https://twitter.com/creativedesign',
          linkedin: 'https://linkedin.com/company/creativedesign',
        },
        services: ['Brand Identity', 'UI/UX Design', 'Print Design', 'Digital Marketing'],
        workingHours: {
          monday: { open: '10:00', close: '19:00', isOpen: true },
          tuesday: { open: '10:00', close: '19:00', isOpen: true },
          wednesday: { open: '10:00', close: '19:00', isOpen: true },
          thursday: { open: '10:00', close: '19:00', isOpen: true },
          friday: { open: '10:00', close: '19:00', isOpen: true },
          saturday: { open: '11:00', close: '17:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        rating: 4.9,
        reviewCount: 89,
        isVerified: true,
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-18T16:45:00Z',
      },
      {
        id: '3',
        name: 'Green Earth Restaurant',
        description: 'Sustainable dining experience with farm-to-table organic ingredients and eco-friendly practices.',
        category: 'Restaurant',
        address: '789 Organic Street, Food District, FD 11111',
        phone: '+1 (555) 456-7890',
        email: 'info@greenearth.com',
        website: 'https://greenearth.com',
        logo: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=200&h=200&fit=crop',
        banner: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=200&fit=crop',
        socialMedia: {
          facebook: 'https://facebook.com/greenearth',
          instagram: 'https://instagram.com/greenearth',
        },
        services: ['Fine Dining', 'Catering', 'Private Events', 'Cooking Classes'],
        workingHours: {
          monday: { open: '11:00', close: '22:00', isOpen: true },
          tuesday: { open: '11:00', close: '22:00', isOpen: true },
          wednesday: { open: '11:00', close: '22:00', isOpen: true },
          thursday: { open: '11:00', close: '22:00', isOpen: true },
          friday: { open: '11:00', close: '23:00', isOpen: true },
          saturday: { open: '10:00', close: '23:00', isOpen: true },
          sunday: { open: '10:00', close: '21:00', isOpen: true },
        },
        rating: 4.7,
        reviewCount: 234,
        isVerified: false,
        createdAt: '2024-01-05T12:00:00Z',
        updatedAt: '2024-01-22T11:20:00Z',
      },
    ];
  }
}

export default new BusinessProfileService(); 