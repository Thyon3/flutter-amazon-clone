import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface BulkOrderRequest {
  userId: string;
  organizationName?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    customizations?: {
      imprint?: string;
      logo?: string;
      packaging?: string;
      specifications?: Record<string, any>;
    };
  }>;
  shippingAddress: {
    name: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
  };
  billingAddress?: {
    name: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
  };
  deliveryRequirements: {
    deliveryDate?: Date;
    deliveryWindow?: 'morning' | 'afternoon' | 'evening';
    specialInstructions?: string;
    deliveryMethod: 'standard' | 'expedited' | 'freight' | 'white_glove';
  };
  paymentMethod: {
    type: 'credit_card' | 'purchase_order' | 'net_terms' | 'wire_transfer';
    details: any;
    purchaseOrderNumber?: string;
  };
  metadata?: {
    department?: string;
    costCenter?: string;
    projectCode?: string;
    approvalRequired?: boolean;
    approverEmail?: string;
  };
}

export interface BulkOrderResponse {
  success: boolean;
  message: string;
  bulkOrder?: BulkOrderInfo;
  quote?: BulkOrderQuote;
}

export interface BulkOrderInfo {
  id: string;
  userId: string;
  organizationName?: string;
  items: any[];
  status: 'quote_requested' | 'quote_approved' | 'processing' | 'manufacturing' | 'quality_check' | 'shipping' | 'delivered' | 'cancelled' | 'on_hold';
  shippingAddress: any;
  billingAddress?: any;
  deliveryRequirements: any;
  paymentMethod: any;
  pricing: {
    subtotal: number;
    bulkDiscount: number;
    shippingCost: number;
    tax: number;
    total: number;
    currency: string;
    volumePricing: Array<{
      quantity: number;
      unitPrice: number;
      discount: number;
    }>;
  };
  timeline: Array<{
    status: string;
    description: string;
    timestamp: Date;
    estimatedDate?: Date;
    updatedBy?: string;
  }>;
  documents: Array<{
    type: 'quote' | 'invoice' | 'packing_slip' | 'certificate_of_compliance';
    url: string;
    uploadedAt: Date;
  }>;
  tracking?: {
    carrier: string;
    trackingNumber: string;
    estimatedDelivery: Date;
    updates: Array<{
      timestamp: Date;
      location: string;
      status: string;
    }>;
  };
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  estimatedDelivery?: Date;
}

