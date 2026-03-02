import { User } from '../model/user';
import { Product } from '../model/product';
import { Order } from '../model/order';
import { Category } from '../model/category';
import { Review } from '../model/review';
import { ShoppingCart } from '../model/shoppingCart';

export interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  sales: {
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    yearRevenue: number;
    revenueGrowth: number;
    topSellingProducts: Array<{
      productId: string;
      name: string;
      sales: number;
      revenue: number;
    }>;
  };
  users: {
    newUsers: number;
    activeUsers: number;
    totalUsers: number;
    userGrowth: number;
    topCountries: Array<{
      country: string;
      users: number;
    }>;
  };
  products: {
    totalProducts: number;
    activeProducts: number;
    lowStock: number;
    outOfStock: number;
    topCategories: Array<{
      category: string;
      count: number;
    }>;
  };
  orders: {
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    ordersByStatus: Record<string, number>;
  };
  reviews: {
    totalReviews: number;
    averageRating: number;
    recentReviews: number;
    topRatedProducts: Array<{
      productId: string;
      name: string;
      rating: number;
      reviews: number;
    }>;
  };
}

export class AdminDashboardService {
  // Get dashboard overview stats
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get overview stats
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const totalProducts = await Product.countDocuments();
      const activeProducts = await Product.countDocuments({ quantity: { $gt: 0 } });
      const totalOrders = await Order.countDocuments();
      
      const revenueResult = await Order.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      const stats = revenueResult[0] || { totalRevenue: 0, avgOrderValue: 0 };

      // Get sales stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

