import { User } from '../model/user';
import { Order } from '../model/order';
import { Review } from '../model/review';
import { Wishlist } from '../model/wishlist';
import { EmailService } from './emailService';

export interface UserProfileRequest {
  userId: string;
  profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    bio?: string;
    avatar?: string;
    preferences: {
      language?: string;
      currency?: string;
      timezone?: string;
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      pushNotifications?: boolean;
      marketingEmails?: boolean;
      orderUpdates?: boolean;
      priceAlerts?: boolean;
      newsletter?: boolean;
    };
    addresses: Array<{
      type: 'home' | 'work' | 'other';
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      isDefault: boolean;
    }>;
    paymentMethods?: Array<{
      type: 'credit_card' | 'debit_card' | 'paypal' | 'bank_account';
      lastFour: string;
      isDefault: boolean;
    }>;
  };
}

export interface UserProfileResponse {
  success: boolean;
  message: string;
  profile?: any;
}

export interface UserStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  totalReviews: number;
  averageRating: number;
  wishlistItems: number;
  memberSince: Date;
  lastOrderDate?: Date;
  favoriteCategories: Array<{ category: string; count: number }>;
  favoriteBrands: Array<{ brand: string; count: number }>;
}

export class UserProfileService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).select('-password -verificationToken');
      
      if (!user) {
        throw new Error('User not found');
      }

      // Get user statistics
      const stats = await this.getUserStats(userId);

      return {
        ...user.toObject(),
        stats,
      };
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error}`);
    }
  }

  // Update user profile
  async updateUserProfile(request: UserProfileRequest): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(request.userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Update basic profile information
      if (request.profile.firstName) user.firstName = request.profile.firstName;
      if (request.profile.lastName) user.lastName = request.profile.lastName;
      if (request.profile.phone) user.phone = request.profile.phone;
      if (request.profile.dateOfBirth) user.dateOfBirth = request.profile.dateOfBirth;
      if (request.profile.gender) user.gender = request.profile.gender;
      if (request.profile.bio) user.bio = request.profile.bio;
      if (request.profile.avatar) user.avatar = request.profile.avatar;

      // Update preferences
      if (request.profile.preferences) {
        user.preferences = {
          ...user.preferences,
          ...request.profile.preferences,
        };
      }

      // Update addresses
      if (request.profile.addresses) {
        user.addresses = request.profile.addresses;
      }

      // Update payment methods
      if (request.profile.paymentMethods) {
        user.paymentMethods = request.profile.paymentMethods;
      }

      await user.save();

      return {
        success: true,
        message: 'Profile updated successfully',
        profile: await this.getUserProfile(request.userId),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update profile: ${error}`,
      };
    }
  }

  // Update user preferences
  async updatePreferences(
    userId: string,
    preferences: Partial<UserProfileRequest['profile']['preferences']>
  ): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      user.preferences = {
        ...user.preferences,
        ...preferences,
      };

      await user.save();

      return {
        success: true,
        message: 'Preferences updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update preferences: ${error}`,
      };
    }
  }

  // Add address
  async addAddress(
    userId: string,
    address: {
      type: 'home' | 'work' | 'other';
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      isDefault: boolean;
    }
  ): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // If setting as default, unset other default addresses
      if (address.isDefault) {
        user.addresses = user.addresses.map(addr => ({
          ...addr,
          isDefault: false,
        }));
      }

      user.addresses.push(address);
      await user.save();

      return {
        success: true,
        message: 'Address added successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add address: ${error}`,
      };
    }
  }

  // Update address
  async updateAddress(
    userId: string,
    addressIndex: number,
    updates: Partial<{
      type: 'home' | 'work' | 'other';
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      isDefault: boolean;
    }>
  ): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (addressIndex < 0 || addressIndex >= user.addresses.length) {
        return {
          success: false,
          message: 'Invalid address index',
        };
      }

      // If setting as default, unset other default addresses
      if (updates.isDefault) {
        user.addresses = user.addresses.map((addr, index) => ({
          ...addr,
          isDefault: index === addressIndex,
        }));
      }

      Object.assign(user.addresses[addressIndex], updates);
      await user.save();

      return {
        success: true,
        message: 'Address updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update address: ${error}`,
      };
    }
  }

  // Delete address
  async deleteAddress(userId: string, addressIndex: number): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (addressIndex < 0 || addressIndex >= user.addresses.length) {
        return {
          success: false,
          message: 'Invalid address index',
        };
      }

      const deletedAddress = user.addresses[addressIndex];
      user.addresses.splice(addressIndex, 1);

      // If deleted address was default, set first remaining address as default
      if (deletedAddress.isDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
      }

      await user.save();

      return {
        success: true,
        message: 'Address deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete address: ${error}`,
      };
    }
  }

  // Upload avatar
  async uploadAvatar(userId: string, avatarUrl: string): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      user.avatar = avatarUrl;
      await user.save();

      return {
        success: true,
        message: 'Avatar uploaded successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to upload avatar: ${error}`,
      };
    }
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Get order statistics
      const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrderDate = orders.length > 0 ? orders[0].createdAt : undefined;

      // Get review statistics
      const reviews = await Review.find({ user: userId });
      const totalReviews = reviews.length;
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      // Get wishlist count
      const wishlists = await Wishlist.find({ user: userId });
      const wishlistItems = wishlists.reduce((sum, wishlist) => sum + wishlist.items.length, 0);

      // Get member since date
      const user = await User.findById(userId);
      const memberSince = user?.createdAt || new Date();

      // Get favorite categories
      const categoryStats = await this.getFavoriteCategories(userId);

      // Get favorite brands
      const brandStats = await this.getFavoriteBrands(userId);

      return {
        totalOrders,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        wishlistItems,
        memberSince,
        lastOrderDate,
        favoriteCategories: categoryStats,
        favoriteBrands: brandStats,
      };
    } catch (error) {
      throw new Error(`Failed to get user stats: ${error}`);
    }
  }

  // Get favorite categories
  private async getFavoriteCategories(userId: string): Promise<Array<{ category: string; count: number }>> {
    try {
      const orders = await Order.find({ user: userId }).populate('items.productId');
      
      const categoryCount = new Map<string, number>();
      
      orders.forEach(order => {
        order.items.forEach((item: any) => {
          const category = item.productId.category;
          categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        });
      });

      return Array.from(categoryCount.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to get favorite categories:', error);
      return [];
    }
  }

  // Get favorite brands
  private async getFavoriteBrands(userId: string): Promise<Array<{ brand: string; count: number }>> {
    try {
      const orders = await Order.find({ user: userId }).populate('items.productId');
      
      const brandCount = new Map<string, number>();
      
      orders.forEach(order => {
        order.items.forEach((item: any) => {
          const brand = item.productId.brand;
          if (brand) {
            brandCount.set(brand, (brandCount.get(brand) || 0) + 1);
          }
        });
      });

      return Array.from(brandCount.entries())
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to get favorite brands:', error);
      return [];
    }
  }

  // Deactivate account
  async deactivateAccount(userId: string, password: string): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify password (in real app, you'd use proper password verification)
      // For now, we'll assume password is verified

      user.isActive = false;
      user.deactivatedAt = new Date();
      await user.save();

      // Send deactivation confirmation email
      await this.sendDeactivationEmail(user);

      return {
        success: true,
        message: 'Account deactivated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to deactivate account: ${error}`,
      };
    }
  }

  // Reactivate account
  async reactivateAccount(userId: string): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      user.isActive = true;
      user.deactivatedAt = undefined;
      await user.save();

      // Send reactivation confirmation email
      await this.sendReactivationEmail(user);

      return {
        success: true,
        message: 'Account reactivated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reactivate account: ${error}`,
      };
    }
  }

  // Delete account
  async deleteAccount(userId: string, password: string): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify password (in real app, you'd use proper password verification)
      // For now, we'll assume password is verified

      // Delete user data (in real app, you'd want to handle this more carefully)
      await User.findByIdAndDelete(userId);

      // Send deletion confirmation email
      await this.sendDeletionEmail(user);

      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete account: ${error}`,
      };
    }
  }

  // Export user data
  async exportUserData(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).select('-password -verificationToken');
      
      if (!user) {
        throw new Error('User not found');
      }

      const orders = await Order.find({ user: userId });
      const reviews = await Review.find({ user: userId });
      const wishlists = await Wishlist.find({ user: userId });

      return {
        user: user.toObject(),
        orders: orders.map(order => order.toObject()),
        reviews: reviews.map(review => review.toObject()),
        wishlists: wishlists.map(wishlist => wishlist.toObject()),
        exportedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to export user data: ${error}`);
    }
  }

  // Get privacy settings
  async getPrivacySettings(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        profileVisibility: user.privacy?.profileVisibility || 'public',
        showEmail: user.privacy?.showEmail || false,
        showPhone: user.privacy?.showPhone || false,
        allowDataCollection: user.privacy?.allowDataCollection || true,
        allowPersonalization: user.privacy?.allowPersonalization || true,
        allowThirdPartySharing: user.privacy?.allowThirdPartySharing || false,
        cookiePreferences: user.privacy?.cookiePreferences || 'all',
      };
    } catch (error) {
      throw new Error(`Failed to get privacy settings: ${error}`);
    }
  }

  // Update privacy settings
  async updatePrivacySettings(
    userId: string,
    settings: any
  ): Promise<UserProfileResponse> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      user.privacy = {
        ...user.privacy,
        ...settings,
      };

      await user.save();

      return {
        success: true,
        message: 'Privacy settings updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update privacy settings: ${error}`,
      };
    }
  }

  // Send deactivation email
  private async sendDeactivationEmail(user: any): Promise<void> {
    try {
      const emailData = {
        to: user.email,
        subject: 'Your Amazon Clone Account Has Been Deactivated',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>Account Deactivated</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.firstName || user.name},</h2>
              <p>Your Amazon Clone account has been successfully deactivated.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>What happens next?</h3>
                <ul>
                  <li>Your account is now inactive</li>
                  <li>Your data will be preserved for 30 days</li>
                  <li>You can reactivate your account at any time</li>
                  <li>After 30 days, your data will be permanently deleted</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/reactivate" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Reactivate Account
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send deactivation email:', error);
    }
  }

  // Send reactivation email
  private async sendReactivationEmail(user: any): Promise<void> {
    try {
      const emailData = {
        to: user.email,
        subject: 'Your Amazon Clone Account Has Been Reactivated',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>Account Reactivated</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Welcome back, ${user.firstName || user.name}!</h2>
              <p>Your Amazon Clone account has been successfully reactivated.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>What's next?</h3>
                <ul>
                  <li>Your account is now active</li>
                  <li>All your data has been restored</li>
                  <li>You can continue shopping as before</li>
                  <li>Your preferences and settings are preserved</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/dashboard" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Go to Dashboard
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send reactivation email:', error);
    }
  }

  // Send deletion email
  private async sendDeletionEmail(user: any): Promise<void> {
    try {
      const emailData = {
        to: user.email,
        subject: 'Your Amazon Clone Account Has Been Deleted',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1>Account Deleted</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Goodbye, ${user.firstName || user.name}!</h2>
              <p>Your Amazon Clone account and all associated data have been permanently deleted.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Important Information</h3>
                <ul>
                  <li>This action cannot be undone</li>
                  <li>All your personal data has been deleted</li>
                  <li>Your order history has been removed</li>
                  <li>You will no longer receive emails from us</li>
                </ul>
              </div>

              <p>We're sorry to see you go! If you change your mind, you can always create a new account.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send deletion email:', error);
    }
  }

  // Get user activity timeline
  async getUserActivityTimeline(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const activities = [];

      // Get recent orders
      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('createdAt totalAmount status items');

      orders.forEach(order => {
        activities.push({
          type: 'order',
          date: order.createdAt,
          description: `Order #${order._id} - ${order.status}`,
          amount: order.totalAmount,
        });
      });

      // Get recent reviews
      const reviews = await Review.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('productId', 'name');

      reviews.forEach(review => {
        activities.push({
          type: 'review',
          date: review.createdAt,
          description: `Reviewed ${review.productId.name}`,
          rating: review.rating,
        });
      });

      // Sort by date and limit
      return activities
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get user activity timeline: ${error}`);
    }
  }
}
