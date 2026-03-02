import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { Review } from '../model/review';
import { Wishlist } from '../model/wishlist';

export interface BehaviorEvent {
  userId: string;
  sessionId?: string;
  eventType: 'page_view' | 'product_view' | 'search' | 'add_to_cart' | 'remove_from_cart' | 'purchase' | 'review' | 'wishlist_add' | 'wishlist_remove' | 'comparison' | 'share' | 'login' | 'logout';
  timestamp: Date;
  metadata: {
    page?: string;
    productId?: string;
    query?: string;
    orderId?: string;
    amount?: number;
    rating?: number;
    source?: string;
    device?: string;
    location?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface BehaviorAnalytics {
  userId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    uniquePages: number;
    totalProductsViewed: number;
    totalSearches: number;
    totalPurchases: number;
    totalSpent: number;
    averageOrderValue: number;
    conversionRate: number;
    bounceRate: number;
    sessionDuration: number;
    pagesPerSession: number;
  };
  behaviorPatterns: {
    mostActiveHours: Array<{ hour: number; events: number }>;
    mostActiveDays: Array<{ day: string; events: number }>;
    preferredCategories: Array<{ category: string; views: number; purchases: number }>;
    preferredBrands: Array<{ brand: string; views: number; purchases: number }>;
    pricePreferences: Array<{ range: string; count: number; percentage: number }>;
    deviceUsage: Array<{ device: string; sessions: number; percentage: number }>;
    trafficSources: Array<{ source: string; sessions: number; percentage: number }>;
  };
  engagementMetrics: {
    productEngagement: Array<{ productId: string; name: string; views: number; addToCart: number; purchases: number; conversionRate: number }>;
    categoryEngagement: Array<{ category: string; views: number; addToCart: number; purchases: number; conversionRate: number }>;
    searchPerformance: Array<{ query: string; searches: number; results: number; clickThrough: number; conversionRate: number }>;
    funnelAnalysis: {
      productViews: number;
      addToCart: number;
      checkout: number;
      purchase: number;
      dropOffRates: {
        viewToCart: number;
        cartToCheckout: number;
        checkoutToPurchase: number;
      };
    };
  };
  recommendations: {
    churnRisk: 'low' | 'medium' | 'high';
    ltv: number; // Lifetime Value
    nextPurchaseProbability: number;
    preferredCommunicationChannel: string;
    personalizedOffers: Array<{
      type: 'discount' | 'free_shipping' | 'product_recommendation' | 'category_promotion';
      value: number;
      confidence: number;
      reason: string;
    }>;
  };
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    demographics?: {
      ageRange?: { min: number; max: number };
      gender?: string[];
      location?: string[];
    };
    behavior?: {
      purchaseFrequency?: { min: number; max: number };
      averageOrderValue?: { min: number; max: number };
      lastPurchaseDays?: { min: number; max: number };
      productCategories?: string[];
    };
    engagement?: {
      sessionFrequency?: { min: number; max: number };
      averageSessionDuration?: { min: number; max: number };
      pagesPerSession?: { min: number; max: number };
    };
  };
  users: string[];
  size: number;
  characteristics: {
    averageAge: number;
    genderDistribution: Record<string, number>;
    locationDistribution: Record<string, number>;
    averageOrderValue: number;
    purchaseFrequency: number;
    churnRate: number;
  };
}

export interface BehaviorInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'recommendation';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  data: any;
  actionable: boolean;
  suggestedActions: string[];
  createdAt: Date;
}

export class UserBehaviorAnalyticsService {
  // Track user behavior event
  async trackEvent(event: BehaviorEvent): Promise<{ success: boolean; message: string }> {
    try {
      // Validate event
      const validation = this.validateEvent(event);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Store event (in real app, would save to database or analytics service)
      console.log(`Behavior event tracked: ${event.eventType} for user ${event.userId}`);

      // Update real-time metrics
      await this.updateRealTimeMetrics(event);

      return {
        success: true,
        message: 'Event tracked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to track event: ${error}`,
      };
    }
  }

