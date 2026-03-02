import { Order } from '../model/order';
import { User } from '../model/user';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface OrderManagementRequest {
  orderId: string;
  action: 'update_status' | 'cancel' | 'refund' | 'return' | 'reship' | 'add_tracking' | 'update_payment';
  data?: any;
  reason?: string;
  notes?: string;
}

export interface OrderManagementResponse {
  success: boolean;
  message: string;
  order?: any;
}

export interface OrderFilters {
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  userId?: string;
  totalAmountRange?: {
    min: number;
    max: number;
  };
  paymentStatus?: string[];
  shippingStatus?: string[];
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  ordersByPaymentStatus: Record<string, number>;
  ordersByShippingStatus: Record<string, number>;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    orderId: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

export class OrderManagementService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Get orders with filters
  async getOrders(
    filters: OrderFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let query: any = {};

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query.status = { $in: filters.status };
      }

      if (filters.dateRange) {
        query.createdAt = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end,
        };
      }

      if (filters.userId) {
        query.user = filters.userId;
      }

      if (filters.totalAmountRange) {
        query.totalAmount = {
          $gte: filters.totalAmountRange.min,
          $lte: filters.totalAmountRange.max,
        };
      }

      if (filters.paymentStatus && filters.paymentStatus.length > 0) {
        query.paymentStatus = { $in: filters.paymentStatus };
      }

      if (filters.shippingStatus && filters.shippingStatus.length > 0) {
        query.shippingStatus = { $in: filters.shippingStatus };
      }

      const orders = await Order.find(query)
        .populate('user', 'name email')
        .populate('items.productId', 'name images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Order.countDocuments(query);

      return { orders, total };
    } catch (error) {
      throw new Error(`Failed to get orders: ${error}`);
    }
  }

  // Get order by ID
  async getOrderById(orderId: string): Promise<any> {
    try {
      const order = await Order.findById(orderId)
        .populate('user', 'name email phone')
        .populate('items.productId', 'name images price description')
        .populate('shippingAddress')
        .populate('billingAddress');

      return order;
    } catch (error) {
      throw new Error(`Failed to get order: ${error}`);
    }
  }

  // Update order status
  async updateOrderStatus(
    orderId: string,
    status: string,
    reason?: string,
    notes?: string
  ): Promise<OrderManagementResponse> {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      const oldStatus = order.status;
      order.status = status;
      
      if (reason) {
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          status,
          reason,
          notes,
          timestamp: new Date(),
          updatedBy: 'system',
        });
      }

      await order.save();

      // Send status update notification
      await this.sendStatusUpdateNotification(order, oldStatus, status, reason);

      return {
        success: true,
        message: 'Order status updated successfully',
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update order status: ${error}`,
      };
    }
  }

  // Cancel order
  async cancelOrder(
    orderId: string,
    reason: string,
    refundAmount?: number
  ): Promise<OrderManagementResponse> {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      if (order.status === 'cancelled' || order.status === 'delivered') {
        return {
          success: false,
          message: 'Order cannot be cancelled',
        };
      }

      const oldStatus = order.status;
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.cancellationReason = reason;

      if (refundAmount !== undefined) {
        order.refundAmount = refundAmount;
        order.refundStatus = 'pending';
      }

      await order.save();

      // Process refund if applicable
      if (refundAmount && refundAmount > 0) {
        await this.processRefund(order, refundAmount, reason);
      }

      // Send cancellation notification
      await this.sendCancellationNotification(order, reason);

      return {
        success: true,
        message: 'Order cancelled successfully',
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to cancel order: ${error}`,
      };
    }
  }

  // Process refund
  async processRefund(
    orderId: string,
    refundAmount: number,
    reason: string
  ): Promise<OrderManagementResponse> {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      order.refundAmount = refundAmount;
      order.refundStatus = 'processing';
      order.refundReason = reason;
      order.refundedAt = new Date();

      await order.save();

      // In a real app, you'd integrate with payment processor
      // For now, we'll simulate the refund process
      setTimeout(async () => {
        try {
          order.refundStatus = 'completed';
          await order.save();
          await this.sendRefundNotification(order, refundAmount, reason);
        } catch (error) {
          console.error('Failed to complete refund:', error);
        }
      }, 5000); // 5 seconds delay

      return {
        success: true,
        message: 'Refund processed successfully',
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process refund: ${error}`,
      };
    }
  }

  // Process return
  async processReturn(
    orderId: string,
    returnItems: Array<{
      productId: string;
      quantity: number;
      reason: string;
    }>,
    notes?: string
  ): Promise<OrderManagementResponse> {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      if (order.status !== 'delivered') {
        return {
          success: false,
          message: 'Order must be delivered before processing returns',
        };
      }

      // Validate return items
      const validReturnItems = [];
      for (const returnItem of returnItems) {
        const orderItem = order.items.find(
          item => item.productId.toString() === returnItem.productId
        );

        if (!orderItem) {
          return {
            success: false,
            message: `Product ${returnItem.productId} not found in order`,
          };
        }

        if (orderItem.quantity < returnItem.quantity) {
          return {
            success: false,
            message: `Return quantity exceeds purchased quantity for ${returnItem.productId}`,
          };
        }

        validReturnItems.push({
          ...returnItem,
          orderItem,
        });
      }

      // Create return record
      order.returnRequest = {
        items: validReturnItems,
        status: 'pending',
        requestedAt: new Date(),
        notes,
      };

      await order.save();

      // Send return confirmation
      await this.sendReturnConfirmationNotification(order, validReturnItems);

      return {
        success: true,
        message: 'Return request submitted successfully',
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process return: ${error}`,
      };
    }
  }

  // Reship order
  async reshipOrder(
    orderId: string,
    newShippingAddress?: any,
    reason?: string
  ): Promise<OrderManagementResponse> {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      if (order.status !== 'delivered') {
        return {
          success: false,
          message: 'Order must be delivered before reshipping',
        };
      }

      // Create reship record
      order.reshipRequest = {
        originalOrderId: orderId,
        newShippingAddress: newShippingAddress || order.shippingAddress,
        status: 'pending',
        requestedAt: new Date(),
        reason: reason || 'Customer request',
      };

      await order.save();

      // Send reship confirmation
      await this.sendReshipConfirmationNotification(order);

      return {
        success: true,
        message: 'Reship request submitted successfully',
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reship order: ${error}`,
      };
    }
  }

  // Add tracking information
  async addTrackingInfo(
    orderId: string,
    trackingNumber: string,
    carrier: string,
    estimatedDelivery?: Date
  ): Promise<OrderManagementResponse> {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      order.trackingNumber = trackingNumber;
      order.carrier = carrier;
      order.estimatedDelivery = estimatedDelivery;
      order.shippingStatus = 'shipped';

      await order.save();

      // Send tracking notification
      await this.sendTrackingNotification(order, trackingNumber, carrier);

      return {
        success: true,
        message: 'Tracking information added successfully',
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add tracking information: ${error}`,
      };
    }
  }

  // Update payment information
  async updatePaymentInfo(
    orderId: string,
    paymentData: {
      paymentMethod: string;
      paymentStatus: string;
      transactionId?: string;
      paidAt?: Date;
    }
  ): Promise<OrderManagementResponse> {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      order.paymentMethod = paymentData.paymentMethod;
      order.paymentStatus = paymentData.paymentStatus;
      
      if (paymentData.transactionId) {
        order.transactionId = paymentData.transactionId;
      }
      
      if (paymentData.paidAt) {
        order.paidAt = paymentData.paidAt;
      }

      await order.save();

      // Send payment confirmation
      if (paymentData.paymentStatus === 'completed') {
        await this.sendPaymentConfirmationNotification(order);
      }

      return {
        success: true,
        message: 'Payment information updated successfully',
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update payment information: ${error}`,
      };
    }
  }

  // Get order statistics
  async getOrderStats(
    filters?: OrderFilters
  ): Promise<OrderStats> {
    try {
      let query: any = {};

      if (filters) {
        if (filters.dateRange) {
          query.createdAt = {
            $gte: filters.dateRange.start,
            $lte: filters.dateRange.end,
          };
        }
        if (filters.status && filters.status.length > 0) {
          query.status = { $in: filters.status };
        }
        if (filters.userId) {
          query.user = filters.userId;
        }
      }

      const totalOrders = await Order.countDocuments(query);
      
      const revenueResult = await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      const stats = revenueResult[0] || { totalRevenue: 0, avgOrderValue: 0 };

      // Orders by status
      const statusStats = await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const ordersByStatus = statusStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Orders by payment status
      const paymentStatusStats = await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
          },
        },
      ]);

      const ordersByPaymentStatus = paymentStatusStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Orders by shipping status
      const shippingStatusStats = await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$shippingStatus',
            count: { $sum: 1 },
          },
        },
      ]);

      const ordersByShippingStatus = shippingStatusStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Top selling products
      const topProducts = await Order.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            name: '$product.name',
            quantity: '$totalQuantity',
            revenue: '$totalRevenue',
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]);

      // Recent orders
      const recentOrders = await Order.find(query)
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderId user totalAmount status createdAt');

      return {
        totalOrders,
        totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
        averageOrderValue: Math.round(stats.avgOrderValue * 100) / 100,
        ordersByStatus,
        ordersByPaymentStatus,
        ordersByShippingStatus,
        topSellingProducts: topProducts,
        recentOrders: recentOrders.map(order => ({
          orderId: order._id.toString(),
          customerName: (order.user as any).name,
          totalAmount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get order stats: ${error}`);
    }
  }

  // Send status update notification
  private async sendStatusUpdateNotification(
    order: any,
    oldStatus: string,
    newStatus: string,
    reason?: string
  ): Promise<void> {
    try {
      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Order Status Update - ${newStatus.toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>📦 Order Status Update</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your order status has been updated from <strong>${oldStatus}</strong> to <strong>${newStatus}</strong>.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Order Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Status:</strong> ${newStatus}</p>
                <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Order Details
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send status update notification:', error);
    }
  }

  // Send cancellation notification
  private async sendCancellationNotification(order: any, reason: string): Promise<void> {
    try {
      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Order Cancelled',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1>❌ Order Cancelled</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your order has been cancelled as requested.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Order Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Refund Amount:</strong> $${(order.refundAmount || 0).toFixed(2)}</p>
                <p><strong>Refund Status:</strong> ${order.refundStatus || 'Not applicable'}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Order Details
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send cancellation notification:', error);
    }
  }

  // Send refund notification
  private async sendRefundNotification(order: any, refundAmount: number, reason: string): Promise<void> {
    try {
      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Refund Processed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>💰 Refund Processed</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>A refund of $${refundAmount.toFixed(2)} has been processed for your order.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Refund Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Status:</strong> ${order.refundStatus}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Order Details
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send refund notification:', error);
    }
  }

  // Send return confirmation notification
  private async sendReturnConfirmationNotification(order: any, returnItems: any[]): Promise<void> {
    try {
      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Return Request Submitted',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ffc107; color: #000; padding: 20px; text-align: center;">
              <h1🔄 Return Request Submitted</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your return request has been submitted and is being processed.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Return Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Items to Return:</strong></p>
                <ul>
                  ${returnItems.map(item => `<li>${item.orderItem.productId.name} - Quantity: ${item.quantity}</li>`).join('')}
                </ul>
                <p><strong>Status:</strong> ${order.returnRequest.status}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Track Return Status
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send return confirmation notification:', error);
    }
  }

  // Send reship confirmation notification
  private async sendReshipConfirmationNotification(order: any): Promise<void> {
    try {
      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Reship Request Submitted',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>📦 Reship Request Submitted</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your reship request has been submitted and is being processed.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Reship Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Reason:</strong> ${order.reshipRequest.reason}</p>
                <p><strong>Status:</strong> ${order.reshipRequest.status}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Track Reship Status
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send reship confirmation notification:', error);
    }
  }

  // Send tracking notification
  private async sendTrackingNotification(order: any, trackingNumber: string, carrier: string): Promise<void> {
    try {
      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Your Order Has Been Shipped!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>🚚 Your Order Has Been Shipped!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Great news! Your order has been shipped and is on its way to you.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Shipping Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
                <p><strong>Carrier:</strong> ${carrier}</p>
                <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery?.toLocaleDateString()}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/track/${trackingNumber}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Track Package
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send tracking notification:', error);
    }
  }

  // Send payment confirmation notification
  private async sendPaymentConfirmationNotification(order: any): Promise<void> {
    try {
      const user = await User.findById(order.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Payment Confirmed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>💳 Payment Confirmed</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your payment has been confirmed successfully.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Payment Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <p><strong>Transaction ID:</strong> ${order.transactionId}</p>
                <p><strong>Paid At:</strong> ${order.paidAt?.toLocaleString()}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/orders/${order._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Order Details
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send payment confirmation notification:', error);
    }
  }
}
