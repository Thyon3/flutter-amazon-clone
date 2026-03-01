import { PriceAlert, IPriceAlert } from '../model/priceAlert';
import { Product } from '../model/product';
import { User } from '../model/user';
import { EmailService } from './emailService';

export class PriceAlertService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create a new price alert
  async createPriceAlert(userId: string, productId: string, targetPrice: number): Promise<IPriceAlert> {
    try {
      // Get current product price
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if alert already exists for this user and product
      const existingAlert = await PriceAlert.findOne({
        user: userId,
        product: productId,
        isActive: true,
        isTriggered: false,
      });

      if (existingAlert) {
        // Update existing alert with new target price
        existingAlert.targetPrice = targetPrice;
        existingAlert.currentPrice = product.price;
        return await existingAlert.save();
      }

      // Create new alert
      const alert = new PriceAlert({
        user: userId,
        product: productId,
        targetPrice,
        currentPrice: product.price,
        originalPrice: product.price,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });

      return await alert.save();
    } catch (error) {
      throw new Error(`Failed to create price alert: ${error}`);
    }
  }

  // Get all price alerts for a user
  async getUserPriceAlerts(userId: string): Promise<IPriceAlert[]> {
    try {
      return await PriceAlert.find({ user: userId })
        .populate('product')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user price alerts: ${error}`);
    }
  }

  // Delete a price alert
  async deletePriceAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const result = await PriceAlert.findOneAndDelete({
        _id: alertId,
        user: userId,
      });
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete price alert: ${error}`);
    }
  }

  // Check and trigger price alerts
  async checkPriceAlerts(productId?: string): Promise<number> {
    try {
      let query: any = {
        isActive: true,
        isTriggered: false,
      };

      if (productId) {
        query.product = productId;
      }

      const alerts = await PriceAlert.find(query).populate('product').populate('user');
      let triggeredCount = 0;

      for (const alert of alerts as any[]) {
        const product = alert.product;
        const user = alert.user;

        if (!product || !user) continue;

        // Update current price
        alert.currentPrice = product.price;

        // Check if price dropped to target or below
        if (product.price <= alert.targetPrice) {
          alert.isTriggered = true;
          alert.triggeredAt = new Date();
          await alert.save();

          // Send email notification
          await this.sendPriceDropEmail(user.email, user.name, product, alert);
          triggeredCount++;
        } else {
          // Just update the current price
          await alert.save();
        }
      }

      return triggeredCount;
    } catch (error) {
      throw new Error(`Failed to check price alerts: ${error}`);
    }
  }

  // Get price drop statistics
  async getPriceDropStats(userId: string): Promise<any> {
    try {
      const totalAlerts = await PriceAlert.countDocuments({ user: userId });
      const activeAlerts = await PriceAlert.countDocuments({ 
        user: userId, 
        isActive: true, 
        isTriggered: false 
      });
      const triggeredAlerts = await PriceAlert.countDocuments({ 
        user: userId, 
        isTriggered: true 
      });

      const recentDrops = await PriceAlert.find({ 
        user: userId, 
        isTriggered: true 
      })
        .populate('product')
        .sort({ triggeredAt: -1 })
        .limit(5);

      return {
        totalAlerts,
        activeAlerts,
        triggeredAlerts,
        recentDrops,
      };
    } catch (error) {
      throw new Error(`Failed to get price drop stats: ${error}`);
    }
  }

  // Send price drop email notification
  private async sendPriceDropEmail(
    userEmail: string, 
    userName: string, 
    product: any, 
    alert: IPriceAlert
  ): Promise<void> {
    try {
      const emailData = {
        to: userEmail,
        subject: `Price Drop Alert: ${product.name} is now $${product.price.toFixed(2)}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Price Drop Alert!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${userName},</h2>
              <p>Great news! The price of <strong>${product.name}</strong> has dropped!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <img src="${product.images[0] || ''}" style="width: 80px; height: 80px; object-fit: cover; margin-right: 15px;">
                  <div>
                    <h3 style="margin: 0;">${product.name}</h3>
                    <p style="margin: 5px 0; color: #666;">${product.description.substring(0, 100)}...</p>
                  </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <span style="text-decoration: line-through; color: #999; font-size: 18px;">
                      $${alert.originalPrice.toFixed(2)}
                    </span>
                    <span style="font-size: 24px; font-weight: bold; color: #B12704; margin-left: 10px;">
                      $${product.price.toFixed(2)}
                    </span>
                  </div>
                  <span style="background-color: #ff9900; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">
                    ${Math.round(((alert.originalPrice - product.price) / alert.originalPrice) * 100)}% OFF
                  </span>
                </div>
                
                <p style="margin-top: 10px; color: #28a745; font-weight: bold;">
                  🎯 You wanted it for $${alert.targetPrice.toFixed(2)} or less
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/product/${product._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Buy Now
                </a>
              </div>
              
              <p style="color: #666; font-size: 12px;">
                This alert will expire in 30 days. You can create new alerts anytime.
              </p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send price drop email:', error);
    }
  }

  // Cleanup expired alerts
  async cleanupExpiredAlerts(): Promise<number> {
    try {
      const result = await PriceAlert.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      return result.deletedCount || 0;
    } catch (error) {
      throw new Error(`Failed to cleanup expired alerts: ${error}`);
    }
  }
}
