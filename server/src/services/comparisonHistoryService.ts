import { ComparisonHistory, IComparisonHistory } from '../model/comparisonHistory';
import { Product } from '../model/product';
import { User } from '../model/user';
import { EmailService } from './emailService';
import { randomBytes } from 'crypto';

export interface ComparisonHistoryRequest {
  userId: string;
  sessionId: string;
  products: Array<{
    productId: string;
    name: string;
    price: number;
    rating: number;
    category: string;
    images: string[];
    features: Record<string, any>;
  }>;
  title?: string;
  notes?: string;
  tags?: string[];
}

export interface ComparisonHistoryResponse {
  success: boolean;
  historyId?: string;
  message: string;
  shareUrl?: string;
  history?: IComparisonHistory;
}

export interface ComparisonHistoryStats {
  totalComparisons: number;
  activeComparisons: number;
  savedComparisons: totalComparisons;
  averageProductsPerComparison: number;
  popularCategories: Array<{
    category: string;
    count: number;
  }>;
  recentComparisons: Array<{
    historyId: string;
    title: string;
    productCount: number;
    createdAt: Date;
  }>;
}

export class ComparisonHistoryService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Save comparison to history
  async saveComparisonToHistory(request: ComparisonHistoryRequest): Promise<ComparisonHistoryResponse> {
    try {
      // Check if comparison already exists for this session
      const existingComparison = await ComparisonHistory.findOne({
        userId: request.userId,
        sessionId: request.sessionId,
        status: { $in: ['active', 'saved'] },
      });

      let comparison: IComparisonHistory;

      if (existingComparison) {
        // Update existing comparison
        comparison = existingComparison;
        comparison.products = request.products;
        comparison.updatedAt = new Date();
        comparison.status = 'saved';
      } else {
        // Create new comparison history
        comparison = new ComparisonHistory({
          userId: request.userId,
          sessionId: request.sessionId,
          products: request.products,
          comparisonDate: new Date(),
          status: 'saved',
          title: request.title,
          notes: request.notes,
          tags: request.tags || [],
        });
      }

      await comparison.save();

      return {
        success: true,
        historyId: comparison._id.toString(),
        message: 'Comparison saved to history',
        history: comparison,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to save comparison to history: ${error}`,
      };
    }
  }

  // Get user's comparison history
  async getUserComparisonHistory(
    userId: string,
    status?: 'active' | 'saved' | 'deleted',
    page: number = 1,
    limit: number = 20
  ): Promise<{ history: IComparisonHistory[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let filter: any = { userId };

      if (status) {
        filter.status = status;
      }

      const history = await ComparisonHistory.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ComparisonHistory.countDocuments(filter);

      return { history, total };
    } catch (error) {
      throw new Error(`Failed to get comparison history: ${error}`);
    }
  }

  // Get comparison by ID
  async getComparisonById(historyId: string, userId?: string): Promise<IComparisonHistory | null> {
    try {
      let filter: any = { _id: historyId };

      // If userId provided, check access permissions
      if (userId) {
        filter = {
          $or: [
            { userId: userId },
            { isPublic: true },
          ],
        };
      }

      const comparison = await ComparisonHistory.findOne(filter)
        .populate('products.productId', 'name images price rating category');

      return comparison;
    } catch (error) {
      throw new Error(`Failed to get comparison by ID: ${error}`);
    }
  }

  // Share comparison
  async shareComparison(
    historyId: string,
    userId: string,
    isPublic: boolean = false
  ): Promise<ComparisonHistoryResponse> {
    try {
      const comparison = await ComparisonHistory.findOne({ _id: historyId, userId: userId });
      
      if (!comparison) {
        return {
          success: false,
          message: 'Comparison not found',
        };
      }

      // Generate share token if not exists
      if (!comparison.shareToken) {
        comparison.shareToken = this.generateShareToken();
      }

      comparison.isPublic = isPublic;
      await comparison.save();

      const shareUrl = `https://yourapp.com/comparison/${comparison.shareToken}`;

      return {
        success: true,
        historyId: comparison._id.toString(),
        message: 'Comparison shared successfully',
        shareUrl,
        history: comparison,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to share comparison: ${error}`,
      };
    }
  }

  // Get comparison by share token
  async getComparisonByShareToken(shareToken: string): Promise<IComparisonHistory | null> {
    try {
      const comparison = await ComparisonHistory.findOne({ 
        shareToken, 
        isPublic: true 
      })
        .populate('products.productId', 'name images price rating category');

      if (comparison) {
        // Increment view count
        comparison.viewCount += 1;
        await comparison.save();
      }

      return comparison;
    } catch (error) {
      throw new Error(`Failed to get comparison by share token: ${error}`);
    }
  }

  // Update comparison
  async updateComparison(
    historyId: string,
    userId: string,
    updates: Partial<Pick<IComparisonHistory, 'title' | 'notes' | 'tags' | 'isPublic'>>
  ): Promise<ComparisonHistoryResponse> {
    try {
      const comparison = await ComparisonHistory.findOne({ _id: historyId, userId: userId });
      
      if (!comparison) {
        return {
          success: false,
          message: 'Comparison not found',
        };
      }

      Object.assign(comparison, updates);
      await comparison.save();

      return {
        success: true,
        message: 'Comparison updated successfully',
        history: comparison,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update comparison: ${error}`,
      };
    }
  }

  // Delete comparison
  async deleteComparison(historyId: string, userId: string): Promise<ComparisonHistoryResponse> {
    try {
      const comparison = await ComparisonHistory.findOne({ _id: historyId, userId: userId });
      
      if (!comparison) {
        return {
          success: false,
          message: 'Comparison not found',
        };
      }

      comparison.status = 'deleted';
      await comparison.save();

      return {
        success: true,
        message: 'Comparison deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete comparison: ${error}`,
      };
    }
  }

  // Get comparison statistics
  async getComparisonStats(userId?: string): Promise<ComparisonHistoryStats> {
    try {
      let filter: any = {};
      
      if (userId) {
        filter.userId = userId;
      }

      const totalComparisons = await ComparisonHistory.countDocuments(filter);
      const activeComparisons = await ComparisonHistory.countDocuments({
        ...filter,
        status: 'active',
      });
      const savedComparisons = await ComparisonHistory.countDocuments({
        ...filter,
        status: 'saved',
      });

      // Calculate average products per comparison
      const allComparisons = await ComparisonHistory.find(filter);
      const totalProducts = allComparisons.reduce((sum, comparison) => sum + comparison.products.length, 0);
      const averageProductsPerComparison = totalComparisons > 0 ? totalProducts / totalComparisons : 0;

      // Get popular categories
      const categoryStats = await ComparisonHistory.aggregate([
        { $unwind: '$products' },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      const popularCategories = categoryStats.map(stat => ({
        category: stat._id,
        count: stat.count,
      }));

      // Get recent comparisons
      const recentComparisons = await ComparisonHistory.find(filter)
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title products.length createdAt updatedAt');

      return {
        totalComparisons,
        activeComparisons,
        savedComparisons,
        averageProductsPerComparison: Math.round(averageProductsPerComparison * 10) / 10,
        popularCategories,
        recentComparisons: recentComparisons.map(comp => ({
          historyId: comp._id.toString(),
          title: comp.title || 'Untitled Comparison',
          productCount: comp.products.length,
          createdAt: comp.createdAt,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get comparison stats: ${error}`);
    }
  }

  // Search comparisons
  async searchComparisons(
    query: string,
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ comparisons: IComparisonHistory[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');

      let filter: any = {
        $or: [
          { title: searchRegex },
          { notes: searchRegex },
          { tags: searchRegex },
        ],
      };

      if (userId) {
        filter.$and = [
          { userId },
          { $or: [{ userId: userId }, { isPublic: true }] },
        ];
      }

      const comparisons = await ComparisonHistory.find(filter)
        .populate('products.productId', 'name images price rating category')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ComparisonHistory.countDocuments(filter);

      return { comparisons, total };
    } catch (error) {
      throw new Error(`Failed to search comparisons: ${error}`);
    }
  }

  // Get comparison insights
  async getComparisonInsights(historyId: string): Promise<any> {
    try {
      const comparison = await ComparisonHistory.findById(historyId)
        .populate('products.productId', 'name price rating category features');

      if (!comparison) {
        throw new Error('Comparison not found');
      }

      // Analyze products
      const products = comparison.products;
      const priceRange = {
        min: Math.min(...products.map(p => p.price)),
        max: Math.max(...products.map(p => p.price)),
      };
      const averagePrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
      const averageRating = products.reduce((sum, p) => sum + p.rating, 0) / products.length;

      const categories = [...new Set(products.map(p => p.category))];
      const priceDistribution = this.analyzePriceDistribution(products);

      const insights = {
        summary: {
          totalProducts: products.length,
          priceRange,
          averagePrice: Math.round(averagePrice * 100) / 100,
          averageRating: Math.round(averageRating * 10) / 10,
          categories,
        },
        recommendations: this.generateRecommendations(products),
        priceAnalysis: priceDistribution,
        ratingAnalysis: this.analyzeRatingDistribution(products),
        categoryAnalysis: this.analyzeCategoryDistribution(categories),
      };

      return insights;
    } catch (error) {
      throw new Error(`Failed to get comparison insights: ${error}`);
    }
  }

  // Generate recommendations based on comparison
  private generateRecommendations(products: any[]): any[] {
    const recommendations = [];

    // Find the best value product
    const bestValue = products.reduce((best, product) => {
      const valueScore = (product.rating / 5) * (1 - (product.price / Math.max(...products.map(p => p.price)));
      return valueScore > best.valueScore ? product : best;
    });

    recommendations.push({
      type: 'best_value',
      title: 'Best Value',
      product: bestValue,
      reason: `Highest rating-to-price ratio`,
    });

    // Find the highest rated product
    const highestRated = products.reduce((highest, product) => 
      product.rating > highest.rating ? product : highest
    );

    recommendations.push({
      type: 'highest_rated',
      title: 'Highest Rated',
      product: highestRated,
      reason: `Top rated with ${highestRated.rating} stars`,
    });

    // Find the cheapest product
    const cheapest = products.reduce((cheapest, product) => 
      product.price < cheapest.price ? product : cheapest
    );

    recommendations.push({
      type: 'cheapest',
      title: 'Most Affordable',
      product: cheapest,
      reason: `Lowest price at $${cheapest.price}`,
    });

    return recommendations;
  }

  // Analyze price distribution
  private analyzePriceDistribution(products: any[]): any {
    const prices = products.map(p => p.price);
    const sortedPrices = prices.sort((a, b) => a - b);
    
    const quartiles = [
      sortedPrices[Math.floor(sortedPrices.length * 0.25)],
      sortedPrices[Math.floor(sortedPrices.length * 0.5)],
      sortedPrices[Math.floor(sortedPrices.length * 0.75)],
    ];

    return {
      min: sortedPrices[0],
      q1: quartiles[0],
      median: quartiles[1],
      q3: quartiles[2],
      max: sortedPrices[sortedPrices.length - 1],
      iqr: quartiles[2] - quartiles[0],
    };
  }

  // Analyze rating distribution
  private analyzeRatingDistribution(products: any[]): any {
    const ratings = products.map(p => p.rating);
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    ratings.forEach(rating => {
      ratingCounts[Math.floor(rating)]++;
    });

    return ratingCounts;
  }

  // Analyze category distribution
  private analyzeCategoryDistribution(categories: string[]): any {
    const categoryCounts: Record<string, number> = {};
    
    categories.forEach(category => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return categoryCounts;
  }

  // Clean up old comparisons
  async cleanupOldComparisons(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await ComparisonHistory.deleteMany({
        status: 'deleted',
        updatedAt: { $lt: thirtyDaysAgo },
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error('Failed to cleanup old comparisons:', error);
      return 0;
    }
  }

  // Generate share token
  private generateShareToken(): string {
    return randomBytes(16).toString('hex');
  }

  // Export comparison to CSV
  async exportComparisonToCSV(historyId: string): Promise<string> {
    try {
      const comparison = await ComparisonHistory.findById(historyId)
        .populate('products.productId', 'name price rating category');

      if (!comparison) {
        throw new Error('Comparison not found');
      }

      let csv = 'Product Name,Price,Rating,Category,Added Date\n';
      
      for (const product of comparison.products) {
        csv += `"${product.name}",${product.price},${product.rating},${product.category},${product.addedAt.toISOString()}\n`;
      }

      return csv;
    } catch (error) {
      throw new Error(`Failed to export comparison to CSV: ${error}`);
    }
  }

  // Get trending comparisons
  async getTrendingComparisons(limit: number = 10): Promise<IComparisonHistory[]> {
    try {
      const comparisons = await ComparisonHistory.find({ isPublic: true })
        .sort({ viewCount: -1, updatedAt: -1 })
        .limit(limit)
        .populate('products.productId', 'name images');

      return comparisons;
    } catch (error) {
      throw new Error(`Failed to get trending comparisons: ${error}`);
    }
  }
}
