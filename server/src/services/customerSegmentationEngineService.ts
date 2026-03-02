import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface SegmentDefinition {
  id: string;
  name: string;
  description: string;
  type: 'demographic' | 'behavioral' | 'transactional' | 'geographic' | 'psychographic' | 'custom';
  criteria: {
    demographics?: {
      ageRange?: { min: number; max: number };
      gender?: string[];
      incomeRange?: { min: number; max: number };
      education?: string[];
      occupation?: string[];
      familyStatus?: string[];
    };
    behavioral?: {
      purchaseFrequency?: { min: number; max: number };
      averageOrderValue?: { min: number; max: number };
      lastPurchaseDays?: { min: number; max: number };
      productCategories?: string[];
      brandPreferences?: string[];
      priceSensitivity?: 'high' | 'medium' | 'low';
      loyaltyTier?: string[];
    };
    transactional?: {
      totalSpent?: { min: number; max: number };
      orderCount?: { min: number; max: number };
      averageOrderValue?: { min: number; max: number };
      refundRate?: { max: number };
      cartAbandonmentRate?: { max: number };
      paymentMethods?: string[];
    };
    geographic?: {
      countries?: string[];
      regions?: string[];
      cities?: string[];
      climate?: string[];
      urbanRural?: 'urban' | 'rural' | 'mixed';
    };
    psychographic?: {
      lifestyle?: string[];
      interests?: string[];
      values?: string[];
      personality?: string[];
      techAdoption?: 'early' | 'mainstream' | 'late';
    };
    custom?: {
      [key: string]: any;
    };
  };
  isActive: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSegment {
  id: string;
  segmentDefinitionId: string;
  name: string;
  description: string;
  type: string;
  users: string[];
  size: number;
  percentage: number;
  characteristics: {
    averageAge: number;
    genderDistribution: Record<string, number>;
    locationDistribution: Record<string, number>;
    averageOrderValue: number;
    purchaseFrequency: number;
    totalSpent: number;
    churnRisk: 'low' | 'medium' | 'high';
    lifetimeValue: number;
  };
  metrics: {
    engagementScore: number;
    conversionRate: number;
    retentionRate: number;
    averageOrderValue: number;
    purchaseFrequency: number;
    responseRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastCalculated: Date;
}

export interface SegmentationRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'between';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
  action: 'include' | 'exclude';
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentationStats {
  totalSegments: number;
  activeSegments: number;
  totalUsersSegmented: number;
  segmentationAccuracy: number;
  averageSegmentSize: number;
  segmentTypes: Record<string, number>;
  topPerformingSegments: Array<{
    segmentId: string;
    name: string;
    conversionRate: number;
    revenue: number;
    size: number;
  }>;
  recentActivity: Array<{
    date: string;
    usersSegmented: number;
    segmentsUpdated: number;
    campaignsRun: number;
  }>;
}

export class CustomerSegmentationEngineService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create segment definition
  async createSegmentDefinition(definition: Partial<SegmentDefinition>): Promise<{ success: boolean; message: string; segment?: SegmentDefinition }> {
    try {
      // Validate definition
      const validation = this.validateSegmentDefinition(definition);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Create segment definition
      const segmentDefinition: SegmentDefinition = {
        id: this.generateId(),
        name: definition.name || '',
        description: definition.description || '',
        type: definition.type || 'custom',
        criteria: definition.criteria || {},
        isActive: definition.isActive !== false,
        priority: definition.priority || 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        message: 'Segment definition created successfully',
        segment: segmentDefinition,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create segment definition: ${error}`,
      };
    }
  }

  // Run segmentation
  async runSegmentation(segmentDefinitionId: string): Promise<{ success: boolean; message: string; segment?: CustomerSegment }> {
    try {
      // Get segment definition
      const segmentDefinition = await this.getSegmentDefinition(segmentDefinitionId);
      if (!segmentDefinition) {
        return {
          success: false,
          message: 'Segment definition not found',
        };
      }

      // Get all users
      const users = await this.getAllUsers();

      // Apply segmentation criteria
      const segmentedUsers = await this.applySegmentationCriteria(users, segmentDefinition);

      // Calculate segment characteristics
      const characteristics = await this.calculateSegmentCharacteristics(segmentedUsers, segmentDefinition);

      // Create customer segment
      const customerSegment: CustomerSegment = {
        id: this.generateId(),
        segmentDefinitionId: segmentDefinitionId,
        name: segmentDefinition.name,
        description: segmentDefinition.description,
        type: segmentDefinition.type,
        users: segmentedUsers.map(user => user.id),
        size: segmentedUsers.length,
        percentage: (segmentedUsers.length / users.length) * 100,
        characteristics,
        metrics: await this.calculateSegmentMetrics(segmentedUsers),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastCalculated: new Date(),
      };

      // Save segment
      await this.saveCustomerSegment(customerSegment);

      return {
        success: true,
        message: `Segmentation completed successfully. ${segmentedUsers.length} users segmented.`,
        segment: customerSegment,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to run segmentation: ${error}`,
      };
    }
  }

  // Get segmentation statistics
  async getSegmentationStats(timeRange?: { start: Date; end: Date }): Promise<SegmentationStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalSegments: 25,
        activeSegments: 20,
        totalUsersSegmented: 45000,
        segmentationAccuracy: 0.87,
        averageSegmentSize: 1800,
        segmentTypes: {
          demographic: 5,
          behavioral: 8,
          transactional: 6,
          geographic: 3,
          psychographic: 2,
          custom: 1,
        },
        topPerformingSegments: [
          {
            segmentId: '1',
            name: 'High-Value Customers',
            conversionRate: 0.12,
            revenue: 500000,
            size: 5000,
          },
          {
            segmentId: '2',
            name: 'Frequent Shoppers',
            conversionRate: 0.15,
            revenue: 300000,
            size: 3000,
          },
          {
            segmentId: '3',
            name: 'Brand Loyalists',
            conversionRate: 0.18,
            revenue: 250000,
            size: 2000,
          },
        ],
        recentActivity: [
          { date: '2024-01-01', usersSegmented: 45000, segmentsUpdated: 5, campaignsRun: 12 },
          { date: '2024-01-02', usersSegmented: 45200, segmentsUpdated: 3, campaignsRun: 8 },
          { date: '2024-01-03', usersSegmented: 45100, segmentsUpdated: 2, campaignsRun: 10 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get segmentation stats: ${error}`);
    }
  }

  // Helper methods
  private validateSegmentDefinition(definition: Partial<SegmentDefinition>): { valid: boolean; message: string } {
    if (!definition.name) {
      return { valid: false, message: 'Segment name is required' };
    }

    if (!definition.type) {
      return { valid: false, message: 'Segment type is required' };
    }

    if (!definition.criteria || Object.keys(definition.criteria).length === 0) {
      return { valid: false, message: 'Segment criteria are required' };
    }

    return { valid: true, message: 'Segment definition is valid' };
  }

  private async applySegmentationCriteria(users: any[], definition: SegmentDefinition): Promise<any[]> {
    const segmentedUsers: any[] = [];

    for (const user of users) {
      if (await this.matchesCriteria(user, definition.criteria)) {
        segmentedUsers.push(user);
      }
    }

    return segmentedUsers;
  }

  private async matchesCriteria(user: any, criteria: any): Promise<boolean> {
    // Check demographic criteria
    if (criteria.demographics) {
      if (criteria.demographics.ageRange) {
        const userAge = this.calculateAge(user.dateOfBirth);
        if (userAge < criteria.demographics.ageRange.min || userAge > criteria.demographics.ageRange.max) {
          return false;
        }
      }

      if (criteria.demographics.gender && criteria.demographics.gender.length > 0) {
        if (!criteria.demographics.gender.includes(user.gender)) {
          return false;
        }
      }
    }

    // Check behavioral criteria
    if (criteria.behavioral) {
      const userBehavior = await this.getUserBehavior(user.id);
      
      if (criteria.behavioral.purchaseFrequency) {
        if (userBehavior.purchaseFrequency < criteria.behavioral.purchaseFrequency.min || 
            userBehavior.purchaseFrequency > criteria.behavioral.purchaseFrequency.max) {
          return false;
        }
      }

      if (criteria.behavioral.averageOrderValue) {
        if (userBehavior.averageOrderValue < criteria.behavioral.averageOrderValue.min || 
            userBehavior.averageOrderValue > criteria.behavioral.averageOrderValue.max) {
          return false;
        }
      }
    }

    // Check transactional criteria
    if (criteria.transactional) {
      const userTransactions = await this.getUserTransactions(user.id);
      
      if (criteria.transactional.totalSpent) {
        if (userTransactions.totalSpent < criteria.transactional.totalSpent.min || 
            userTransactions.totalSpent > criteria.transactional.totalSpent.max) {
          return false;
        }
      }
    }

    return true;
  }

  private async calculateSegmentCharacteristics(users: any[], definition: SegmentDefinition): Promise<any> {
    if (users.length === 0) {
      return {
        averageAge: 0,
        genderDistribution: {},
        locationDistribution: {},
        averageOrderValue: 0,
        purchaseFrequency: 0,
        totalSpent: 0,
        churnRisk: 'medium',
        lifetimeValue: 0,
      };
    }

    // Calculate demographics
    const ages = users.map(user => this.calculateAge(user.dateOfBirth));
    const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;

    const genderDistribution = users.reduce((dist, user) => {
      dist[user.gender] = (dist[user.gender] || 0) + 1;
      return dist;
    }, {});

    // Calculate transactional metrics
    const transactions = await Promise.all(users.map(user => this.getUserTransactions(user.id)));
    const totalSpent = transactions.reduce((sum, tx) => sum + tx.totalSpent, 0);
    const averageOrderValue = totalSpent / users.length;

    // Calculate behavioral metrics
    const behaviors = await Promise.all(users.map(user => this.getUserBehavior(user.id)));
    const purchaseFrequency = behaviors.reduce((sum, behavior) => sum + behavior.purchaseFrequency, 0) / users.length;

    // Calculate churn risk
    const churnRisk = await this.calculateChurnRisk(users);

    // Calculate lifetime value
    const lifetimeValue = averageOrderValue * purchaseFrequency * 12; // Annual LTV

    return {
      averageAge,
      genderDistribution,
      locationDistribution: {}, // Would calculate from user addresses
      averageOrderValue,
      purchaseFrequency,
      totalSpent,
      churnRisk,
      lifetimeValue,
    };
  }

  private async calculateSegmentMetrics(users: any[]): Promise<any> {
    if (users.length === 0) {
      return {
        engagementScore: 0,
        conversionRate: 0,
        retentionRate: 0,
        averageOrderValue: 0,
        purchaseFrequency: 0,
        responseRate: 0,
      };
    }

    // Calculate engagement score
    const engagementScores = await Promise.all(users.map(user => this.calculateEngagementScore(user.id)));
    const engagementScore = engagementScores.reduce((sum, score) => sum + score, 0) / users.length;

    // Calculate conversion rate
    const conversions = await Promise.all(users.map(user => this.getUserConversions(user.id)));
    const conversionRate = conversions.filter(conv => conv).length / users.length;

    // Calculate retention rate
    const retentionData = await Promise.all(users.map(user => this.calculateRetention(user.id)));
    const retentionRate = retentionData.filter(retained => retained).length / users.length;

    // Calculate other metrics
    const transactions = await Promise.all(users.map(user => this.getUserTransactions(user.id)));
    const totalSpent = transactions.reduce((sum, tx) => sum + tx.totalSpent, 0);
    const averageOrderValue = totalSpent / users.length;

    const behaviors = await Promise.all(users.map(user => this.getUserBehavior(user.id)));
    const purchaseFrequency = behaviors.reduce((sum, behavior) => sum + behavior.purchaseFrequency, 0) / users.length;

    const responses = await Promise.all(users.map(user => this.getUserResponses(user.id)));
    const responseRate = responses.filter(resp => resp).length / users.length;

    return {
      engagementScore,
      conversionRate,
      retentionRate,
      averageOrderValue,
      purchaseFrequency,
      responseRate,
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private async getUserBehavior(userId: string): Promise<any> {
    // In a real app, you'd calculate from user activity
    return {
      purchaseFrequency: 2,
      averageOrderValue: 150,
      lastPurchaseDays: 15,
      productCategories: ['electronics', 'clothing'],
      brandPreferences: ['Apple', 'Nike'],
      priceSensitivity: 'medium',
      loyaltyTier: 'silver',
    };
  }

  private async getUserTransactions(userId: string): Promise<any> {
    // In a real app, you'd query database
    return {
      totalSpent: 1500,
      orderCount: 10,
      averageOrderValue: 150,
      refundRate: 0.05,
      cartAbandonmentRate: 0.15,
    };
  }

  private async calculateEngagementScore(userId: string): Promise<number> {
    // In a real app, you'd calculate based on user activity
    return 0.75;
  }

  private async getUserConversions(userId: string): Promise<boolean> {
    // In a real app, you'd check if user has converted
    return true;
  }

  private async calculateRetention(userId: string): Promise<boolean> {
    // In a real app, you'd calculate retention
    return true;
  }

  private async getUserResponses(userId: string): Promise<boolean> {
    // In a real app, you'd check response rates
    return true;
  }

  private async calculateChurnRisk(users: any[]): Promise<'low' | 'medium' | 'high'> {
    // In a real app, you'd use ML model to predict churn
    const recentActivity = await Promise.all(users.map(user => this.getUserBehavior(user.id)));
    const avgLastPurchase = recentActivity.reduce((sum, behavior) => sum + behavior.lastPurchaseDays, 0) / users.length;
    
    if (avgLastPurchase > 90) return 'high';
    if (avgLastPurchase > 30) return 'medium';
    return 'low';
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Database helper methods
  private async getAllUsers(): Promise<any[]> {
    // In a real app, you'd query database
    return [];
  }

  private async getSegmentDefinition(segmentDefinitionId: string): Promise<SegmentDefinition | null> {
    // In a real app, you'd query database
    return null;
  }

  private async saveCustomerSegment(segment: CustomerSegment): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Customer segment saved: ${segment.id}`);
  }
}