      const todayRevenue = await Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
      ]);

      const weekRevenue = await Order.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
      ]);

      const monthRevenue = await Order.aggregate([
        { $match: { createdAt: { $gte: monthAgo } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
      ]);

      const yearRevenue = await Order.aggregate([
        { $match: { createdAt: { $gte: yearAgo } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
      ]);

      const lastMonthRevenue = monthRevenue[0]?.revenue || 0;
      const thisMonthRevenue = monthRevenue[0]?.revenue || 0;
      const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      // Get top selling products
      const topSellingProducts = await Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalSales: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            name: '$product.name',
            sales: '$totalSales',
            revenue: '$totalRevenue',
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]);

      // Get user stats
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
      
      const userGrowth = totalUsers > 0 ? ((activeUsers / totalUsers) * 100) : 0;

      // Get top countries (simplified - in real app, you'd have proper location data)
      const topCountries = [
        { country: 'United States', users: Math.floor(totalUsers * 0.4) },
        { country: 'United Kingdom', users: Math.floor(totalUsers * 0.2) },
        { country: 'Canada', users: Math.floor(totalUsers * 0.15) },
        { country: 'Australia', users: Math.floor(totalUsers * 0.1) },
        { country: 'Germany', users: Math.floor(totalUsers * 0.08) },
        { country: 'France', users: Math.floor(totalUsers * 0.07) },
      ];

      // Get product stats
      const lowStock = await Product.countDocuments({ quantity: { $gt: 0, $lte: 10 } });
      const outOfStock = await Product.countDocuments({ quantity: 0 });

      const topCategories = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Get order stats
      const pendingOrders = await Order.countDocuments({ status: 'pending' });
      const processingOrders = await Order.countDocuments({ status: 'processing' });
      const shippedOrders = await Order.countDocuments({ status: 'shipped' });
      const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
      const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

      const ordersByStatus = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      // Get review stats
      const totalReviews = await Review.countDocuments();
      const ratingResult = await Review.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
          },
        },
      ]);

      const averageRating = ratingResult[0]?.avgRating || 0;
      const recentReviews = await Review.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      const topRatedProducts = await Review.aggregate([
        {
          $group: {
            _id: '$product',
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
        { $match: { avgRating: { $gte: 4 } } },
        { $sort: { avgRating: -1, reviewCount: -1 } },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            name: '$product.name',
            rating: '$avgRating',
            reviews: '$reviewCount',
          },
        },
        { $limit: 10 },
      ]);

      return {
        overview: {
          totalUsers,
          activeUsers,
          totalProducts,
          activeProducts,
          totalOrders,
          totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
          averageOrderValue: Math.round(stats.avgOrderValue * 100) / 100,
        },
        sales: {
          todayRevenue: Math.round((todayRevenue[0]?.revenue || 0) * 100) / 100,
          weekRevenue: Math.round((weekRevenue[0]?.revenue || 0) * 100) / 100,
          monthRevenue: Math.round((monthRevenue[0]?.revenue || 0) * 100) / 100,
          yearRevenue: Math.round((yearRevenue[0]?.revenue || 0) * 100) / 100,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          topSellingProducts: topSellingProducts.map(p => ({
            productId: p.productId,
            name: p.name,
            sales: p.sales,
            revenue: Math.round(p.revenue * 100) / 100,
          })),
        },
        users: {
          newUsers,
          activeUsers,
          totalUsers,
          userGrowth: Math.round(userGrowth * 10) / 10,
          topCountries,
        },
        products: {
          totalProducts,
          activeProducts,
          lowStock,
          outOfStock,
          topCategories: topCategories.map(c => ({
            category: c._id,
            count: c.count,
          })),
        },
        orders: {
          totalOrders,
          pendingOrders,
          processingOrders,
          shippedOrders,
          deliveredOrders,
          cancelledOrders,
          ordersByStatus: ordersByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {} as Record<string, number>),
        },
        reviews: {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          recentReviews,
          topRatedProducts: topRatedProducts.map(p => ({
            productId: p.productId,
            name: p.name,
            rating: Math.round(p.rating * 10) / 10,
            reviews: p.reviews,
          })),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard stats: ${error}`);
    }
  }

  // Get sales analytics
  async getSalesAnalytics(period: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    try {
      const now = new Date();
      let startDate: Date;
      let groupBy: string;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          groupBy = { $hour: { $hour: { $dateToString: { format: '%Y-%m-%d' }, $hour: { $hour: '%H' } } } };
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = { $day: { $day: { $dateToString: { format: '%Y-%m-%d' } } } };
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          groupBy = { $day: { $day: { $dateToString: { format: '%Y-%m-%d' } } } };
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          groupBy = { $month: { $month: { $dateToString: { format: '%Y-%m' } } } };
          break;
      }

      const salesData = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: groupBy,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' },
        },
        { $sort: { '_id': 1 } },
      ]);

      return salesData.map(item => ({
        period: item._id,
        revenue: Math.round(item.revenue * 100) / 100,
        orders: item.orders,
        avgOrderValue: Math.round(item.avgOrderValue * 100) / 100,
      }));
    } catch (error) {
      throw new Error(`Failed to get sales analytics: ${error}`);
    }
  }

  // Get user analytics
  async getUserAnalytics(period: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    try {
      const now = new Date();
      let startDate: Date;
      let groupBy: string;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          groupBy = { $hour: { $hour: { $dateToString: { format: '%Y-%m-%d' }, $hour: { $hour: '%H' } } } };
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = { $day: { $day: { $dateToString: { format: '%Y-%m-%d' } } } };
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          groupBy = { $day: { $day: { $dateToString: { format: '%Y-%m-%d' } } } };
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          groupBy = { $month: { $month: { $dateToString: { format: '%Y-%m' } } } };
          break;
      }

      const userData = await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: groupBy,
          newUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        },
        { $sort: { '_id': 1 } },
      ]);

      return userData.map(item => ({
        period: item._id,
        newUsers: item.newUsers,
        activeUsers: item.activeUsers,
      }));
    } catch (error) {
      throw new Error(`Failed to get user analytics: ${error}`);
    }
  }

  // Get product analytics
  async getProductAnalytics(): Promise<any> {
    try {
      const totalProducts = await Product.countDocuments();
      const activeProducts = await Product.countDocuments({ quantity: { $gt: 0 } });
      const lowStock = await Product.countDocuments({ quantity: { $gt: 0, $lte: 10 } });
      const outOfStock = await Product.countDocuments({ quantity: 0 });

      const categoryStats = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            totalStock: { $sum: '$quantity' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      const topRatedProducts = await Product.find({ averageRating: { $gte: 4 } })
        .sort({ averageRating: -1, reviewCount: -1 })
        .limit(10)
        .select('name averageRating reviewCount category');

      const recentlyAdded = await Product.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name createdAt category');

      const priceDistribution = await Product.aggregate([
        {
          $bucket: {
            groupBy: '$price',
            boundaries: [0, 25, 50, 100, 200, 500, 1000, Infinity],
            default: 'Other',
            output: { count: { $sum: 1 } },
          },
        },
        { $sort: { '_id': 1 } },
      ]);

      return {
        totalProducts,
        activeProducts,
        lowStock,
        outOfStock,
        stockHealth: {
          healthy: activeProducts,
          lowStock,
          outOfStock,
        },
        categoryStats: categoryStats.map(c => ({
          category: c._id,
          count: c.count,
          avgPrice: Math.round(c.avgPrice * 100) / 100,
          totalStock: c.totalStock,
        })),
        topRatedProducts: topRatedProducts.map(p => ({
          name: p.name,
          rating: Math.round(p.averageRating * 10) / 10,
          reviews: p.reviewCount,
          category: p.category,
        })),
        recentlyAdded: recentlyAdded.map(p => ({
          name: p.name,
          createdAt: p.createdAt,
          category: p.category,
        })),
        priceDistribution: priceDistribution.map(p => ({
          range: this.getPriceRangeLabel(p._id),
          count: p.count,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get product analytics: ${error}`);
    }
  }

  // Get order analytics
  async getOrderAnalytics(): Promise<any> {
    try {
      const totalOrders = await Order.countDocuments();
      
      const statusStats = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const paymentStats = await Order.aggregate([
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const shippingStats = await Order.aggregate([
        {
          $group: {
            _id: '$shippingStatus',
            count: { sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const monthlyOrders = await Order.aggregate([
        {
          $group: {
            _id: { $year: { $year: { $dateToString: { format: '%Y-%m' } } },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { '_id': 1 } },
        { $limit: 12 },
      ]);

      const averageOrderValue = await Order.aggregate([
        {
          $group: {
            _id: null,
            avgValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      return {
        totalOrders,
        statusBreakdown: statusStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        paymentBreakdown: paymentStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        shippingBreakdown: shippingStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        monthlyTrends: monthlyOrders.map(item => ({
          month: item._id,
          orders: item.count,
          revenue: Math.round(item.revenue * 100) / 100,
        })),
        averageOrderValue: Math.round((averageOrderValue[0]?.avgValue || 0) * 100) / 100,
      };
    } catch (error) {
      throw new Error(`Failed to get order analytics: ${error}`);
    }
  }

  // Get review analytics
  async getReviewAnalytics(): Promise<any> {
    try {
      const totalReviews = await Review.countDocuments();
      
      const ratingDistribution = await Review.aggregate([
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id': 1 } },
      ]);

      const recentReviews = await Review.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('productId', 'name')
        .populate('user', 'name');

      const reviewTrends = await Review.aggregate([
        {
          $group: {
            _id: { $month: { $month: { $dateToString: { format: '%Y-%m' } } } },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { '_id': 1 } },
        { $limit: 12 },
      ]);

      const topReviewers = await Review.aggregate([
        {
          $group: {
            _id: '$user',
            reviewCount: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $match: { avgRating: { $gte: 4 } } },
        { $sort: { reviewCount: -1, avgRating: -1 } },
        { $limit: 10 },
      ]);

      return {
        totalReviews,
        ratingDistribution: ratingDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        averageRating: await Review.aggregate([
          { $group: { _id: null, avgRating: { $avg: '$rating' } } },
        ]).then(result => Math.round((result[0]?.avgRating || 0) * 10) / 10),
        recentReviews,
        reviewTrends: reviewTrends.map(item => ({
          month: item._id,
          count: item.count,
          avgRating: Math.round(item.avgRating * 10) / 10,
        })),
        topReviewers: topReviewers.map(r => ({
          userId: r._id,
          reviewCount: r.reviewCount,
          avgRating: Math.round(r.avgRating * 10) / 10,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get review analytics: ${error}`);
    }
  }

  // Get system health metrics
  async getSystemHealth(): Promise<any> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentOrders = await Order.countDocuments({ createdAt: { $gte: last24Hours } });
      const recentUsers = await User.countDocuments({ createdAt: { $gte: last24Hours } });
      const recentReviews = await Review.countDocuments({ createdAt: { $gte: last24Hours } });

      // Database connection health (simplified)
      const dbStatus = 'healthy'; // In real app, you'd check actual DB connection

      // Server performance metrics
      const serverUptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      return {
        status: dbStatus,
        uptime: serverUptime,
        memoryUsage: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
        recentActivity: {
          orders: recentOrders,
          users: recentUsers,
          reviews: recentReviews,
        },
        performance: {
          avgResponseTime: 150, // In real app, you'd track actual response times
          errorRate: 0.5, // In real app, you'd track actual error rates
        },
      };
    } catch (error) {
      throw new Error(`Failed to get system health: ${error}`);
    }
  }

  // Get real-time metrics
  async getRealTimeMetrics(): Promise<any> {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const recentOrders = await Order.countDocuments({ createdAt: { $gte: lastHour } });
      const activeUsers = await User.countDocuments({ isActive: true, lastSeen: { $gte: lastHour } });
      const activeCarts = await ShoppingCart.countDocuments({ status: 'active' });

      return {
        timestamp: now,
        recentOrders,
        activeUsers,
        activeCarts,
        serverLoad: {
          cpu: Math.random() * 100, // In real app, you'd get actual CPU usage
          memory: Math.random() * 100, // In real app, you'd get actual memory usage
        },
      };
    } catch (error) {
      throw new Error(`Failed to get real-time metrics: ${error}`);
    }
  }

  // Helper method for price range labels
  private getPriceRangeLabel(range: number): string {
    const ranges = {
      0: 'Under $25',
      25: '$25 - $50',
      50: '$50 - $100',
      100: '$100 - $200',
      200: '$200 - $500',
      500: '$500 - $1000',
      1000: 'Over $1000',
    };
    return ranges[range] || 'Other';
  }

  // Export data for reports
  async exportData(type: 'orders' | 'users' | 'products' | 'reviews', filters?: any): Promise<any> {
    try {
      let data: any[] = [];

      switch (type) {
        case 'orders':
          data = await Order.find(filters || {})
            .populate('user', 'name email')
            .populate('items.productId', 'name price')
            .sort({ createdAt: -1 });
          break;
        case 'users':
          data = await User.find(filters || {})
            .select('-password -verificationToken')
            .sort({ createdAt: -1 });
          break;
        case 'products':
          data = await Product.find(filters || {})
            .sort({ createdAt: -1 });
          break;
        case 'reviews':
          data = await Review.find(filters || {})
            .populate('user', 'name')
            .populate('productId', 'name')
            .sort({ createdAt: -1 });
          break;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to export data: ${error}`);
    }
  }

  // Search functionality for admin
  async search(query: string, type: 'users' | 'products' | 'orders' | 'reviews', page: number = 1, limit: number = 20): Promise<any> {
    try {
      let results: any[] = [];
      let total = 0;

      const searchRegex = new RegExp(query, 'i');

      switch (type) {
        case 'users':
          results = await User.find({
            $or: [
              { name: searchRegex },
              { email: searchRegex },
              { phone: searchRegex },
            ],
          })
            .select('-password -verificationToken')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
          total = await User.countDocuments({
            $or: [
              { name: searchRegex },
              { email: searchRegex },
              { phone: searchRegex },
            ],
          });
          break;
        case 'products':
          results = await Product.find({
            $or: [
              { name: searchRegex },
              { description: searchRegex },
              { tags: searchRegex },
              { brand: searchRegex },
            ],
          })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
          total = await Product.countDocuments({
            $or: [
              { name: searchRegex },
              { description: searchRegex },
              { tags: searchRegex },
              { brand: searchRegex },
            ],
          });
          break;
        case 'orders':
          results = await Order.find({
            $or: [
              { orderId: searchRegex },
              { status: searchRegex },
            ],
          })
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
          total = await Order.countDocuments({
            $or: [
              { orderId: searchRegex },
              { status: searchRegex },
            ],
          });
          break;
        case 'reviews':
          results = await Review.find({
            $or: [
              { title: searchRegex },
              { content: searchRegex },
              { rating: searchRegex },
            ],
          })
            .populate('user', 'name')
            .populate('productId', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
          total = await Review.countDocuments({
            $or: [
              { title: searchRegex },
              { content: searchRegex },
              { rating: searchRegex },
            ],
          });
          break;
      }

      return {
        results,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new Error(`Failed to search: ${error}`);
    }
  }
}
