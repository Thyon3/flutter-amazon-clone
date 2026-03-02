import { Product } from '../model/product';
import { User } from '../model/user';
import { Order } from '../model/order';
import { Review } from '../model/review';
import { Category } from '../model/category';

export interface RecommendationRequest {
  userId: string;
  type: 'personalized' | 'trending' | 'similar' | 'collaborative' | 'content_based' | 'hybrid' | 'cross_sell' | 'up_sell' | 'frequently_bought_together';
  productId?: string;
  category?: string;
  limit?: number;
  context?: {
    page?: 'home' | 'product' | 'cart' | 'checkout' | 'search' | 'category';
    sessionId?: string;
    device?: string;
    location?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  };
  filters?: {
    priceRange?: { min: number; max: number };
    brands?: string[];
    categories?: string[];
    inStock?: boolean;
    rating?: number;
    prime?: boolean;
  };
}

export interface RecommendationResponse {
  success: boolean;
  message: string;
  recommendations: ProductRecommendation[];
  algorithm: string;
  totalProcessed: number;
  executionTime: number;
  metadata?: {
    confidence: number;
    diversity: number;
    freshness: number;
    popularity: number;
  };
}

export interface ProductRecommendation {
  productId: string;
  name: string;
  score: number;
  confidence: number;
  reason: string;
  algorithm: string;
  metadata: {
    price: number;
    rating: number;
    reviewCount: number;
    category: string;
    brand: string;
    inStock: boolean;
    prime?: boolean;
    discount?: number;
    features: string[];
    tags: string[];
  };
}

export interface RecommendationAnalytics {
  totalRecommendations: number;
  clickThroughRate: number;
  conversionRate: number;
  averageConfidence: number;
  algorithmPerformance: Record<string, {
    usage: number;
    ctr: number;
    conversion: number;
    avgConfidence: number;
  }>;
  userSegments: Record<string, {
    count: number;
    avgCTR: number;
    avgConversion: number;
  }>;
  productPerformance: Record<string, {
    recommendations: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
  trends: Array<{
    date: string;
    recommendations: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
}

export class ProductRecommendationEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private productFeatures: Map<string, ProductFeatures> = new Map();
  private userItemMatrix: Map<string, Map<string, number>> = new Map();
  private categoryHierarchy: Map<string, string[]> = new Map();

  constructor() {
    this.initializeData();
  }

  // Get recommendations
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const startTime = Date.now();
    
    try {
      let recommendations: ProductRecommendation[] = [];
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
        case 'cross_sell':
          recommendations = await this.getCrossSellRecommendations(request);
          algorithm = 'cross_sell';
          break;
        case 'up_sell':
          recommendations = await this.getUpSellRecommendations(request);
          algorithm = 'up_sell';
          break;
        case 'frequently_bought_together':
          recommendations = await this.getFrequentlyBoughtTogetherRecommendations(request);
          algorithm = 'frequently_bought_together';
          break;
        case 'hybrid':
        default:
          recommendations = await this.getHybridRecommendations(request);
          algorithm = 'hybrid';
          break;
      }

      const executionTime = Date.now() - startTime;

      // Apply filters
      recommendations = this.applyFilters(recommendations, request.filters);

      // Sort by score and limit
      recommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, request.limit || 10);

      // Calculate metadata
      const metadata = this.calculateMetadata(recommendations);

