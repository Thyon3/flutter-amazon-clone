import { ProductBundle, IProductBundle } from '../model/productBundle';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface BundleRequest {
  name: string;
  description: string;
  type: 'bundle' | 'kit' | 'combo' | 'package';
  products: Array<{
    productId: string;
    quantity: number;
    discountPercentage: number;
    isRequired?: boolean;
  }>;
  images: string[];
  tags?: string[];
  category: string;
  brand?: string;
  restrictions?: {
    minQuantity?: number;
    maxQuantity?: number;
    requiresAllItems?: boolean;
    allowedSubstitutions?: boolean;
  };
  metadata?: {
    bundleType?: 'seasonal' | 'everyday' | 'limited' | 'exclusive';
    targetAudience?: string[];
    occasions?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    estimatedAssemblyTime?: number;
  };
  featured?: boolean;
  priority?: number;
}

export interface BundleResponse {
  success: boolean;
  bundleId?: string;
  message: string;
  bundle?: IProductBundle;
}

export interface BundleStats {
  totalBundles: number;
  activeBundles: number;
  featuredBundles: number;
  bundlesByType: Record<string, number>;
  bundlesByCategory: Record<string, number>;
  averageSavings: number;
  topSellingBundles: Array<{
    bundleId: string;
    name: string;
    salesCount: number;
    totalRevenue: number;
  }>;
}

