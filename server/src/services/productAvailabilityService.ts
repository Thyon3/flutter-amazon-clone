import { User } from '../model/user';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface AvailabilityAlertRequest {
  userId: string;
  productId: string;
  alertType: 'back_in_stock' | 'price_drop' | 'new_arrival' | 'low_stock' | 'discontinued';
  conditions?: {
    priceThreshold?: number;
    stockThreshold?: number;
    variantId?: string;
    size?: string;
    color?: string;
  };
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  expiresAt?: Date;
}

export interface AvailabilityAlertResponse {
  success: boolean;
  message: string;
  alert?: AvailabilityAlert;
}

export interface AvailabilityAlert {
  id: string;
  userId: string;
  productId: string;
  alertType: 'back_in_stock' | 'price_drop' | 'new_arrival' | 'low_stock' | 'discontinued';
  conditions?: any;
  preferences: any;
  status: 'active' | 'triggered' | 'expired' | 'cancelled';
  triggerCount: number;
  lastTriggered?: Date;
  createdAt: Date;
  expiresAt?: Date;
  triggeredAt?: Date;
}

export interface PriceDropAlert {
  id: string;
  userId: string;
  productId: string;
  originalPrice: number;
  targetPrice: number;
  currentPrice: number;
  percentageDrop: number;
  status: 'active' | 'triggered' | 'expired';
  createdAt: Date;
  triggeredAt?: Date;
}

export interface BackInStockAlert {
  id: string;
  userId: string;
  productId: string;
  variantId?: string;
  size?: string;
  color?: string;
  status: 'active' | 'triggered' | 'expired';
  createdAt: Date;
  triggeredAt?: Date;
  stockLevel?: number;
}

export interface AvailabilityStats {
  totalAlerts: number;
  activeAlerts: number;
  triggeredAlerts: number;
  expiredAlerts: number;
  alertsByType: Record<string, number>;
  conversionRate: number;
  averageResponseTime: number;
  topProducts: Array<{
    productId: string;
    name: string;
    alertCount: number;
    conversionRate: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    alertsCreated: number;
    alertsTriggered: number;
    conversions: number;
  }>;
}