  // Get user behavior analytics
  async getUserBehaviorAnalytics(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<BehaviorAnalytics> {
    try {
      // Get user data
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's events within time range
      const events = await this.getUserEvents(userId, timeRange);
      
      // Get user's orders
      const orders = await Order.find({ 
        user: userId,
        createdAt: { $gte: timeRange.start, $lte: timeRange.end }
      }).populate('items.productId');

      // Calculate summary metrics
      const summary = this.calculateSummaryMetrics(events, orders);

      // Analyze behavior patterns
      const behaviorPatterns = await this.analyzeBehaviorPatterns(userId, events, orders);

      // Calculate engagement metrics
      const engagementMetrics = await this.calculateEngagementMetrics(userId, events, orders);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(userId, events, orders, user);

      return {
        userId,
        timeRange,
        summary,
        behaviorPatterns,
        engagementMetrics,
        recommendations,
      };
    } catch (error) {
      throw new Error(`Failed to get user behavior analytics: ${error}`);
    }
  }

  // Get user segments
  async getUserSegments(): Promise<UserSegment[]> {
    try {
      // Define common user segments
      const segments: UserSegment[] = [
        {
          id: 'new_users',
          name: 'New Users',
          description: 'Users who joined in the last 30 days',
          criteria: {
            behavior: {
              lastPurchaseDays: { min: 0, max: 30 },
              purchaseFrequency: { min: 0, max: 1 },
            },
          },
          users: [],
          size: 0,
          characteristics: {
            averageAge: 28,
            genderDistribution: { male: 45, female: 55 },
            locationDistribution: { 'US': 60, 'UK': 20, 'CA': 10, 'Other': 10 },
            averageOrderValue: 45,
            purchaseFrequency: 0.5,
            churnRate: 0.4,
          },
        },
        {
          id: 'regular_shoppers',
          name: 'Regular Shoppers',
          description: 'Users who purchase monthly',
          criteria: {
            behavior: {
              purchaseFrequency: { min: 1, max: 3 },
              averageOrderValue: { min: 50, max: 200 },
            },
          },
          users: [],
          size: 0,
          characteristics: {
            averageAge: 35,
            genderDistribution: { male: 50, female: 50 },
            locationDistribution: { 'US': 55, 'UK': 25, 'CA': 15, 'Other': 5 },
            averageOrderValue: 120,
            purchaseFrequency: 2,
            churnRate: 0.15,
          },
        },
        {
          id: 'vip_customers',
          name: 'VIP Customers',
          description: 'High-value frequent shoppers',
          criteria: {
            behavior: {
              purchaseFrequency: { min: 4, max: 100 },
              averageOrderValue: { min: 200, max: 10000 },
            },
          },
          users: [],
          size: 0,
          characteristics: {
            averageAge: 42,
            genderDistribution: { male: 55, female: 45 },
            locationDistribution: { 'US': 65, 'UK': 20, 'CA': 10, 'Other': 5 },
            averageOrderValue: 350,
            purchaseFrequency: 6,
            churnRate: 0.05,
          },
        },
        {
          id: 'at_risk_customers',
          name: 'At-Risk Customers',
          description: 'Users showing signs of churn',
          criteria: {
            behavior: {
              lastPurchaseDays: { min: 60, max: 365 },
              purchaseFrequency: { min: 0, max: 2 },
            },
          },
          users: [],
          size: 0,
          characteristics: {
            averageAge: 31,
            genderDistribution: { male: 48, female: 52 },
            locationDistribution: { 'US': 50, 'UK': 22, 'CA': 13, 'Other': 15 },
            averageOrderValue: 65,
            purchaseFrequency: 0.3,
            churnRate: 0.6,
          },
        },
      ];

      // In a real app, you'd query database to populate users for each segment
      return segments;
    } catch (error) {
      throw new Error(`Failed to get user segments: ${error}`);
    }
  }

  // Get behavior insights
  async getBehaviorInsights(
    timeRange: { start: Date; end: Date },
    type?: string
  ): Promise<BehaviorInsight[]> {
    try {
      // Generate insights based on behavior data
      const insights: BehaviorInsight[] = [
        {
          id: '1',
          type: 'trend',
          title: 'Mobile Usage Increasing',
          description: 'Mobile traffic has increased by 25% compared to last month',
          impact: 'high',
          confidence: 0.85,
          data: {
            mobileTraffic: 65,
            desktopTraffic: 35,
            change: '+25%',
          },
          actionable: true,
          suggestedActions: [
            'Optimize mobile experience',
            'Implement mobile-specific features',
            'Test mobile checkout flow',
          ],
          createdAt: new Date(),
        },
        {
          id: '2',
          type: 'opportunity',
          title: 'Cart Abandonment Spike',
          description: 'Cart abandonment rate increased by 15% in electronics category',
          impact: 'medium',
          confidence: 0.75,
          data: {
            category: 'Electronics',
            abandonmentRate: 75,
            change: '+15%',
          },
          actionable: true,
          suggestedActions: [
            'Send abandoned cart emails',
            'Offer free shipping',
            'Simplify checkout process',
          ],
          createdAt: new Date(),
        },
        {
          id: '3',
          type: 'risk',
          title: 'High Churn Risk Segment',
          description: 'Users who haven\'t purchased in 90+ days showing high churn risk',
          impact: 'high',
          confidence: 0.9,
          data: {
            atRiskUsers: 2500,
            churnProbability: 0.65,
          },
          actionable: true,
          suggestedActions: [
            'Launch re-engagement campaign',
            'Offer personalized discounts',
            'Send product recommendations',
          ],
          createdAt: new Date(),
        },
      ];

      return type ? insights.filter(insight => insight.type === type) : insights;
    } catch (error) {
      throw new Error(`Failed to get behavior insights: ${error}`);
    }
  }

  // Get cohort analysis
  async getCohortAnalysis(
    cohortType: 'monthly' | 'quarterly' | 'yearly'
  ): Promise<any> {
    try {
      // In a real app, you'd analyze user cohorts based on signup date
      return {
        cohortType,
        data: [
          {
            cohort: 'Jan 2024',
            size: 1000,
            retention: [
              { month: 0, percentage: 100 },
              { month: 1, percentage: 75 },
              { month: 2, percentage: 60 },
              { month: 3, percentage: 50 },
              { month: 4, percentage: 45 },
              { month: 5, percentage: 42 },
            ],
          },
          {
            cohort: 'Feb 2024',
            size: 1200,
            retention: [
              { month: 0, percentage: 100 },
              { month: 1, percentage: 78 },
              { month: 2, percentage: 62 },
              { month: 3, percentage: 52 },
              { month: 4, percentage: 48 },
            ],
          },
          {
            cohort: 'Mar 2024',
            size: 1100,
            retention: [
              { month: 0, percentage: 100 },
              { month: 1, percentage: 80 },
              { month: 2, percentage: 65 },
              { month: 3, percentage: 55 },
            ],
          },
        ],
        summary: {
          averageMonth1Retention: 77.7,
          averageMonth3Retention: 55.7,
          averageMonth6Retention: 45,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get cohort analysis: ${error}`);
    }
  }

  // Get funnel analysis
  async getFunnelAnalysis(timeRange: { start: Date; end: Date }): Promise<any> {
    try {
      // In a real app, you'd analyze user journey through conversion funnel
      return {
        timeRange,
        funnel: [
          {
            stage: 'Product Views',
            users: 10000,
            conversionRate: 100,
            dropOffRate: 0,
          },
          {
            stage: 'Add to Cart',
            users: 2500,
            conversionRate: 25,
            dropOffRate: 75,
          },
          {
            stage: 'Checkout Started',
            users: 1800,
            conversionRate: 18,
            dropOffRate: 28,
          },
          {
            stage: 'Payment',
            users: 1500,
            conversionRate: 15,
            dropOffRate: 17,
          },
          {
            stage: 'Purchase Completed',
            users: 1200,
            conversionRate: 12,
            dropOffRate: 20,
          },
        ],
        insights: [
          {
            stage: 'Product Views to Add to Cart',
            issue: 'High drop-off rate',
            recommendation: 'Improve product pages and add clear CTAs',
          },
          {
            stage: 'Checkout Started to Payment',
            issue: 'Payment friction',
            recommendation: 'Simplify payment process and add more options',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get funnel analysis: ${error}`);
    }
  }

  // Helper methods
  private validateEvent(event: BehaviorEvent): { valid: boolean; message: string } {
    if (!event.userId) {
      return { valid: false, message: 'User ID is required' };
    }

    if (!event.eventType) {
      return { valid: false, message: 'Event type is required' };
    }

    const validEventTypes = [
      'page_view', 'product_view', 'search', 'add_to_cart', 'remove_from_cart',
      'purchase', 'review', 'wishlist_add', 'wishlist_remove', 'comparison',
      'share', 'login', 'logout'
    ];

    if (!validEventTypes.includes(event.eventType)) {
      return { valid: false, message: 'Invalid event type' };
    }

    return { valid: true, message: 'Event is valid' };
  }

  private async updateRealTimeMetrics(event: BehaviorEvent): Promise<void> {
    // In a real app, you'd update real-time analytics dashboards
    console.log(`Real-time metrics updated for ${event.eventType}`);
  }

  private async getUserEvents(userId: string, timeRange: { start: Date; end: Date }): Promise<BehaviorEvent[]> {
    // In a real app, you'd fetch from analytics database
    // For now, return mock data
    return [
      {
        userId,
        eventType: 'page_view',
        timestamp: new Date(Date.now() - 3600000),
        metadata: { page: '/home', device: 'mobile' },
      },
      {
        userId,
        eventType: 'product_view',
        timestamp: new Date(Date.now() - 3000000),
        metadata: { productId: '123', page: '/products/123' },
      },
      {
        userId,
        eventType: 'add_to_cart',
        timestamp: new Date(Date.now() - 2400000),
        metadata: { productId: '123', amount: 99.99 },
      },
      {
        userId,
        eventType: 'purchase',
        timestamp: new Date(Date.now() - 1800000),
        metadata: { orderId: '456', amount: 99.99 },
      },
    ];
  }

  private calculateSummaryMetrics(events: BehaviorEvent[], orders: any[]): any {
    const totalEvents = events.length;
    const uniquePages = new Set(events.filter(e => e.metadata.page).map(e => e.metadata.page)).size;
    const totalProductsViewed = events.filter(e => e.eventType === 'product_view').length;
    const totalSearches = events.filter(e => e.eventType === 'search').length;
    const totalPurchases = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
    
    // Calculate conversion rate (purchases / product views)
    const conversionRate = totalProductsViewed > 0 ? (totalPurchases / totalProductsViewed) * 100 : 0;
    
    // Calculate bounce rate (single page sessions)
    const sessions = this.groupEventsBySession(events);
    const singlePageSessions = sessions.filter(session => session.events.length === 1).length;
    const bounceRate = sessions.length > 0 ? (singlePageSessions / sessions.length) * 100 : 0;
    
    // Calculate average session duration
    const sessionDurations = sessions.map(session => {
      const start = session.events[0].timestamp;
      const end = session.events[session.events.length - 1].timestamp;
      return (end.getTime() - start.getTime()) / 1000;
    });
    const sessionDuration = sessionDurations.length > 0 ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length : 0;
    
    // Calculate pages per session
    const pagesPerSession = sessions.length > 0 ? events.length / sessions.length : 0;

    return {
      totalEvents,
      uniquePages,
      totalProductsViewed,
      totalSearches,
      totalPurchases,
      totalSpent,
      averageOrderValue,
      conversionRate,
      bounceRate,
      sessionDuration,
      pagesPerSession,
    };
  }

  private groupEventsBySession(events: BehaviorEvent[]): Array<{ sessionId: string; events: BehaviorEvent[] }> {
    // In a real app, you'd group by actual session IDs
    // For now, group by 30-minute windows
    const sessions = new Map();
    
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let currentSessionId = 'session_1';
    let sessionStart = events[0]?.timestamp || new Date();
    
    events.forEach(event => {
      const timeDiff = event.timestamp.getTime() - sessionStart.getTime();
      
      if (timeDiff > 30 * 60 * 1000) { // 30 minutes
        currentSessionId = `session_${sessions.size + 1}`;
        sessionStart = event.timestamp;
      }
      
      if (!sessions.has(currentSessionId)) {
        sessions.set(currentSessionId, { sessionId: currentSessionId, events: [] });
      }
      
      sessions.get(currentSessionId).events.push(event);
    });
    
    return Array.from(sessions.values());
  }

  private async analyzeBehaviorPatterns(userId: string, events: BehaviorEvent[], orders: any[]): Promise<any> {
    // Most active hours
    const hourCounts = new Array(24).fill(0);
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts[hour]++;
    });
    const mostActiveHours = hourCounts.map((count, hour) => ({ hour, events: count }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 6);

    // Most active days
    const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    events.forEach(event => {
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][event.timestamp.getDay()];
      dayCounts[day]++;
    });
    const mostActiveDays = Object.entries(dayCounts)
      .map(([day, events]) => ({ day, events }))
      .sort((a, b) => b.events - a.events);

    // Preferred categories (mock data)
    const preferredCategories = [
      { category: 'Electronics', views: 45, purchases: 8 },
      { category: 'Clothing', views: 32, purchases: 5 },
      { category: 'Home', views: 28, purchases: 3 },
    ];

    // Preferred brands (mock data)
    const preferredBrands = [
      { brand: 'Apple', views: 25, purchases: 4 },
      { brand: 'Nike', views: 20, purchases: 3 },
      { brand: 'Samsung', views: 18, purchases: 2 },
    ];

    // Price preferences
    const priceRanges = [
      { range: '$0-$50', count: 15, percentage: 30 },
      { range: '$50-$100', count: 20, percentage: 40 },
      { range: '$100-$200', count: 10, percentage: 20 },
      { range: '$200+', count: 5, percentage: 10 },
    ];

    // Device usage
    const deviceCounts = { mobile: 35, desktop: 12, tablet: 3 };
    const totalDeviceSessions = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
    const deviceUsage = Object.entries(deviceCounts)
      .map(([device, sessions]) => ({
        device,
        sessions,
        percentage: (sessions / totalDeviceSessions) * 100,
      }));

    // Traffic sources
    const trafficSources = [
      { source: 'Direct', sessions: 25, percentage: 50 },
      { source: 'Search', sessions: 15, percentage: 30 },
      { source: 'Social', sessions: 7, percentage: 14 },
      { source: 'Email', sessions: 3, percentage: 6 },
    ];

    return {
      mostActiveHours,
      mostActiveDays,
      preferredCategories,
      preferredBrands,
      pricePreferences: priceRanges,
      deviceUsage,
      trafficSources,
    };
  }

