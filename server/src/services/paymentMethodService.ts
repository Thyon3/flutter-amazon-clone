import { PaymentMethod, IPaymentMethod } from '../model/paymentMethod';
import { User } from '../model/user';
import { EmailService } from './emailService';

export interface PaymentMethodRequest {
  userId: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_account';
  provider: string;
  cardNumber?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  cardholderName?: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paypalEmail?: string;
  bankName?: string;
  accountType?: string;
  routingNumber?: string;
  accountNumber?: string;
  isDefault?: boolean;
}

export interface PaymentMethodResponse {
  success: boolean;
  paymentMethodId?: string;
  message: string;
  paymentMethod?: IPaymentMethod;
}

export interface PaymentMethodStats {
  totalPaymentMethods: number;
  activePaymentMethods: number;
  expiredPaymentMethods: number;
  methodsByType: Record<string, number>;
  methodsByProvider: Record<string, number>;
  verificationStats: {
    verified: number;
    pending: number;
    failed: number;
  };
}

export class PaymentMethodService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Add a new payment method
  async addPaymentMethod(request: PaymentMethodRequest): Promise<PaymentMethodResponse> {
    try {
      // Validate payment method data
      const validation = this.validatePaymentMethod(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Check if this should be the default payment method
      const isDefault = request.isDefault || false;
      
      // If setting as default, unset other default methods
      if (isDefault) {
        await PaymentMethod.updateMany(
          { user: request.userId, isDefault: true },
          { isDefault: false }
        );
      }

      // Process payment method based on type
      let processedData: Partial<IPaymentMethod> = {
        user: request.userId,
        type: request.type,
        provider: request.provider,
        isDefault,
        billingAddress: request.billingAddress,
        status: 'active',
        verificationStatus: 'pending',
      };

      switch (request.type) {
        case 'credit_card':
        case 'debit_card':
          if (!request.cardNumber || !request.expiryMonth || !request.expiryYear || !request.cvv) {
            return {
              success: false,
              message: 'Card details are required for credit/debit cards',
            };
          }
          
          processedData.lastFour = request.cardNumber.slice(-4);
          processedData.expiryMonth = request.expiryMonth;
          processedData.expiryYear = request.expiryYear;
          processedData.brand = this.detectCardBrand(request.cardNumber);
          processedData.metadata = {
            cardholderName: request.cardholderName,
          };
          
          // In a real app, you'd integrate with a payment processor like Stripe
          processedData.token = await this.createPaymentToken(request);
          break;

        case 'paypal':
          if (!request.paypalEmail) {
            return {
              success: false,
              message: 'PayPal email is required',
            };
          }
          
          processedData.lastFour = request.paypalEmail.slice(-4);
          processedData.metadata = {
            paypalEmail: request.paypalEmail,
          };
          
          processedData.token = await this.createPayPalToken(request.paypalEmail);
          break;

        case 'bank_account':
          if (!request.bankName || !request.accountType || !request.routingNumber || !request.accountNumber) {
            return {
              success: false,
              message: 'Bank account details are required',
            };
          }
          
          processedData.lastFour = request.accountNumber.slice(-4);
          processedData.metadata = {
            bankName: request.bankName,
            accountType: request.accountType,
            routingNumber: request.routingNumber,
          };
          
          processedData.token = await this.createBankToken(request);
          break;

        default:
          processedData.lastFour = '****';
          processedData.token = await this.createGenericToken(request);
      }

      const paymentMethod = new PaymentMethod(processedData);
      await paymentMethod.save();

      // Send verification notification
      await this.sendVerificationNotification(paymentMethod);

      return {
        success: true,
        paymentMethodId: paymentMethod._id.toString(),
        message: 'Payment method added successfully',
        paymentMethod,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add payment method: ${error}`,
      };
    }
  }

  // Get user's payment methods
  async getUserPaymentMethods(userId: string): Promise<IPaymentMethod[]> {
    try {
      const paymentMethods = await PaymentMethod.find({ 
        user: userId,
        status: { $ne: 'expired' }
      })
        .sort({ isDefault: -1, createdAt: -1 });

      return paymentMethods;
    } catch (error) {
      throw new Error(`Failed to get user payment methods: ${error}`);
    }
  }

  // Get payment method by ID
  async getPaymentMethodById(paymentMethodId: string, userId: string): Promise<IPaymentMethod | null> {
    try {
      const paymentMethod = await PaymentMethod.findOne({ 
        _id: paymentMethodId, 
        user: userId 
      });

      return paymentMethod;
    } catch (error) {
      throw new Error(`Failed to get payment method: ${error}`);
    }
  }

  // Update payment method
  async updatePaymentMethod(
    paymentMethodId: string,
    userId: string,
    updates: Partial<Pick<IPaymentMethod, 'billingAddress' | 'isDefault' | 'metadata'>>
  ): Promise<PaymentMethodResponse> {
    try {
      const paymentMethod = await PaymentMethod.findOne({ 
        _id: paymentMethodId, 
        user: userId 
      });
      
      if (!paymentMethod) {
        return {
          success: false,
          message: 'Payment method not found',
        };
      }

      // If setting as default, unset other default methods
      if (updates.isDefault) {
        await PaymentMethod.updateMany(
          { user: userId, isDefault: true, _id: { $ne: paymentMethodId } },
          { isDefault: false }
        );
      }

      Object.assign(paymentMethod, updates);
      await paymentMethod.save();

      return {
        success: true,
        message: 'Payment method updated successfully',
        paymentMethod,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update payment method: ${error}`,
      };
    }
  }

  // Delete payment method
  async deletePaymentMethod(paymentMethodId: string, userId: string): Promise<PaymentMethodResponse> {
    try {
      const paymentMethod = await PaymentMethod.findOne({ 
        _id: paymentMethodId, 
        user: userId 
      });
      
      if (!paymentMethod) {
        return {
          success: false,
          message: 'Payment method not found',
        };
      }

      // Don't allow deletion of default payment method if user has other methods
      if (paymentMethod.isDefault) {
        const otherMethods = await PaymentMethod.find({ 
          user: userId, 
          _id: { $ne: paymentMethodId },
          status: 'active'
        });
        
        if (otherMethods.length > 0) {
          return {
            success: false,
            message: 'Cannot delete default payment method. Please set another payment method as default first.',
          };
        }
      }

      await PaymentMethod.findByIdAndDelete(paymentMethodId);

      return {
        success: true,
        message: 'Payment method deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete payment method: ${error}`,
      };
    }
  }

  // Set default payment method
  async setDefaultPaymentMethod(paymentMethodId: string, userId: string): Promise<PaymentMethodResponse> {
    try {
      const paymentMethod = await PaymentMethod.findOne({ 
        _id: paymentMethodId, 
        user: userId 
      });
      
      if (!paymentMethod) {
        return {
          success: false,
          message: 'Payment method not found',
        };
      }

      // Unset other default methods
      await PaymentMethod.updateMany(
        { user: userId, isDefault: true },
        { isDefault: false }
      );

      // Set this as default
      paymentMethod.isDefault = true;
      await paymentMethod.save();

      return {
        success: true,
        message: 'Default payment method updated successfully',
        paymentMethod,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to set default payment method: ${error}`,
      };
    }
  }

  // Verify payment method
  async verifyPaymentMethod(paymentMethodId: string, userId: string): Promise<PaymentMethodResponse> {
    try {
      const paymentMethod = await PaymentMethod.findOne({ 
        _id: paymentMethodId, 
        user: userId 
      });
      
      if (!paymentMethod) {
        return {
          success: false,
          message: 'Payment method not found',
        };
      }

      // In a real app, you'd verify with the payment processor
      const isVerified = await this.verifyWithProcessor(paymentMethod);
      
      paymentMethod.verificationStatus = isVerified ? 'verified' : 'failed';
      await paymentMethod.save();

      // Send verification result notification
      await this.sendVerificationResultNotification(paymentMethod, isVerified);

      return {
        success: true,
        message: `Payment method ${isVerified ? 'verified' : 'verification failed'}`,
        paymentMethod,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to verify payment method: ${error}`,
      };
    }
  }

  // Check for expired payment methods
  async checkExpiredPaymentMethods(): Promise<number> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const expiredMethods = await PaymentMethod.find({
        type: { $in: ['credit_card', 'debit_card'] },
        status: 'active',
        $or: [
          { expiryYear: { $lt: currentYear } },
          { 
            $and: [
              { expiryYear: currentYear },
              { expiryMonth: { $lt: currentMonth } }
            ]
          }
        ],
      });

      let updatedCount = 0;
      for (const method of expiredMethods) {
        method.status = 'expired';
        await method.save();
        updatedCount++;
        
        // Send expiration notification
        await this.sendExpirationNotification(method);
      }

      return updatedCount;
    } catch (error) {
      console.error('Failed to check expired payment methods:', error);
      return 0;
    }
  }

  // Get payment method statistics
  async getPaymentMethodStats(userId?: string): Promise<PaymentMethodStats> {
    try {
      let filter: any = {};
      if (userId) {
        filter.user = userId;
      }

      const totalPaymentMethods = await PaymentMethod.countDocuments(filter);
      const activePaymentMethods = await PaymentMethod.countDocuments({ 
        ...filter, 
        status: 'active' 
      });
      const expiredPaymentMethods = await PaymentMethod.countDocuments({ 
        ...filter, 
        status: 'expired' 
      });

      // Methods by type
      const typeStats = await PaymentMethod.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]);

      const methodsByType = typeStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Methods by provider
      const providerStats = await PaymentMethod.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$provider',
            count: { $sum: 1 },
          },
        },
      ]);

      const methodsByProvider = providerStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Verification stats
      const verificationStats = await PaymentMethod.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$verificationStatus',
            count: { $sum: 1 },
          },
        },
      ]);

      const verificationCounts = verificationStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, { verified: 0, pending: 0, failed: 0 });

      return {
        totalPaymentMethods,
        activePaymentMethods,
        expiredPaymentMethods,
        methodsByType,
        methodsByProvider,
        verificationStats: verificationCounts,
      };
    } catch (error) {
      throw new Error(`Failed to get payment method stats: ${error}`);
    }
  }

  // Validate payment method data
  private validatePaymentMethod(request: PaymentMethodRequest): { valid: boolean; message: string } {
    // Validate card number if provided
    if (request.cardNumber && !this.isValidCardNumber(request.cardNumber)) {
      return { valid: false, message: 'Invalid card number' };
    }

    // Validate expiry date if provided
    if (request.expiryMonth && request.expiryYear) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      if (request.expiryYear < currentYear || 
          (request.expiryYear === currentYear && request.expiryMonth < currentMonth)) {
        return { valid: false, message: 'Card has expired' };
      }
    }

    // Validate email if provided
    if (request.paypalEmail && !this.isValidEmail(request.paypalEmail)) {
      return { valid: false, message: 'Invalid PayPal email' };
    }

    // Validate billing address
    if (!request.billingAddress.street || !request.billingAddress.city || 
        !request.billingAddress.state || !request.billingAddress.zip || 
        !request.billingAddress.country) {
      return { valid: false, message: 'Complete billing address is required' };
    }

    return { valid: true, message: 'Payment method data is valid' };
  }

  // Detect card brand
  private detectCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\D/g, '');
    
    if (number.startsWith('4')) return 'visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'mastercard';
    if (number.startsWith('3')) return 'american_express';
    if (number.startsWith('6')) return 'discover';
    
    return 'unknown';
  }

  // Validate card number (Luhn algorithm)
  private isValidCardNumber(cardNumber: string): boolean {
    const number = cardNumber.replace(/\D/g, '');
    
    if (number.length < 13 || number.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  // Validate email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Create payment token (simulated)
  private async createPaymentToken(request: PaymentMethodRequest): Promise<string> {
    // In a real app, you'd integrate with Stripe, Braintree, etc.
    return `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create PayPal token (simulated)
  private async createPayPalToken(email: string): Promise<string> {
    return `paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create bank token (simulated)
  private async createBankToken(request: PaymentMethodRequest): Promise<string> {
    return `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create generic token (simulated)
  private async createGenericToken(request: PaymentMethodRequest): Promise<string> {
    return `generic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Verify with payment processor (simulated)
  private async verifyWithProcessor(paymentMethod: IPaymentMethod): Promise<boolean> {
    // In a real app, you'd verify with the payment processor
    // For simulation, we'll return true for most cases
    return Math.random() > 0.1; // 90% success rate
  }

  // Send verification notification
  private async sendVerificationNotification(paymentMethod: IPaymentMethod): Promise<void> {
    try {
      const user = await User.findById(paymentMethod.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Payment Method Added - Verification Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>💳 Payment Method Added</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>A new payment method has been added to your account. Please verify it to start using it.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Payment Method Details:</h3>
                <p><strong>Type:</strong> ${paymentMethod.type}</p>
                <p><strong>Provider:</strong> ${paymentMethod.provider}</p>
                <p><strong>Last Four:</strong> ****${paymentMethod.lastFour}</p>
                <p><strong>Status:</strong> ${paymentMethod.verificationStatus}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/payment-methods/verify/${paymentMethod._id}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Verify Payment Method
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send verification notification:', error);
    }
  }

  // Send verification result notification
  private async sendVerificationResultNotification(paymentMethod: IPaymentMethod, isVerified: boolean): Promise<void> {
    try {
      const user = await User.findById(paymentMethod.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: `Payment Method ${isVerified ? 'Verified' : 'Verification Failed'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${isVerified ? '#28a745' : '#dc3545'}; color: white; padding: 20px; text-align: center;">
              <h1>💳 Payment Method ${isVerified ? 'Verified' : 'Verification Failed'}</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your payment method has been ${isVerified ? 'successfully verified' : 'failed verification'}.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Payment Method Details:</h3>
                <p><strong>Type:</strong> ${paymentMethod.type}</p>
                <p><strong>Provider:</strong> ${paymentMethod.provider}</p>
                <p><strong>Last Four:</strong> ****${paymentMethod.lastFour}</p>
                <p><strong>Status:</strong> ${paymentMethod.verificationStatus}</p>
              </div>

              ${isVerified ? `
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h4>Great News!</h4>
                  <p>Your payment method is now ready to use for purchases.</p>
                </div>
              ` : `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h4>Action Required</h4>
                  <p>Please check your payment method details and try again, or contact support for assistance.</p>
                </div>
              `}

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/payment-methods" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Manage Payment Methods
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send verification result notification:', error);
    }
  }

  // Send expiration notification
  private async sendExpirationNotification(paymentMethod: IPaymentMethod): Promise<void> {
    try {
      const user = await User.findById(paymentMethod.user);
      if (!user) return;

      const emailData = {
        to: user.email,
        subject: 'Payment Method Expired',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1>💳 Payment Method Expired</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>Your payment method has expired and is no longer available for use.</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Expired Payment Method:</h3>
                <p><strong>Type:</strong> ${paymentMethod.type}</p>
                <p><strong>Provider:</strong> ${paymentMethod.provider}</p>
                <p><strong>Last Four:</strong> ****${paymentMethod.lastFour}</p>
                <p><strong>Status:</strong> Expired</p>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Action Required</h4>
                <p>Please update your payment method information or add a new payment method to continue using our services.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/payment-methods" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Update Payment Methods
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send expiration notification:', error);
    }
  }
}