export interface BulkOrderQuote {
  id: string;
  bulkOrderId: string;
  validUntil: Date;
  pricing: {
    subtotal: number;
    bulkDiscount: number;
    shippingEstimate: number;
    taxEstimate: number;
    totalEstimate: number;
    currency: string;
  };
  terms: {
    paymentTerms: string;
    deliveryTerms: string;
    warranty: string;
    returnPolicy: string;
  };
  notes: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface BulkOrderStats {
  totalBulkOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageProcessingTime: number;
  topCustomers: Array<{
    userId: string;
    organizationName: string;
    orderCount: number;
    totalSpent: number;
  }>;
  popularProducts: Array<{
    productId: string;
    name: string;
    bulkOrderCount: number;
    totalQuantity: number;
    revenue: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    orders: number;
    revenue: number;
    averageValue: number;
  }>;
}

export class BulkOrderService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Request bulk order quote
  async requestBulkQuote(request: BulkOrderRequest): Promise<BulkOrderResponse> {
    try {
      // Validate request
      const validation = this.validateBulkOrderRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Check product availability and pricing
      const productCheck = await this.checkProductAvailability(request.items);
      if (!productCheck.available) {
        return {
          success: false,
          message: `Some products are not available: ${productCheck.unavailableProducts.join(', ')}`,
        };
      }

      // Calculate bulk pricing
      const pricing = await this.calculateBulkPricing(request.items);

      // Create bulk order
      const bulkOrder: BulkOrderInfo = {
        id: this.generateId(),
        userId: request.userId,
        organizationName: request.organizationName,
        items: request.items,
        status: 'quote_requested',
        shippingAddress: request.shippingAddress,
        billingAddress: request.billingAddress,
        deliveryRequirements: request.deliveryRequirements,
        paymentMethod: request.paymentMethod,
        pricing,
        timeline: [
          {
            status: 'quote_requested',
            description: 'Bulk order quote requested',
            timestamp: new Date(),
          },
        ],
        documents: [],
        metadata: request.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create quote
      const quote: BulkOrderQuote = {
        id: this.generateId(),
        bulkOrderId: bulkOrder.id,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        pricing: {
          subtotal: pricing.subtotal,
          bulkDiscount: pricing.bulkDiscount,
          shippingEstimate: pricing.shippingCost,
          taxEstimate: pricing.tax,
          totalEstimate: pricing.total,
          currency: pricing.currency,
        },
        terms: {
          paymentTerms: this.getPaymentTerms(request.paymentMethod.type),
          deliveryTerms: this.getDeliveryTerms(request.deliveryRequirements.deliveryMethod),
          warranty: 'Standard manufacturer warranty applies',
          returnPolicy: '30-day return policy for bulk orders',
        },
        notes: [
          'Quote valid for 30 days',
          'Pricing subject to product availability',
          'Bulk discounts apply as shown',
        ],
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // Save bulk order and quote
      await this.saveBulkOrder(bulkOrder);
      await this.saveQuote(quote);

      // Send quote to customer
      await this.sendBulkQuoteEmail(bulkOrder, quote);

      return {
        success: true,
        message: 'Bulk order quote requested successfully',
        bulkOrder,
        quote,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to request bulk quote: ${error}`,
      };
    }
  }

  // Approve bulk order quote
  async approveBulkQuote(quoteId: string, approvedBy: string): Promise<{ success: boolean; message: string }> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) {
        return {
          success: false,
          message: 'Quote not found',
        };
      }

      if (quote.status !== 'pending') {
        return {
          success: false,
          message: 'Quote is not in pending status',
        };
      }

      if (quote.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Quote has expired',
        };
      }

      // Update quote status
      quote.status = 'approved';
      await this.updateQuote(quote);

      // Get bulk order and update status
      const bulkOrder = await this.getBulkOrder(quote.bulkOrderId);
      if (bulkOrder) {
        bulkOrder.status = 'quote_approved';
        bulkOrder.updatedAt = new Date();
        
        // Add to timeline
        bulkOrder.timeline.push({
          status: 'quote_approved',
          description: `Quote approved by ${approvedBy}`,
          timestamp: new Date(),
          updatedBy: approvedBy,
        });

        // Start processing
        await this.startBulkOrderProcessing(bulkOrder);

        await this.updateBulkOrder(bulkOrder);
      }

      // Send approval confirmation
      await this.sendQuoteApprovalEmail(quote, bulkOrder);

      return {
        success: true,
        message: 'Bulk order quote approved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to approve quote: ${error}`,
      };
    }
  }

  // Process bulk order
  async processBulkOrder(bulkOrderId: string, processedBy: string): Promise<{ success: boolean; message: string }> {
    try {
      const bulkOrder = await this.getBulkOrder(bulkOrderId);
      if (!bulkOrder) {
        return {
          success: false,
          message: 'Bulk order not found',
        };
      }

      if (bulkOrder.status !== 'quote_approved') {
        return {
          success: false,
          message: 'Bulk order is not approved for processing',
        };
      }

      // Start processing workflow
      bulkOrder.status = 'processing';
      bulkOrder.updatedAt = new Date();

      // Add to timeline
      bulkOrder.timeline.push({
        status: 'processing',
        description: `Order processing started by ${processedBy}`,
        timestamp: new Date(),
        updatedBy: processedBy,
        estimatedDate: this.calculateEstimatedDelivery(bulkOrder),
      });

      await this.updateBulkOrder(bulkOrder);

      // Start manufacturing process
      await this.startManufacturingProcess(bulkOrder);

      // Send processing notification
      await this.sendProcessingNotification(bulkOrder);

      return {
        success: true,
        message: 'Bulk order processing started',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process bulk order: ${error}`,
      };
    }
  }

  // Update bulk order status
  async updateBulkOrderStatus(
    bulkOrderId: string,
    status: string,
    updatedBy: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const bulkOrder = await this.getBulkOrder(bulkOrderId);
      if (!bulkOrder) {
        return {
          success: false,
          message: 'Bulk order not found',
        };
      }

      // Update status
      bulkOrder.status = status as any;
      bulkOrder.updatedAt = new Date();

      // Add to timeline
      bulkOrder.timeline.push({
        status,
        description: notes || `Status updated to ${status}`,
        timestamp: new Date(),
        updatedBy,
      });

      await this.updateBulkOrder(bulkOrder);

      // Send status update notification
      await this.sendStatusUpdateNotification(bulkOrder, status);

      return {
        success: true,
        message: 'Bulk order status updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update status: ${error}`,
      };
    }
  }

  // Add tracking information
  async addTrackingInfo(
    bulkOrderId: string,
    carrier: string,
    trackingNumber: string,
    estimatedDelivery: Date
  ): Promise<{ success: boolean; message: string }> {
    try {
      const bulkOrder = await this.getBulkOrder(bulkOrderId);
      if (!bulkOrder) {
        return {
          success: false,
          message: 'Bulk order not found',
        };
      }

      // Add tracking info
      bulkOrder.tracking = {
        carrier,
        trackingNumber,
        estimatedDelivery,
        updates: [],
      };

      bulkOrder.status = 'shipping';
      bulkOrder.updatedAt = new Date();

      // Add to timeline
      bulkOrder.timeline.push({
        status: 'shipping',
        description: `Order shipped via ${carrier} - Tracking: ${trackingNumber}`,
        timestamp: new Date(),
        estimatedDelivery,
      });

      await this.updateBulkOrder(bulkOrder);

      // Send shipping notification
      await this.sendShippingNotification(bulkOrder);

      return {
        success: true,
        message: 'Tracking information added successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add tracking info: ${error}`,
      };
    }
  }

  // Get user's bulk orders
  async getUserBulkOrders(userId: string, status?: string): Promise<BulkOrderInfo[]> {
    try {
      // In a real app, you'd query database
      return [
        {
          id: '1',
          userId,
          organizationName: 'Acme Corp',
          items: [
            {
              productId: '123',
              quantity: 100,
              customizations: {
                imprint: 'Acme Corp Logo',
                packaging: 'Custom Boxes',
              },
            },
          ],
          status: 'delivered',
          pricing: {
            subtotal: 10000,
            bulkDiscount: 1500,
            shippingCost: 500,
            tax: 800,
            total: 9800,
            currency: 'USD',
            volumePricing: [],
          },
          timeline: [
            {
              status: 'quote_requested',
              description: 'Quote requested',
              timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
            {
              status: 'delivered',
              description: 'Order delivered',
              timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
          ],
          documents: [],
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get user bulk orders: ${error}`);
    }
  }

  // Get bulk order statistics
  async getBulkOrderStats(timeRange?: { start: Date; end: Date }): Promise<BulkOrderStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalBulkOrders: 5000,
        pendingOrders: 200,
        processingOrders: 300,
        completedOrders: 4500,
        totalRevenue: 50000000,
        averageOrderValue: 10000,
        averageProcessingTime: 14, // days
        topCustomers: [
          {
            userId: '1',
            organizationName: 'Acme Corp',
            orderCount: 25,
            totalSpent: 250000,
          },
          {
            userId: '2',
            organizationName: 'Global Industries',
            orderCount: 20,
            totalSpent: 200000,
          },
          {
            userId: '3',
            organizationName: 'Tech Solutions',
            orderCount: 18,
            totalSpent: 180000,
          },
        ],
        popularProducts: [
          {
            productId: '1',
            name: 'Office Chair Pro',
            bulkOrderCount: 150,
            totalQuantity: 5000,
            revenue: 500000,
          },
          {
            productId: '2',
            name: 'Standing Desk Elite',
            bulkOrderCount: 120,
            totalQuantity: 3000,
            revenue: 450000,
          },
          {
            productId: '3',
            name: 'Monitor Arm Plus',
            bulkOrderCount: 100,
            totalQuantity: 2000,
            revenue: 200000,
          },
        ],
        monthlyTrends: [
          { month: '2024-01', orders: 150, revenue: 1500000, averageValue: 10000 },
          { month: '2024-02', orders: 180, revenue: 1800000, averageValue: 10000 },
          { month: '2024-03', orders: 200, revenue: 2000000, averageValue: 10000 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get bulk order stats: ${error}`);
    }
  }

  // Process expired quotes
  async processExpiredQuotes(): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      const expiredQuotes = await this.getExpiredQuotes();
      let processedCount = 0;

      for (const quote of expiredQuotes) {
        quote.status = 'expired';
        await this.updateQuote(quote);

        // Update bulk order status
        const bulkOrder = await this.getBulkOrder(quote.bulkOrderId);
        if (bulkOrder && bulkOrder.status === 'quote_requested') {
          bulkOrder.status = 'cancelled';
          bulkOrder.updatedAt = new Date();
          
          bulkOrder.timeline.push({
            status: 'cancelled',
            description: 'Quote expired',
            timestamp: new Date(),
          });

          await this.updateBulkOrder(bulkOrder);
        }

        // Send expiration notification
        await this.sendQuoteExpirationNotification(quote);
        processedCount++;
      }

      return {
        success: true,
        message: `Processed ${processedCount} expired quotes`,
        processed: processedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process expired quotes: ${error}`,
        processed: 0,
      };
    }
  }

  // Helper methods
  private validateBulkOrderRequest(request: BulkOrderRequest): { valid: boolean; message: string } {
    if (!request.userId) {
      return { valid: false, message: 'User ID is required' };
    }

    if (!request.items || request.items.length === 0) {
      return { valid: false, message: 'At least one item is required' };
    }

    for (const item of request.items) {
      if (!item.productId) {
        return { valid: false, message: 'Product ID is required for all items' };
      }

      if (!item.quantity || item.quantity < 10) {
        return { valid: false, message: 'Minimum quantity for bulk orders is 10 units' };
      }
    }

    if (!request.shippingAddress) {
      return { valid: false, message: 'Shipping address is required' };
    }

    if (!request.deliveryRequirements) {
      return { valid: false, message: 'Delivery requirements are required' };
    }

    if (!request.paymentMethod) {
      return { valid: false, message: 'Payment method is required' };
    }

    return { valid: true, message: 'Request is valid' };
  }

  private async checkProductAvailability(items: any[]): Promise<{ available: boolean; unavailableProducts: string[] }> {
    // In a real app, you'd check inventory
    const unavailableProducts: string[] = [];
    
    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (!product || product.stock < item.quantity) {
        unavailableProducts.push(item.productId);
      }
    }

    return {
      available: unavailableProducts.length === 0,
      unavailableProducts,
    };
  }

  private async calculateBulkPricing(items: any[]): Promise<any> {
    let subtotal = 0;
    const volumePricing: any[] = [];

    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (product) {
        const unitPrice = product.price;
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        // Calculate volume pricing tiers
        const tiers = [
          { quantity: 10, discount: 0.05 },
          { quantity: 50, discount: 0.10 },
          { quantity: 100, discount: 0.15 },
          { quantity: 500, discount: 0.20 },
          { quantity: 1000, discount: 0.25 },
        ];

        for (const tier of tiers) {
          if (item.quantity >= tier.quantity) {
            volumePricing.push({
              quantity: tier.quantity,
              unitPrice: unitPrice * (1 - tier.discount),
              discount: tier.discount,
            });
          }
        }
      }
    }

    // Apply bulk discount
    const bulkDiscount = subtotal * 0.15; // 15% bulk discount
    const discountedSubtotal = subtotal - bulkDiscount;

    // Calculate shipping and tax
    const shippingCost = discountedSubtotal * 0.05; // 5% shipping
    const tax = discountedSubtotal * 0.08; // 8% tax
    const total = discountedSubtotal + shippingCost + tax;

    return {
      subtotal,
      bulkDiscount,
      shippingCost,
      tax,
      total,
      currency: 'USD',
      volumePricing,
    };
  }

  private getPaymentTerms(paymentType: string): string {
    const terms = {
      credit_card: 'Payment due at time of order',
      purchase_order: 'Net 30 days from invoice',
      net_terms: 'Net 30 days from delivery',
      wire_transfer: 'Payment due within 7 days of invoice',
    };
    return terms[paymentType as keyof typeof terms] || 'Payment due at time of order';
  }

  private getDeliveryTerms(deliveryMethod: string): string {
    const terms = {
      standard: 'Delivery within 7-10 business days',
      expedited: 'Delivery within 3-5 business days',
      freight: 'Delivery within 14-21 business days',
      white_glove: 'Delivery within 7-10 business days with installation',
    };
    return terms[deliveryMethod as keyof typeof terms] || 'Standard delivery terms apply';
  }

  private calculateEstimatedDelivery(bulkOrder: BulkOrderInfo): Date {
    const deliveryDate = new Date();
    const processingDays = 14; // Manufacturing and processing
    const shippingDays = 5; // Shipping time
    
    deliveryDate.setDate(deliveryDate.getDate() + processingDays + shippingDays);
    return deliveryDate;
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
      stock: 1000,
    };
  }

  private async saveBulkOrder(bulkOrder: BulkOrderInfo): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Bulk order saved: ${bulkOrder.id}`);
  }

  private async updateBulkOrder(bulkOrder: BulkOrderInfo): Promise<void> {
    // In a real app, you'd update database
    console.log(`Bulk order updated: ${bulkOrder.id}`);
  }

  private async saveQuote(quote: BulkOrderQuote): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Quote saved: ${quote.id}`);
  }

  private async updateQuote(quote: BulkOrderQuote): Promise<void> {
    // In a real app, you'd update database
    console.log(`Quote updated: ${quote.id}`);
  }

  private async getQuote(quoteId: string): Promise<BulkOrderQuote | null> {
    // In a real app, you'd query database
    return null;
  }

  private async getBulkOrder(bulkOrderId: string): Promise<BulkOrderInfo | null> {
    // In a real app, you'd query database
    return null;
  }

  private async getExpiredQuotes(): Promise<BulkOrderQuote[]> {
    // In a real app, you'd query database
    return [];
  }

  private async startBulkOrderProcessing(bulkOrder: BulkOrderInfo): Promise<void> {
    // In a real app, you'd start the manufacturing workflow
    console.log(`Starting processing for bulk order: ${bulkOrder.id}`);
  }

  private async startManufacturingProcess(bulkOrder: BulkOrderInfo): Promise<void> {
    // In a real app, you'd integrate with manufacturing systems
    console.log(`Starting manufacturing for bulk order: ${bulkOrder.id}`);
  }

  // Email notification methods
  private async sendBulkQuoteEmail(bulkOrder: BulkOrderInfo, quote: BulkOrderQuote): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com', // Would get from user record
        subject: 'Your Bulk Order Quote is Ready',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #FF9900; color: white; padding: 20px; text-align: center;">
              <h1>📋 Bulk Order Quote</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your bulk order quote is ready</h2>
              <p>Thank you for your interest in our bulk ordering program.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Quote Details</h4>
                <p><strong>Quote ID:</strong> ${quote.id}</p>
                <p><strong>Organization:</strong> ${bulkOrder.organizationName || 'N/A'}</p>
                <p><strong>Items:</strong> ${bulkOrder.items.length} product(s)</p>
                <p><strong>Total Quantity:</strong> ${bulkOrder.items.reduce((sum, item) => sum + item.quantity, 0)} units</p>
                <p><strong>Valid Until:</strong> ${quote.expiresAt.toLocaleDateString()}</p>
              </div>

              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Pricing Summary</h4>
                <p><strong>Subtotal:</strong> $${quote.pricing.subtotal.toFixed(2)}</p>
                <p><strong>Bulk Discount:</strong> -$${quote.pricing.bulkDiscount.toFixed(2)}</p>
                <p><strong>Shipping Estimate:</strong> $${quote.pricing.shippingEstimate.toFixed(2)}</p>
                <p><strong>Tax Estimate:</strong> $${quote.pricing.taxEstimate.toFixed(2)}</p>
                <p><strong>Total Estimate:</strong> <span style="font-size: 18px; color: #28a745;">$${quote.pricing.totalEstimate.toFixed(2)}</span></p>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Terms & Conditions</h4>
                <p><strong>Payment Terms:</strong> ${quote.terms.paymentTerms}</p>
                <p><strong>Delivery Terms:</strong> ${quote.terms.deliveryTerms}</p>
                <p><strong>Warranty:</strong> ${quote.terms.warranty}</p>
                <p><strong>Return Policy:</strong> ${quote.terms.returnPolicy}</p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="/bulk-orders/approve/${quote.id}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Approve Quote
                </a>
              </div>

              <p>Please review the quote and contact us with any questions.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send bulk quote email:', error);
    }
  }

  private async sendQuoteApprovalEmail(quote: BulkOrderQuote, bulkOrder: BulkOrderInfo): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Your Bulk Order Has Been Approved!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>✅ Quote Approved!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your bulk order has been approved</h2>
              <p>We've started processing your order and will keep you updated on the progress.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Order Details</h4>
                <p><strong>Order ID:</strong> ${bulkOrder.id}</p>
                <p><strong>Quote ID:</strong> ${quote.id}</p>
                <p><strong>Total Amount:</strong> $${quote.pricing.totalEstimate.toFixed(2)}</p>
                <p><strong>Status:</strong> Processing</p>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>What's Next?</h4>
                <ol>
                  <li>Manufacturing process begins (1-2 weeks)</li>
                  <li>Quality inspection and testing</li>
                  <li>Packaging and shipping preparation</li>
                  <li>Shipment to your location</li>
                  <li>Delivery and installation (if applicable)</li>
                </ol>
              </div>

              <p>You'll receive updates at each stage of the process.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send quote approval email:', error);
    }
  }

  private async sendProcessingNotification(bulkOrder: BulkOrderInfo): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Your Bulk Order is Being Processed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>🏭 Order Processing</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your order is now being processed</h2>
              <p>We've started the manufacturing process for your bulk order.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Processing Details</h4>
                <p><strong>Order ID:</strong> ${bulkOrder.id}</p>
                <p><strong>Status:</strong> Manufacturing</p>
                <p><strong>Estimated Delivery:</strong> ${bulkOrder.estimatedDelivery?.toLocaleDateString()}</p>
              </div>

              <p>We'll notify you when your order ships.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send processing notification:', error);
    }
  }

  private async sendStatusUpdateNotification(bulkOrder: BulkOrderInfo, status: string): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: `Bulk Order Status Update: ${status.replace('_', ' ')}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #6c757d; color: white; padding: 20px; text-align: center;">
              <h1>📊 Status Update</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your bulk order status has been updated</h2>
              <p>Order ${bulkOrder.id} is now: <strong>${status.replace('_', ' ')}</strong></p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Latest Update</h4>
                <p><strong>Status:</strong> ${status.replace('_', ' ')}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <p>Check your account for more details.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send status update notification:', error);
    }
  }

  private async sendShippingNotification(bulkOrder: BulkOrderInfo): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Your Bulk Order Has Shipped!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>🚚 Order Shipped!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your bulk order is on its way!</h2>
              <p>Your order has been shipped and is heading to your location.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Shipping Details</h4>
                <p><strong>Carrier:</strong> ${bulkOrder.tracking?.carrier}</p>
                <p><strong>Tracking Number:</strong> ${bulkOrder.tracking?.trackingNumber}</p>
                <p><strong>Estimated Delivery:</strong> ${bulkOrder.tracking?.estimatedDelivery.toLocaleDateString()}</p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="/track/${bulkOrder.tracking?.trackingNumber}" style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Track Order
                </a>
              </div>

              <p>You'll receive updates as your order progresses.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send shipping notification:', error);
    }
  }

  private async sendQuoteExpirationNotification(quote: BulkOrderQuote): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Your Bulk Order Quote Has Expired',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1>⏰ Quote Expired</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your quote has expired</h2>
              <p>The bulk order quote ${quote.id} has expired.</p>
              
              <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Quote Details</h4>
                <p><strong>Quote ID:</strong> ${quote.id}</p>
                <p><strong>Expired:</strong> ${quote.expiresAt.toLocaleDateString()}</p>
                <p><strong>Original Amount:</strong> $${quote.pricing.totalEstimate.toFixed(2)}</p>
              </div>

              <p>Please contact us to request a new quote.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send quote expiration notification:', error);
    }
  }
}
