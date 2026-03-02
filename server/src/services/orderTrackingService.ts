import { OrderTracking, IOrderTracking } from '../model/orderTracking';
import { Order } from '../model/order';
import { User } from '../model/user';
import { EmailService } from './emailService';
import { randomBytes } from 'crypto';

export interface TrackingRequest {
  orderId: string;
  carrier: string;
  estimatedDelivery: Date;
  recipientInfo: {
    name: string;
    phone: string;
    email: string;
  };
  deliveryInstructions?: string;
  metadata?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    serviceType?: string;
    signatureRequired?: boolean;
  };
}

export interface TrackingResponse {
  success: boolean;
  trackingId?: string;
  trackingNumber?: string;
  message: string;
  tracking?: IOrderTracking;
}

export interface TrackingEvent {
  status: string;
  location: string;
  description: string;
  isMilestone?: boolean;
}

export interface TrackingStats {
  totalTrackedOrders: number;
  deliveredOrders: number;
  inTransitOrders: number;
  delayedOrders: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  carrierPerformance: Array<{
    carrier: string;
    totalOrders: number;
    onTimeRate: number;
    averageTime: number;
  }>;
}

export class OrderTrackingService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create new order tracking
  async createTracking(request: TrackingRequest): Promise<TrackingResponse> {
    try {
      // Check if order exists
      const order = await Order.findById(request.orderId);
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      // Generate tracking number
      const trackingNumber = this.generateTrackingNumber();

      const tracking = new OrderTracking({
        orderId: request.orderId,
        trackingNumber,
        carrier: request.carrier,
        estimatedDelivery: request.estimatedDelivery,
        recipientInfo: request.recipientInfo,
        deliveryInstructions: request.deliveryInstructions,
        metadata: request.metadata,
        trackingEvents: [{
          timestamp: new Date(),
          status: 'pending',
          location: 'Processing Center',
          description: 'Order created and awaiting pickup',
          isMilestone: true,
        }],
      });

      await tracking.save();

      // Send initial tracking notification
      await this.sendTrackingNotification(tracking, 'tracking_created');

      return {
        success: true,
        trackingId: tracking._id.toString(),
        trackingNumber,
        message: 'Order tracking created successfully',
        tracking,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create tracking: ${error}`,
      };
    }
  }

  // Get tracking by tracking number
  async getTrackingByNumber(trackingNumber: string): Promise<IOrderTracking | null> {
    try {
      const tracking = await OrderTracking.findOne({ trackingNumber })
        .populate('orderId', 'items totalAmount createdAt');

      return tracking;
    } catch (error) {
      throw new Error(`Failed to get tracking: ${error}`);
    }
  }

  // Get tracking by order ID
  async getTrackingByOrderId(orderId: string): Promise<IOrderTracking | null> {
    try {
      const tracking = await OrderTracking.findOne({ orderId })
        .populate('orderId', 'items totalAmount createdAt');

      return tracking;
    } catch (error) {
      throw new Error(`Failed to get tracking: ${error}`);
    }
  }

  // Update tracking status
  async updateTrackingStatus(
    trackingNumber: string,
    status: IOrderTracking['status'],
    event: TrackingEvent,
    currentLocation?: IOrderTracking['currentLocation']
  ): Promise<TrackingResponse> {
    try {
      const tracking = await OrderTracking.findOne({ trackingNumber });
      
      if (!tracking) {
        return {
          success: false,
          message: 'Tracking not found',
        };
      }

      // Update status
      tracking.status = status;
      
      // Add tracking event
      tracking.trackingEvents.push({
        timestamp: new Date(),
        status: event.status,
        location: event.location,
        description: event.description,
        isMilestone: event.isMilestone || false,
      });

      // Update current location if provided
      if (currentLocation) {
        tracking.currentLocation = currentLocation;
      }

      // Set actual delivery time if delivered
      if (status === 'delivered') {
        tracking.actualDelivery = new Date();
      }

      await tracking.save();

      // Send notification
      await this.sendTrackingNotification(tracking, 'status_updated');

      return {
        success: true,
        message: 'Tracking status updated successfully',
        tracking,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update tracking status: ${error}`,
      };
    }
  }

  // Get user's tracked orders
  async getUserTrackedOrders(
    userId: string,
    status?: IOrderTracking['status'],
    page: number = 1,
    limit: number = 20
  ): Promise<{ trackings: IOrderTracking[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // First get user's orders
      const orders = await Order.find({ user: userId }).select('_id');
      const orderIds = orders.map(order => order._id.toString());

      let filter: any = { orderId: { $in: orderIds } };
      
      if (status) {
        filter.status = status;
      }

      const trackings = await OrderTracking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'items totalAmount createdAt');

      const total = await OrderTracking.countDocuments(filter);

      return { trackings, total };
    } catch (error) {
      throw new Error(`Failed to get user tracked orders: ${error}`);
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(
    trackingNumber: string,
    notifications: Partial<IOrderTracking['notifications']>
  ): Promise<TrackingResponse> {
    try {
      const tracking = await OrderTracking.findOne({ trackingNumber });
      
      if (!tracking) {
        return {
          success: false,
          message: 'Tracking not found',
        };
      }

      Object.assign(tracking.notifications, notifications);
      await tracking.save();

      return {
        success: true,
        message: 'Notification preferences updated successfully',
        tracking,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update notification preferences: ${error}`,
      };
    }
  }

  // Get tracking statistics
  async getTrackingStats(): Promise<TrackingStats> {
    try {
      const totalTrackedOrders = await OrderTracking.countDocuments();
      const deliveredOrders = await OrderTracking.countDocuments({ status: 'delivered' });
      const inTransitOrders = await OrderTracking.countDocuments({ status: 'in_transit' });
      const delayedOrders = await OrderTracking.countDocuments({ status: 'delayed' });

      // Calculate average delivery time
      const deliveredTrackings = await OrderTracking.find({ 
        status: 'delivered',
        actualDelivery: { $exists: true },
        createdAt: { $exists: true },
      });

      let totalDeliveryTime = 0;
      deliveredTrackings.forEach(tracking => {
        if (tracking.actualDelivery && tracking.createdAt) {
          const deliveryTime = tracking.actualDelivery.getTime() - tracking.createdAt.getTime();
          totalDeliveryTime += deliveryTime;
        }
      });

      const averageDeliveryTime = deliveredTrackings.length > 0 
        ? totalDeliveryTime / deliveredTrackings.length / (1000 * 60 * 60 * 24) // in days
        : 0;

      // Calculate on-time delivery rate
      const onTimeDeliveries = deliveredTrackings.filter(tracking => 
        tracking.actualDelivery && tracking.estimatedDelivery &&
        tracking.actualDelivery <= tracking.estimatedDelivery
      ).length;

      const onTimeDeliveryRate = deliveredTrackings.length > 0 
        ? (onTimeDeliveries / deliveredTrackings.length) * 100 
        : 0;

      // Carrier performance
      const carrierStats = await OrderTracking.aggregate([
        {
          $group: {
            _id: '$carrier',
            totalOrders: { $sum: 1 },
            deliveredOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
              }
            },
            avgDeliveryTime: {
              $avg: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ['$status', 'delivered'] },
                      { $exists: '$actualDelivery' },
                      { $exists: '$createdAt' }
                    ]
                  },
                  { $divide: [{ $subtract: ['$actualDelivery', '$createdAt'] }, 1000 * 60 * 60 * 24] },
                  null
                ]
              }
            },
          },
        },
        {
          $project: {
            carrier: '$_id',
            totalOrders: 1,
            deliveredOrders: 1,
            onTimeRate: { $multiply: [{ $divide: ['$deliveredOrders', '$totalOrders'] }, 100] },
            averageTime: '$avgDeliveryTime',
          },
        },
        { $sort: { totalOrders: -1 } },
      ]);

      return {
        totalTrackedOrders,
        deliveredOrders,
        inTransitOrders,
        delayedOrders,
        averageDeliveryTime: Math.round(averageDeliveryTime * 10) / 10,
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
        carrierPerformance: carrierStats,
      };
    } catch (error) {
      throw new Error(`Failed to get tracking stats: ${error}`);
    }
  }

  // Get real-time tracking updates
  async getRealTimeUpdates(trackingNumber: string): Promise<any> {
    try {
      const tracking = await OrderTracking.findOne({ trackingNumber });
      
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      // In a real app, you'd integrate with carrier APIs
      // For now, we'll simulate real-time updates
      const simulatedUpdates = this.simulateRealTimeUpdates(tracking);

      return {
        tracking,
        realTimeUpdates: simulatedUpdates,
        estimatedArrival: this.calculateEstimatedArrival(tracking),
        deliveryProgress: this.calculateDeliveryProgress(tracking),
      };
    } catch (error) {
      throw new Error(`Failed to get real-time updates: ${error}`);
    }
  }

  // Send tracking notification
  private async sendTrackingNotification(tracking: IOrderTracking, type: string): Promise<void> {
    try {
      const order = await Order.findById(tracking.orderId);
      if (!order) return;

      const emailData = {
        to: tracking.recipientInfo.email,
        subject: this.getNotificationSubject(type, tracking.trackingNumber),
        html: this.getNotificationEmail(type, tracking, order),
      };

      if (tracking.notifications.email) {
        await this.emailService.sendEmail(emailData);
      }

      // In a real app, you'd also send SMS and push notifications
      if (tracking.notifications.sms) {
        await this.sendSMSNotification(tracking, type);
      }
    } catch (error) {
      console.error('Failed to send tracking notification:', error);
    }
  }

  // Get notification subject
  private getNotificationSubject(type: string, trackingNumber: string): string {
    switch (type) {
      case 'tracking_created':
        return `Your Order is on its Way! - Tracking #${trackingNumber}`;
      case 'status_updated':
        return `Update on Your Order - Tracking #${trackingNumber}`;
      case 'delivered':
        return `Your Order Has Been Delivered! - Tracking #${trackingNumber}`;
      default:
        return `Order Tracking Update - Tracking #${trackingNumber}`;
    }
  }

  // Get notification email content
  private getNotificationEmail(type: string, tracking: IOrderTracking, order: any): string {
    const baseUrl = 'https://yourapp.com';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
          <h1>📦 Order Tracking Update</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Hi ${tracking.recipientInfo.name},</h2>
          <p>${this.getNotificationMessage(type, tracking)}</p>
          
          <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Tracking Details:</h3>
            <p><strong>Tracking Number:</strong> ${tracking.trackingNumber}</p>
            <p><strong>Carrier:</strong> ${tracking.carrier}</p>
            <p><strong>Status:</strong> ${tracking.status}</p>
            <p><strong>Estimated Delivery:</strong> ${tracking.estimatedDelivery.toLocaleDateString()}</p>
            ${tracking.currentLocation ? `<p><strong>Current Location:</strong> ${tracking.currentLocation.city}, ${tracking.currentLocation.state}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/track/${tracking.trackingNumber}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Track Your Package
            </a>
          </div>

          ${tracking.deliveryInstructions ? `
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4>Delivery Instructions:</h4>
              <p>${tracking.deliveryInstructions}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Get notification message
  private getNotificationMessage(type: string, tracking: IOrderTracking): string {
    switch (type) {
      case 'tracking_created':
        return 'Your order has been shipped and is on its way to you!';
      case 'status_updated':
        return 'There has been an update to your order status.';
      case 'delivered':
        return 'Great news! Your order has been delivered successfully.';
      default:
        return 'Your order tracking has been updated.';
    }
  }

  // Send SMS notification
  private async sendSMSNotification(tracking: IOrderTracking, type: string): Promise<void> {
    // In a real app, you'd integrate with SMS service like Twilio
    console.log(`SMS notification sent to ${tracking.recipientInfo.phone}: ${this.getNotificationMessage(type, tracking)}`);
  }

  // Generate tracking number
  private generateTrackingNumber(): string {
    const prefix = 'AMZ';
    const randomPart = randomBytes(6).toString('hex').toUpperCase();
    const checksum = this.calculateChecksum(randomPart);
    return `${prefix}${randomPart}${checksum}`;
  }

  // Calculate checksum for tracking number
  private calculateChecksum(input: string): string {
    // Simple checksum calculation
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input.charCodeAt(i);
    }
    return (sum % 10).toString();
  }

  // Simulate real-time updates
  private simulateRealTimeUpdates(tracking: IOrderTracking): any[] {
    // In a real app, you'd fetch from carrier APIs
    return [
      {
        timestamp: new Date(),
        type: 'location_update',
        message: 'Package is currently in transit',
        location: tracking.currentLocation,
      },
    ];
  }

  // Calculate estimated arrival
  private calculateEstimatedArrival(tracking: IOrderTracking): Date {
    // Simple calculation based on current status and estimated delivery
    const now = new Date();
    const timeToDelivery = tracking.estimatedDelivery.getTime() - now.getTime();
    
    if (timeToDelivery > 0) {
      return tracking.estimatedDelivery;
    }
    
    // If past estimated delivery, add buffer time
    const bufferTime = 24 * 60 * 60 * 1000; // 24 hours
    return new Date(now.getTime() + bufferTime);
  }

  // Calculate delivery progress
  private calculateDeliveryProgress(tracking: IOrderTracking): number {
    const statusProgress = {
      pending: 0,
      picked_up: 20,
      in_transit: 50,
      out_for_delivery: 80,
      delivered: 100,
      delayed: 0,
      returned: 0,
    };

    return statusProgress[tracking.status] || 0;
  }

  // Search trackings
  async searchTrackings(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ trackings: IOrderTracking[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');

      const trackings = await OrderTracking.find({
        $or: [
          { trackingNumber: searchRegex },
          { carrier: searchRegex },
          { 'trackingEvents.location': searchRegex },
          { 'trackingEvents.description': searchRegex },
        ],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'items totalAmount createdAt');

      const total = await OrderTracking.countDocuments({
        $or: [
          { trackingNumber: searchRegex },
          { carrier: searchRegex },
          { 'trackingEvents.location': searchRegex },
          { 'trackingEvents.description': searchRegex },
        ],
      });

      return { trackings, total };
    } catch (error) {
      throw new Error(`Failed to search trackings: ${error}`);
    }
  }

  // Get delivery predictions
  async getDeliveryPredictions(trackingNumber: string): Promise<any> {
    try {
      const tracking = await OrderTracking.findOne({ trackingNumber });
      
      if (!tracking) {
        throw new Error('Tracking not found');
      }

      // Analyze historical data for predictions
      const similarTrackings = await OrderTracking.find({
        carrier: tracking.carrier,
        status: 'delivered',
        actualDelivery: { $exists: true },
        estimatedDelivery: { $exists: true },
      });

      const averageDelay = this.calculateAverageDelay(similarTrackings);
      const onTimeProbability = this.calculateOnTimeProbability(similarTrackings);

      return {
        currentEstimate: tracking.estimatedDelivery,
        adjustedEstimate: this.getAdjustedEstimate(tracking, averageDelay),
        onTimeProbability,
        riskFactors: this.identifyRiskFactors(tracking),
      };
    } catch (error) {
      throw new Error(`Failed to get delivery predictions: ${error}`);
    }
  }

  // Calculate average delay
  private calculateAverageDelay(trackings: IOrderTracking[]): number {
    if (trackings.length === 0) return 0;

    const totalDelay = trackings.reduce((sum, tracking) => {
      if (tracking.actualDelivery && tracking.estimatedDelivery) {
        return sum + (tracking.actualDelivery.getTime() - tracking.estimatedDelivery.getTime());
      }
      return sum;
    }, 0);

    return totalDelay / trackings.length / (1000 * 60 * 60 * 24); // in days
  }

  // Calculate on-time probability
  private calculateOnTimeProbability(trackings: IOrderTracking[]): number {
    if (trackings.length === 0) return 0.5; // Default 50%

    const onTimeCount = trackings.filter(tracking => 
      tracking.actualDelivery && tracking.estimatedDelivery &&
      tracking.actualDelivery <= tracking.estimatedDelivery
    ).length;

    return onTimeCount / trackings.length;
  }

  // Get adjusted estimate
  private getAdjustedEstimate(tracking: IOrderTracking, averageDelay: number): Date {
    const adjustedTime = tracking.estimatedDelivery.getTime() + (averageDelay * 24 * 60 * 60 * 1000);
    return new Date(adjustedTime);
  }

  // Identify risk factors
  private identifyRiskFactors(tracking: IOrderTracking): string[] {
    const riskFactors: string[] = [];

    if (tracking.status === 'delayed') {
      riskFactors.push('Package is currently delayed');
    }

    const now = new Date();
    const daysSinceCreation = (now.getTime() - tracking.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation > 7) {
      riskFactors.push('Package has been in transit for over 7 days');
    }

    if (tracking.carrier === 'USPS' && tracking.metadata?.serviceType === 'Standard') {
      riskFactors.push('Standard shipping may have longer delivery times');
    }

    return riskFactors;
  }
}
