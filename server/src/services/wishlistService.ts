import { Wishlist, IWishlist } from '../model/wishlist';
import { User } from '../model/user';
import { Product } from '../model/product';
import { EmailService } from './emailService';
import { randomBytes } from 'crypto';

export interface WishlistRequest {
  userId: string;
  name: string;
  description?: string;
  category: string;
  isPublic?: boolean;
  tags?: string[];
  settings?: Partial<IWishlist['settings']>;
}

export interface WishlistItemRequest {
  productId: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface WishlistResponse {
  success: boolean;
  wishlistId?: string;
  message: string;
  shareUrl?: string;
}

export class WishlistService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create a new wishlist
  async createWishlist(request: WishlistRequest): Promise<WishlistResponse> {
    try {
      const shareToken = request.isPublic ? this.generateShareToken() : undefined;

      const wishlist = new Wishlist({
        user: request.userId,
        name: request.name,
        description: request.description,
        category: request.category,
        isPublic: request.isPublic || false,
        shareToken,
        tags: request.tags || [],
        settings: {
          allowComments: true,
          notifyOnPriceDrop: true,
          notifyOnBackInStock: true,
          ...request.settings,
        },
      });

      await wishlist.save();

      return {
        success: true,
        wishlistId: wishlist._id.toString(),
        message: 'Wishlist created successfully',
        shareUrl: shareToken ? `https://yourapp.com/wishlist/${shareToken}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create wishlist: ${error}`,
      };
    }
  }

  // Get user's wishlists
  async getUserWishlists(
    userId: string,
    category?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ wishlists: IWishlist[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let filter: any = { user: userId };

      if (category && category !== 'all') {
        filter.category = category;
      }

      const wishlists = await Wishlist.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.productId', 'name price images');

      const total = await Wishlist.countDocuments(filter);

      return { wishlists, total };
    } catch (error) {
      throw new Error(`Failed to get user wishlists: ${error}`);
    }
  }

  // Get wishlist by ID
  async getWishlistById(wishlistId: string, userId?: string): Promise<IWishlist | null> {
    try {
      let filter: any = { _id: wishlistId };

      // If userId provided, check access permissions
      if (userId) {
        filter = {
          $or: [
            { user: userId },
            { isPublic: true },
            { 'collaborators.userId': userId },
          ],
        };
      } else {
        filter.isPublic = true;
      }

      const wishlist = await Wishlist.findOne(filter)
        .populate('items.productId', 'name price images')
        .populate('user', 'name')
        .populate('collaborators.userId', 'name');

      return wishlist;
    } catch (error) {
      throw new Error(`Failed to get wishlist: ${error}`);
    }
  }

  // Get wishlist by share token
  async getWishlistByShareToken(shareToken: string): Promise<IWishlist | null> {
    try {
      const wishlist = await Wishlist.findOne({ shareToken, isPublic: true })
        .populate('items.productId', 'name price images')
        .populate('user', 'name');

      return wishlist;
    } catch (error) {
      throw new Error(`Failed to get wishlist by share token: ${error}`);
    }
  }

