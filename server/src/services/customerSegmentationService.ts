import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { Review } from '../model/review';

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  valueType?: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface SegmentDefinition {
  id: string;
  name: string;
  description: string;
  criteria: {
    filters: SegmentCriteria[];
    logic: 'and' | 'or';
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentResponse {
  success: boolean;
  message: string;
  segment?: SegmentDefinition;
  userCount?: number;
}

export interface CustomerProfile {
  userId: string;
  demographics: {
    age?: number;
    gender?: string;
    location?: {
      country: string;
      city: string;
    };
    registrationDate: Date;
  };
  behavior: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    orderFrequency: number; // orders per month
    preferredCategories: Array<{ category: string; count: number }>;
    preferredBrands: Array<{ brand: string; count: number }>;
    averageRating: number;
    reviewCount: number;
    cartAbandonmentRate: number;
    sessionFrequency: number; // sessions per week
    averageSessionDuration: number; // in minutes
  };
  engagement: {
    emailOpenRate: number;
    emailClickRate: number;
    lastEmailOpen?: Date;
    lastLoginDate?: Date;
    loyaltyPoints?: number;
    loyaltyTier?: string;
    referralCount: number;
    socialShares: number;
  };
  predictive: {
    churnRisk: 'low' | 'medium' | 'high';
    lifetimeValue: number;
    nextPurchaseProbability: number;
    preferredPurchaseTime: number; // days from now
    priceSensitivity: 'low' | 'medium' | 'high';
    productAffinity: Record<string, number>;
  };
}

export interface SegmentAnalytics {
  segmentId: string;
  segmentName: string;
  userCount: number;
  averageOrderValue: number;
  totalRevenue: number;
  conversionRate: number;
  retentionRate: number;
  churnRate: number;
  topProducts: Array<{
    productId: string;
    name: string;
    purchases: number;
    revenue: number;
  }>;
  trends: {
    growth: number; // percentage change over last period
    engagement: number; // average engagement score
    satisfaction: number; // average satisfaction score
  };
}

export class CustomerSegmentationService {
  // Create customer segment
  async createSegment(definition: Partial<SegmentDefinition>): Promise<SegmentResponse> {
    try {
      if (!definition.name || !definition.criteria) {
        return {
          success: false,
          message: 'Segment name and criteria are required',
        };
      }

      // Validate criteria
      const validation = this.validateCriteria(definition.criteria);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      const segment: SegmentDefinition = {
        id: this.generateId(),
        name: definition.name,
        description: definition.description || '',
        criteria: definition.criteria,
        isActive: definition.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate segment size
      const userCount = await this.calculateSegmentSize(segment.criteria);

      return {
        success: true,
        message: 'Segment created successfully',
        segment,
        userCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create segment: ${error}`,
      };
    }
  }

  // Validate segment criteria
  private validateCriteria(criteria: any): { valid: boolean; message: string } {
    try {
      if (!criteria.filters || criteria.filters.length === 0) {
        return { valid: false, message: 'At least one filter is required' };
      }

      if (!['and', 'or'].includes(criteria.logic)) {
        return { valid: false, message: 'Logic must be "and" or "or"' };
      }

      for (const filter of criteria.filters) {
        if (!filter.field || !filter.operator || filter.value === undefined) {
          return { valid: false, message: 'Each filter must have field, operator, and value' };
        }

        const validOperators = [
          'equals', 'not_equals', 'contains', 'not_contains',
          'greater_than', 'less_than', 'between', 'in', 'not_in',
          'exists', 'not_exists'
        ];

        if (!validOperators.includes(filter.operator)) {
          return { valid: false, message: `Invalid operator: ${filter.operator}` };
        }
      }

      return { valid: true, message: 'Criteria is valid' };
    } catch (error) {
      return { valid: false, message: `Validation error: ${error}` };
    }
  }

  // Calculate segment size
  private async calculateSegmentSize(criteria: any): Promise<number> {
    try {
      let query: any = {};

      // Build MongoDB query based on criteria
      for (const filter of criteria.filters) {
        const mongoFilter = this.buildMongoFilter(filter);
        
        if (criteria.logic === 'and') {
          query = { ...query, ...mongoFilter };
        } else {
          // For 'or' logic, we need to use $or
          if (!query.$or) query.$or = [];
          query.$or.push(mongoFilter);
        }
      }

      const count = await User.countDocuments(query);
      return count;
    } catch (error) {
      console.error('Failed to calculate segment size:', error);
      return 0;
    }
  }

  // Build MongoDB filter from criteria
  private buildMongoFilter(filter: SegmentCriteria): any {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'not_equals':
        return { [field]: { $ne: value } };
      case 'contains':
        return { [field]: { $regex: value, $options: 'i' } };
      case 'not_contains':
        return { [field]: { $not: { $regex: value, $options: 'i' } } };
      case 'greater_than':
        return { [field]: { $gt: value } };
      case 'less_than':
        return { [field]: { $lt: value } };
      case 'between':
        return { [field]: { $gte: value[0], $lte: value[1] } };
      case 'in':
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      case 'not_in':
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
      case 'exists':
        return { [field]: { $exists: true } };
      case 'not_exists':
        return { [field]: { $exists: false } };
      default:
        return {};
    }
  }

  // Get all segments
  async getSegments(): Promise<SegmentDefinition[]> {
    try {
      // In real app, you'd fetch from database
      const segments: SegmentDefinition[] = [
        {
          id: '1',
          name: 'VIP Customers',
          description: 'Customers who have spent over $500 and placed more than 10 orders',
          criteria: {
            logic: 'and',
            filters: [
              { field: 'totalSpent', operator: 'greater_than', value: 500 },
              { field: 'totalOrders', operator: 'greater_than', value: 10 }
            ]
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'New Customers',
          description: 'Customers who joined in the last 30 days',
          criteria: {
            logic: 'and',
            filters: [
              { field: 'createdAt', operator: 'greater_than', value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            ]
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          name: 'High-Value Customers',
          description: 'Customers with average order value over $100',
          criteria: {
            logic: 'and',
            filters: [
              { field: 'averageOrderValue', operator: 'greater_than', value: 100 }
            ]
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '4',
          name: 'Inactive Customers',
          description: 'Customers who haven\'t placed an order in 90 days',
          criteria: {
            logic: 'and',
            filters: [
              { field: 'lastOrderDate', operator: 'less_than', value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
            ]
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '5',
          name: 'Frequent Shoppers',
          description: 'Customers who place more than 2 orders per month',
          criteria: {
            logic: 'and',
            filters: [
              { field: 'orderFrequency', operator: 'greater_than', value: 2 }
            ]
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return segments;
    } catch (error) {
      throw new Error(`Failed to get segments: ${error}`);
    }
  }

  // Get customer profile
  async getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      // Get order data
      const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrderDate = orders.length > 0 ? orders[0].createdAt : undefined;

      // Calculate order frequency (orders per month)
      const firstOrderDate = orders.length > 0 ? orders[orders.length - 1].createdAt : new Date();
      const monthsSinceFirstOrder = Math.max(1, (Date.now() - firstOrderDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
      const orderFrequency = totalOrders / monthsSinceFirstOrder;

      // Get preferred categories and brands
      const preferredCategories = await this.getPreferredCategories(userId);
      const preferredBrands = await this.getPreferredBrands(userId);

      // Get review data
      const reviews = await Review.find({ user: userId });
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      // Build customer profile
      const profile: CustomerProfile = {
        userId,
        demographics: {
          age: this.calculateAge(user.dateOfBirth),
          gender: user.gender,
          location: {
            country: user.addresses[0]?.country || 'Unknown',
            city: user.addresses[0]?.city || 'Unknown',
          },
          registrationDate: user.createdAt,
        },
        behavior: {
          totalOrders,
          totalSpent: Math.round(totalSpent * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          lastOrderDate,
          orderFrequency: Math.round(orderFrequency * 10) / 10,
          preferredCategories,
          preferredBrands,
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: reviews.length,
          cartAbandonmentRate: await this.calculateCartAbandonmentRate(userId),
          sessionFrequency: Math.random() * 5 + 1, // Mock data
          averageSessionDuration: Math.random() * 30 + 5, // Mock data
        },
        engagement: {
          emailOpenRate: Math.random() * 0.5 + 0.1, // Mock data
          emailClickRate: Math.random() * 0.2 + 0.02, // Mock data
          lastEmailOpen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          lastLoginDate: user.lastSeen || new Date(),
          loyaltyPoints: user.loyaltyPoints || 0,
          loyaltyTier: this.getLoyaltyTier(user.loyaltyPoints || 0),
          referralCount: Math.floor(Math.random() * 10), // Mock data
          socialShares: Math.floor(Math.random() * 20), // Mock data
        },
        predictive: {
          churnRisk: this.calculateChurnRisk(profile),
          lifetimeValue: this.calculateLifetimeValue(totalSpent, orderFrequency, averageOrderValue),
          nextPurchaseProbability: this.calculateNextPurchaseProbability(orderFrequency, lastOrderDate),
          preferredPurchaseTime: this.calculatePreferredPurchaseTime(orders),
          priceSensitivity: this.calculatePriceSensitivity(averageOrderValue),
          productAffinity: await this.calculateProductAffinity(userId),
        },
      };

      return profile;
    } catch (error) {
      console.error('Failed to get customer profile:', error);
      return null;
    }
  }

  // Calculate age from date of birth
  private calculateAge(dateOfBirth?: Date): number | undefined {
    if (!dateOfBirth) return undefined;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Get preferred categories
  private async getPreferredCategories(userId: string): Promise<Array<{ category: string; count: number }>> {
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
      console.error('Failed to get preferred categories:', error);
      return [];
    }
  }

  // Get preferred brands
  private async getPreferredBrands(userId: string): Promise<Array<{ brand: string; count: number }>> {
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
      console.error('Failed to get preferred brands:', error);
      return [];
    }
  }

  // Calculate cart abandonment rate
  private async calculateCartAbandonmentRate(userId: string): Promise<number> {
    try {
      // In real app, you'd query shopping cart service
      // For now, return mock data
      return Math.random() * 0.5 + 0.1; // 10-60%
    } catch (error) {
      console.error('Failed to calculate cart abandonment rate:', error);
      return 0;
    }
  }

  // Get loyalty tier
  private getLoyaltyTier(points: number): string {
    if (points >= 1000) return 'Platinum';
    if (points >= 500) return 'Gold';
    if (points >= 100) return 'Silver';
    return 'Bronze';
  }

  // Calculate churn risk
  private calculateChurnRisk(profile: any): 'low' | 'medium' | 'high' {
    // Simple churn risk calculation based on various factors
    let riskScore = 0;

    if (profile.behavior?.orderFrequency < 1) riskScore += 30;
    if (profile.behavior?.lastOrderDate && Date.now() - profile.behavior.lastOrderDate.getTime() > 90 * 24 * 60 * 60 * 1000) riskScore += 25;
    if (profile.engagement?.emailOpenRate < 0.1) riskScore += 20;
    if (profile.behavior?.cartAbandonmentRate > 0.5) riskScore += 15;

    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  // Calculate lifetime value
  private calculateLifetimeValue(totalSpent: number, orderFrequency: number, averageOrderValue: number): number {
    // Simple LTV calculation
    const monthlyValue = orderFrequency * averageOrderValue;
    const projectedMonths = 24; // Project 2 years
    return monthlyValue * projectedMonths;
  }

  // Calculate next purchase probability
  private calculateNextPurchaseProbability(orderFrequency: number, lastOrderDate?: Date): number {
    let probability = 0.5; // Base probability

    // Adjust based on frequency
    if (orderFrequency > 2) probability += 0.2;
    else if (orderFrequency < 0.5) probability -= 0.2;

    // Adjust based on time since last order
    if (lastOrderDate) {
      const daysSinceLastOrder = (Date.now() - lastOrderDate.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceLastOrder < 7) probability += 0.1;
      else if (daysSinceLastOrder > 30) probability -= 0.1;
    }

    return Math.max(0, Math.min(1, probability));
  }

  // Calculate preferred purchase time
  private calculatePreferredPurchaseTime(orders: any[]): number {
    if (orders.length === 0) return 30; // Default 30 days

    // Calculate average days between orders
    const intervals: number[] = [];
    for (let i = 1; i < orders.length; i++) {
      const daysDiff = (orders[i - 1].createdAt.getTime() - orders[i].createdAt.getTime()) / (24 * 60 * 60 * 1000);
      intervals.push(daysDiff);
    }

    return intervals.length > 0 
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length 
      : 30;
  }

  // Calculate price sensitivity
  private calculatePriceSensitivity(averageOrderValue: number): 'low' | 'medium' | 'high' {
    if (averageOrderValue > 200) return 'low';
    if (averageOrderValue > 50) return 'medium';
    return 'high';
  }

  // Calculate product affinity
  private async calculateProductAffinity(userId: string): Promise<Record<string, number>> {
    try {
      const orders = await Order.find({ user: userId }).populate('items.productId');
      const affinity = new Map<string, number>();

      orders.forEach(order => {
        order.items.forEach((item: any) => {
          const productId = item.productId._id.toString();
          affinity.set(productId, (affinity.get(productId) || 0) + item.quantity);
        });
      });

      // Normalize to 0-1 scale
      const maxAffinity = Math.max(...Array.from(affinity.values()));
      const normalizedAffinity: Record<string, number> = {};

      affinity.forEach((value, key) => {
        normalizedAffinity[key] = maxAffinity > 0 ? value / maxAffinity : 0;
      });

      return normalizedAffinity;
    } catch (error) {
      console.error('Failed to calculate product affinity:', error);
      return {};
    }
  }

  // Get segment analytics
  async getSegmentAnalytics(segmentId: string): Promise<SegmentAnalytics | null> {
    try {
      const segment = await this.getSegmentById(segmentId);
      if (!segment) return null;

      const users = await this.getSegmentUsers(segment);
      const userIds = users.map(u => u._id.toString());

      // Get order data for segment
      const segmentOrders = await Order.find({ user: { $in: userIds } });
      const totalRevenue = segmentOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = segmentOrders.length > 0 ? totalRevenue / segmentOrders.length : 0;

      // Get top products
      const topProducts = await this.getTopProductsForSegment(userIds);

      // Calculate metrics
      const conversionRate = await this.calculateConversionRate(userIds);
      const retentionRate = await this.calculateRetentionRate(userIds);
      const churnRate = await this.calculateChurnRate(userIds);

      return {
        segmentId,
        segmentName: segment.name,
        userCount: users.length,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        conversionRate,
        retentionRate,
        churnRate,
        topProducts,
        trends: {
          growth: Math.random() * 20 - 10, // Mock growth percentage
          engagement: Math.random() * 0.5 + 0.3, // Mock engagement score
          satisfaction: Math.random() * 2 + 3, // Mock satisfaction score (1-5)
        },
      };
    } catch (error) {
      console.error('Failed to get segment analytics:', error);
      return null;
    }
  }

  // Get segment by ID
  private async getSegmentById(segmentId: string): Promise<SegmentDefinition | null> {
    try {
      const segments = await this.getSegments();
      return segments.find(s => s.id === segmentId) || null;
    } catch (error) {
      console.error('Failed to get segment by ID:', error);
      return null;
    }
  }

  // Get users in segment
  private async getSegmentUsers(segment: SegmentDefinition): Promise<User[]> {
    try {
      const query = this.buildQueryFromCriteria(segment.criteria);
      return await User.find(query).select('name email preferences');
    } catch (error) {
      console.error('Failed to get segment users:', error);
      return [];
    }
  }

  // Build query from criteria
  private buildQueryFromCriteria(criteria: any): any {
    let query: any = {};

    for (const filter of criteria.filters) {
      const mongoFilter = this.buildMongoFilter(filter);
      
      if (criteria.logic === 'and') {
        query = { ...query, ...mongoFilter };
      } else {
        if (!query.$or) query.$or = [];
        query.$or.push(mongoFilter);
      }
    }

    return query;
  }

  // Get top products for segment
  private async getTopProductsForSegment(userIds: string[]): Promise<any[]> {
    try {
      const topProducts = await Order.aggregate([
        { $match: { user: { $in: userIds } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            purchases: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            name: '$product.name',
            purchases: '$purchases',
            revenue: '$revenue',
          },
        },
      ]);

      return topProducts.map(p => ({
        productId: p.productId,
        name: p.name,
        purchases: p.purchases,
        revenue: Math.round(p.revenue * 100) / 100,
      }));
    } catch (error) {
      console.error('Failed to get top products for segment:', error);
      return [];
    }
  }

  // Calculate conversion rate
  private async calculateConversionRate(userIds: string[]): Promise<number> {
    try {
      // In real app, you'd calculate based on actual conversion events
      // For now, return mock data
      return Math.random() * 0.1 + 0.02; // 2-12%
    } catch (error) {
      console.error('Failed to calculate conversion rate:', error);
      return 0;
    }
  }

  // Calculate retention rate
  private async calculateRetentionRate(userIds: string[]): Promise<number> {
    try {
      // In real app, you'd calculate based on actual retention data
      // For now, return mock data
      return Math.random() * 0.3 + 0.6; // 60-90%
    } catch (error) {
      console.error('Failed to calculate retention rate:', error);
      return 0;
    }
  }

  // Calculate churn rate
  private async calculateChurnRate(userIds: string[]): Promise<number> {
    try {
      // In real app, you'd calculate based on actual churn data
      // For now, return mock data
      return Math.random() * 0.2 + 0.05; // 5-25%
    } catch (error) {
      console.error('Failed to calculate churn rate:', error);
      return 0;
    }
  }

  // Update segment
  async updateSegment(segmentId: string, updates: Partial<SegmentDefinition>): Promise<SegmentResponse> {
    try {
      const segment = await this.getSegmentById(segmentId);
      if (!segment) {
        return {
          success: false,
          message: 'Segment not found',
        };
      }

      const updatedSegment = {
        ...segment,
        ...updates,
        updatedAt: new Date(),
      };

      const userCount = await this.calculateSegmentSize(updatedSegment.criteria);

      return {
        success: true,
        message: 'Segment updated successfully',
        segment: updatedSegment,
        userCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update segment: ${error}`,
      };
    }
  }

  // Delete segment
  async deleteSegment(segmentId: string): Promise<SegmentResponse> {
    try {
      const segment = await this.getSegmentById(segmentId);
      if (!segment) {
        return {
          success: false,
          message: 'Segment not found',
        };
      }

      // In real app, you'd delete from database
      return {
        success: true,
        message: 'Segment deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete segment: ${error}`,
      };
    }
  }

  // Get segmentation insights
  async getSegmentationInsights(): Promise<any> {
    try {
      const segments = await this.getSegments();
      const totalUsers = await User.countDocuments({ isActive: true });

      const insights = {
        overview: {
          totalSegments: segments.length,
          totalUsers,
          averageSegmentSize: segments.length > 0 ? totalUsers / segments.length : 0,
          coverage: segments.length > 0 ? (segments.reduce((sum, s) => sum + (s.userCount || 0), 0) / totalUsers) * 100 : 0,
        },
        segmentPerformance: await Promise.all(
          segments.map(async segment => ({
            segmentId: segment.id,
            segmentName: segment.name,
            userCount: await this.calculateSegmentSize(segment.criteria),
            performance: await this.getSegmentAnalytics(segment.id),
          }))
        ),
        recommendations: [
          'Consider creating segments based on purchase frequency',
          'Segment users by product category preferences',
          'Create high-value customer segments for premium offers',
          'Identify at-risk customers for retention campaigns',
        ],
      };

      return insights;
    } catch (error) {
      throw new Error(`Failed to get segmentation insights: ${error}`);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