  private async calculateEngagementMetrics(userId: string, events: BehaviorEvent[], orders: any[]): Promise<any> {
    // Product engagement
    const productViews = events.filter(e => e.eventType === 'product_view');
    const addToCarts = events.filter(e => e.eventType === 'add_to_cart');
    
    const productEngagement = [
      {
        productId: '123',
        name: 'iPhone 15',
        views: 5,
        addToCart: 2,
        purchases: 1,
        conversionRate: 20,
      },
      {
        productId: '456',
        name: 'Nike Shoes',
        views: 3,
        addToCart: 1,
        purchases: 0,
        conversionRate: 0,
      },
    ];

    // Category engagement
    const categoryEngagement = [
      {
        category: 'Electronics',
        views: 25,
        addToCart: 8,
        purchases: 3,
        conversionRate: 12,
      },
      {
        category: 'Clothing',
        views: 18,
        addToCart: 5,
        purchases: 2,
        conversionRate: 11,
      },
    ];

    // Search performance
    const searchEvents = events.filter(e => e.eventType === 'search');
    const searchPerformance = [
      {
        query: 'iPhone',
        searches: 5,
        results: 120,
        clickThrough: 15,
        conversionRate: 20,
      },
      {
        query: 'shoes',
        searches: 3,
        results: 80,
        clickThrough: 8,
        conversionRate: 25,
      },
    ];

    // Funnel analysis
    const productViewsCount = productViews.length;
    const addToCartCount = addToCarts.length;
    const checkoutCount = events.filter(e => e.metadata.page?.includes('checkout')).length;
    const purchaseCount = orders.length;

    const viewToCartRate = productViewsCount > 0 ? ((productViewsCount - addToCartCount) / productViewsCount) * 100 : 0;
    const cartToCheckoutRate = addToCartCount > 0 ? ((addToCartCount - checkoutCount) / addToCartCount) * 100 : 0;
    const checkoutToPurchaseRate = checkoutCount > 0 ? ((checkoutCount - purchaseCount) / checkoutCount) * 100 : 0;

    return {
      productEngagement,
      categoryEngagement,
      searchPerformance,
      funnelAnalysis: {
        productViews: productViewsCount,
        addToCart: addToCartCount,
        checkout: checkoutCount,
        purchase: purchaseCount,
        dropOffRates: {
          viewToCart: viewToCartRate,
          cartToCheckout: cartToCheckoutRate,
          checkoutToPurchase: checkoutToPurchaseRate,
        },
      },
    };
  }

