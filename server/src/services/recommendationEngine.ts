import { Product } from '../model/product';
import { User } from '../model/user';
import { Order } from '../model/order';
import { Review } from '../model/review';

export interface RecommendationRequest {
  userId: string;
  type: 'personalized' | 'trending' | 'similar' | 'collaborative' | 'content_based' | 'hybrid';
  productId?: string;
  category?: string;
  limit?: number;
  context?: {
    page?: 'home' | 'product' | 'cart' | 'checkout';
    sessionId?: string;
    device?: string;
  };
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: Array<{
    productId: string;
    score: number;
    reason: string;
    product: any;
  }>;
  algorithm: string;
  totalProcessed: number;
  executionTime: number;
}

export interface RecommendationAnalytics {
  totalRecommendations: number;
  clickThroughRate: number;
  conversionRate: number;
  algorithmPerformance: Record<string, {
    usage: number;
    ctr: number;
    conversion: number;
  }>;
  popularCategories: Array<{
    category: string;
    recommendations: number;
    clicks: number;
  }>;
}

export class RecommendationEngine {
  private userProfiles: Map<string, any> = new Map();
  private productFeatures: Map<string, any> = new Map();
  private userItemMatrix: Map<string, Map<string, number>> = new Map();

  constructor() {
    this.initializeData();
  }

  // Get recommendations
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const startTime = Date.now();
    
