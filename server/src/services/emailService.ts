import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
}

export interface EmailTemplate {
  welcome: {
    subject: string;
    html: string;
  };
  orderConfirmation: {
    subject: string;
    html: string;
  };
  promotional: {
    subject: string;
    html: string;
  };
  abandonedCart: {
    subject: string;
    html: string;
  };
  reviewRequest: {
    subject: string;
    html: string;
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter (configure with your email service)
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  private getTemplates(): EmailTemplate {
    return {
      welcome: {
        subject: 'Welcome to Amazon Clone! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>Welcome to Amazon Clone</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi {{name}},</h2>
              <p>Thank you for joining Amazon Clone! We're excited to have you as part of our community.</p>
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Get Started with:</h3>
                <ul>
                  <li>🛍️ Browse our extensive product catalog</li>
                  <li>🔍 Use advanced search and filters</li>
                  <li>⭐ Compare products side-by-side</li>
                  <li>🚀 Enjoy fast and secure checkout</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{shopUrl}}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Start Shopping
                </a>
              </div>
              <p>Happy shopping!</p>
              <p>The Amazon Clone Team</p>
            </div>
          </div>
        `,
      },
      orderConfirmation: {
        subject: 'Order Confirmation #{{orderNumber}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>Order Confirmed!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Thank you for your order, {{name}}!</h2>
              <p>Your order #{{orderNumber}} has been confirmed and will be shipped soon.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Order Details:</h3>
                <p><strong>Order Number:</strong> {{orderNumber}}</p>
                <p><strong>Order Date:</strong> {{orderDate}}</p>
                <p><strong>Total Amount:</strong> \${{totalAmount}}</p>
                <p><strong>Shipping Address:</strong> {{shippingAddress}}</p>
              </div>

              <h3>Items Ordered:</h3>
              {{#each items}}
              <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
                <p><strong>{{this.name}}</strong></p>
                <p>Quantity: {{this.quantity}} | Price: \${{this.price}}</p>
              </div>
              {{/each}}

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{trackingUrl}}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Track Your Order
                </a>
              </div>
            </div>
          </div>
        `,
      },
      promotional: {
        subject: '🔥 Hot Deals Just for You! Limited Time Offer',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>🔥 Hot Deals!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi {{name}},</h2>
              <p>We've got some amazing deals just for you! Don't miss out on these limited-time offers.</p>
              
              {{#each deals}}
              <div style="border: 1px solid #ddd; border-radius: 5px; margin: 15px 0; overflow: hidden;">
                <img src="{{this.imageUrl}}" style="width: 100%; height: 200px; object-fit: cover;">
                <div style="padding: 15px;">
                  <h3>{{this.title}}</h3>
                  <p>{{this.description}}</p>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span style="text-decoration: line-through; color: #999;">\${{this.originalPrice}}</span>
                      <span style="font-size: 20px; font-weight: bold; color: #B12704; margin-left: 10px;">\${{this.salePrice}}</span>
                    </div>
                    <span style="background-color: #ff9900; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">
                      {{this.discount}}% OFF
                    </span>
                  </div>
                </div>
              </div>
              {{/each}}

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{shopUrl}}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Shop All Deals
                </a>
              </div>
            </div>
          </div>
        `,
      },
      abandonedCart: {
        subject: 'You left items in your cart! 🛒',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>Did you forget something?</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi {{name}},</h2>
              <p>We noticed you left some items in your cart. Don't miss out!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Your Cart Items:</h3>
                {{#each cartItems}}
                <div style="display: flex; align-items: center; margin: 10px 0;">
                  <img src="{{this.imageUrl}}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px;">
                  <div style="flex: 1;">
                    <p style="margin: 0; font-weight: bold;">{{this.name}}</p>
                    <p style="margin: 0; color: #666;">Quantity: {{this.quantity}} | \${{this.price}}</p>
                  </div>
                </div>
                {{/each}}
                <p style="margin-top: 15px; font-weight: bold;">Total: \${{total}}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{cartUrl}}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Complete Your Purchase
                </a>
              </div>
            </div>
          </div>
        `,
      },
      reviewRequest: {
        subject: 'How was your experience with {{productName}}?',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>Share Your Experience</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi {{name}},</h2>
              <p>We hope you're enjoying your recent purchase of {{productName}}!</p>
              <p>Your feedback helps other shoppers make informed decisions. Would you take a moment to share your experience?</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <h3>Rate this product:</h3>
                <div style="font-size: 30px; margin: 15px 0;">
                  ⭐⭐⭐⭐⭐
                </div>
                <p>Click on the stars to rate</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{reviewUrl}}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Leave a Review
                </a>
              </div>
            </div>
          </div>
        `,
      },
    };
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let htmlContent = options.html;
      let textContent = options.text;

      // Process template if provided
      if (options.template && options.templateData) {
        const templates = this.getTemplates();
        const template = templates[options.template as keyof EmailTemplate];
        
        if (template) {
          htmlContent = this.processTemplate(template.html, options.templateData);
          textContent = this.processTemplate(template.text || '', options.templateData);
        }
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@amazonclone.com',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: htmlContent,
        text: textContent,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    return this.sendEmail({
      to,
      template: 'welcome',
      templateData: {
        name,
        shopUrl: 'https://yourapp.com/shop',
      },
    });
  }

  async sendOrderConfirmation(to: string, orderData: any): Promise<boolean> {
    return this.sendEmail({
      to,
      template: 'orderConfirmation',
      templateData: orderData,
    });
  }

  async sendPromotionalEmail(to: string | string[], deals: any[]): Promise<boolean> {
    return this.sendEmail({
      to,
      template: 'promotional',
      templateData: {
        name: 'Valued Customer',
        deals,
        shopUrl: 'https://yourapp.com/deals',
      },
    });
  }

  async sendAbandonedCartEmail(to: string, cartData: any): Promise<boolean> {
    return this.sendEmail({
      to,
      template: 'abandonedCart',
      templateData: cartData,
    });
  }

  async sendReviewRequest(to: string, productName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      template: 'reviewRequest',
      templateData: {
        name: 'Valued Customer',
        productName,
        reviewUrl: 'https://yourapp.com/review',
      },
    });
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;
    
    // Simple template processing (replace {{variable}} with actual values)
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, data[key]);
    });

    return processed;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}