  private async generateRecommendations(userId: string, events: BehaviorEvent[], orders: any[], user: any): Promise<any> {
    // Calculate churn risk
    const lastPurchase = orders.length > 0 ? Math.max(...orders.map(o => o.createdAt.getTime())) : 0;
    const daysSinceLastPurchase = (Date.now() - lastPurchase) / (1000 * 60 * 60 * 24);
    
    let churnRisk: 'low' | 'medium' | 'high' = 'low';
    if (daysSinceLastPurchase > 90) churnRisk = 'high';
    else if (daysSinceLastPurchase > 60) churnRisk = 'medium';

    // Calculate LTV (simplified)
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const purchaseFrequency = orders.length / Math.max(daysSinceLastPurchase / 30, 1);
    const ltv = totalSpent * purchaseFrequency * 12; // Annual LTV

    // Next purchase probability
    const avgPurchaseCycle = this.calculateAveragePurchaseCycle(orders);
    const nextPurchaseProbability = this.calculateNextPurchaseProbability(daysSinceLastPurchase, avgPurchaseCycle);

    // Preferred communication channel
    const deviceUsage = this.calculateDeviceUsage(events);
    const preferredCommunicationChannel = deviceUsage.mobile > deviceUsage.desktop ? 'push' : 'email';

    // Personalized offers
    const personalizedOffers = [
      {
        type: 'discount' as const,
        value: 15,
        confidence: 0.8,
        reason: 'Based on your purchase history and cart abandonment',
      },
      {
        type: 'free_shipping' as const,
        value: 0,
        confidence: 0.7,
        reason: 'You\'re close to free shipping threshold',
      },
      {
        type: 'product_recommendation' as const,
        value: 0,
        confidence: 0.6,
        reason: 'Products similar to your recent purchases',
      },
    ];

    return {
      churnRisk,
      ltv,
      nextPurchaseProbability,
      preferredCommunicationChannel,
      personalizedOffers,
    };
  }