  // Add item to wishlist
  async addItemToWishlist(
    wishlistId: string,
    userId: string,
    item: WishlistItemRequest
  ): Promise<WishlistResponse> {
    try {
      const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
      
      if (!wishlist) {
        return {
          success: false,
          message: 'Wishlist not found',
        };
      }

      // Check if item already exists
      const existingItem = wishlist.items.find(
        wishlistItem => wishlistItem.productId.toString() === item.productId
      );

      if (existingItem) {
        return {
          success: false,
          message: 'Item already in wishlist',
        };
      }

      // Validate product exists
      const product = await Product.findById(item.productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      // Add item
      wishlist.items.push({
        productId: item.productId,
        addedAt: new Date(),
        notes: item.notes,
        priority: item.priority || 'medium',
      });

      await wishlist.save();

      return {
        success: true,
        message: 'Item added to wishlist',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add item to wishlist: ${error}`,
      };
    }
  }

  // Remove item from wishlist
  async removeItemFromWishlist(
    wishlistId: string,
    userId: string,
    productId: string
  ): Promise<WishlistResponse> {
    try {
      const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
      
      if (!wishlist) {
        return {
          success: false,
          message: 'Wishlist not found',
        };
      }

      // Remove item
      wishlist.items = wishlist.items.filter(
        item => item.productId.toString() !== productId
      );

      await wishlist.save();

      return {
        success: true,
        message: 'Item removed from wishlist',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to remove item from wishlist: ${error}`,
      };
    }
  }

  // Update wishlist item
  async updateWishlistItem(
    wishlistId: string,
    userId: string,
    productId: string,
    updates: { notes?: string; priority?: 'low' | 'medium' | 'high' }
  ): Promise<WishlistResponse> {
    try {
      const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
      
      if (!wishlist) {
        return {
          success: false,
          message: 'Wishlist not found',
        };
      }

      // Find and update item
      const item = wishlist.items.find(
        item => item.productId.toString() === productId
      );

      if (!item) {
        return {
          success: false,
          message: 'Item not found in wishlist',
        };
      }

      if (updates.notes !== undefined) {
        item.notes = updates.notes;
      }
      if (updates.priority !== undefined) {
        item.priority = updates.priority;
      }

      await wishlist.save();

      return {
        success: true,
        message: 'Wishlist item updated',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update wishlist item: ${error}`,
      };
    }
  }

  // Update wishlist
  async updateWishlist(
    wishlistId: string,
    userId: string,
    updates: Partial<Pick<IWishlist, 'name' | 'description' | 'category' | 'isPublic' | 'tags' | 'settings'>>
  ): Promise<WishlistResponse> {
    try {
      const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
      
      if (!wishlist) {
        return {
          success: false,
          message: 'Wishlist not found',
        };
      }

      // Update fields
      Object.assign(wishlist, updates);

      // Generate new share token if making public
      if (updates.isPublic && !wishlist.shareToken) {
        wishlist.shareToken = this.generateShareToken();
      }

      await wishlist.save();

      return {
        success: true,
        message: 'Wishlist updated successfully',
        shareUrl: wishlist.shareToken ? `https://yourapp.com/wishlist/${wishlist.shareToken}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update wishlist: ${error}`,
      };
    }
  }

  // Delete wishlist
  async deleteWishlist(wishlistId: string, userId: string): Promise<WishlistResponse> {
    try {
      const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
      
      if (!wishlist) {
        return {
          success: false,
          message: 'Wishlist not found',
        };
      }

      await Wishlist.findByIdAndDelete(wishlistId);

      return {
        success: true,
        message: 'Wishlist deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete wishlist: ${error}`,
      };
    }
  }

  // Add collaborator to wishlist
  async addCollaborator(
    wishlistId: string,
    userId: string,
    collaboratorId: string,
    permission: 'view' | 'edit'
  ): Promise<WishlistResponse> {
    try {
      const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
      
      if (!wishlist) {
        return {
          success: false,
          message: 'Wishlist not found',
        };
      }

      // Check if collaborator already exists
      const existingCollaborator = wishlist.collaborators.find(
        collab => collab.userId.toString() === collaboratorId
      );

      if (existingCollaborator) {
        return {
          success: false,
          message: 'User is already a collaborator',
        };
      }

      // Add collaborator
      wishlist.collaborators.push({
        userId: collaboratorId,
        permission,
        addedAt: new Date(),
      });

      await wishlist.save();

      // Notify collaborator
      await this.notifyCollaboratorAdded(collaboratorId, wishlist);

      return {
        success: true,
        message: 'Collaborator added successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add collaborator: ${error}`,
      };
    }
  }

  // Remove collaborator from wishlist
  async removeCollaborator(
    wishlistId: string,
    userId: string,
    collaboratorId: string
  ): Promise<WishlistResponse> {
    try {
      const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
      
      if (!wishlist) {
        return {
          success: false,
          message: 'Wishlist not found',
        };
      }

      // Remove collaborator
      wishlist.collaborators = wishlist.collaborators.filter(
        collab => collab.userId.toString() !== collaboratorId
      );

      await wishlist.save();

      return {
        success: true,
        message: 'Collaborator removed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to remove collaborator: ${error}`,
      };
    }
  }

  // Get wishlist statistics
  async getWishlistStats(userId: string): Promise<any> {
    try {
      const wishlists = await Wishlist.find({ user: userId });
      
      const totalWishlists = wishlists.length;
      const totalItems = wishlists.reduce((sum, wishlist) => sum + wishlist.items.length, 0);
      
      const categoryStats = wishlists.reduce((stats, wishlist) => {
        stats[wishlist.category] = (stats[wishlist.category] || 0) + 1;
        return stats;
      }, {} as Record<string, number>);

      const publicWishlists = wishlists.filter(w => w.isPublic).length;
      const sharedWishlists = wishlists.filter(w => w.shareToken).length;

      const totalCollaborators = wishlists.reduce((sum, wishlist) => sum + wishlist.collaborators.length, 0);

      return {
        totalWishlists,
        totalItems,
        categoryStats,
        publicWishlists,
        sharedWishlists,
        totalCollaborators,
      };
    } catch (error) {
      throw new Error(`Failed to get wishlist stats: ${error}`);
    }
  }

  // Search public wishlists
  async searchPublicWishlists(
    query: string,
    category?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ wishlists: IWishlist[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');

      let filter: any = {
        isPublic: true,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ],
      };

      if (category && category !== 'all') {
        filter.category = category;
      }

      const wishlists = await Wishlist.find(filter)
        .populate('user', 'name')
        .populate('items.productId', 'name price images')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Wishlist.countDocuments(filter);

      return { wishlists, total };
    } catch (error) {
      throw new Error(`Failed to search public wishlists: ${error}`);
    }
  }

