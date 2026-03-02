import { User } from '../model/user';
import { Product } from '../model/product';

export interface RecommendationResult {
  products: Array<{
    productId: string;
    score: number;
    reason: string;
  }>;
  algorithm: string;
  timestamp: Date;
}

export interface UserBehavior {
  userId: string;
  viewedProducts: string[];
  purchasedProducts: string[];
  cartProducts: string[];
  wishlistProducts: string[];
  searchHistory: string[];
  categories: string[];
  priceRange: {
    min: number;
    max: number;
  };
  lastActivity: Date;
}

export class RecommendationService {
  private userBehaviors: Map<string, UserBehavior> = new Map();
  private productSimilarityCache: Map<string, Map<string, number>> = new Map();

  // Get personalized recommendations for a user
  async getRecommendations(userId: string, limit: number = 10): Promise<RecommendationResult> {
    try {
      const userBehavior = await this.getUserBehavior(userId);
      
      // Use multiple algorithms and combine results
      const collaborativeResults = await this.collaborativeFiltering(userId, userBehavior);
      const contentBasedResults = await this.contentBasedFiltering(userBehavior);
      const popularityResults = await this.popularityBasedFiltering(userBehavior);
      
      // Combine and rank recommendations
      const combinedResults = this.combineRecommendations([
        { results: collaborativeResults, weight: 0.4 },
        { results: contentBasedResults, weight: 0.4 },
        { results: popularityResults, weight: 0.2 },
      ]);

      return {
        products: combinedResults.slice(0, limit),
        algorithm: 'hybrid',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get recommendations: ${error}`);
    }
  }

  // Collaborative filtering based on similar users
  private async collaborativeFiltering(
    userId: string, 
    userBehavior: UserBehavior
  ): Promise<Array<{ productId: string; score: number; reason: string }>> {
    const similarUsers = await this.findSimilarUsers(userId, userBehavior);
    const recommendations = new Map<string, { score: number; count: number }>();

    for (const similarUser of similarUsers) {
      const similarBehavior = this.userBehaviors.get(similarUser.userId);
      if (!similarBehavior) continue;

      // Recommend products that similar users liked but current user hasn't seen
      for (const productId of similarBehavior.purchasedProducts) {
        if (!userBehavior.viewedProducts.includes(productId) && 
            !userBehavior.purchasedProducts.includes(productId)) {
          
          const currentScore = recommendations.get(productId);
          const similarity = similarUser.similarity;
          
          if (currentScore) {
            currentScore.score += similarity;
            currentScore.count += 1;
          } else {
            recommendations.set(productId, { score: similarity, count: 1 });
          }
        }
      }
    }

    // Average scores and convert to array
    return Array.from(recommendations.entries())
      .map(([productId, data]) => ({
        productId,
        score: data.score / data.count,
        reason: 'Users like you also bought this',
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Content-based filtering based on product features
  private async contentBasedFiltering(
    userBehavior: UserBehavior
  ): Promise<Array<{ productId: string; score: number; reason: string }>> {
    const recommendations = new Map<string, number>();

    // Analyze user's preferred categories and price range
    const categoryScores = this.calculateCategoryPreferences(userBehavior);
    const pricePreference = userBehavior.priceRange;

    // Get all products and calculate similarity scores
    const allProducts = await Product.find({});
    
    for (const product of allProducts) {
      // Skip if user already interacted with this product
      if (userBehavior.viewedProducts.includes(product._id.toString()) ||
          userBehavior.purchasedProducts.includes(product._id.toString())) {
        continue;
      }

      let score = 0;
      let reasons: string[] = [];

      // Category similarity
      const categoryScore = categoryScores.get(product.category) || 0;
      score += categoryScore * 0.4;
      if (categoryScore > 0.5) {
        reasons.push('Similar to your preferred categories');
      }

      // Price range preference
      const priceScore = this.calculatePriceSimilarity(product.price, pricePreference);
      score += priceScore * 0.3;
      if (priceScore > 0.5) {
        reasons.push('Within your preferred price range');
      }

      // Content similarity to previously viewed products
      const contentScore = await this.calculateContentSimilarity(
        product._id.toString(),
        userBehavior.viewedProducts
      );
      score += contentScore * 0.3;
      if (contentScore > 0.5) {
        reasons.push('Similar to items you viewed');
      }

      if (score > 0.1) {
        recommendations.set(product._id.toString(), score);
      }
    }

    return Array.from(recommendations.entries())
      .map(([productId, score]) => ({
        productId,
        score,
        reason: 'Based on your browsing history',
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Popularity-based filtering
  private async popularityBasedFiltering(
    userBehavior: UserBehavior
  ): Promise<Array<{ productId: string; score: number; reason: string }>> {
    const allProducts = await Product.find({})
      .sort({ ratings: -1, quantity: -1 })
      .limit(50);

    return allProducts
      .filter(product => 
        !userBehavior.viewedProducts.includes(product._id.toString()) &&
        !userBehavior.purchasedProducts.includes(product._id.toString())
      )
      .map((product, index) => ({
        productId: product._id.toString(),
        score: 1 - (index / 50), // Decreasing score based on popularity rank
        reason: 'Trending product',
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Find users with similar behavior patterns
  private async findSimilarUsers(
    userId: string, 
    userBehavior: UserBehavior
  ): Promise<Array<{ userId: string; similarity: number }>> {
    const similarities: Array<{ userId: string; similarity: number }> = [];

    for (const [otherUserId, otherBehavior] of this.userBehaviors.entries()) {
      if (otherUserId === userId) continue;

      const similarity = this.calculateUserSimilarity(userBehavior, otherBehavior);
      if (similarity > 0.1) { // Only consider users with some similarity
        similarities.push({ userId: otherUserId, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20); // Top 20 similar users
  }

  // Calculate similarity between two users
  private calculateUserSimilarity(user1: UserBehavior, user2: UserBehavior): number {
    let similarity = 0;
    let factors = 0;

    // Category overlap
    const categoryOverlap = this.calculateOverlap(user1.categories, user2.categories);
    similarity += categoryOverlap * 0.3;
    factors += 0.3;

    // Product overlap
    const productOverlap = this.calculateOverlap(
      user1.purchasedProducts, 
      user2.purchasedProducts
    );
    similarity += productOverlap * 0.4;
    factors += 0.4;

    // Price range similarity
    const priceSimilarity = this.calculatePriceRangeSimilarity(
      user1.priceRange, 
      user2.priceRange
    );
    similarity += priceSimilarity * 0.3;
    factors += 0.3;

    return factors > 0 ? similarity / factors : 0;
  }

  // Calculate overlap between two arrays
  private calculateOverlap(array1: string[], array2: string[]): number {
    if (array1.length === 0 || array2.length === 0) return 0;
    
    const set1 = new Set(array1);
    const set2 = new Set(array2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    return intersection.size / Math.max(set1.size, set2.size);
  }

  // Calculate price range similarity
  private calculatePriceRangeSimilarity(range1: { min: number; max: number }, range2: { min: number; max: number }): number {
    const overlap = Math.min(range1.max, range2.max) - Math.max(range1.min, range2.min);
    const union = Math.max(range1.max, range2.max) - Math.min(range1.min, range2.min);
    
    return union > 0 ? overlap / union : 0;
  }

  // Calculate category preferences
  private calculateCategoryPreferences(userBehavior: UserBehavior): Map<string, number> {
    const categoryScores = new Map<string, number>();
    const totalInteractions = userBehavior.viewedProducts.length + 
                             userBehavior.purchasedProducts.length + 
                             userBehavior.cartProducts.length;

    if (totalInteractions === 0) return categoryScores;

    // Count interactions per category
    const categoryCounts = new Map<string, number>();
    
    for (const productId of userBehavior.viewedProducts) {
      const category = this.getProductCategory(productId);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }
    
    for (const productId of userBehavior.purchasedProducts) {
      const category = this.getProductCategory(productId);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 2); // Weight purchases higher
    }
    
    for (const productId of userBehavior.cartProducts) {
      const category = this.getProductCategory(productId);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1.5); // Weight cart items higher
    }

    // Normalize scores
    for (const [category, count] of categoryCounts.entries()) {
      categoryScores.set(category, count / totalInteractions);
    }

    return categoryScores;
  }

  // Calculate price similarity
  private calculatePriceSimilarity(price: number, priceRange: { min: number; max: number }): number {
    if (price >= priceRange.min && price <= priceRange.max) {
      return 1.0;
    }
    
    const distance = Math.min(
      Math.abs(price - priceRange.min),
      Math.abs(price - priceRange.max)
    );
    
    const range = priceRange.max - priceRange.min;
    return range > 0 ? Math.max(0, 1 - (distance / range)) : 0;
  }

  // Calculate content similarity between products
  private async calculateContentSimilarity(productId: string, viewedProducts: string[]): Promise<number> {
    if (viewedProducts.length === 0) return 0;

    let totalSimilarity = 0;
    let count = 0;

    for (const viewedProductId of viewedProducts) {
      const similarity = await this.getProductSimilarity(productId, viewedProductId);
      totalSimilarity += similarity;
      count++;
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  // Get similarity between two products (with caching)
  private async getProductSimilarity(productId1: string, productId2: string): Promise<number> {
    // Check cache
    if (this.productSimilarityCache.has(productId1)) {
      const cached = this.productSimilarityCache.get(productId1)!;
      if (cached.has(productId2)) {
        return cached.get(productId2)!;
      }
    }

    // Calculate similarity (simplified - in real app would use more sophisticated features)
    const product1 = await Product.findById(productId1);
    const product2 = await Product.findById(productId2);

    if (!product1 || !product2) return 0;

    let similarity = 0;

    // Category similarity
    if (product1.category === product2.category) {
      similarity += 0.4;
    }

    // Price similarity
    const priceDiff = Math.abs(product1.price - product2.price);
    const avgPrice = (product1.price + product2.price) / 2;
    const priceSimilarity = avgPrice > 0 ? 1 - (priceDiff / avgPrice) : 0;
    similarity += priceSimilarity * 0.3;

    // Rating similarity
    const ratingDiff = Math.abs((product1.ratings || 0) - (product2.ratings || 0));
    const ratingSimilarity = Math.max(0, 1 - (ratingDiff / 5));
    similarity += ratingSimilarity * 0.3;

    // Cache the result
    if (!this.productSimilarityCache.has(productId1)) {
      this.productSimilarityCache.set(productId1, new Map());
    }
    this.productSimilarityCache.get(productId1)!.set(productId2, similarity);

    return similarity;
  }

  // Combine recommendations from multiple algorithms
  private combineRecommendations(
    weightedResults: Array<{ results: Array<{ productId: string; score: number; reason: string }>; weight: number }>
  ): Array<{ productId: string; score: number; reason: string }> {
    const combined = new Map<string, { score: number; reasons: Set<string> }>();

    for (const { results, weight } of weightedResults) {
      for (const result of results) {
        const existing = combined.get(result.productId);
        const weightedScore = result.score * weight;

        if (existing) {
          existing.score += weightedScore;
          existing.reasons.add(result.reason);
        } else {
          combined.set(result.productId, {
            score: weightedScore,
            reasons: new Set([result.reason]),
          });
        }
      }
    }

    return Array.from(combined.entries())
      .map(([productId, data]) => ({
        productId,
        score: data.score,
        reason: Array.from(data.reasons).join(', '),
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Update user behavior
  async updateUserBehavior(
    userId: string, 
    action: 'view' | 'purchase' | 'cart' | 'wishlist' | 'search',
    data: any
  ): Promise<void> {
    let behavior = this.userBehaviors.get(userId);
    
    if (!behavior) {
      behavior = {
        userId,
        viewedProducts: [],
        purchasedProducts: [],
        cartProducts: [],
        wishlistProducts: [],
        searchHistory: [],
        categories: [],
        priceRange: { min: 0, max: 1000 },
        lastActivity: new Date(),
      };
      this.userBehaviors.set(userId, behavior);
    }

    switch (action) {
      case 'view':
        if (!behavior.viewedProducts.includes(data.productId)) {
          behavior.viewedProducts.push(data.productId);
        }
        break;
      case 'purchase':
        if (!behavior.purchasedProducts.includes(data.productId)) {
          behavior.purchasedProducts.push(data.productId);
        }
        break;
      case 'cart':
        if (!behavior.cartProducts.includes(data.productId)) {
          behavior.cartProducts.push(data.productId);
        }
        break;
      case 'wishlist':
        if (!behavior.wishlistProducts.includes(data.productId)) {
          behavior.wishlistProducts.push(data.productId);
        }
        break;
      case 'search':
        behavior.searchHistory.push(data.query);
        break;
    }

    behavior.lastActivity = new Date();
    await this.updateUserPreferences(behavior);
  }

  // Update user preferences based on behavior
  private async updateUserPreferences(behavior: UserBehavior): Promise<void> {
    // Update categories
    const allProducts = await Product.find({
      _id: { $in: [...behavior.viewedProducts, ...behavior.purchasedProducts] }
    });

    const categories = new Set(allProducts.map(p => p.category));
    behavior.categories = Array.from(categories);

    // Update price range
    const prices = allProducts.map(p => p.price);
    if (prices.length > 0) {
      behavior.priceRange = {
        min: Math.min(...prices) * 0.8,
        max: Math.max(...prices) * 1.2,
      };
    }
  }

  // Helper methods
  private getProductCategory(productId: string): string {
    // In a real app, this would fetch from database
    return 'electronics'; // Simplified
  }

  private async getUserBehavior(userId: string): Promise<UserBehavior> {
    let behavior = this.userBehaviors.get(userId);
    
    if (!behavior) {
      // Load from database in real app
      behavior = {
        userId,
        viewedProducts: [],
        purchasedProducts: [],
        cartProducts: [],
        wishlistProducts: [],
        searchHistory: [],
        categories: [],
        priceRange: { min: 0, max: 1000 },
        lastActivity: new Date(),
      };
      this.userBehaviors.set(userId, behavior);
    }

    return behavior;
  }

  // Get recommendation statistics
  async getRecommendationStats(userId: string): Promise<any> {
    const behavior = await this.getUserBehavior(userId);
    const recommendations = await this.getRecommendations(userId, 5);

    return {
      totalInteractions: behavior.viewedProducts.length + 
                        behavior.purchasedProducts.length + 
                        behavior.cartProducts.length,
      preferredCategories: behavior.categories,
      priceRange: behavior.priceRange,
      recentRecommendations: recommendations.products,
      algorithm: recommendations.algorithm,
    };
  }
}