export class ProductBundleService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create a new product bundle
  async createBundle(request: BundleRequest): Promise<BundleResponse> {
    try {
      // Validate products and calculate pricing
      const validatedProducts = await this.validateBundleProducts(request.products);
      
      if (!validatedProducts.valid) {
        return {
          success: false,
          message: validatedProducts.message,
        };
      }

      // Calculate bundle pricing
      const pricing = await this.calculateBundlePricing(request.products);

      const bundle = new ProductBundle({
        name: request.name,
        description: request.description,
        type: request.type,
        products: request.products,
        pricing,
        images: request.images,
        tags: request.tags || [],
        category: request.category,
        brand: request.brand,
        restrictions: {
          minQuantity: request.restrictions?.minQuantity || 1,
          maxQuantity: request.restrictions?.maxQuantity || 999,
          requiresAllItems: request.restrictions?.requiresAllItems || false,
          allowedSubstitutions: request.restrictions?.allowedSubstitutions || false,
        },
        metadata: {
          bundleType: request.metadata?.bundleType || 'everyday',
          targetAudience: request.metadata?.targetAudience || [],
          occasions: request.metadata?.occasions || [],
          difficulty: request.metadata?.difficulty || 'beginner',
          estimatedAssemblyTime: request.metadata?.estimatedAssemblyTime,
        },
        featured: request.featured || false,
        priority: request.priority || 0,
      });

      await bundle.save();

      return {
        success: true,
        bundleId: bundle._id.toString(),
        message: 'Product bundle created successfully',
        bundle,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create product bundle: ${error}`,
      };
    }
  }

  // Get all bundles
  async getBundles(
    type?: string,
    category?: string,
    featured?: boolean,
    page: number = 1,
    limit: number = 20
  ): Promise<{ bundles: IProductBundle[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let filter: any = { status: 'active' };

      if (type) {
        filter.type = type;
      }
      if (category) {
        filter.category = category;
      }
      if (featured !== undefined) {
        filter.featured = featured;
      }

      const bundles = await ProductBundle.find(filter)
        .populate('products.productId', 'name images price')
        .sort({ featured: -1, priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ProductBundle.countDocuments(filter);

      return { bundles, total };
    } catch (error) {
      throw new Error(`Failed to get bundles: ${error}`);
    }
  }

  // Get bundle by ID
  async getBundleById(bundleId: string): Promise<IProductBundle | null> {
    try {
      const bundle = await ProductBundle.findById(bundleId)
        .populate('products.productId', 'name images price description');

      return bundle;
    } catch (error) {
      throw new Error(`Failed to get bundle: ${error}`);
    }
  }

  // Update bundle
  async updateBundle(
    bundleId: string,
    updates: Partial<Pick<IProductBundle, 'name' | 'description' | 'images' | 'tags' | 'category' | 'featured' | 'priority' | 'status'>>
  ): Promise<BundleResponse> {
    try {
      const bundle = await ProductBundle.findById(bundleId);
      
      if (!bundle) {
        return {
          success: false,
          message: 'Bundle not found',
        };
      }

      Object.assign(bundle, updates);
      await bundle.save();

      return {
        success: true,
        message: 'Bundle updated successfully',
        bundle,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update bundle: ${error}`,
      };
    }
  }

  // Delete bundle
  async deleteBundle(bundleId: string): Promise<BundleResponse> {
    try {
      const bundle = await ProductBundle.findById(bundleId);
      
      if (!bundle) {
        return {
          success: false,
          message: 'Bundle not found',
        };
      }

      await ProductBundle.findByIdAndDelete(bundleId);

      return {
        success: true,
        message: 'Bundle deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete bundle: ${error}`,
      };
    }
  }

  // Get featured bundles
  async getFeaturedBundles(limit: number = 10): Promise<IProductBundle[]> {
    try {
      const bundles = await ProductBundle.find({ 
        status: 'active', 
        featured: true 
      })
        .populate('products.productId', 'name images price')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit);

      return bundles;
    } catch (error) {
      throw new Error(`Failed to get featured bundles: ${error}`);
    }
  }

  // Get bundles by category
  async getBundlesByCategory(category: string, limit: number = 20): Promise<IProductBundle[]> {
    try {
      const bundles = await ProductBundle.find({ 
        status: 'active', 
        category 
      })
        .populate('products.productId', 'name images price')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit);

      return bundles;
    } catch (error) {
      throw new Error(`Failed to get bundles by category: ${error}`);
    }
  }

  // Search bundles
  async searchBundles(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ bundles: IProductBundle[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');

      const bundles = await ProductBundle.find({
        status: 'active',
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
          { category: searchRegex },
        ],
      })
        .populate('products.productId', 'name images price')
        .sort({ featured: -1, priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ProductBundle.countDocuments({
        status: 'active',
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
          { category: searchRegex },
        ],
      });

      return { bundles, total };
    } catch (error) {
      throw new Error(`Failed to search bundles: ${error}`);
    }
  }

  // Get bundle recommendations
  async getBundleRecommendations(productId: string, limit: number = 5): Promise<IProductBundle[]> {
    try {
      const bundles = await ProductBundle.find({
        status: 'active',
        'products.productId': productId,
      })
        .populate('products.productId', 'name images price')
        .sort({ priority: -1, 'pricing.discountPercentage': -1 })
        .limit(limit);

      return bundles;
    } catch (error) {
      throw new Error(`Failed to get bundle recommendations: ${error}`);
    }
  }

  // Update bundle availability
  async updateBundleAvailability(bundleId: string): Promise<BundleResponse> {
    try {
      const bundle = await ProductBundle.findById(bundleId);
      
      if (!bundle) {
        return {
          success: false,
          message: 'Bundle not found',
        };
      }

      // Check availability of all products
      let totalStock = 0;
      let allInStock = true;

      for (const bundleProduct of bundle.products) {
        const product = await Product.findById(bundleProduct.productId);
        if (!product) {
          allInStock = false;
          break;
        }

        const availableStock = Math.floor(product.quantity / bundleProduct.quantity);
        totalStock = totalStock === 0 ? availableStock : Math.min(totalStock, availableStock);

        if (product.quantity < bundleProduct.quantity) {
          allInStock = false;
        }
      }

      bundle.availability.inStock = allInStock;
      bundle.availability.stockCount = totalStock;

      await bundle.save();

      return {
        success: true,
        message: 'Bundle availability updated',
        bundle,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update bundle availability: ${error}`,
      };
    }
  }

  // Get bundle statistics
  async getBundleStats(): Promise<BundleStats> {
    try {
      const totalBundles = await ProductBundle.countDocuments();
      const activeBundles = await ProductBundle.countDocuments({ status: 'active' });
      const featuredBundles = await ProductBundle.countDocuments({ featured: true });

      // Bundles by type
      const typeStats = await ProductBundle.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]);

      const bundlesByType = typeStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Bundles by category
      const categoryStats = await ProductBundle.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]);

      const bundlesByCategory = categoryStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Average savings
      const savingsStats = await ProductBundle.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            avgSavings: { $avg: '$pricing.discountPercentage' },
          },
        },
      ]);

      const averageSavings = savingsStats[0]?.avgSavings || 0;

      // Top selling bundles (simulated - in real app, you'd track sales)
      const topSellingBundles = await ProductBundle.find({ status: 'active' })
        .sort({ priority: -1, featured: -1 })
        .limit(5)
        .select('name priority featured');

      return {
        totalBundles,
        activeBundles,
        featuredBundles,
        bundlesByType,
        bundlesByCategory,
        averageSavings: Math.round(averageSavings * 10) / 10,
        topSellingBundles: topSellingBundles.map(bundle => ({
          bundleId: bundle._id.toString(),
          name: bundle.name,
          salesCount: Math.floor(Math.random() * 1000), // Simulated
          totalRevenue: Math.floor(Math.random() * 10000), // Simulated
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get bundle stats: ${error}`);
    }
  }

  // Validate bundle products
  private async validateBundleProducts(products: BundleRequest['products']): Promise<{ valid: boolean; message: string; productPrices?: Map<string, number> }> {
    const productPrices = new Map<string, number>();

    for (const product of products) {
      const productDoc = await Product.findById(product.productId);
      
      if (!productDoc) {
        return { valid: false, message: `Product ${product.productId} not found` };
      }

      if (productDoc.quantity < product.quantity) {
        return { valid: false, message: `Insufficient stock for ${productDoc.name}` };
      }

      if (product.discountPercentage < 0 || product.discountPercentage > 100) {
        return { valid: false, message: `Invalid discount percentage for ${productDoc.name}` };
      }

      productPrices.set(product.productId, productDoc.price);
    }

    return { valid: true, message: 'Products validated', productPrices };
  }

  // Calculate bundle pricing
  private async calculateBundlePricing(products: BundleRequest['products']): Promise<IProductBundle['pricing']> {
    let originalTotal = 0;
    let bundlePrice = 0;

    for (const product of products) {
      const productDoc = await Product.findById(product.productId);
      if (!productDoc) continue;

      const itemTotal = productDoc.price * product.quantity;
      const itemDiscount = itemTotal * (product.discountPercentage / 100);
      const itemBundlePrice = itemTotal - itemDiscount;

      originalTotal += itemTotal;
      bundlePrice += itemBundlePrice;
    }

    const totalSavings = originalTotal - bundlePrice;
    const discountPercentage = originalTotal > 0 ? (totalSavings / originalTotal) * 100 : 0;

    return {
      originalTotal: Math.round(originalTotal * 100) / 100,
      bundlePrice: Math.round(bundlePrice * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      discountPercentage: Math.round(discountPercentage * 10) / 10,
    };
  }

  // Get bundle analytics
  async getBundleAnalytics(): Promise<any> {
    try {
      const stats = await this.getBundleStats();
      
      // Additional analytics
      const recentBundles = await ProductBundle.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('products.productId', 'name');

      const performanceMetrics = await this.calculatePerformanceMetrics();

      return {
        stats,
        recentBundles,
        performanceMetrics,
      };
    } catch (error) {
      throw new Error(`Failed to get bundle analytics: ${error}`);
    }
  }

  // Calculate performance metrics
  private async calculatePerformanceMetrics(): Promise<any> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentBundles = await ProductBundle.find({
        createdAt: { $gte: thirtyDaysAgo },
        status: 'active',
      });

      const averageDiscount = recentBundles.reduce((sum, bundle) => sum + bundle.pricing.discountPercentage, 0) / recentBundles.length;

      const averageProductsPerBundle = recentBundles.reduce((sum, bundle) => sum + bundle.products.length, 0) / recentBundles.length;

      return {
        last30DaysCreated: recentBundles.length,
        averageDiscount: Math.round(averageDiscount * 10) / 10,
        averageProductsPerBundle: Math.round(averageProductsPerBundle * 10) / 10,
      };
    } catch (error) {
      console.error('Failed to calculate performance metrics:', error);
      return {};
    }
  }

  // Clone bundle
  async cloneBundle(bundleId: string, newName?: string): Promise<BundleResponse> {
    try {
      const originalBundle = await ProductBundle.findById(bundleId);
      
      if (!originalBundle) {
        return {
          success: false,
          message: 'Bundle not found',
        };
      }

      const clonedBundle = new ProductBundle({
        ...originalBundle.toObject(),
        _id: undefined,
        name: newName || `${originalBundle.name} (Copy)`,
        status: 'inactive', // Start as inactive
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await clonedBundle.save();

      return {
        success: true,
        bundleId: clonedBundle._id.toString(),
        message: 'Bundle cloned successfully',
        bundle: clonedBundle,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clone bundle: ${error}`,
      };
    }
  }

  // Get seasonal bundles
  async getSeasonalBundles(season?: string, limit: number = 20): Promise<IProductBundle[]> {
    try {
      let filter: any = { 
        status: 'active',
        'metadata.bundleType': 'seasonal'
      };

      if (season) {
        filter['metadata.occasions'] = season;
      }

      const bundles = await ProductBundle.find(filter)
        .populate('products.productId', 'name images price')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit);

      return bundles;
    } catch (error) {
      throw new Error(`Failed to get seasonal bundles: ${error}`);
    }
  }

  // Get bundle comparisons
  async getBundleComparisons(bundleIds: string[]): Promise<IProductBundle[]> {
    try {
      const bundles = await ProductBundle.find({
        _id: { $in: bundleIds },
        status: 'active',
      })
        .populate('products.productId', 'name images price')
        .sort({ 'pricing.discountPercentage': -1 });

      return bundles;
    } catch (error) {
      throw new Error(`Failed to get bundle comparisons: ${error}`);
    }
  }
}