  // Get trending wishlists
  async getTrendingWishlists(limit: number = 10): Promise<IWishlist[]> {
    try {
      const wishlists = await Wishlist.find({ isPublic: true })
        .sort({ 'items.length': -1, updatedAt: -1 })
        .limit(limit)
        .populate('user', 'name')
        .populate('items.productId', 'name price images');

      return wishlists;
    } catch (error) {
      throw new Error(`Failed to get trending wishlists: ${error}`);
    }
  }

  // Generate share token
  private generateShareToken(): string {
    return randomBytes(16).toString('hex');
  }

  // Notify collaborator added
  private async notifyCollaboratorAdded(collaboratorId: string, wishlist: IWishlist): Promise<void> {
    try {
      const user = await User.findById(collaboratorId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `You've been added to a wishlist!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Wishlist Collaboration!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>You've been added to the wishlist <strong>${wishlist.name}</strong>!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Wishlist Details:</h3>
                <p><strong>Name:</strong> ${wishlist.name}</p>
                <p><strong>Category:</strong> ${wishlist.category}</p>
                <p><strong>Items:</strong> ${wishlist.items.length}</p>
                <p><strong>Description:</strong> ${wishlist.description || 'No description'}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/wishlist/${wishlist._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Wishlist
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to notify collaborator:', error);
    }
  }

  // Process price drop notifications for wishlists
  async processPriceDropNotifications(productId: string, newPrice: number): Promise<number> {
    try {
      const wishlists = await Wishlist.find({
        'items.productId': productId,
        'settings.notifyOnPriceDrop': true,
      });

      let notificationsSent = 0;

      for (const wishlist of wishlists) {
        const user = await User.findById(wishlist.user);
        if (!user) continue;

        const product = await Product.findById(productId);
        if (!product) continue;

        const emailData = {
          to: user.email,
          subject: `Price Drop Alert for ${product.name}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
                <h1>💰 Price Drop Alert!</h1>
              </div>
              <div style="padding: 20px;">
                <h2>Hi ${user.name},</h2>
                <p>A product in your wishlist <strong>${wishlist.name}</strong> has dropped in price!</p>
                
                <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3>${product.name}</h3>
                  <p><strong>Old Price:</strong> $${product.price.toFixed(2)}</p>
                  <p><strong>New Price:</strong> $${newPrice.toFixed(2)}</p>
                  <p><strong>You Save:</strong> $${(product.price - newPrice).toFixed(2)}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://yourapp.com/product/${productId}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Buy Now
                  </a>
                </div>
              </div>
            </div>
          `,
        };

        await this.emailService.sendEmail(emailData);
        notificationsSent++;
      }

      return notificationsSent;
    } catch (error) {
      console.error('Failed to process price drop notifications:', error);
      return 0;
    }
  }
}