      return {
        success: true,
        message: 'Recommendations generated successfully',
        recommendations,
        algorithm,
        totalProcessed: recommendations.length,
        executionTime,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate recommendations: ${error}`,
        recommendations: [],
        algorithm: 'error',
        totalProcessed: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  // Personalized recommendations
  private async getPersonalizedRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      const userId = request.userId;
      
      // Get user profile
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        return this.getTrendingRecommendations(request);
      }

      const recommendations: ProductRecommendation[] = [];

      // Category-based recommendations
      if (userProfile.preferredCategories.length > 0) {
        const categoryProducts = await this.getProductsByCategories(userProfile.preferredCategories);
        categoryProducts.forEach(product => {
          recommendations.push({
            productId: product._id.toString(),
            name: product.name,
            score: this.calculateCategoryScore(product, userProfile),
            confidence: 0.8,
            reason: `Based on your interest in ${product.category}`,
            algorithm: 'personalized',
            metadata: this.getProductMetadata(product),
          });
        });
      }

      // Brand-based recommendations
      if (userProfile.preferredBrands.length > 0) {
        const brandProducts = await this.getProductsByBrands(userProfile.preferredBrands);
        brandProducts.forEach(product => {
          recommendations.push({
            productId: product._id.toString(),
            name: product.name,
            score: this.calculateBrandScore(product, userProfile),
            confidence: 0.7,
            reason: `Based on your preference for ${product.brand}`,
            algorithm: 'personalized',
            metadata: this.getProductMetadata(product),
          });
        });

        recommendations.push({
          productId: product._id.toString(),
          name: product.name,
          score: this.calculateBrandScore(product, userProfile),
          confidence: 0.7,
          reason: `Based on your preference for ${product.brand}`,
          algorithm: 'personalized',
          metadata: this.getProductMetadata(product),
        });
      }

      // Price range recommendations
      if (userProfile.priceRange) {
        const priceProducts = await this.getProductsByPriceRange(userProfile.priceRange.min, userProfile.priceRange.max);
        priceProducts.forEach(product => {
          recommendations.push({
            productId: product._id.toString(),
            name: product.name,
            score: this.calculatePriceScore(product, userProfile),
            confidence: 0.6,
            reason: 'Within your preferred price range',
            algorithm: 'personalized',
            metadata: this.getProductMetadata(product),
          });
        });
      }

      // Feature-based recommendations
      if (userProfile.preferredFeatures.length > 0) {
        const featureProducts = await this.getProductsByFeatures(userProfile.preferredFeatures);
        featureProducts.forEach(product => {
          recommendations.push({
            productId: product._id.toString(),
            name: product.name,
            score: this.calculateFeatureScore(product, userProfile),
            confidence: 0.75,
            reason: 'Matches your preferred features',
            algorithm: 'personalized',
            metadata: this.getProductMetadata(product),
          });
        });
      }

      return recommendations;
    } catch (error) {
      throw new Error(`Failed to get personalized recommendations: ${error}`);
    }
  }

  // Trending recommendations
  private async getTrendingRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      const limit = request.limit || 10;
      const category = request.category;
      
      let query: any = { quantity: { $gt: 0 } };
      if (category) {
        query.category = category;
      }

      const trendingProducts = await Product.find(query)
        .sort({ 
          salesCount: -1, 
          averageRating: -1, 
          reviewCount: -1,
          createdAt: -1 
        })
        .limit(limit * 2) // Get more to filter
        .select('name price images category brand averageRating reviewCount salesCount createdAt features tags')
        .lean();

      const recommendations: ProductRecommendation[] = trendingProducts.map(product => ({
        productId: product._id.toString(),
        name: product.name,
        score: this.calculateTrendingScore(product),
        confidence: 0.6,
        reason: 'Trending product with high sales and ratings',
        algorithm: 'trending',
        metadata: this.getProductMetadata(product),
      }));

      return recommendations.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get trending recommendations: ${error}`);
    }
  }

  // Similar product recommendations
  private async getSimilarProductRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      if (!request.productId) {
        return this.getTrendingRecommendations(request);
      }

      const product = await Product.findById(request.productId);
      if (!product) {
        return this.getTrendingRecommendations(request);
      }

      const similarProducts = await Product.find({
        _id: { $ne: request.productId },
        $or: [
          { category: product.category },
          { brand: product.brand },
          { tags: { $in: product.tags } },
        ],
        quantity: { $gt: 0 },
      })
        .sort({ averageRating: -1, salesCount: -1 })
        .limit(request.limit || 10)
        .select('name price images category brand averageRating salesCount tags features')
        .lean();

      const recommendations: ProductRecommendation[] = similarProducts.map(similarProduct => ({
        productId: similarProduct._id.toString(),
        name: similarProduct.name,
        score: this.calculateSimilarityScore(product, similarProduct),
        confidence: 0.8,
        reason: this.getSimilarityReason(product, similarProduct),
        algorithm: 'similar_products',
        metadata: this.getProductMetadata(similarProduct),
      }));

      return recommendations;
    } catch (error) {
      throw new Error(`Failed to get similar product recommendations: ${error}`);
    }
  }

  // Collaborative filtering recommendations
  private async getCollaborativeFilteringRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      const userId = request.userId;
      
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
      const recommendations = await this.getProductsFromSimilarUsers(similarUsers, userProducts, request.limit || 10);

      return recommendations.map(rec => ({
        productId: rec.productId,
        name: rec.productName,
        score: rec.score,
        confidence: rec.confidence,
        reason: `Users like you also bought this`,
        algorithm: 'collaborative_filtering',
        metadata: this.getProductMetadata(rec.product),
      }));
    } catch (error) {
      throw new Error(`Failed to get collaborative filtering recommendations: ${error}`);
    }
  }

  // Content-based recommendations
  private async getContentBasedRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      const userId = request.userId;
      
      // Get user's highly rated products
      const userReviews = await Review.find({ user: userId, rating: { $gte: 4 } })
        .populate('productId')
        .sort({ rating: -1 })
        .limit(20);

      if (userReviews.length === 0) {
        return this.getTrendingRecommendations(request);
      }

      // Extract features from user's preferred products
      const userFeatures = this.extractUserFeatures(userReviews);

      // Find products with similar features
      const recommendations = await this.findSimilarFeatureProducts(userFeatures, userId, request.limit || 10);

      return recommendations.map(rec => ({
        productId: rec.productId,
        name: rec.productName,
        score: rec.score,
        confidence: rec.confidence,
        reason: `Similar to products you've rated highly`,
        algorithm: 'content_based',
        metadata: this.getProductMetadata(rec.product),
      }));
    } catch (error) {
      throw new Error(`Failed to get content-based recommendations: ${error}`);
    }
  }

  // Cross-sell recommendations
  private async getCrossSellRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      if (!request.productId) {
        return this.getTrendingRecommendations(request);
      }

      const product = await Product.findById(request.productId);
      if (!product) {
        return this.getTrendingRecommendations(request);
      }

      // Find products frequently bought together with this product
      const crossSellProducts = await this.getFrequentlyBoughtTogether(product._id.toString());
      
      if (crossSellProducts.length === 0) {
        // Fallback to category-based recommendations
        return this.getCategoryBasedRecommendations(product.category, request.limit || 10);
      }

      return crossSellProducts.map(product => ({
        productId: product.productId,
        name: product.productName,
        score: product.score,
        confidence: 0.7,
        reason: 'Frequently bought together',
        algorithm: 'cross_sell',
        metadata: this.getProductMetadata(product.product),
      }));
    } catch (error) {
      throw new Error(`Failed to get cross-sell recommendations: ${error}`);
    }
  }

  // Up-sell recommendations
  private async getUpSellRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      if (!request.productId) {
        return this.getTrendingRecommendations(request);
      }

      const product = await Product.findById(request.productId);
      if (!product) {
        return this.getTrendingRecommendations(request);
      }

      // Find premium versions or upgrades
      const upSellProducts = await Product.find({
        category: product.category,
        brand: product.brand,
        price: { $gt: product.price * 1.2 }, // At least 20% more expensive
        quantity: { $gt: 0 },
      })
        .sort({ averageRating: -1, price: -1 })
        .limit(request.limit || 10)
        .select('name price images category brand averageRating')
        .lean();

      return upSellProducts.map(product => ({
        productId: product._id.toString(),
        name: product.name,
        score: this.calculateUpSellScore(product, product),
        confidence: 0.6,
        reason: 'Premium version or upgrade',
        algorithm: 'up_sell',
        metadata: this.getProductMetadata(product),
      }));
    } catch (error) {
      throw new Error(`Failed to get up-sell recommendations: ${error}`);
    }
  }

  // Frequently bought together recommendations
  private async getFrequentlyBoughtTogetherRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      if (!request.productId) {
        return this.getTrendingRecommendations(request);
      }

      const frequentlyBought = await this.getFrequentlyBoughtTogether(request.productId);
      
      return frequentlyBought.map(product => ({
        productId: product.productId,
        name: product.productName,
        score: product.score,
        confidence: product.confidence,
        reason: 'Frequently bought together',
        algorithm: 'frequently_bought_together',
        metadata: this.getProductMetadata(product.product),
      }));
    } catch (error) {
      throw new Error(`Failed to get frequently bought together recommendations: ${error}`);
    }
  }

  // Hybrid recommendations
  private async getHybridRecommendations(request: RecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      const userId = request.userId;
      
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
        .slice(0, request.limit || 10);

      return sortedRecommendations.map(rec => ({
        ...rec,
        reason: this.getHybridReason(rec.sources),
      }));
    } catch (error) {
      throw new Error(`Failed to get hybrid recommendations: ${error}`);
    }
  }

  // Helper methods for score calculation
  private calculateCategoryScore(product: any, userProfile: UserProfile): number {
    const categoryIndex = userProfile.preferredCategories.indexOf(product.category);
    if (categoryIndex === -1) return 0.3;
    
    return 0.9 - (categoryIndex * 0.1);
  }

  private calculateBrandScore(product: any, userProfile: UserProfile): number {
    const brandIndex = userProfile.preferredBrands.indexOf(product.brand);
    if (brandIndex === -1) return 0.3;
    
    return 0.9 - (brandIndex * 0.1);
  }

  private calculatePriceScore(product: any, userProfile: UserProfile): number {
    const priceRange = userProfile.priceRange;
    if (!priceRange) return 0.5;
    
    if (product.price < priceRange.min) return 0.3;
    if (product.price > priceRange.max) return 0.3;
    
    return 0.8;
  }

  private calculateFeatureScore(product: any, userProfile: UserProfile): number {
    const matchingFeatures = product.features.filter((feature: string) => 
      userProfile.preferredFeatures.includes(feature)
    ).length;
    
    const totalFeatures = product.features.length || 1;
    return matchingFeatures / totalFeatures;
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
    
    if (product1.category === product2.category) reasons.push('same category');
    if (product1.brand === product2.brand) reasons.push('same brand');
    
    const commonTags = product1.tags.filter((tag: string) => 
      product2.tags.includes(tag)
    );
    if (commonTags.length > 0) reasons.push('similar features');
    
    return reasons.length > 0 
      ? `Similar ${reasons.join(', ')}`
      : 'Similar product';
  }

  private calculateUpSellScore(upgradeProduct: any, originalProduct: any): number {
    const priceRatio = upgradeProduct.price / originalProduct.price;
    const ratingDiff = upgradeProduct.averageRating - originalProduct.averageRating;
    
    // Higher price and better rating gets higher score for up-sell
    return Math.min(priceRatio / 2, 1) + Math.max(ratingDiff / 5, 0);
  }

  private getHybridReason(sources: string[]): string {
    if (sources.length === 1) {
      return `Recommended based on ${sources[0]}`;
    }
    
    return `Recommended based on ${sources.join(', ')}`;
  }

  // Helper methods for data retrieval
  private async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const orders = await Order.find({ user: userId })
        .populate('items.productId')
        .sort({ createdAt: -1 });

      const reviews = await Review.find({ user: userId })
        .populate('productId');

      return {
        userId,
        preferredCategories: this.getPreferredCategories(orders),
        preferredBrands: this.getPreferredBrands(orders),
        priceRange: this.getPriceRange(orders),
        preferredFeatures: this.getPreferredFeatures(reviews),
        averageRating: this.getAverageRating(reviews),
        lastActivity: user.lastSeen || new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error}`);
    }
  }

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

    if (prices.length === 0) return { min: 0, max: 1000 };
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  private getPreferredFeatures(reviews: any[]): string[] {
    const featureCount = new Map<string, number>();
    
    reviews.forEach(review => {
      const product = review.productId;
      if (product && product.features) {
        product.features.forEach((feature: string) => {
          featureCount.set(feature, (featureCount.get(feature) || 0) + 1);
        });
      }
    });

    return Array.from(featureCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([feature]) => feature);
  }

  private getAverageRating(reviews: any[]): number {
    if (reviews.length === 0) return 0;
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviews.length;
  }

  // Helper methods for product retrieval
  private async getProductsByCategories(categories: string[]): Promise<any[]> {
    return await Product.find({ category: { $in: categories }, quantity: { $gt: 0 } })
      .sort({ averageRating: -1, salesCount: -1 })
      .limit(20)
      .lean();
  }

  private async getProductsByBrands(brands: string[]): Promise<any[]> {
    return await Product.find({ brand: { $in: brands }, quantity: { $gt: 0 } })
      .sort({ averageRating: -1, salesCount: -1 })
      .limit(20)
      .lean();
  }

  private async getProductsByPriceRange(min: number, max: number): Promise<any[]> {
    return await Product.find({ 
      price: { $gte: min, $lte: max }, 
      quantity: { $gt: 0 } 
    })
      .sort({ averageRating: -1, salesCount: -1 })
      .limit(20)
      .lean();
  }

  private async getProductsByFeatures(features: string[]): Promise<any[]> {
    return await Product.find({ 
      features: { $in: features }, 
      quantity: { $gt: 0 } 
    })
      .sort({ averageRating: -1, salesCount: -1 })
      .limit(20)
      .lean();
  }

  // Helper methods for collaborative filtering
  private async findSimilarUsers(userId: string, userProducts: string[]): Promise<string[]> {
    // Simplified implementation - in real app, use proper similarity metrics
    const similarUsers = await Order.aggregate([
      { $match: { user: { $ne: userId } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$user',
          commonProducts: { $sum: 1 },
        },
      },
      { $match: { 'items.productId': { $in: userProducts } } },
      { $group: { _id: '$user', commonProducts: { $sum: 1 } } },
      { $sort: { commonProducts: -1 } },
      { $limit: 10 },
    ]);

    return similarUsers.map(u => u._id.toString());
  }

  private async getProductsFromSimilarUsers(similarUsers: string[], userProducts: Set<string>, limit: number): Promise<any[]> {
    const recommendations = await Order.aggregate([
      { $match: { user: { $in: similarUsers } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          count: { $sum: '$items.quantity' },
          users: { $addToSet: '$user' },
        },
      },
      { $match: { 'items.productId': { $nin: Array.from(userProducts) } } },
      {
        $group: {
          _id: '$items.productId',
          count: { $sum: '$items.quantity' },
          users: { $addToSet: '$user' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          productName: '$product.name',
          count: '$count',
          users: '$users',
          score: '$count / (Array.isArray('$users') ? '$users.length' : 1)',
        },
      },
    ]);

    return recommendations.map(rec => ({
      productId: rec.productId,
      productName: rec.productName,
      score: rec.score,
      product: rec.product,
      confidence: Math.min(rec.score / 5, 1),
    }));
  }

  // Helper methods for content-based filtering
  private extractUserFeatures(reviews: any[]): Map<string, number> {
    const features = new Map<string, number>();
    
    reviews.forEach(review => {
      const product = review.productId;
      if (product && product.features) {
        product.features.forEach((feature: string) => {
          features.set(feature, (features.get(feature) || 0) + 1);
        });
      }
    });

    return features;
  }

  private async findSimilarFeatureProducts(userFeatures: Map<string, number>, userId: string, limit: number): Promise<any[]> {
    const products = await Product.find({ quantity: { $gt: 0 } })
      .sort({ averageRating: -1, salesCount: -1 })
      .limit(limit)
      .lean();

    const scoredProducts = products.map(product => {
      let score = 0;
      
      // Category match
      if (userFeatures.has(product.category)) {
        score += userFeatures.get(product.category) * 0.3;
      }
      
      // Feature matches
      product.features.forEach((feature: string) => {
        if (userFeatures.has(feature)) {
          score += userFeatures.get(feature) * 0.1;
        }
      });
      
      return {
        productId: product._id.toString(),
        productName: product.name,
        score,
        product,
        confidence: Math.min(score / 10, 1),
      };
    });

    return scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Helper methods for cross-sell and up-sell
  private async getFrequentlyBoughtTogether(productId: string): Promise<any[]> {
    // In a real app, you'd analyze order data to find frequently bought together items
    // For now, return mock data
    return [
      {
        productId: '2',
        productName: 'Product 2',
        score: 0.8,
        confidence: 0.7,
        product: null,
      },
      {
        productId: '3',
        productName: 'Product 3',
        score: 0.6,
        confidence: 0.6,
        product: null,
      },
    ];
  }

  private async getFrequentlyBoughtTogether(productId: string): Promise<any[]> {
    // In a real app, you'd analyze order data to find frequently bought together items
    // For now, return mock data
    return [
      {
        productId: '2',
        productName: 'Product 2',
        score: 0.8,
        confidence: 0.7,
        product: null,
      },
      {
        productId: '3',
        productName: 'product 3',
        score: 0.6,
        confidence: 0.6,
        product: null,
      },
    ];
  }

  private async getCategoryBasedRecommendations(category: string, limit: number): Promise<any[]> {
    return await Product.find({ category, quantity: { $gt: 0 } })
      .sort({ averageRating: -1, salesCount: -1 })
      .limit(limit)
      .lean();
  }

  // Apply filters to recommendations
  private applyFilters(recommendations: ProductRecommendation[], filters?: any): ProductRecommendation[] {
    if (!filters) return recommendations;

    return recommendations.filter(rec => {
      // Price range filter
      if (filters.priceRange) {
        if (rec.metadata.price < filters.priceRange.min || rec.metadata.price > filters.priceRange.max) {
          return false;
        }
      }

      // Brand filter
      if (filters.brands && filters.brands.length > 0) {
        if (!filters.brands.includes(rec.metadata.brand)) {
          return false;
        }
      }

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(rec.metadata.category)) {
          return false;
        }
      }

      // Rating filter
      if (filters.rating && rec.metadata.rating < filters.rating) {
        return false;
      }

      // Stock filter
      if (filters.inStock !== undefined && rec.metadata.inStock !== filters.inStock) {
        return false;
      }

      // Prime filter
      if (filters.prime !== undefined && rec.metadata.prime !== filters.prime) {
        return false;
      }

      return true;
    });
  }

  // Calculate metadata
  private calculateMetadata(recommendations: ProductRecommendation[]): any {
    const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length;
    const avgScore = recommendations.reduce((sum, rec) => sum + rec.score, 0) / recommendations.length;
    
    // Diversity: measure how different the recommendations are
    const categories = new Set(recommendations.map(r => r.metadata.category));
    const diversity = categories.size / recommendations.length;
    
    // Freshness: measure how recently the products were added
    const avgAge = recommendations.reduce((sum, rec) => {
      const product = rec.metadata as any;
      const age = (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return sum + age;
    }, 0) / recommendations.length;
    const freshness = Math.max(0, 1 - avgAge / 30); // 30 days max age
    
    // Popularity: based on sales and ratings
    const avgPopularity = recommendations.reduce((sum, rec) => {
      const product = rec.metadata as any;
      const popularity = (product.salesCount || 0) / 1000 + (product.averageRating || 0) / 5;
      return sum + popularity;
    }, 0) / recommendations.length;

    return {
      confidence: avgConfidence,
      diversity,
      freshness,
      popularity: avgPopularity,
    };
  }

  // Get product metadata
  private getProductMetadata(product: any): any {
    return {
      price: product.price,
      rating: product.averageRating || 0,
      reviewCount: product.reviewCount || 0,
      category: product.category,
      brand: product.brand || '',
      inStock: product.quantity > 0,
      prime: product.prime || false,
      discount: product.originalPrice ? 
        ((product.originalPrice - product.price) / product.originalPrice) * 100 : undefined,
      features: product.features || [],
      tags: product.tags || [],
    };
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
        averageConfidence: 0.75,
        algorithmPerformance: {
          personalized: { usage: 400000, ctr: 0.18, conversion: 0.06, avgConfidence: 0.8 },
          trending: { usage: 300000, ctr: 0.12, conversion: 0.04, avgConfidence: 0.7 },
          collaborative: { usage: 200000, ctr: 0.16, conversion: 0.05, avgConfidence: 0.7 },
          content_based: { usage: 100000, ctr: 0.14, conversion: 0.04, avgConfidence: 0.75 },
        },
        userSegments: {
          new: { count: 50000, avgCTR: 0.12, avgConversion: 0.03 },
          regular: { count: 300000, avgCTR: 0.15, avgConversion: 0.05 },
          vip: { count: 50000, avgCTR: 0.20, avgConversion: 0.08 },
        },
        productPerformance: {
          '1': { recommendations: 1000, clicks: 150, conversions: 50, revenue: 5000 },
          '2': { recommendations: 800, clicks: 120, conversions: 40, revenue: 4000 },
          '3': { recommendations: 600, clicks: 90, conversions: 30, revenue: 3000 },
        },
        trends: [
          { date: '2024-01-01', recommendations: 1000, clicks: 150, conversions: 50, revenue: 5000 },
          { date: '2024-01-02', recommendations: 1200, clicks: 180, conversions: 60, revenue: 6000 },
          { date: '2024-01-03', recommendations: 1100, clicks: 165, conversions: 55, revenue: 5500 },
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

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// User profile interface
interface UserProfile {
  userId: string;
  preferredCategories: string[];
  preferredBrands: string[];
  priceRange: { min: number; max: number };
  preferredFeatures: string[];
  averageRating: number;
  lastActivity: Date;
}