export class ProductAvailabilityService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create availability alert
  async createAlert(request: AvailabilityAlertRequest): Promise<AvailabilityAlertResponse> {
    try {
      // Validate request
      const validation = this.validateAlertRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Check if user already has similar alert
      const existingAlert = await this.findExistingAlert(request);
      if (existingAlert) {
        return {
          success: false,
          message: 'You already have an alert for this product and conditions',
        };
      }

      // Create alert
      const alert: AvailabilityAlert = {
        id: this.generateId(),
        userId: request.userId,
        productId: request.productId,
        alertType: request.alertType,
        conditions: request.conditions,
        preferences: request.preferences,
        status: 'active',
        triggerCount: 0,
        createdAt: new Date(),
        expiresAt: request.expiresAt,
      };

      // Save alert
      await this.saveAlert(alert);

      // Send confirmation
      await this.sendAlertConfirmation(alert);

      return {
        success: true,
        message: 'Alert created successfully',
        alert,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create alert: ${error}`,
      };
    }
  }

  // Check and trigger alerts
  async checkAndTriggerAlerts(productId: string, changeType: 'stock' | 'price' | 'status'): Promise<{ success: boolean; message: string; triggered: number }> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          triggered: 0,
        };
      }

      // Get active alerts for this product
      const alerts = await this.getActiveAlerts(productId);
      let triggeredCount = 0;

      for (const alert of alerts) {
        const shouldTrigger = await this.evaluateAlert(alert, product, changeType);
        
        if (shouldTrigger) {
          await this.triggerAlert(alert, product);
          triggeredCount++;
        }
      }

      return {
        success: true,
        message: `Processed ${alerts.length} alerts, triggered ${triggeredCount}`,
        triggered: triggeredCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to check alerts: ${error}`,
        triggered: 0,
      };
    }
  }

  // Get user's alerts
  async getUserAlerts(userId: string, status?: string): Promise<AvailabilityAlert[]> {
    try {
      // In a real app, you'd query database
      return [
        {
          id: '1',
          userId,
          productId: '123',
          alertType: 'back_in_stock',
          conditions: { variantId: '456', size: 'M', color: 'Blue' },
          preferences: {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            frequency: 'immediate',
          },
          status: 'active',
          triggerCount: 0,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: '2',
          userId,
          productId: '124',
          alertType: 'price_drop',
          conditions: { priceThreshold: 50 },
          preferences: {
            emailNotifications: true,
            pushNotifications: false,
            smsNotifications: false,
            frequency: 'immediate',
          },
          status: 'triggered',
          triggerCount: 1,
          lastTriggered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          triggeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get user alerts: ${error}`);
    }
  }

  // Cancel alert
  async cancelAlert(alertId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const alert = await this.getAlert(alertId);
      if (!alert) {
        return {
          success: false,
          message: 'Alert not found',
        };
      }

      if (alert.userId !== userId) {
        return {
          success: false,
          message: 'Unauthorized to cancel this alert',
        };
      }

      alert.status = 'cancelled';
      await this.updateAlert(alert);

      return {
        success: true,
        message: 'Alert cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to cancel alert: ${error}`,
      };
    }
  }

  // Create price drop alert
  async createPriceDropAlert(
    userId: string,
    productId: string,
    targetPrice: number
  ): Promise<{ success: boolean; message: string; alert?: PriceDropAlert }> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      const alert: PriceDropAlert = {
        id: this.generateId(),
        userId,
        productId,
        originalPrice: product.price,
        targetPrice,
        currentPrice: product.price,
        percentageDrop: ((product.price - targetPrice) / product.price) * 100,
        status: 'active',
        createdAt: new Date(),
      };

      // Check if current price already meets target
      if (product.price <= targetPrice) {
        alert.status = 'triggered';
        alert.triggeredAt = new Date();
        await this.sendPriceDropAlert(alert, product);
      }

      await this.savePriceDropAlert(alert);

      return {
        success: true,
        message: 'Price drop alert created successfully',
        alert,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create price drop alert: ${error}`,
      };
    }
  }

  // Create back in stock alert
  async createBackInStockAlert(
    userId: string,
    productId: string,
    options?: {
      variantId?: string;
      size?: string;
      color?: string;
    }
  ): Promise<{ success: boolean; message: string; alert?: BackInStockAlert }> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      const alert: BackInStockAlert = {
        id: this.generateId(),
        userId,
        productId,
        variantId: options?.variantId,
        size: options?.size,
        color: options?.color,
        status: 'active',
        createdAt: new Date(),
        stockLevel: product.stock,
      };

      // Check if product is already in stock
      if (product.stock > 0) {
        alert.status = 'triggered';
        alert.triggeredAt = new Date();
        await this.sendBackInStockAlert(alert, product);
      }

      await this.saveBackInStockAlert(alert);

      return {
        success: true,
        message: 'Back in stock alert created successfully',
        alert,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create back in stock alert: ${error}`,
      };
    }
  }

  // Process expired alerts
  async processExpiredAlerts(): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      const expiredAlerts = await this.getExpiredAlerts();
      let processedCount = 0;

      for (const alert of expiredAlerts) {
        alert.status = 'expired';
        await this.updateAlert(alert);
        processedCount++;

        // Send expiration notification
        await this.sendExpirationNotification(alert);
      }

      return {
        success: true,
        message: `Processed ${processedCount} expired alerts`,
        processed: processedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process expired alerts: ${error}`,
        processed: 0,
      };
    }
  }

  // Get availability statistics
  async getAvailabilityStats(timeRange?: { start: Date; end: Date }): Promise<AvailabilityStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalAlerts: 100000,
        activeAlerts: 75000,
        triggeredAlerts: 20000,
        expiredAlerts: 5000,
        alertsByType: {
          back_in_stock: 40000,
          price_drop: 35000,
          new_arrival: 15000,
          low_stock: 8000,
          discontinued: 2000,
        },
        conversionRate: 0.25,
        averageResponseTime: 2.5, // hours
        topProducts: [
          {
            productId: '1',
            name: 'iPhone 15 Pro',
            alertCount: 5000,
            conversionRate: 0.35,
          },
          {
            productId: '2',
            name: 'Nike Air Max',
            alertCount: 3500,
            conversionRate: 0.28,
          },
          {
            productId: '3',
            name: 'Sony PlayStation 5',
            alertCount: 3000,
            conversionRate: 0.42,
          },
        ],
        monthlyTrends: [
          { month: '2024-01', alertsCreated: 8000, alertsTriggered: 2000, conversions: 500 },
          { month: '2024-02', alertsCreated: 9000, alertsTriggered: 2200, conversions: 550 },
          { month: '2024-03', alertsCreated: 10000, alertsTriggered: 2500, conversions: 625 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get availability stats: ${error}`);
    }
  }

  // Helper methods
  private validateAlertRequest(request: AvailabilityAlertRequest): { valid: boolean; message: string } {
    if (!request.userId) {
      return { valid: false, message: 'User ID is required' };
    }

    if (!request.productId) {
      return { valid: false, message: 'Product ID is required' };
    }

    if (!request.alertType || !['back_in_stock', 'price_drop', 'new_arrival', 'low_stock', 'discontinued'].includes(request.alertType)) {
      return { valid: false, message: 'Invalid alert type' };
    }

    if (!request.preferences) {
      return { valid: false, message: 'Preferences are required' };
    }

    return { valid: true, message: 'Request is valid' };
  }

  private async findExistingAlert(request: AvailabilityAlertRequest): Promise<AvailabilityAlert | null> {
    // In a real app, you'd query database for existing similar alerts
    return null;
  }

  private async getActiveAlerts(productId: string): Promise<AvailabilityAlert[]> {
    // In a real app, you'd query database
    return [];
  }

  private async evaluateAlert(alert: AvailabilityAlert, product: any, changeType: string): Promise<boolean> {
    switch (alert.alertType) {
      case 'back_in_stock':
        return changeType === 'stock' && product.stock > 0 && 
               (!alert.conditions?.variantId || product.variantId === alert.conditions.variantId);

      case 'price_drop':
        return changeType === 'price' && 
               (!alert.conditions?.priceThreshold || product.price <= alert.conditions.priceThreshold);

      case 'low_stock':
        return changeType === 'stock' && 
               product.stock > 0 && product.stock <= (alert.conditions?.stockThreshold || 5);

      case 'discontinued':
        return changeType === 'status' && product.status === 'discontinued';

      case 'new_arrival':
        return changeType === 'status' && product.status === 'active' && 
               product.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      default:
        return false;
    }
  }

  private async triggerAlert(alert: AvailabilityAlert, product: any): Promise<void> {
    alert.status = 'triggered';
    alert.triggerCount++;
    alert.lastTriggered = new Date();
    alert.triggeredAt = new Date();

    await this.updateAlert(alert);

    // Send notification based on alert type
    switch (alert.alertType) {
      case 'back_in_stock':
        await this.sendBackInStockNotification(alert, product);
        break;
      case 'price_drop':
        await this.sendPriceDropNotification(alert, product);
        break;
      case 'low_stock':
        await this.sendLowStockNotification(alert, product);
        break;
      case 'discontinued':
        await this.sendDiscontinuedNotification(alert, product);
        break;
      case 'new_arrival':
        await this.sendNewArrivalNotification(alert, product);
        break;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async getProduct(productId: string): Promise<any> {
    // In a real app, you'd query database
    return {
      id: productId,
      name: 'Sample Product',
      price: 99.99,
      stock: 10,
      status: 'active',
      createdAt: new Date(),
    };
  }

  private async saveAlert(alert: AvailabilityAlert): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Alert saved: ${alert.id}`);
  }

  private async updateAlert(alert: AvailabilityAlert): Promise<void> {
    // In a real app, you'd update database
    console.log(`Alert updated: ${alert.id}`);
  }

  private async savePriceDropAlert(alert: PriceDropAlert): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Price drop alert saved: ${alert.id}`);
  }

  private async saveBackInStockAlert(alert: BackInStockAlert): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Back in stock alert saved: ${alert.id}`);
  }

  private async getAlert(alertId: string): Promise<AvailabilityAlert | null> {
    // In a real app, you'd query database
    return null;
  }

  private async getExpiredAlerts(): Promise<AvailabilityAlert[]> {
    // In a real app, you'd query database
    return [];
  }

  // Email notification methods
  private async sendAlertConfirmation(alert: AvailabilityAlert): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com', // Would get from user record
        subject: 'Alert Created Successfully',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>🔔 Alert Created!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your alert has been set up</h2>
              <p>We'll notify you when your alert conditions are met.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Alert Details</h4>
                <p><strong>Type:</strong> ${alert.alertType.replace('_', ' ')}</p>
                <p><strong>Product:</strong> Product ID ${alert.productId}</p>
                <p><strong>Created:</strong> ${alert.createdAt.toLocaleString()}</p>
                ${alert.expiresAt ? `<p><strong>Expires:</strong> ${alert.expiresAt.toLocaleDateString()}</p>` : ''}
              </div>

              <p>You can manage your alerts from your account settings.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send alert confirmation:', error);
    }
  }

  private async sendBackInStockNotification(alert: AvailabilityAlert, product: any): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Good News! Your item is back in stock',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>✅ Back in Stock!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Great news!</h2>
              <p>The product you're interested in is now available.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Product Details</h4>
                <p><strong>Name:</strong> ${product.name}</p>
                <p><strong>Price:</strong> $${product.price.toFixed(2)}</p>
                <p><strong>Stock:</strong> ${product.stock} available</p>
                ${alert.conditions?.size ? `<p><strong>Size:</strong> ${alert.conditions.size}</p>` : ''}
                ${alert.conditions?.color ? `<p><strong>Color:</strong> ${alert.conditions.color}</p>` : ''}
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="/products/${product.id}" style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Shop Now
                </a>
              </div>

              <p>Hurry while supplies last!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send back in stock notification:', error);
    }
  }

  private async sendPriceDropNotification(alert: AvailabilityAlert, product: any): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Price Drop Alert! Save on your wishlist item',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>💰 Price Drop!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Good news!</h2>
              <p>The price of your tracked product has dropped.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Price Details</h4>
                <p><strong>Product:</strong> ${product.name}</p>
                <p><strong>New Price:</strong> <span style="color: #28a745; font-size: 18px;">$${product.price.toFixed(2)}</span></p>
                <p><strong>Your Target:</strong> $${alert.conditions?.priceThreshold?.toFixed(2) || 'N/A'}</p>
                <p><strong>Savings:</strong> <span style="color: #dc3545;">$${((alert.conditions?.priceThreshold || 0) - product.price).toFixed(2)}</span></p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="/products/${product.id}" style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Buy Now
                </a>
              </div>

              <p>This offer won't last long!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send price drop notification:', error);
    }
  }

  private async sendLowStockNotification(alert: AvailabilityAlert, product: any): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Low Stock Alert - Limited Time',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ffc107; color: #000; padding: 20px; text-align: center;">
              <h1>⚠️ Low Stock Alert</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Act fast!</h2>
              <p>The product you're interested in is running low on stock.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Stock Information</h4>
                <p><strong>Product:</strong> ${product.name}</p>
                <p><strong>Current Stock:</strong> <span style="color: #dc3545; font-weight: bold;">${product.stock} left</span></p>
                <p><strong>Price:</strong> $${product.price.toFixed(2)}</p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="/products/${product.id}" style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Buy Now
                </a>
              </div>

              <p>Once it's gone, it might be gone for good!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send low stock notification:', error);
    }
  }

  private async sendDiscontinuedNotification(alert: AvailabilityAlert, product: any): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Product Discontinued',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1>🚫 Product Discontinued</h1>
            </div>
            <div style="padding: 20px;">
              <h2>We're sorry</h2>
              <p>The product you were tracking has been discontinued.</p>
              
              <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Product Details</h4>
                <p><strong>Name:</strong> ${product.name}</p>
                <p><strong>Status:</strong> Discontinued</p>
              </div>

              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Similar Products</h4>
                <p>Check out these similar items you might like:</p>
                <ul>
                  <li><a href="/products/1">Similar Product 1</a></li>
                  <li><a href="/products/2">Similar Product 2</a></li>
                  <li><a href="/products/3">Similar Product 3</a></li>
                </ul>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send discontinued notification:', error);
    }
  }

  private async sendNewArrivalNotification(alert: AvailabilityAlert, product: any): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'New Arrival! Check out this product',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>🆕 New Arrival!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Just in!</h2>
              <p>A new product matching your interests is now available.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>New Product</h4>
                <p><strong>Name:</strong> ${product.name}</p>
                <p><strong>Price:</strong> $${product.price.toFixed(2)}</p>
                <p><strong>Category:</strong> ${product.category || 'N/A'}</p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="/products/${product.id}" style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Product
                </a>
              </div>

              <p>Be the first to get this amazing product!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send new arrival notification:', error);
    }
  }

  private async sendExpirationNotification(alert: AvailabilityAlert): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Your Alert Has Expired',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #6c757d; color: white; padding: 20px; text-align: center;">
              <h1>⏰ Alert Expired</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your alert has expired</h2>
              <p>The alert you set up has reached its expiration date.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Alert Details</h4>
                <p><strong>Type:</strong> ${alert.alertType.replace('_', ' ')}</p>
                <p><strong>Product:</strong> Product ID ${alert.productId}</p>
                <p><strong>Trigger Count:</strong> ${alert.triggerCount}</p>
                <p><strong>Expired:</strong> ${alert.expiresAt?.toLocaleDateString()}</p>
              </div>

              <p>You can create a new alert from the product page.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send expiration notification:', error);
    }
  }

  private async sendPriceDropAlert(alert: PriceDropAlert, product: any): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Price Drop Alert Triggered!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>💰 Price Drop Alert!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your target price has been reached!</h2>
              <p>The product price has dropped to your target price.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Price Details</h4>
                <p><strong>Product:</strong> ${product.name}</p>
                <p><strong>Original Price:</strong> $${alert.originalPrice.toFixed(2)}</p>
                <p><strong>Current Price:</strong> <span style="color: #28a745; font-size: 18px;">$${product.price.toFixed(2)}</span></p>
                <p><strong>Your Target:</strong> $${alert.targetPrice.toFixed(2)}</p>
                <p><strong>You Save:</strong> <span style="color: #dc3545;">$${(alert.originalPrice - product.price).toFixed(2)}</span></p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="/products/${product.id}" style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Buy Now
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send price drop alert:', error);
    }
  }

  private async sendBackInStockAlert(alert: BackInStockAlert, product: any): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Back in Stock Alert!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>✅ Back in Stock!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>It's available now!</h2>
              <p>The product you wanted is back in stock.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Product Details</h4>
                <p><strong>Name:</strong> ${product.name}</p>
                <p><strong>Price:</strong> $${product.price.toFixed(2)}</p>
                <p><strong>Stock:</strong> ${product.stock} available</p>
                ${alert.size ? `<p><strong>Size:</strong> ${alert.size}</p>` : ''}
                ${alert.color ? `<p><strong>Color:</strong> ${alert.color}</p>` : ''}
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="/products/${product.id}" style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Buy Now
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send back in stock alert:', error);
    }
  }
}
