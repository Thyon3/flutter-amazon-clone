import { Product } from '../model/product';
import { User } from '../model/user';
import { Review } from '../model/review';

export interface ComparisonRequest {
  userId?: string;
  sessionId?: string;
  productIds: string[];
  name?: string;
  description?: string;
  isPublic: boolean;
  shareToken?: string;
}

export interface ComparisonResponse {
  success: boolean;
  message: string;
  comparison?: ComparisonInfo;
  shareUrl?: string;
}

export interface ComparisonInfo {
  id: string;
  userId?: string;
  sessionId?: string;
  name?: string;
  description?: string;
  productIds: string[];
  products: ProductComparison[];
  categories: ComparisonCategory[];
  specifications: ComparisonSpecification[];
  prices: ComparisonPrice[];
  ratings: ComparisonRating[];
  availability: ComparisonAvailability[];
  features: ComparisonFeature[];
  summary: ComparisonSummary;
  isPublic: boolean;
  shareToken?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductComparison {
  productId: string;
  name: string;
  images: string[];
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  quantity: number;
  brand: string;
  category: string;
  specifications: Record<string, any>;
  features: string[];
  pros: string[];
  cons: string[];
  score: number;
}

export interface ComparisonCategory {
  name: string;
  products: Array<{
    productId: string;
    productName: string;
    value: any;
    score: number;
  }>;
}

export interface ComparisonSpecification {
  name: string;
  unit?: string;
  products: Array<{
    productId: string;
    productName: string;
    value: any;
    better?: boolean;
  }>;
}

export interface ComparisonPrice {
  productId: string;
  productName: string;
  currentPrice: number;
  originalPrice?: number;
  discount?: number;
  discountPercentage?: number;
  pricePerUnit?: string;
  bestPrice: boolean;
}

export interface ComparisonRating {
  productId: string;
  productName: string;
  rating: number;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
  bestRating: boolean;
}

export interface ComparisonAvailability {
  productId: string;
  productName: string;
  inStock: boolean;
  quantity: number;
  shippingTime: string;
  bestAvailability: boolean;
}

export interface ComparisonFeature {
  name: string;
  products: Array<{
    productId: string;
    productName: string;
    has: boolean;
    value?: any;
  }>;
}

export interface ComparisonSummary {
  bestOverall: string;
  bestPrice: string;
  bestRating: string;
  bestFeatures: string;
  mostPopular: string;
  bestValue: string;
  recommendations: string[];
}

export class ProductComparisonService {
  // Create comparison
  async createComparison(request: ComparisonRequest): Promise<ComparisonResponse> {
    try {
      // Validate request
      const validation = this.validateComparisonRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Get product details
      const products = await this.getProductDetails(request.productIds);
      if (products.length < 2) {
        return {
          success: false,
          message: 'At least 2 products are required for comparison',
        };
      }

      // Create comparison
      const comparison: ComparisonInfo = {
        id: this.generateId(),
        userId: request.userId,
        sessionId: request.sessionId,
        name: request.name,
        description: request.description,
        productIds: request.productIds,
        products: await this.compareProducts(products),
        categories: await this.compareByCategories(products),
        specifications: await this.compareSpecifications(products),
        prices: await this.comparePrices(products),
        ratings: await this.compareRatings(products),
        availability: await this.compareAvailability(products),
        features: await this.compareFeatures(products),
        summary: await this.generateSummary(products),
        isPublic: request.isPublic,
        shareToken: request.isPublic ? this.generateShareToken() : undefined,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        message: 'Comparison created successfully',
        comparison,
        shareUrl: comparison.shareToken ? `/compare/${comparison.shareToken}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create comparison: ${error}`,
      };
    }
  }

  // Get product details for comparison
  private async getProductDetails(productIds: string[]): Promise<Product[]> {
    try {
      const products = await Product.find({ _id: { $in: productIds } })
        .select('name images price originalPrice brand category quantity specifications features averageRating reviewCount')
        .lean();

      return products;
    } catch (error) {
      throw new Error(`Failed to get product details: ${error}`);
    }
  }