    try {
      let recommendations: any[] = [];
      let algorithm = '';

      switch (request.type) {
        case 'personalized':
          recommendations = await this.getPersonalizedRecommendations(request);
          algorithm = 'personalized';
          break;
        case 'trending':
          recommendations = await this.getTrendingRecommendations(request);
          algorithm = 'trending';
          break;
        case 'similar':
          recommendations = await this.getSimilarProductRecommendations(request);
          algorithm = 'similar_products';
          break;
        case 'collaborative':
          recommendations = await this.getCollaborativeFilteringRecommendations(request);
          algorithm = 'collaborative_filtering';
          break;
        case 'content_based':
          recommendations = await this.getContentBasedRecommendations(request);
          algorithm = 'content_based';
          break;
        case 'hybrid':
        default:
          recommendations = await this.getHybridRecommendations(request);
          algorithm = 'hybrid';
          break;
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        recommendations: recommendations.slice(0, request.limit || 10),
        algorithm,
        totalProcessed: recommendations.length,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        recommendations: [],
        algorithm: 'error',
        totalProcessed: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  // Personalized recommendations
  private async getPersonalizedRecommendations(request: RecommendationRequest): Promise<any[]> {
    const { userId, limit = 10 } = request;
    
    // Get user profile
    const userProfile = await this.getUserProfile(userId);
    if (!userProfile) {
      return this.getTrendingRecommendations(request);
    }

    const recommendations: any[] = [];
    
    // Category-based recommendations
    if (userProfile.preferredCategories.length > 0) {
      const categoryProducts = await Product.find({
        category: { $in: userProfile.preferredCategories },
        _id: { $nin: userProfile.viewedProducts },
      })
        .sort({ averageRating: -1, salesCount: -1 })
        .limit(Math.floor(limit / 2));

      categoryProducts.forEach(product => {
        recommendations.push({
          productId: product._id,
          score: this.calculateCategoryScore(product, userProfile),
          reason: `Based on your interest in ${product.category}`,
          product,
        });
      });
    }

    // Brand-based recommendations
    if (userProfile.preferredBrands.length > 0) {
      const brandProducts = await Product.find({
        brand: { $in: userProfile.preferredBrands },
        _id: { $nin: userProfile.viewedProducts },
      })
        .sort({ averageRating: -1, salesCount: -1 })
        .limit(Math.floor(limit / 2));

      brandProducts.forEach(product => {
        recommendations.push({
          productId: product._id,
          score: this.calculateBrandScore(product, userProfile),
          reason: `Based on your preference for ${product.brand}`,
          product,
        });
      });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  // Trending recommendations
  private async getTrendingRecommendations(request: RecommendationRequest): Promise<any[]> {
    const { limit = 10, category } = request;
    
    let filter: any = {
      quantity: { $gt: 0 },
    };

    if (category) {
      filter.category = category;
    }

    const trendingProducts = await Product.find(filter)
      .sort({ 
        salesCount: -1, 
        averageRating: -1,
        reviewCount: -1,
      })
      .limit(limit)
      .select('name price images category brand averageRating salesCount');

    return trendingProducts.map(product => ({
      productId: product._id,
      score: this.calculateTrendingScore(product),
      reason: 'Trending product with high sales and ratings',
      product,
    }));
  }

  // Similar product recommendations
  private async getSimilarProductRecommendations(request: RecommendationRequest): Promise<any[]> {
    const { productId, limit = 10 } = request;
    
    if (!productId) {
      return this.getTrendingRecommendations(request);
    }

    const product = await Product.findById(productId);
    if (!product) {
      return [];
    }

    const similarProducts = await Product.find({
      _id: { $ne: productId },
      $or: [
        { category: product.category },
        { brand: product.brand },
        { tags: { $in: product.tags } },
      ],
      quantity: { $gt: 0 },
    })
      .sort({ averageRating: -1, salesCount: -1 })
      .limit(limit)
      .select('name price images category brand averageRating salesCount tags');

    return similarProducts.map(similarProduct => ({
      productId: similarProduct._id,
      score: this.calculateSimilarityScore(product, similarProduct),
      reason: this.getSimilarityReason(product, similarProduct),
      product: similarProduct,
    }));
  }

  // Collaborative filtering recommendations
  private async getCollaborativeFilteringRecommendations(request: RecommendationRequest): Promise<any[]> {
    const { userId, limit = 10 } = request;
    
    // Get user's purchase history
    const userOrders = await Order.find({ user: userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });

    if (userOrders.length === 0) {
      return this.getTrendingRecommendations(request);
    }

    // Find users with similar purchase patterns
    const userProducts = new Set();
    userOrders.forEach(order => {
      order.items.forEach((item: any) => {
        userProducts.add(item.productId.toString());
      });
    });

    // Find similar users (simplified - in real app, use proper collaborative filtering)
    const similarUsers = await this.findSimilarUsers(userId, Array.from(userProducts));

    // Get products purchased by similar users but not by current user
    const recommendations = await this.getProductsFromSimilarUsers(similarUsers, userProducts, limit);

    return recommendations.map(rec => ({
      productId: rec.productId,
      score: rec.score,
      reason: `Users like you also bought this`,
      product: rec.product,
    }));
  }

  // Content-based recommendations
  private async getContentBasedRecommendations(request: RecommendationRequest): Promise<any[]> {
    const { userId, limit = 10 } = request;
    
    // Get user's highly rated products
    const userReviews = await Review.find({ user: userId, rating: { $gte: 4 } })
      .populate('productId')
      .sort({ rating: -1 });

    if (userReviews.length === 0) {
      return this.getTrendingRecommendations(request);
    }

    // Extract features from user's preferred products
    const userFeatures = this.extractUserFeatures(userReviews);

    // Find products with similar features
    const recommendations = await this.findSimilarFeatureProducts(userFeatures, userId, limit);

    return recommendations.map(rec => ({
      productId: rec.productId,
      score: rec.score,
      reason: `Similar to products you've rated highly`,
      product: rec.product,
    }));
  }

  // Hybrid recommendations
  private async getHybridRecommendations(request: RecommendationRequest): Promise<any[]> {
    const { userId, limit = 10 } = request;
    
    // Get recommendations from multiple algorithms
    const personalized = await this.getPersonalizedRecommendations(request);
    const trending = await this.getTrendingRecommendations(request);
    const collaborative = await this.getCollaborativeFilteringRecommendations(request);

    // Combine and weight recommendations
    const combinedRecommendations = new Map();

    // Add personalized recommendations (weight: 0.4)
    personalized.forEach(rec => {
      combinedRecommendations.set(rec.productId, {
        ...rec,
        score: rec.score * 0.4,
        sources: ['personalized'],
      });
    });

    // Add trending recommendations (weight: 0.3)
    trending.forEach(rec => {
      if (combinedRecommendations.has(rec.productId)) {
        const existing = combinedRecommendations.get(rec.productId);
        existing.score += rec.score * 0.3;
        existing.sources.push('trending');
      } else {
        combinedRecommendations.set(rec.productId, {
          ...rec,
          score: rec.score * 0.3,
          sources: ['trending'],
        });
      }
    });

    // Add collaborative recommendations (weight: 0.3)
    collaborative.forEach(rec => {
      if (combinedRecommendations.has(rec.productId)) {
        const existing = combinedRecommendations.get(rec.productId);
        existing.score += rec.score * 0.3;
        existing.sources.push('collaborative');
      } else {
        combinedRecommendations.set(rec.productId, {
          ...rec,
          score: rec.score * 0.3,
          sources: ['collaborative'],
        });
      }
    });

    // Sort by combined score and return top recommendations
    const sortedRecommendations = Array.from(combinedRecommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sortedRecommendations.map(rec => ({
      ...rec,
      reason: this.getHybridReason(rec.sources),
    }));
  }

  // Get user profile
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const orders = await Order.find({ user: userId })
        .populate('items.productId')
        .sort({ createdAt: -1 });

      const reviews = await Review.find({ user: userId })
        .populate('productId');

      // Analyze user behavior
      const profile = {
        preferredCategories: this.getPreferredCategories(orders),
        preferredBrands: this.getPreferredBrands(orders),
        priceRange: this.getPriceRange(orders),
        viewedProducts: user.viewedProducts || [],
        averageRating: this.getAverageRating(reviews),
        purchaseFrequency: orders.length,
        lastPurchase: orders.length > 0 ? orders[0].createdAt : null,
      };

      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  // Helper methods for profile analysis
  private getPreferredCategories(orders: any[]): string[] {
    const categoryCount = new Map<string, number>();
    
    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const category = item.productId.category;
        categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
      });
    });

    return Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }

  private getPreferredBrands(orders: any[]): string[] {
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
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([brand]) => brand);
  }

