import { FlashDeal, IFlashDeal } from '../model/flashDeal';
import { Product } from '../model/product';
import { User } from '../model/user';
import { EmailService } from './emailService';

export interface FlashDealRequest {
  title: string;
  description: string;
  products: Array<{
    productId: string;
    dealPrice: number;
    maxQuantity: number;
  }>;
  startTime: Date;
  endTime: Date;
  bannerImage?: string;
  tags?: string[];
  targetAudience?: 'all' | 'new' | 'prime' | 'loyalty';
  maxPurchasePerUser?: number;
  priority?: number;
}

export interface FlashDealResponse {
  success: boolean;
  dealId?: string;
  message: string;
  deal?: IFlashDeal;
}

export interface FlashDealStats {
  totalDeals: number;
  activeDeals: number;
  upcomingDeals: number;
  expiredDeals: number;
  totalRevenue: number;
  totalSavings: number;
  topPerformingDeals: Array<{
    dealId: string;
    title: string;
    revenue: number;
    unitsSold: number;
    savings: number;
  }>;
}

export class FlashDealService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create a new flash deal
  async createFlashDeal(request: FlashDealRequest): Promise<FlashDealResponse> {
    try {
      // Validate products and get current prices
      const validatedProducts = await this.validateDealProducts(request.products);
      
      if (!validatedProducts.valid) {
        return {
          success: false,
          message: validatedProducts.message,
        };
      }

      const deal = new FlashDeal({
        title: request.title,
        description: request.description,
        products: request.products.map(product => ({
          productId: product.productId,
          originalPrice: validatedProducts.productPrices.get(product.productId) || 0,
          dealPrice: product.dealPrice,
          maxQuantity: product.maxQuantity,
          soldQuantity: 0,
        })),
        startTime: request.startTime,
        endTime: request.endTime,
        bannerImage: request.bannerImage,
        tags: request.tags || [],
        targetAudience: request.targetAudience || 'all',
        maxPurchasePerUser: request.maxPurchasePerUser || 1,
        priority: request.priority || 0,
      });

      await deal.save();

      // Schedule notifications for deal start
      this.scheduleDealNotifications(deal);

      return {
        success: true,
        dealId: deal._id.toString(),
        message: 'Flash deal created successfully',
        deal,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create flash deal: ${error}`,
      };
    }
  }

  // Get active flash deals
  async getActiveFlashDeals(
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ deals: IFlashDeal[]; total: number }> {
    try {
      const now = new Date();
      const skip = (page - 1) * limit;

      let filter: any = {
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gt: now },
      };

      // Filter by target audience if user provided
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          const userAudience = this.getUserAudience(user);
          filter.$or = [
            { targetAudience: 'all' },
            { targetAudience: userAudience },
          ];
        }
      }

      const deals = await FlashDeal.find(filter)
        .populate('products.productId', 'name images')
        .sort({ priority: -1, endTime: 1 })
        .skip(skip)
        .limit(limit);

      const total = await FlashDeal.countDocuments(filter);

      return { deals, total };
    } catch (error) {
      throw new Error(`Failed to get active flash deals: ${error}`);
    }
  }

  // Get upcoming flash deals
  async getUpcomingFlashDeals(page: number = 1, limit: number = 20): Promise<{ deals: IFlashDeal[]; total: number }> {
    try {
      const now = new Date();
      const skip = (page - 1) * limit;

      const deals = await FlashDeal.find({
        isActive: true,
        startTime: { $gt: now },
      })
        .populate('products.productId', 'name images')
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit);

      const total = await FlashDeal.countDocuments({
        isActive: true,
        startTime: { $gt: now },
      });

      return { deals, total };
    } catch (error) {
      throw new Error(`Failed to get upcoming flash deals: ${error}`);
    }
  }

  // Get flash deal by ID
  async getFlashDealById(dealId: string): Promise<IFlashDeal | null> {
    try {
      const deal = await FlashDeal.findById(dealId)
        .populate('products.productId', 'name images description');

      return deal;
    } catch (error) {
      throw new Error(`Failed to get flash deal: ${error}`);
    }
  }

  // Update flash deal
  async updateFlashDeal(
    dealId: string,
    updates: Partial<Pick<IFlashDeal, 'title' | 'description' | 'endTime' | 'isActive' | 'priority' | 'bannerImage' | 'tags'>>
  ): Promise<FlashDealResponse> {
    try {
      const deal = await FlashDeal.findById(dealId);
      
      if (!deal) {
        return {
          success: false,
          message: 'Flash deal not found',
        };
      }

      Object.assign(deal, updates);
      await deal.save();

      return {
        success: true,
        message: 'Flash deal updated successfully',
        deal,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update flash deal: ${error}`,
      };
    }
  }

  // Delete flash deal
  async deleteFlashDeal(dealId: string): Promise<FlashDealResponse> {
    try {
      const deal = await FlashDeal.findById(dealId);
      
      if (!deal) {
        return {
          success: false,
          message: 'Flash deal not found',
        };
      }

      await FlashDeal.findByIdAndDelete(dealId);

      return {
        success: true,
        message: 'Flash deal deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete flash deal: ${error}`,
      };
    }
  }

  // Purchase from flash deal
  async purchaseFromFlashDeal(
    dealId: string,
    userId: string,
    items: Array<{ productId: string; quantity: number }>
  ): Promise<{ success: boolean; message: string; orderTotal?: number }> {
    try {
      const deal = await FlashDeal.findById(dealId);
      
      if (!deal) {
        return { success: false, message: 'Flash deal not found' };
      }

      const now = new Date();
      if (now < deal.startTime || now > deal.endTime || !deal.isActive) {
        return { success: false, message: 'Flash deal is not active' };
      }

      let totalAmount = 0;
      const purchasedItems: any[] = [];

      // Validate each item
      for (const item of items) {
        const dealProduct = deal.products.find(
          dp => dp.productId.toString() === item.productId
        );

        if (!dealProduct) {
          return { success: false, message: `Product ${item.productId} not in this deal` };
        }

        if (dealProduct.soldQuantity + item.quantity > dealProduct.maxQuantity) {
          return { success: false, message: `Insufficient stock for ${item.productId}` };
        }

        const itemTotal = dealProduct.dealPrice * item.quantity;
        totalAmount += itemTotal;

        purchasedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: dealProduct.dealPrice,
        });
      }

      // In a real app, you would create an order here
      // For now, we'll just update the sold quantities
      for (const item of items) {
        const dealProduct = deal.products.find(
          dp => dp.productId.toString() === item.productId
        );
        if (dealProduct) {
          dealProduct.soldQuantity += item.quantity;
        }
      }

      await deal.save();

      return {
        success: true,
        message: 'Purchase successful',
        orderTotal: totalAmount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to purchase from flash deal: ${error}`,
      };
    }
  }

  // Get flash deal statistics
  async getFlashDealStats(): Promise<FlashDealStats> {
    try {
      const now = new Date();
      
      const totalDeals = await FlashDeal.countDocuments();
      const activeDeals = await FlashDeal.countDocuments({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gt: now },
      });
      const upcomingDeals = await FlashDeal.countDocuments({
        isActive: true,
        startTime: { $gt: now },
      });
      const expiredDeals = await FlashDeal.countDocuments({
        $or: [
          { endTime: { $lt: now } },
          { isActive: false },
        ],
      });

      // Calculate revenue and savings
      const allDeals = await FlashDeal.find({});
      let totalRevenue = 0;
      let totalSavings = 0;

      for (const deal of allDeals) {
        for (const product of deal.products) {
          const revenue = product.dealPrice * product.soldQuantity;
          const originalRevenue = product.originalPrice * product.soldQuantity;
          const savings = originalRevenue - revenue;

          totalRevenue += revenue;
          totalSavings += savings;
        }
      }

      // Get top performing deals
      const topPerformingDeals = await FlashDeal.aggregate([
        { $unwind: '$products' },
        {
          $group: {
            _id: '$_id',
            title: { $first: '$title' },
            revenue: {
              $sum: { $multiply: ['$products.dealPrice', '$products.soldQuantity'] }
            },
            unitsSold: { $sum: '$products.soldQuantity' },
            savings: {
              $sum: {
                $multiply: [
                  { $subtract: ['$products.originalPrice', '$products.dealPrice'] },
                  '$products.soldQuantity'
                ]
              }
            },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]);

      return {
        totalDeals,
        activeDeals,
        upcomingDeals,
        expiredDeals,
        totalRevenue,
        totalSavings,
        topPerformingDeals,
      };
    } catch (error) {
      throw new Error(`Failed to get flash deal stats: ${error}`);
    }
  }

  // Process expired deals (cron job)
  async processExpiredDeals(): Promise<number> {
    try {
      const now = new Date();
      
      const expiredDeals = await FlashDeal.find({
        isActive: true,
        endTime: { $lt: now },
      });

      let processedCount = 0;

      for (const deal of expiredDeals) {
        deal.isActive = false;
        await deal.save();
        
        // Send notification about deal ending
        await this.notifyDealEnded(deal);
        processedCount++;
      }

      return processedCount;
    } catch (error) {
      console.error('Failed to process expired deals:', error);
      return 0;
    }
  }

  // Validate deal products
  private async validateDealProducts(products: FlashDealRequest['products']): Promise<{ valid: boolean; message: string; productPrices?: Map<string, number> }> {
    const productPrices = new Map<string, number>();

    for (const product of products) {
      const productDoc = await Product.findById(product.productId);
      
      if (!productDoc) {
        return { valid: false, message: `Product ${product.productId} not found` };
      }

      if (product.dealPrice >= productDoc.price) {
        return { valid: false, message: `Deal price must be lower than current price for ${productDoc.name}` };
      }

      if (productDoc.quantity < product.maxQuantity) {
        return { valid: false, message: `Insufficient stock for ${productDoc.name}` };
      }

      productPrices.set(product.productId, productDoc.price);
    }

    return { valid: true, message: 'Products validated', productPrices };
  }

  // Get user audience type
  private getUserAudience(user: any): 'new' | 'prime' | 'loyalty' | 'all' {
    // Simplified logic - in real app, you'd check user's purchase history, membership, etc.
    if (user.createdAt && Date.now() - user.createdAt.getTime() < 30 * 24 * 60 * 60 * 1000) {
      return 'new';
    }
    
    // Check if user has Prime membership
    if (user.isPrimeMember) {
      return 'prime';
    }
    
    // Check loyalty status based on total purchases
    if (user.totalSpent > 1000) {
      return 'loyalty';
    }
    
    return 'all';
  }

  // Schedule deal notifications
  private async scheduleDealNotifications(deal: IFlashDeal): Promise<void> {
    try {
      // In a real app, you'd use a job scheduler like Bull or Agenda
      // For now, we'll just log the scheduling
      console.log(`Scheduled notifications for deal: ${deal.title}`);
      console.log(`Start: ${deal.startTime}, End: ${deal.endTime}`);
    } catch (error) {
      console.error('Failed to schedule deal notifications:', error);
    }
  }

  // Notify users about deal ending soon
  private async notifyDealEnded(deal: IFlashDeal): Promise<void> {
    try {
      // In a real app, you'd notify users who showed interest or purchased
      console.log(`Flash deal ended: ${deal.title}`);
    } catch (error) {
      console.error('Failed to notify deal ended:', error);
    }
  }

  // Get time remaining for a deal
  getTimeRemaining(endTime: Date): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  }

  // Search flash deals
  async searchFlashDeals(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ deals: IFlashDeal[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');
      const now = new Date();

      const deals = await FlashDeal.find({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gt: now },
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ],
      })
        .populate('products.productId', 'name images')
        .sort({ priority: -1, endTime: 1 })
        .skip(skip)
        .limit(limit);

      const total = await FlashDeal.countDocuments({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gt: now },
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ],
      });

      return { deals, total };
    } catch (error) {
      throw new Error(`Failed to search flash deals: ${error}`);
    }
  }
}