  // Compare products
  private async compareProducts(products: Product[]): Promise<ProductComparison[]> {
    try {
      return products.map(product => ({
        productId: product._id.toString(),
        name: product.name,
        images: product.images || [],
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.originalPrice ? 
          Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : undefined,
        rating: product.averageRating || 0,
        reviewCount: product.reviewCount || 0,
        inStock: product.quantity > 0,
        quantity: product.quantity,
        brand: product.brand || '',
        category: product.category || '',
        specifications: product.specifications || {},
        features: product.features || [],
        pros: this.generatePros(product),
        cons: this.generateCons(product),
        score: this.calculateProductScore(product),
      }));
    } catch (error) {
      throw new Error(`Failed to compare products: ${error}`);
    }
  }

  // Compare by categories
  private async compareByCategories(products: Product[]): Promise<ComparisonCategory[]> {
    try {
      const categories = [...new Set(products.map(p => p.category))];
      
      return categories.map(category => {
        const categoryProducts = products.filter(p => p.category === category);
        
        return {
          name: category,
          products: categoryProducts.map(product => ({
            productId: product._id.toString(),
            productName: product.name,
            value: product.price,
            score: this.calculateProductScore(product),
          })),
        };
      });
    } catch (error) {
      throw new Error(`Failed to compare by categories: ${error}`);
    }
  }

  // Compare specifications
  private async compareSpecifications(products: Product[]): Promise<ComparisonSpecification[]> {
    try {
      // Get all specification keys
      const allSpecs = new Set<string>();
      products.forEach(product => {
        if (product.specifications) {
          Object.keys(product.specifications).forEach(key => allSpecs.add(key));
        }
      });

      const specifications: ComparisonSpecification[] = [];

      for (const specName of allSpecs) {
        const specProducts: any[] = [];
        
        products.forEach(product => {
          const value = product.specifications?.[specName];
          if (value !== undefined) {
            specProducts.push({
              productId: product._id.toString(),
              productName: product.name,
              value,
            });
          }
        });

        // Determine which product has the best value for this spec
        let bestValue: any;
        let betterProduct: string | undefined;
        
        if (specProducts.length > 0) {
          // Simple comparison logic (can be enhanced based on spec type)
          bestValue = this.getBestSpecValue(specProducts.map(p => p.value), specName);
          betterProduct = specProducts.find(p => p.value === bestValue)?.productId;
        }

        specifications.push({
          name: specName,
          products: specProducts.map(p => ({
            ...p,
            better: p.productId === betterProduct,
          })),
        });
      }

      return specifications;
    } catch (error) {
      throw new Error(`Failed to compare specifications: ${error}`);
    }
  }

  // Get best specification value
  private getBestSpecValue(values: any[], specName: string): any {
    try {
      // Determine best value based on spec type
      const numericValues = values.filter(v => typeof v === 'number');
      
      if (numericValues.length > 0) {
        // For numeric specs, highest value is usually best
        return Math.max(...numericValues);
      }

      // For string specs, use simple heuristics
      if (specName.toLowerCase().includes('storage') || specName.toLowerCase().includes('memory')) {
        // For storage/memory, highest numeric value is best
        const numbers = values.map(v => parseFloat(v.replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n));
        return numbers.length > 0 ? Math.max(...numbers) : values[0];
      }

      if (specName.toLowerCase().includes('weight')) {
        // For weight, lowest numeric value is usually best
        const numbers = values.map(v => parseFloat(v.replace(/[^0-9.]/g, ''))).filter(n => !isNaN(n));
        return numbers.length > 0 ? Math.min(...numbers) : values[0];
      }

      // For boolean specs, true is usually better than false
      const trueValues = values.filter(v => v === true || v === 'yes');
      if (trueValues.length > 0) return true;

      // For other specs, return the first value
      return values[0];
    } catch (error) {
      return values[0];
    }
  }