  private getPriceRange(orders: any[]): { min: number; max: number } {
    const prices = orders.flatMap(order => 
      order.items.map((item: any) => item.productId.price)
    );

    if (prices.length === 0) {
      return { min: 0, max: 1000 };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  private getAverageRating(reviews: any[]): number {
    if (reviews.length === 0) return 0;
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviews.length;
  }

  // Score calculation methods
  private calculateCategoryScore(product: any, userProfile: any): number {
    const categoryIndex = userProfile.preferredCategories.indexOf(product.category);
    if (categoryIndex === -1) return 0.3;
    
    return 0.9 - (categoryIndex * 0.1);
  }

  private calculateBrandScore(product: any, userProfile: any): number {
    const brandIndex = userProfile.preferredBrands.indexOf(product.brand);
    if (brandIndex === -1) return 0.3;
    
    return 0.9 - (brandIndex * 0.1);
  }

  private calculateTrendingScore(product: any): number {
    const salesScore = Math.min(product.salesCount / 1000, 1) * 0.4;
    const ratingScore = (product.averageRating / 5) * 0.3;
    const reviewScore = Math.min(product.reviewCount / 100, 1) * 0.3;
    
    return salesScore + ratingScore + reviewScore;
  }

  private calculateSimilarityScore(product1: any, product2: any): number {
    let score = 0;
    
    if (product1.category === product2.category) score += 0.3;
    if (product1.brand === product2.brand) score += 0.3;
    
    // Tag similarity
    const commonTags = product1.tags.filter((tag: string) => 
      product2.tags.includes(tag)
    ).length;
    const tagSimilarity = commonTags / Math.max(product1.tags.length, product2.tags.length);
    score += tagSimilarity * 0.4;
    
    return score;
  }

  private getSimilarityReason(product1: any, product2: any): string {
    const reasons = [];
    
    if (product1.category === product2.category) {
      reasons.push('same category');
    }
    if (product1.brand === product2.brand) {
      reasons.push('same brand');
    }
    
    const commonTags = product1.tags.filter((tag: string) => 
      product2.tags.includes(tag)
    );
    if (commonTags.length > 0) {
      reasons.push('similar features');
    }
    
    return reasons.length > 0 
      ? `Similar ${reasons.join(', ')}`
      : 'Similar product';
  }

  // Collaborative filtering helpers
  private async findSimilarUsers(userId: string, userProducts: string[]): Promise<string[]> {
    // Simplified implementation - in real app, use proper similarity metrics
    const similarUsers = await Order.aggregate([
      { $match: { user: { $ne: userId } } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: userProducts } } },
      { $group: { _id: '$user', commonProducts: { $sum: 1 } } },
      { $match: { commonProducts: { $gte: 2 } } },
      { $sort: { commonProducts: -1 } },
      { $limit: 10 },
    ]);

    return similarUsers.map(u => u._id.toString());
  }

  private async getProductsFromSimilarUsers(similarUsers: string[], userProducts: Set<string>, limit: number): Promise<any[]> {
    const recommendations = await Order.aggregate([
      { $match: { user: { $in: similarUsers } } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $nin: Array.from(userProducts) } } },
      { $group: { 
        _id: '$items.productId', 
        count: { $sum: '$items.quantity' },
        users: { $addToSet: '$user' }
      }},
      { $sort: { count: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' }},
      { $unwind: '$product' },
    ]);

    return recommendations.map(rec => ({
      productId: rec._id,
      score: rec.count / similarUsers.length,
      product: rec.product,
    }));
  }

