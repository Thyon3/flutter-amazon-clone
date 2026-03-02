import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { Review } from '../model/review';
import { EmailService } from './emailService';

export interface NotificationRequest {
  userId: string;
  type: 'order_status' | 'price_drop' | 'product_recommendation' | 'promotion' | 'review_response' | 'wishlist_update' | 'cart_abandoned' | 'delivery_update' | 'security_alert' | 'system_update';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('email' | 'push' | 'sms' | 'in_app' | 'webhook')[];
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: {
    imageUrl?: string;
    actionUrl?: string;
    actionText?: string;
    category?: string;
    tags?: string[];
  };
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  notification?: NotificationInfo;
}

export interface NotificationInfo {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority: string;
  channels: string[];
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'expired';
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject?: string;
  title: string;
  message: string;
  variables: string[];
  channels: string[];
  priority: string;
  metadata?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationStats {
  totalNotifications: number;
  sentNotifications: number;
  deliveredNotifications: number;
  readNotifications: number;
  failedNotifications: number;
  averageDeliveryTime: number;
  channelStats: Record<string, {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
  }>;
  typeStats: Record<string, {
    count: number;
    readRate: number;
    engagementRate: number;
  }>;
  priorityStats: Record<string, {
    count: number;
    deliveryRate: number;
    readRate: number;
  }>;
}

export class NotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create notification
  async createNotification(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      // Validate notification request
      const validation = this.validateNotificationRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Create notification record
      const notification: NotificationInfo = {
        id: this.generateId(),
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        data: request.data,
        priority: request.priority,
        channels: request.channels,
        status: 'pending',
        scheduledAt: request.scheduledAt,
        expiresAt: request.expiresAt,
        metadata: request.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Process notification
      await this.processNotification(notification);

      return {
        success: true,
        message: 'Notification created successfully',
        notification,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create notification: ${error}`,
      };
    }
  }

  // Process notification through channels
  private async processNotification(notification: NotificationInfo): Promise<void> {
    try {
      notification.status = 'sent';
      notification.sentAt = new Date();

      // Process each channel
      for (const channel of notification.channels) {
        await this.sendToChannel(notification, channel);
      }

      notification.status = 'delivered';
      notification.deliveredAt = new Date();

    } catch (error) {
      notification.status = 'failed';
      console.error('Failed to process notification:', error);
    }
  }

  // Send notification to specific channel
  private async sendToChannel(notification: NotificationInfo, channel: string): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(notification);
          break;
        case 'push':
          await this.sendPushNotification(notification);
          break;
        case 'sms':
          await this.sendSMSNotification(notification);
          break;
        case 'in_app':
          await this.sendInAppNotification(notification);
          break;
        case 'webhook':
          await this.sendWebhookNotification(notification);
          break;
        default:
          console.warn(`Unknown notification channel: ${channel}`);
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error);
    }
  }

  // Send email notification
  private async sendEmailNotification(notification: NotificationInfo): Promise<void> {
    try {
      const user = await User.findById(notification.userId);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: notification.title,
        html: this.generateEmailHTML(notification),
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      throw new Error(`Failed to send email notification: ${error}`);
    }
  }

  // Send push notification
  private async sendPushNotification(notification: NotificationInfo): Promise<void> {
    try {
      // In a real implementation, you'd use FCM, APNs, or other push services
      console.log(`Push notification sent to user ${notification.userId}: ${notification.title}`);
    } catch (error) {
      throw new Error(`Failed to send push notification: ${error}`);
    }
  }

  // Send SMS notification
  private async sendSMSNotification(notification: NotificationInfo): Promise<void> {
    try {
      // In a real implementation, you'd use Twilio, SendGrid, or other SMS services
      const user = await User.findById(notification.userId);
      if (!user || !user.phone) return;

      console.log(`SMS notification sent to ${user.phone}: ${notification.title}`);
    } catch (error) {
      throw new Error(`Failed to send SMS notification: ${error}`);
    }
  }

  // Send in-app notification
  private async sendInAppNotification(notification: NotificationInfo): Promise<void> {
    try {
      // In a real implementation, you'd store in database for real-time fetching
      console.log(`In-app notification created for user ${notification.userId}: ${notification.title}`);
    } catch (error) {
      throw new Error(`Failed to create in-app notification: ${error}`);
    }
  }

  // Send webhook notification
  private async sendWebhookNotification(notification: NotificationInfo): Promise<void> {
    try {
      // In a real implementation, you'd send HTTP request to webhook URL
      console.log(`Webhook notification sent for user ${notification.userId}: ${notification.title}`);
    } catch (error) {
      throw new Error(`Failed to send webhook notification: ${error}`);
    }
  }

  // Generate email HTML
  private generateEmailHTML(notification: NotificationInfo): string {
    const { title, message, metadata } = notification;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
          <h1>🔔 ${title}</h1>
        </div>
        <div style="padding: 20px;">
          <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p>${message}</p>
          </div>
          
          ${metadata?.imageUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${metadata.imageUrl}" alt="${title}" style="max-width: 100%; height: auto; border-radius: 5px;">
            </div>
          ` : ''}
          
          ${metadata?.actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${metadata.actionUrl}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                ${metadata.actionText || 'View Details'}
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Create bulk notifications
  async createBulkNotifications(requests: NotificationRequest[]): Promise<NotificationResponse> {
    try {
      const results: NotificationInfo[] = [];
      let successCount = 0;
      let failureCount = 0;

      for (const request of requests) {
        try {
          const response = await this.createNotification(request);
          if (response.success && response.notification) {
            results.push(response.notification);
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
          console.error(`Failed to create notification for user ${request.userId}:`, error);
        }
      }

      return {
        success: successCount > 0,
        message: `Bulk notifications created: ${successCount} success, ${failureCount} failures`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create bulk notifications: ${error}`,
      };
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    filters?: {
      type?: string;
      status?: string;
      priority?: string;
      channel?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: NotificationInfo[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let query: any = { userId };

      // Apply filters
      if (filters) {
        if (filters.type) query.type = filters.type;
        if (filters.status) query.status = filters.status;
        if (filters.priority) query.priority = filters.priority;
        if (filters.channel) query.channels = { $in: [filters.channel] };
        if (filters.startDate || filters.endDate) {
          query.createdAt = {};
          if (filters.startDate) query.createdAt.$gte = filters.startDate;
          if (filters.endDate) query.createdAt.$lte = filters.endDate;
        }
      }

      // In a real implementation, you'd query database
      // For now, return mock data
      const notifications: NotificationInfo[] = [
        {
          id: '1',
          userId,
          type: 'order_status',
          title: 'Order Shipped',
          message: 'Your order #12345 has been shipped and is on its way!',
          priority: 'medium',
          channels: ['email', 'push'],
          status: 'delivered',
          sentAt: new Date(Date.now() - 3600000),
          deliveredAt: new Date(Date.now() - 3000000),
          metadata: {
            actionUrl: '/orders/12345',
            actionText: 'Track Order',
          },
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date(Date.now() - 3600000),
        },
        {
          id: '2',
          userId,
          type: 'price_drop',
          title: 'Price Drop Alert',
          message: 'A product in your wishlist is now on sale!',
          priority: 'medium',
          channels: ['email', 'push'],
          status: 'delivered',
          sentAt: new Date(Date.now() - 7200000),
          deliveredAt: new Date(Date.now() - 7000000),
          metadata: {
            imageUrl: '/products/product1.jpg',
            actionUrl: '/products/123',
            actionText: 'View Deal',
          },
          createdAt: new Date(Date.now() - 7200000),
          updatedAt: new Date(Date.now() - 7200000),
        },
      ];

      return {
        notifications: notifications.slice(skip, skip + limit),
        total: notifications.length,
      };
    } catch (error) {
      throw new Error(`Failed to get user notifications: ${error}`);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, you'd update database
      console.log(`Notification ${notificationId} marked as read by user ${userId}`);
      
      return {
        success: true,
        message: 'Notification marked as read',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to mark notification as read: ${error}`,
      };
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, you'd update database
      console.log(`All notifications marked as read for user ${userId}`);
      
      return {
        success: true,
        message: 'All notifications marked as read',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to mark all notifications as read: ${error}`,
      };
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, you'd delete from database
      console.log(`Notification ${notificationId} deleted by user ${userId}`);
      
      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete notification: ${error}`,
      };
    }
  }

  // Create notification template
  async createTemplate(template: Partial<NotificationTemplate>): Promise<{ success: boolean; message: string; template?: NotificationTemplate }> {
    try {
      const newTemplate: NotificationTemplate = {
        id: this.generateId(),
        name: template.name || '',
        type: template.type || '',
        title: template.title || '',
        message: template.message || '',
        variables: template.variables || [],
        channels: template.channels || ['email'],
        priority: template.priority || 'medium',
        metadata: template.metadata || {},
        isActive: template.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // In a real implementation, you'd save to database
      console.log(`Notification template created: ${newTemplate.name}`);

      return {
        success: true,
        message: 'Template created successfully',
        template: newTemplate,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create template: ${error}`,
      };
    }
  }

  // Get notification templates
  async getTemplates(type?: string): Promise<NotificationTemplate[]> {
    try {
      // In a real implementation, you'd fetch from database
      const templates: NotificationTemplate[] = [
        {
          id: '1',
          name: 'Order Status Update',
          type: 'order_status',
          title: 'Order {{status}}',
          message: 'Your order #{{orderId}} has been {{status}}.',
          variables: ['status', 'orderId'],
          channels: ['email', 'push', 'sms'],
          priority: 'medium',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Price Drop Alert',
          type: 'price_drop',
          title: 'Price Drop Alert',
          message: '{{productName}} is now on sale for ${{newPrice}}!',
          variables: ['productName', 'newPrice'],
          channels: ['email', 'push'],
          priority: 'medium',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return type ? templates.filter(t => t.type === type) : templates;
    } catch (error) {
      throw new Error(`Failed to get templates: ${error}`);
    }
  }

  // Send notification using template
  async sendFromTemplate(
    templateId: string,
    userId: string,
    variables: Record<string, any>,
    channels?: string[]
  ): Promise<NotificationResponse> {
    try {
      const templates = await this.getTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        return {
          success: false,
          message: 'Template not found',
        };
      }

      // Replace variables in title and message
      let title = template.title;
      let message = template.message;

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        title = title.replace(regex, value);
        message = message.replace(regex, value);
      }

      const notification: NotificationRequest = {
        userId,
        type: template.type as any,
        title,
        message,
        channels: channels || template.channels,
        priority: template.priority as any,
        metadata: template.metadata,
      };

      return await this.createNotification(notification);
    } catch (error) {
      return {
        success: false,
        message: `Failed to send from template: ${error}`,
      };
    }
  }

  // Get notification statistics
  async getNotificationStats(
    filters?: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      type?: string;
    }
  ): Promise<NotificationStats> {
    try {
      // In a real implementation, you'd calculate from database
      const stats: NotificationStats = {
        totalNotifications: 1000,
        sentNotifications: 950,
        deliveredNotifications: 900,
        readNotifications: 450,
        failedNotifications: 50,
        averageDeliveryTime: 2.5, // seconds
        channelStats: {
          email: { sent: 400, delivered: 380, read: 200, failed: 20, deliveryRate: 95, readRate: 52.6 },
          push: { sent: 350, delivered: 320, read: 180, failed: 30, deliveryRate: 91.4, readRate: 56.3 },
          sms: { sent: 150, delivered: 145, read: 60, failed: 5, deliveryRate: 96.7, readRate: 41.4 },
          in_app: { sent: 50, delivered: 50, read: 10, failed: 0, deliveryRate: 100, readRate: 20 },
        },
        typeStats: {
          order_status: { count: 300, readRate: 65, engagementRate: 75 },
          price_drop: { count: 200, readRate: 80, engagementRate: 90 },
          promotion: { count: 250, readRate: 45, engagementRate: 60 },
          review_response: { count: 100, readRate: 70, engagementRate: 85 },
          wishlist_update: { count: 80, readRate: 55, engagementRate: 70 },
          cart_abandoned: { count: 50, readRate: 40, engagementRate: 50 },
          delivery_update: { count: 20, readRate: 90, engagementRate: 95 },
        },
        priorityStats: {
          urgent: { count: 50, deliveryRate: 98, readRate: 85 },
          high: { count: 200, deliveryRate: 95, readRate: 70 },
          medium: { count: 500, deliveryRate: 92, readRate: 50 },
          low: { count: 250, deliveryRate: 88, readRate: 35 },
        },
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to get notification stats: ${error}`);
    }
  }

  // Schedule notification
  async scheduleNotification(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      // Add scheduledAt if not provided (default to 1 hour from now)
      if (!request.scheduledAt) {
        request.scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
      }

      return await this.createNotification(request);
    } catch (error) {
      return {
        success: false,
        message: `Failed to schedule notification: ${error}`,
      };
    }
  }

  // Cancel scheduled notification
  async cancelScheduledNotification(notificationId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, you'd update database
      console.log(`Scheduled notification ${notificationId} cancelled by user ${userId}`);
      
      return {
        success: true,
        message: 'Scheduled notification cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to cancel scheduled notification: ${error}`,
      };
    }
  }

  // Get user notification preferences
  async getUserNotificationPreferences(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      return {
        email: user.preferences?.emailNotifications !== false,
        push: user.preferences?.pushNotifications !== false,
        sms: user.preferences?.smsNotifications !== false,
        in_app: user.preferences?.inAppNotifications !== false,
        marketing: user.preferences?.marketingEmails !== false,
        orderUpdates: user.preferences?.orderUpdates !== false,
        priceAlerts: user.preferences?.priceAlerts !== false,
        newsletter: user.preferences?.newsletter !== false,
      };
    } catch (error) {
      throw new Error(`Failed to get user notification preferences: ${error}`);
    }
  }

  // Update user notification preferences
  async updateNotificationPreferences(
    userId: string,
    preferences: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      in_app?: boolean;
      marketing?: boolean;
      orderUpdates?: boolean;
      priceAlerts?: boolean;
      newsletter?: boolean;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Update preferences
      if (user.preferences) {
        if (preferences.email !== undefined) user.preferences.emailNotifications = preferences.email;
        if (preferences.push !== undefined) user.preferences.pushNotifications = preferences.push;
        if (preferences.sms !== undefined) user.preferences.smsNotifications = preferences.sms;
        if (preferences.in_app !== undefined) user.preferences.inAppNotifications = preferences.in_app;
        if (preferences.marketing !== undefined) user.preferences.marketingEmails = preferences.marketing;
        if (preferences.orderUpdates !== undefined) user.preferences.orderUpdates = preferences.orderUpdates;
        if (preferences.priceAlerts !== undefined) user.preferences.priceAlerts = preferences.priceAlerts;
        if (preferences.newsletter !== undefined) user.preferences.newsletter = preferences.newsletter;
      }

      await user.save();

      return {
        success: true,
        message: 'Notification preferences updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update notification preferences: ${error}`,
      };
    }
  }

  // Validate notification request
  private validateNotificationRequest(request: NotificationRequest): { valid: boolean; message: string } {
    if (!request.userId) {
      return { valid: false, message: 'User ID is required' };
    }

    if (!request.title || !request.message) {
      return { valid: false, message: 'Title and message are required' };
    }

    if (!request.channels || request.channels.length === 0) {
      return { valid: false, message: 'At least one channel is required' };
    }

    const validChannels = ['email', 'push', 'sms', 'in_app', 'webhook'];
    const invalidChannels = request.channels.filter(channel => !validChannels.includes(channel));
    if (invalidChannels.length > 0) {
      return { valid: false, message: `Invalid channels: ${invalidChannels.join(', ')}` };
    }

    return { valid: true, message: 'Notification request is valid' };
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Cleanup expired notifications
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      // In a real implementation, you'd delete expired notifications from database
      console.log('Expired notifications cleaned up');
      return 100; // Mock number of cleaned notifications
    } catch (error) {
      console.error('Failed to cleanup expired notifications:', error);
      return 0;
    }
  }

  // Get real-time notification stream
  async getNotificationStream(userId: string): Promise<any> {
    try {
      // In a real implementation, you'd use WebSockets or Server-Sent Events
      return {
        stream: 'notification_stream_' + userId,
        endpoint: '/notifications/stream/' + userId,
        protocol: 'websocket',
      };
    } catch (error) {
      throw new Error(`Failed to get notification stream: ${error}`);
    }
  }

  // Send batch notifications
  async sendBatchNotifications(notifications: NotificationRequest[]): Promise<{
    success: boolean;
    total: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        for (const notification of batch) {
          try {
            const result = await this.createNotification(notification);
            if (result.success) {
              sent++;
            } else {
              failed++;
              errors.push(`Failed to send notification to ${notification.userId}: ${result.message}`);
            }
          } catch (error) {
            failed++;
            errors.push(`Error sending notification to ${notification.userId}: ${error.message}`);
          }
        }

        // Add delay between batches to avoid overwhelming services
        if (i + batchSize < notifications.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: sent > 0,
        total: notifications.length,
        sent,
        failed,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        total: 0,
        sent: 0,
        failed: 0,
        errors: [`Batch processing failed: ${error.message}`],
      };
    }
  }
}