  // Compare prices
  private async comparePrices(products: Product[]): Promise<ComparisonPrice[]> {
    try {
      const prices = products.map(product => ({
        productId: product._id.toString(),
        productName: product.name,
        currentPrice: product.price,
        originalPrice: product.originalPrice,
        discount: product.originalPrice ? 
          Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : undefined,
        discountPercentage: product.originalPrice ? 
          Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : undefined,
        pricePerUnit: this.calculatePricePerUnit(product),
        bestPrice: false,
      }));

      // Mark best price
      const minPrice = Math.min(...prices.map(p => p.currentPrice));
      prices.forEach(price => {
        price.bestPrice = price.currentPrice === minPrice;
      });

      return prices;
    } catch (error) {
      throw new Error(`Failed to compare prices: ${error}`);
    }
  }

  // Calculate price per unit
  private calculatePricePerUnit(product: Product): string {
    try {
      // Try to extract unit information from specifications
      const unitSpec = product.specifications?.unit || product.specifications?.package_size;
      
      if (unitSpec && typeof unitSpec === 'object') {
        const quantity = unitSpec.quantity || unitSpec.count || 1;
        const unit = unitSpec.unit || 'unit';
        return `$${(product.price / quantity).toFixed(2)} per ${unit}`;
      }

      return `$${product.price.toFixed(2)}`;
    } catch (error) {
      return `$${product.price.toFixed(2)}`;
    }
  }

  // Compare ratings
  private async compareRatings(products: Product[]): Promise<ComparisonRating[]> {
    try {
      const ratings = products.map(product => ({
        productId: product._id.toString(),
        productName: product.name,
        rating: product.averageRating || 0,
        reviewCount: product.reviewCount || 0,
        ratingDistribution: await this.getRatingDistribution(product._id.toString()),
        bestRating: false,
      }));

      // Mark best rating
      const maxRating = Math.max(...ratings.map(r => r.rating));
      ratings.forEach(rating => {
        rating.bestRating = rating.rating === maxRating;
      });

      return ratings;
    } catch (error) {
      throw new Error(`Failed to compare ratings: ${error}`);
    }
  }

  // Get rating distribution
  private async getRatingDistribution(productId: string): Promise<Record<number, number>> {
    try {
      const reviews = await Review.find({ product: productId });
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
          distribution[review.rating]++;
        }
      });