  private calculateAveragePurchaseCycle(orders: any[]): number {
    if (orders.length < 2) return 90; // Default 90 days
    
    const purchaseDates = orders.map(o => o.createdAt.getTime()).sort();
    const intervals = [];
    
    for (let i = 1; i < purchaseDates.length; i++) {
      intervals.push((purchaseDates[i] - purchaseDates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  private calculateNextPurchaseProbability(daysSinceLastPurchase: number, avgPurchaseCycle: number): number {
    if (daysSinceLastPurchase > avgPurchaseCycle * 2) return 0.9;
    if (daysSinceLastPurchase > avgPurchaseCycle) return 0.7;
    if (daysSinceLastPurchase > avgPurchaseCycle * 0.5) return 0.5;
    return 0.3;
  }

  private calculateDeviceUsage(events: BehaviorEvent[]): { mobile: number; desktop: number; tablet: number } {
    const deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
    
    events.forEach(event => {
      const device = event.metadata.device;
      if (device && deviceCounts.hasOwnProperty(device)) {
        deviceCounts[device]++;
      }
    });
    
    return deviceCounts;
  }

  // Export analytics data
  async exportAnalyticsData(
    userId: string,
    timeRange: { start: Date; end: Date },
    format: 'json' | 'csv' | 'pdf'
  ): Promise<any> {
    try {
      const analytics = await this.getUserBehaviorAnalytics(userId, timeRange);
      
      return {
        data: analytics,
        format,
        exportedAt: new Date(),
        filename: `user_analytics_${userId}_${Date.now()}.${format}`,
      };
    } catch (error) {
      throw new Error(`Failed to export analytics data: ${error}`);
    }
  }

  // Get real-time user activity
  async getRealTimeActivity(userId?: string): Promise<any> {
    try {
      // In a real app, you'd fetch from real-time analytics
      return {
        activeUsers: 1250,
        currentSessions: 890,
        pageViews: 2450,
        topPages: [
          { page: '/home', views: 450 },
          { page: '/products', views: 320 },
          { page: '/cart', views: 180 },
        ],
        realtimeEvents: [
          { userId: '123', action: 'page_view', page: '/products/456', timestamp: new Date() },
          { userId: '456', action: 'add_to_cart', productId: '789', timestamp: new Date() },
          { userId: '789', action: 'purchase', orderId: '101', timestamp: new Date() },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get real-time activity: ${error}`);
    }
  }

  // Generate behavior report
  async generateBehaviorReport(
    timeRange: { start: Date; end: Date },
    reportType: 'user_summary' | 'segment_analysis' | 'funnel_analysis' | 'cohort_analysis'
  ): Promise<any> {
    try {
      switch (reportType) {
        case 'user_summary':
          return await this.getUserBehaviorAnalytics('summary', timeRange);
        case 'segment_analysis':
          return await this.getUserSegments();
        case 'funnel_analysis':
          return await this.getFunnelAnalysis(timeRange);
        case 'cohort_analysis':
          return await this.getCohortAnalysis('monthly');
        default:
          throw new Error('Invalid report type');
      }
    } catch (error) {
      throw new Error(`Failed to generate behavior report: ${error}`);
    }
  }
}
