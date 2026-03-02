import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface ReturnRequest {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    reason: 'defective' | 'wrong_item' | 'not_as_described' | 'no_longer_needed' | 'damaged_shipping' | 'expired' | 'other';
    condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
    description: string;
    images?: string[];
    refundPreference: 'refund' | 'exchange' | 'store_credit';
    exchangeProductId?: string;
  }>;
  returnMethod: 'mail' | 'dropoff' | 'pickup';
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  metadata?: {
    customerNotes?: string;
    supportTicketId?: string;
  };
}

export interface ReturnResponse {
  success: boolean;
  message: string;
  returnRequest?: ReturnInfo;
}

export interface ReturnInfo {
  id: string;
  orderId: string;
  userId: string;
  items: any[];
  status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'received' | 'processing' | 'completed' | 'cancelled';
  returnMethod: string;
  shippingAddress?: any;
  returnLabel?: {
    url: string;
    trackingNumber: string;
    carrier: string;
    expiresAt: Date;
  };
  refundInfo?: {
    type: 'refund' | 'exchange' | 'store_credit';
    amount: number;
    currency: string;
    status: 'pending' | 'processed' | 'failed';
    processedAt?: Date;
    transactionId?: string;
  };
  timeline: Array<{
    status: string;
    description: string;
    timestamp: Date;
    updatedBy?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface RefundInfo {
  id: string;
  returnId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  type: 'full' | 'partial' | 'shipping' | 'restocking_fee';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  method: 'original_payment' | 'store_credit' | 'gift_card' | 'bank_transfer';
  reason: string;
  processingTime: number; // in days
  processedAt?: Date;
  transactionId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReturnPolicy {
  id: string;
  name: string;
  description: string;
  category: string;
  returnWindow: number; // days
  conditionRequirements: {
    new: boolean;
    tagsAttached: boolean;
    originalPackaging: boolean;
    unused: boolean;
  };
  refundOptions: ('refund' | 'exchange' | 'store_credit')[];
  restockingFee?: number; // percentage
  exceptions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReturnStats {
  totalReturns: number;
  pendingReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  completedReturns: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  averageProcessingTime: number;
  returnRate: number;
  topReturnReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  returnsByCategory: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    returns: number;
    refunds: number;
    amount: number;
  }>;
}

export class ReturnRefundService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create return request
  async createReturnRequest(request: ReturnRequest): Promise<ReturnResponse> {
    try {
      // Validate request
      const validation = this.validateReturnRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Check if order is eligible for return
      const order = await this.getOrder(request.orderId);
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      const eligibilityCheck = await this.checkReturnEligibility(order, request);
      if (!eligibilityCheck.eligible) {
        return {
          success: false,
          message: eligibilityCheck.reason,
        };
      }

      // Create return request
      const returnInfo: ReturnInfo = {
        id: this.generateId(),
        orderId: request.orderId,
        userId: request.userId,
        items: request.items,
        status: 'pending',
        returnMethod: request.returnMethod,
        shippingAddress: request.shippingAddress,
        timeline: [
          {
            status: 'pending',
            description: 'Return request submitted',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: this.calculateReturnExpiration(),
      };

      // Save return request
      await this.saveReturnRequest(returnInfo);

      // Send confirmation email
      await this.sendReturnConfirmation(returnInfo, order);

      return {
        success: true,
        message: 'Return request submitted successfully',
        returnRequest: returnInfo,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create return request: ${error}`,
      };
    }
  }

  // Approve return request
  async approveReturnRequest(returnId: string, approvedBy: string, notes?: string): Promise<{ success: boolean; message: string }> {
    try {
      const returnInfo = await this.getReturnRequest(returnId);
      if (!returnInfo) {
        return {
          success: false,
          message: 'Return request not found',
        };
      }

      if (returnInfo.status !== 'pending') {
        return {
          success: false,
          message: 'Return request is not in pending status',
        };
      }

      // Update status
      returnInfo.status = 'approved';
      returnInfo.updatedAt = new Date();

      // Generate return label
      const returnLabel = await this.generateReturnLabel(returnInfo);
      returnInfo.returnLabel = returnLabel;

      // Add to timeline
      returnInfo.timeline.push({
        status: 'approved',
        description: `Return request approved by ${approvedBy}${notes ? ': ' + notes : ''}`,
        timestamp: new Date(),
        updatedBy: approvedBy,
      });

      await this.updateReturnRequest(returnInfo);

      // Send approval email
      await this.sendReturnApproval(returnInfo);

      return {
        success: true,
        message: 'Return request approved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to approve return request: ${error}`,
      };
    }
  }

  // Reject return request
  async rejectReturnRequest(returnId: string, rejectedBy: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const returnInfo = await this.getReturnRequest(returnId);
      if (!returnInfo) {
        return {
          success: false,
          message: 'Return request not found',
        };
      }

      if (returnInfo.status !== 'pending') {
        return {
          success: false,
          message: 'Return request is not in pending status',
        };
      }

      // Update status
      returnInfo.status = 'rejected';
      returnInfo.updatedAt = new Date();

      // Add to timeline
      returnInfo.timeline.push({
        status: 'rejected',
        description: `Return request rejected by ${rejectedBy}: ${reason}`,
        timestamp: new Date(),
        updatedBy: rejectedBy,
      });

      await this.updateReturnRequest(returnInfo);

      // Send rejection email
      await this.sendReturnRejection(returnInfo, reason);

      return {
        success: true,
        message: 'Return request rejected successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reject return request: ${error}`,
      };
    }
  }

  // Process received return
  async processReceivedReturn(returnId: string, receivedBy: string, conditionNotes?: string): Promise<{ success: boolean; message: string }> {
    try {
      const returnInfo = await this.getReturnRequest(returnId);
      if (!returnInfo) {
        return {
          success: false,
          message: 'Return request not found',
        };
      }

      if (returnInfo.status !== 'in_transit') {
        return {
          success: false,
          message: 'Return is not in transit',
        };
      }

      // Update status
      returnInfo.status = 'received';
      returnInfo.updatedAt = new Date();

      // Add to timeline
      returnInfo.timeline.push({
        status: 'received',
        description: `Return received by ${receivedBy}${conditionNotes ? ': ' + conditionNotes : ''}`,
        timestamp: new Date(),
        updatedBy: receivedBy,
      });

      await this.updateReturnRequest(returnInfo);

      // Send received notification
      await this.sendReturnReceivedNotification(returnInfo);

      return {
        success: true,
        message: 'Return received successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process received return: ${error}`,
      };
    }
  }

  // Process refund
  async processRefund(returnId: string, processedBy: string, refundAmount?: number): Promise<{ success: boolean; message: string; refund?: RefundInfo }> {
    try {
      const returnInfo = await this.getReturnRequest(returnId);
      if (!returnInfo) {
        return {
          success: false,
          message: 'Return request not found',
        };
      }

      if (returnInfo.status !== 'received') {
        return {
          success: false,
          message: 'Return has not been received yet',
        };
      }

      // Calculate refund amount
      const calculatedAmount = refundAmount || await this.calculateRefundAmount(returnInfo);

      // Create refund record
      const refund: RefundInfo = {
        id: this.generateId(),
        returnId,
        orderId: returnInfo.orderId,
        userId: returnInfo.userId,
        amount: calculatedAmount,
        currency: 'USD',
        type: 'full',
        status: 'processing',
        method: 'original_payment',
        reason: 'Return processed',
        processingTime: 5, // 5 business days
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update return status
      returnInfo.status = 'processing';
      returnInfo.refundInfo = {
        type: 'refund',
        amount: calculatedAmount,
        currency: 'USD',
        status: 'pending',
      };
      returnInfo.updatedAt = new Date();

      // Add to timeline
      returnInfo.timeline.push({
        status: 'processing',
        description: `Refund processing started by ${processedBy}: $${calculatedAmount.toFixed(2)}`,
        timestamp: new Date(),
        updatedBy: processedBy,
      });

      await this.saveRefund(refund);
      await this.updateReturnRequest(returnInfo);

      // Process refund with payment processor
      const refundResult = await this.processPaymentRefund(refund);
      
      if (refundResult.success) {
        refund.status = 'completed';
        refund.processedAt = new Date();
        refund.transactionId = refundResult.transactionId;
        
        returnInfo.status = 'completed';
        returnInfo.refundInfo.status = 'processed';
        returnInfo.refundInfo.processedAt = new Date();
        returnInfo.refundInfo.transactionId = refundResult.transactionId;

        // Add final timeline entry
        returnInfo.timeline.push({
          status: 'completed',
          description: `Refund completed: $${calculatedAmount.toFixed(2)}`,
          timestamp: new Date(),
          updatedBy: processedBy,
        });
      } else {
        refund.status = 'failed';
        refund.failureReason = refundResult.error;
      }

      await this.updateRefund(refund);
      await this.updateReturnRequest(returnInfo);

      // Send refund notification
      await this.sendRefundNotification(returnInfo, refund);

      return {
        success: true,
        message: 'Refund processed successfully',
        refund,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process refund: ${error}`,
      };
    }
  }

  // Get user's returns
  async getUserReturns(userId: string, status?: string): Promise<ReturnInfo[]> {
    try {
      // In a real app, you'd query database
      return [
        {
          id: '1',
          orderId: '123',
          userId,
          items: [
            {
              productId: '456',
              quantity: 1,
              reason: 'defective',
              condition: 'good',
              description: 'Product stopped working after 2 weeks',
            },
          ],
          status: 'completed',
          returnMethod: 'mail',
          refundInfo: {
            type: 'refund',
            amount: 99.99,
            currency: 'USD',
            status: 'processed',
            processedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          timeline: [
            {
              status: 'pending',
              description: 'Return request submitted',
              timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            },
            {
              status: 'approved',
              description: 'Return request approved',
              timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            },
            {
              status: 'completed',
              description: 'Refund processed',
              timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
          ],
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get user returns: ${error}`);
    }
  }

  // Get return policies
  async getReturnPolicies(category?: string): Promise<ReturnPolicy[]> {
    try {
      // In a real app, you'd query database
      return [
        {
          id: '1',
          name: 'Standard Return Policy',
          description: '30-day return window for most items',
          category: 'general',
          returnWindow: 30,
          conditionRequirements: {
            new: false,
            tagsAttached: false,
            originalPackaging: false,
            unused: false,
          },
          refundOptions: ['refund', 'exchange', 'store_credit'],
          restockingFee: 0,
          exceptions: ['Custom items', 'Perishables', 'Personal care products'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Electronics Return Policy',
          description: '14-day return window for electronics',
          category: 'electronics',
          returnWindow: 14,
          conditionRequirements: {
            new: true,
            tagsAttached: true,
            originalPackaging: true,
            unused: false,
          },
          refundOptions: ['refund', 'exchange'],
          restockingFee: 15,
          exceptions: ['Software', 'Opened media'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get return policies: ${error}`);
    }
  }

  // Get return statistics
  async getReturnStats(timeRange?: { start: Date; end: Date }): Promise<ReturnStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalReturns: 25000,
        pendingReturns: 1500,
        approvedReturns: 20000,
        rejectedReturns: 2000,
        completedReturns: 18000,
        totalRefundAmount: 1500000,
        averageRefundAmount: 83.33,
        averageProcessingTime: 4.5,
        returnRate: 0.08, // 8%
        topReturnReasons: [
          { reason: 'defective', count: 8000, percentage: 32 },
          { reason: 'not_as_described', count: 6000, percentage: 24 },
          { reason: 'no_longer_needed', count: 5000, percentage: 20 },
          { reason: 'wrong_item', count: 3000, percentage: 12 },
          { reason: 'damaged_shipping', count: 2000, percentage: 8 },
          { reason: 'other', count: 1000, percentage: 4 },
        ],
        returnsByCategory: {
          electronics: 8000,
          clothing: 6000,
          home: 4000,
          books: 3000,
          sports: 2500,
          beauty: 1500,
        },
        monthlyTrends: [
          { month: '2024-01', returns: 2000, refunds: 1800, amount: 150000 },
          { month: '2024-02', returns: 2200, refunds: 2000, amount: 165000 },
          { month: '2024-03', returns: 2100, refunds: 1900, amount: 160000 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get return stats: ${error}`);
    }
  }

  // Helper methods
  private validateReturnRequest(request: ReturnRequest): { valid: boolean; message: string } {
    if (!request.orderId) {
      return { valid: false, message: 'Order ID is required' };
    }

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

      if (!item.reason) {
        return { valid: false, message: 'Return reason is required for all items' };
      }

      if (!item.condition) {
        return { valid: false, message: 'Item condition is required for all items' };
      }
    }

    if (!request.returnMethod) {
      return { valid: false, message: 'Return method is required' };
    }

    return { valid: true, message: 'Request is valid' };
  }

  private async checkReturnEligibility(order: any, request: ReturnRequest): Promise<{ eligible: boolean; reason?: string }> {
    // Check return window
    const orderDate = new Date(order.createdAt);
    const returnWindow = 30; // days
    const daysSinceOrder = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceOrder > returnWindow) {
      return {
        eligible: false,
        reason: `Return window of ${returnWindow} days has expired`,
      };
    }

    // Check if items were already returned
    for (const item of request.items) {
      const existingReturn = await this.findExistingReturn(order.id, item.productId);
      if (existingReturn) {
        return {
          eligible: false,
          reason: 'Item has already been returned',
        };
      }
    }

    return { eligible: true };
  }

  private calculateReturnExpiration(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 14); // 14 days to ship return
    return expiration;
  }

  private async calculateRefundAmount(returnInfo: ReturnInfo): Promise<number> {
    // In a real app, you'd calculate based on item prices, restocking fees, etc.
    let totalAmount = 0;

    for (const item of returnInfo.items) {
      const product = await this.getProduct(item.productId);
      if (product) {
        totalAmount += product.price * item.quantity;
      }
    }

    // Apply restocking fee if applicable
    const restockingFee = 0.15; // 15%
    totalAmount *= (1 - restockingFee);

    return Math.round(totalAmount * 100) / 100;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async getOrder(orderId: string): Promise<any> {
    // In a real app, you'd query database
    return {
      id: orderId,
      userId: 'user123',
      items: [
        {
          productId: '456',
          quantity: 1,
          price: 99.99,
        },
      ],
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    };
  }

  private async getProduct(productId: string): Promise<any> {
    // In a real app, you'd query database
    return {
      id: productId,
      name: 'Sample Product',
      price: 99.99,
      category: 'electronics',
    };
  }

  private async findExistingReturn(orderId: string, productId: string): Promise<ReturnInfo | null> {
    // In a real app, you'd query database
    return null;
  }

  private async generateReturnLabel(returnInfo: ReturnInfo): Promise<any> {
    // In a real app, you'd integrate with shipping carrier API
    return {
      url: 'https://shipping.example.com/label/123456',
      trackingNumber: '1Z999AA1234567890',
      carrier: 'UPS',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
  }

  private async processPaymentRefund(refund: RefundInfo): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // In a real app, you'd integrate with payment processor
    return {
      success: true,
      transactionId: 'txn_' + Math.random().toString(36).substr(2, 9),
    };
  }

  private async saveReturnRequest(returnInfo: ReturnInfo): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Return request saved: ${returnInfo.id}`);
  }

  private async updateReturnRequest(returnInfo: ReturnInfo): Promise<void> {
    // In a real app, you'd update database
    console.log(`Return request updated: ${returnInfo.id}`);
  }

  private async saveRefund(refund: RefundInfo): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Refund saved: ${refund.id}`);
  }

  private async updateRefund(refund: RefundInfo): Promise<void> {
    // In a real app, you'd update database
    console.log(`Refund updated: ${refund.id}`);
  }

  private async getReturnRequest(returnId: string): Promise<ReturnInfo | null> {
    // In a real app, you'd query database
    return null;
  }

  // Email notification methods
  private async sendReturnConfirmation(returnInfo: ReturnInfo, order: any): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com', // Would get from user record
        subject: 'Return Request Submitted',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>📦 Return Request Submitted</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your return request has been received</h2>
              <p>We'll review your request and send you a return label if approved.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Return Details</h4>
                <p><strong>Return ID:</strong> ${returnInfo.id}</p>
                <p><strong>Order ID:</strong> ${returnInfo.orderId}</p>
                <p><strong>Items:</strong> ${returnInfo.items.length} item(s)</p>
                <p><strong>Return Method:</strong> ${returnInfo.returnMethod}</p>
                <p><strong>Submitted:</strong> ${returnInfo.createdAt.toLocaleString()}</p>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Next Steps</h4>
                <ol>
                  <li>We'll review your return request within 1-2 business days</li>
                  <li>If approved, you'll receive a return label via email</li>
                  <li>Package the items and attach the return label</li>
                  <li>Drop off the package at the designated carrier</li>
                  <li>We'll process your refund once the return is received</li>
                </ol>
              </div>

              <p>You can track your return status in your account.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send return confirmation:', error);
    }
  }

  private async sendReturnApproval(returnInfo: ReturnInfo): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Return Request Approved - Return Label Inside',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>✅ Return Request Approved</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your return has been approved!</h2>
              <p>Please print the return label and ship your items back.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Return Label</h4>
                <p><strong>Tracking Number:</strong> ${returnInfo.returnLabel?.trackingNumber}</p>
                <p><strong>Carrier:</strong> ${returnInfo.returnLabel?.carrier}</p>
                <p><strong>Expires:</strong> ${returnInfo.returnLabel?.expiresAt?.toLocaleDateString()}</p>
                
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${returnInfo.returnLabel?.url}" style="background-color: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Print Return Label
                  </a>
                </div>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Shipping Instructions</h4>
                <ol>
                  <li>Package items securely in original packaging if possible</li>
                  <li>Attach the return label to the package</li>
                  <li>Remove any old shipping labels</li>
                  <li>Drop off at any ${returnInfo.returnLabel?.carrier} location</li>
                  <li>Keep your receipt for tracking purposes</li>
                </ol>
              </div>

              <p>Return must be shipped within 14 days of approval.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send return approval:', error);
    }
  }

  private async sendReturnRejection(returnInfo: ReturnInfo, reason: string): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Return Request Not Approved',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1>❌ Return Request Not Approved</h1>
            </div>
            <div style="padding: 20px;">
              <h2>We couldn't approve your return request</h2>
              <p>After reviewing your request, we found that it doesn't meet our return policy requirements.</p>
              
              <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Reason for Rejection</h4>
                <p>${reason}</p>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Return Policy Highlights</h4>
                <ul>
                  <li>Items must be returned within 30 days of purchase</li>
                  <li>Items must be in resalable condition</li>
                  <li>Original packaging preferred but not always required</li>
                  <li>Custom items and perishables are non-returnable</li>
                </ul>
              </div>

              <p>If you believe this was an error, please contact our customer support.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send return rejection:', error);
    }
  }

  private async sendReturnReceivedNotification(returnInfo: ReturnInfo): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Your Return Has Been Received',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>📦 Return Received</h1>
            </div>
            <div style="padding: 20px;">
              <h2>We've received your return!</h2>
              <p>Your items have been received and are now being processed.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Return Details</h4>
                <p><strong>Return ID:</strong> ${returnInfo.id}</p>
                <p><strong>Status:</strong> Processing</p>
                <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>What happens next?</h4>
                <ol>
                  <li>We'll inspect the returned items (1-2 business days)</li>
                  <li>Your refund will be processed if everything is in order</li>
                  <li>Refund will be issued to your original payment method</li>
                  <li>You'll receive a confirmation email when refund is processed</li>
                </ol>
              </div>

              <p>Thank you for your patience!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send return received notification:', error);
    }
  }

  private async sendRefundNotification(returnInfo: ReturnInfo, refund: RefundInfo): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com',
        subject: 'Your Refund Has Been Processed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>💰 Refund Processed</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your refund has been processed!</h2>
              <p>The refund has been issued to your original payment method.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Refund Details</h4>
                <p><strong>Amount:</strong> <span style="font-size: 18px; color: #28a745;">$${refund.amount.toFixed(2)}</span></p>
                <p><strong>Transaction ID:</strong> ${refund.transactionId}</p>
                <p><strong>Method:</strong> ${refund.method.replace('_', ' ')}</p>
                <p><strong>Processed:</strong> ${refund.processedAt?.toLocaleString()}</p>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Important Notes</h4>
                <ul>
                  <li>Refunds may take 3-5 business days to appear in your account</li>
                  <li>The timing depends on your bank or credit card company</li>
                  <li>You'll see the refund as a separate transaction</li>
                </ul>
              </div>

              <p>Thank you for shopping with us!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send refund notification:', error);
    }
  }
}