      return distribution;
    } catch (error) {
      throw new Error(`Failed to get rating distribution: ${error}`);
    }
  }

  // Compare availability
  private async compareAvailability(products: Product[]): Promise<ComparisonAvailability[]> {
    try {
      const availability = products.map(product => ({
        productId: product._id.toString(),
        productName: product.name,
        inStock: product.quantity > 0,
        quantity: product.quantity,
        shippingTime: this.estimateShippingTime(product),
        bestAvailability: false,
      }));

      // Mark best availability
      const inStockProducts = availability.filter(a => a.inStock);
      if (inStockProducts.length > 0) {
        const maxQuantity = Math.max(...inStockProducts.map(a => a.quantity));
        const fastestShipping = Math.min(...inStockProducts.map(a => this.parseShippingTime(a.shippingTime)));
        
        availability.forEach(avail => {
          avail.bestAvailability = avail.inStock && 
            avail.quantity === maxQuantity && 
            this.parseShippingTime(avail.shippingTime) === fastestShipping;
        });
      }

      return availability;
    } catch (error) {
      throw new Error(`Failed to compare availability: ${error}`);
    }
  }

  // Estimate shipping time
  private estimateShippingTime(product: Product): string {
    try {
      // Simple shipping time estimation based on product attributes
      if (product.quantity <= 0) return 'Out of Stock';
      
      const hasPrime = (product as any).prime || false;
      const weight = product.specifications?.weight || 1;
      
      if (hasPrime) {
        return '1-2 days';
      } else if (weight < 1) {
        return '2-3 days';
      } else if (weight < 5) {
        return '3-5 days';
      } else {
        return '5-7 days';
      }
    } catch (error) {
      return '3-5 days';
    }
  }

  // Parse shipping time to days
  private parseShippingTime(shippingTime: string): number {
    try {
      const match = shippingTime.match(/(\d+)/);
      return match ? parseInt(match[1]) : 5;
    } catch (error) {
      return 5;
    }
  }

  // Compare features
  private async compareFeatures(products: Product[]): Promise<ComparisonFeature[]> {
    try {
      // Get all unique features
      const allFeatures = new Set<string>();
      products.forEach(product => {
        if (product.features) {
          product.features.forEach(feature => allFeatures.add(feature));
        }
      });

      const features: ComparisonFeature[] = [];

      for (const featureName of allFeatures) {
        const featureProducts: any[] = [];
        
        products.forEach(product => {
          const hasFeature = product.features?.includes(featureName) || false;
          featureProducts.push({
            productId: product._id.toString(),
            productName: product.name,
            has,
            value: hasFeature,
          });
        });

        features.push({
          name: featureName,
          products: featureProducts,
        });
      }

      return features;
    } catch (error) {
      throw new Error(`Failed to compare features: ${error}`);
    }
  }

  // Generate summary
  private async generateSummary(products: Product[]): Promise<ComparisonSummary> {
    try {
      const bestOverall = this.getBestOverallProduct(products);
      const bestPrice = this.getBestPriceProduct(products);
      const bestRating = this.getBestRatingProduct(products);
      const bestFeatures = this.getBestFeaturesProduct(products);
      const mostPopular = this.getMostPopularProduct(products);
      const bestValue = this.getBestValueProduct(products);
      const recommendations = this.getRecommendations(products);

      return {
        bestOverall,
        bestPrice,
        bestRating,
        bestFeatures,
        mostPopular,
        bestValue,
        recommendations,
      };
    } catch (error) {
      throw new Error(`Failed to generate summary: ${error}`);
    }
  }

  // Get best overall product
  private getBestOverallProduct(products: Product[]): string {
    try {
      const scoredProducts = products.map(product => ({
        product,
        score: this.calculateProductScore(product),
      }));

      scoredProducts.sort((a, b) => b.score - a.score);
      return scoredProducts[0]?.product.name || '';
    } catch (error) {
      return '';
    }
  }

  // Get best price product
  private getBestPriceProduct(products: Product[]): string {
    try {
      const cheapestProduct = products.reduce((min, product) => 
        product.price < min.price ? product : min
      );
      
      return cheapestProduct.name;
    } catch (error) {
      return '';
    }
  }

  // Get best rating product
  private getBestRatingProduct(products: Product[]): string {
    try {
      const bestRatedProduct = products.reduce((best, product) => 
        (product.averageRating || 0) > (best.averageRating || 0) ? product : best
      );
      
      return bestRatedProduct.name;
    } catch (error) {
      return '';
    }
  }

  // Get best features product
  private getBestFeaturesProduct(products: Product[]): string {
    try {
      const productFeatures = products.map(product => ({
        product,
        featureCount: product.features?.length || 0,
      }));

      productFeatures.sort((a, b) => b.featureCount - a.featureCount);
      return productFeatures[0]?.product.name || '';
    } catch (error) {
      return '';
    }
  }

  // Get most popular product
  private getMostPopularProduct(products: Product[]): string {
    try {
      const mostPopular = products.reduce((popular, product) => 
        (product.reviewCount || 0) > (popular.reviewCount || 0) ? product : popular
      );
      
      return mostPopular.name;
    } catch (error) {
      return '';
    }
  }

  // Get best value product
  private getBestValueProduct(products: Product[]): string {
    try {
      const valueScores = products.map(product => ({
        product,
        score: this.calculateValueScore(product),
      }));

      valueScores.sort((a, b) => b.score - a.score);
      return valueScores[0]?.product.name || '';
    } catch (error) {
      return '';
    }
  }

  // Calculate product score
  private calculateProductScore(product: Product): number {
    try {
      let score = 0;
      
      // Rating score (40% weight)
      score += (product.averageRating || 0) * 0.4;
      
      // Review count score (20% weight)
      score += Math.min(product.reviewCount || 0, 100) * 0.002;
      
      // Price score (20% weight) - lower price gets higher score
      const maxPrice = 1000; // Assume max price for normalization
      score += (1 - (product.price / maxPrice)) * 0.2;
      
      // Stock score (10% weight)
      score += (product.quantity > 0 ? 1 : 0) * 0.1;
      
      // Feature count score (10% weight)
      score += Math.min((product.features?.length || 0) / 20, 1) * 0.1;
      
      return Math.round(score * 100) / 100;
    } catch (error) {
      return 0;
    }
  }

  // Calculate value score
  private calculateValueScore(product: Product): number {
    try {
      let score = 0;
      
      // Rating to price ratio
      const ratingPriceRatio = (product.averageRating || 0) / product.price;
      score += ratingPriceRatio * 100;
      
      // Feature count to price ratio
      const featurePriceRatio = (product.features?.length || 0) / product.price;
      score += featurePriceRatio * 50;
      
      // Discount amount
      if (product.originalPrice && product.originalPrice > product.price) {
        const discountRatio = (product.originalPrice - product.price) / product.originalPrice;
        score += discountRatio * 25;
      }
      
      return Math.round(score);
    } catch (error) {
      return 0;
    }
  }

  // Get recommendations
  private getRecommendations(products: Product[]): string[] {
    try {
      // Simple recommendation logic based on compared products
      const categories = [...new Set(products.map(p => p.category))];
      const brands = [...new Set(products.map(p => p.brand))];
      
      return [
        `Consider products in the ${categories[0]} category`,
        `Look for deals on ${brands[0]} products`,
        'Check customer reviews for more insights',
      ];
    } catch (error) {
      return [];
    }
  }

  // Generate pros
  private generatePros(product: Product): string[] {
    try {
      const pros: string[] = [];
      
      if (product.averageRating >= 4) {
        pros.push('High customer satisfaction');
      }
      
      if (product.price < 100) {
        pros.push('Affordable price');
      }
      
      if (product.quantity > 10) {
        pros.push('In stock and ready to ship');
      }
      
      if (product.features && product.features.length > 5) {
        pros.push('Rich feature set');
      }
      
      if ((product as any).prime) {
        pros.push('Prime eligible');
      }
      
      return pros;
    } catch (error) {
      return [];
    }
  }

  // Generate cons
  private generateCons(product: Product): string[] {
    try {
      const cons: string[] = [];
      
      if (product.averageRating < 3) {
        cons.push('Mixed customer reviews');
      }
      
      if (product.price > 500) {
        cons.push('Expensive');
      }
      
      if (product.quantity === 0) {
        cons.push('Currently out of stock');
      }
      
      if (!product.features || product.features.length === 0) {
        cons.push('Limited features');
      }
      
      if (!(product as any).prime) {
        cons.push('Not Prime eligible');
      }
      
      return cons;
    } catch (error) {
      return [];
    }
  }

  // Get comparison by ID
  async getComparisonById(comparisonId: string, userId?: string): Promise<ComparisonInfo | null> {
    try {
      // In a real implementation, you'd fetch from database
      // For now, return mock data
      return {
        id: comparisonId,
        userId,
        name: 'Laptop Comparison',
        description: 'Comparing top laptops for work',
        productIds: ['1', '2', '3'],
        products: [],
        categories: [],
        specifications: [],
        prices: [],
        ratings: [],
        availability: [],
        features: [],
        summary: {} as ComparisonSummary,
        isPublic: false,
        viewCount: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get comparison: ${error}`);
    }
  }

  // Get user comparisons
  async getUserComparisons(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ comparisons: ComparisonInfo[]; total: number }> {
    try {
      // In a real implementation, you'd fetch from database with pagination
      const comparisons: ComparisonInfo[] = [
        {
          id: '1',
          userId,
          name: 'Phone Comparison',
          productIds: ['4', '5'],
          isPublic: false,
          viewCount: 15,
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 86400000),
        } as ComparisonInfo,
        {
          id: '2',
          userId,
          name: 'Tablet Comparison',
          productIds: ['6', '7'],
          isPublic: false,
          viewCount: 8,
          createdAt: new Date(Date.now() - 172800000),
          updatedAt: new Date(Date.now() - 172800000),
        } as ComparisonInfo,
      ];

      return {
        comparisons: comparisons.slice((page - 1) * limit, page * limit),
        total: comparisons.length,
      };
    } catch (error) {
      throw new Error(`Failed to get user comparisons: ${error}`);
    }
  }

  // Get public comparisons
  async getPublicComparisons(
    page: number = 1,
    limit: number = 20
  ): Promise<{ comparisons: ComparisonInfo[]; total: number }> {
    try {
      // In a real implementation, you'd fetch from database
      const comparisons: ComparisonInfo[] = [
        {
          id: '3',
          name: 'Gaming Laptop Comparison',
          productIds: ['8', '9', '10'],
          isPublic: true,
          viewCount: 150,
          createdAt: new Date(Date.now() - 259200000),
          updatedAt: new Date(Date.now() - 259200000),
        } as ComparisonInfo,
      ];

      return {
        comparisons: comparisons.slice((page - 1) * limit, page * limit),
        total: comparisons.length,
      };
    } catch (error) {
      throw new Error(`Failed to get public comparisons: ${error}`);
    }
  }

  // Update comparison
  async updateComparison(
    comparisonId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      productIds?: string[];
      isPublic?: boolean;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, you'd update database
      console.log(`Comparison ${comparisonId} updated by user ${userId}`);
      
      return {
        success: true,
        message: 'Comparison updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update comparison: ${error}`,
      };
    }
  }

  // Delete comparison
  async deleteComparison(comparisonId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, you'd delete from database
      console.log(`Comparison ${comparisonId} deleted by user ${userId}`);
      
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

  // Share comparison
  async shareComparison(
    comparisonId: string,
    userId: string,
    options: {
      generatePublicLink?: boolean;
      expiresIn?: number; // days
    }
  ): Promise<{ success: boolean; message: string; shareUrl?: string }> {
    try {
      const comparison = await this.getComparisonById(comparisonId, userId);
      if (!comparison) {
        return {
          success: false,
          message: 'Comparison not found',
        };
      }

      let shareToken = comparison.shareToken;
      
      if (options.generatePublicLink && !shareToken) {
        shareToken = this.generateShareToken();
        // In a real implementation, you'd update the comparison with the share token
      }

      const shareUrl = `/compare/${shareToken}`;
      
      return {
        success: true,
        message: 'Comparison shared successfully',
        shareUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to share comparison: ${error}`,
      };
    }
  }

  // Get comparison by share token
  async getComparisonByShareToken(shareToken: string): Promise<ComparisonInfo | null> {
    try {
      // In a real implementation, you'd fetch from database using share token
      const comparison = await this.getComparisonById('1'); // Mock implementation
      
      if (comparison && comparison.shareToken === shareToken) {
        // Increment view count
        comparison.viewCount++;
      }
      
      return comparison;
    } catch (error) {
      throw new Error(`Failed to get comparison by share token: ${error}`);
    }
  }

  // Validate comparison request
  private validateComparisonRequest(request: ComparisonRequest): { valid: boolean; message: string } {
    if (!request.productIds || request.productIds.length < 2) {
      return { valid: false, message: 'At least 2 products are required for comparison' };
    }

    if (!request.userId && !request.sessionId) {
      return { valid: false, message: 'User ID or session ID is required' };
    }

    return { valid: true, message: 'Comparison request is valid' };
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Generate share token
  private generateShareToken(): string {
    return Math.random().toString(36).substr(2, 12);
  }

  // Get comparison analytics
  async getComparisonAnalytics(): Promise<any> {
    try {
      // In a real implementation, you'd calculate from database
      return {
        totalComparisons: 1000,
        publicComparisons: 200,
        privateComparisons: 800,
        averageProductsPerComparison: 3.2,
        mostComparedCategories: [
          { category: 'Electronics', count: 400 },
          { category: 'Clothing', count: 300 },
          { category: 'Home', count: 200 },
        ],
        topViewedComparisons: [
          { name: 'iPhone vs Samsung Galaxy', views: 500 },
          { name: 'MacBook vs Dell XPS', views: 350 },
          { name: 'Nike vs Adidas Shoes', views: 250 },
        ],
        sharingStats: {
          totalShares: 500,
          publicShares: 150,
          privateShares: 350,
          averageViewsPerShare: 25,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get comparison analytics: ${error}`);
    }
  }
}