  // Content-based filtering helpers
  private extractUserFeatures(reviews: any[]): any {
    const features = {
      categories: new Map<string, number>(),
      brands: new Map<string, number>(),
      tags: new Map<string, number>(),
      priceRange: { min: Infinity, max: -Infinity },
    };

    reviews.forEach(review => {
      const product = review.productId;
      
      features.categories.set(product.category, (features.categories.get(product.category) || 0) + 1);
      
      if (product.brand) {
        features.brands.set(product.brand, (features.brands.get(product.brand) || 0) + 1);
      }
      
      product.tags.forEach((tag: string) => {
        features.tags.set(tag, (features.tags.get(tag) || 0) + 1);
      });
      
      features.priceRange.min = Math.min(features.priceRange.min, product.price);
      features.priceRange.max = Math.max(features.priceRange.max, product.price);
    });

    return features;
  }

  private async findSimilarFeatureProducts(userFeatures: any, userId: string, limit: number): Promise<any[]> {
    // Find products with similar features
    const products = await Product.find({
      _id: { $nin: await this.getViewedProducts(userId) },
      quantity: { $gt: 0 },
    });

    const scoredProducts = products.map(product => {
      let score = 0;
      
      // Category match
      if (userFeatures.categories.has(product.category)) {
        score += userFeatures.categories.get(product.category) * 0.3;
      }
      
      // Brand match
      if (product.brand && userFeatures.brands.has(product.brand)) {
        score += userFeatures.brands.get(product.brand) * 0.2;
      }
      
      // Tag matches
      product.tags.forEach((tag: string) => {
        if (userFeatures.tags.has(tag)) {
          score += userFeatures.tags.get(tag) * 0.1;
        }
      });
      
      // Price range match
      if (product.price >= userFeatures.priceRange.min && product.price <= userFeatures.priceRange.max) {
        score += 0.2;
      }
      
      return {
        productId: product._id,
        score,
        product,
      };
    });

    return scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getViewedProducts(userId: string): Promise<string[]> {
    const user = await User.findById(userId);
    return user?.viewedProducts || [];
  }

  private getHybridReason(sources: string[]): string {
    if (sources.length === 1) {
      return `Recommended based on ${sources[0]}`;
    }
    
    return `Recommended based on ${sources.join(', ')}`;
  }

  // Initialize data
  private async initializeData(): Promise<void> {
    // In a real app, you'd load and cache data here
    console.log('Recommendation engine initialized');
  }

  // Get recommendation analytics
  async getRecommendationAnalytics(): Promise<RecommendationAnalytics> {
    try {
      // In a real app, you'd track recommendations and their performance
      return {
        totalRecommendations: 1000000,
        clickThroughRate: 0.15,
        conversionRate: 0.05,
        algorithmPerformance: {
          personalized: { usage: 400000, ctr: 0.18, conversion: 0.06 },
          trending: { usage: 300000, ctr: 0.12, conversion: 0.04 },
          collaborative: { usage: 200000, ctr: 0.16, conversion: 0.05 },
          content_based: { usage: 100000, ctr: 0.14, conversion: 0.04 },
        },
        popularCategories: [
          { category: 'Electronics', recommendations: 300000, clicks: 45000 },
          { category: 'Clothing', recommendations: 250000, clicks: 35000 },
          { category: 'Home', recommendations: 200000, clicks: 28000 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get recommendation analytics: ${error}`);
    }
  }

  // Update user behavior
  async updateUserBehavior(userId: string, action: string, productId: string): Promise<void> {
    try {
      // In a real app, you'd update user behavior data
      console.log(`User behavior updated: ${userId} - ${action} - ${productId}`);
    } catch (error) {
      console.error('Failed to update user behavior:', error);
    }
  }

  // A/B testing for recommendations
  async testRecommendationAlgorithm(userId: string, algorithmA: string, algorithmB: string): Promise<any> {
    try {
      // In a real app, you'd implement A/B testing
      return {
        algorithmA: { ctr: 0.16, conversion: 0.05 },
        algorithmB: { ctr: 0.14, conversion: 0.04 },
        winner: algorithmA,
      };
    } catch (error) {
      throw new Error(`Failed to test recommendation algorithm: ${error}`);
    }
  }
}
