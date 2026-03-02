import { User } from '../model/user';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { EmailService } from './emailService';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  exchangeRate: number;
  isActive: boolean;
  lastUpdated: Date;
}

export interface CurrencyConversion {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  timestamp: Date;
}

export interface CurrencyRequest {
  userId: string;
  preferredCurrency: string;
  autoConvert: boolean;
  notificationPreferences: {
    rateAlerts: boolean;
    conversionConfirmations: boolean;
    priceChanges: boolean;
  };
}

export interface CurrencyResponse {
  success: boolean;
  message: string;
  currency?: Currency;
}

export interface PriceConversion {
  productId: string;
  originalPrice: number;
  originalCurrency: string;
  convertedPrice: number;
  targetCurrency: string;
  exchangeRate: number;
  lastUpdated: Date;
}

export interface CurrencyStats {
  totalCurrencies: number;
  activeCurrencies: number;
  totalConversions: number;
  averageDailyVolume: number;
  topCurrencies: Array<{
    code: string;
    name: string;
    volume: number;
    percentage: number;
  }>;
  exchangeRateVolatility: Array<{
    currency: string;
    volatility: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  monthlyTrends: Array<{
    month: string;
    conversions: number;
    volume: number;
    averageRate: number;
  }>;
}

export class MultiCurrencyService {
  private emailService: EmailService;
  private currencies: Map<string, Currency> = new Map();

  constructor() {
    this.emailService = new EmailService();
    this.initializeCurrencies();
  }

  // Initialize supported currencies
  private initializeCurrencies(): void {
    const defaultCurrencies: Currency[] = [
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        exchangeRate: 1.0,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
        exchangeRate: 0.85,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimalPlaces: 2,
        exchangeRate: 0.73,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        decimalPlaces: 0,
        exchangeRate: 110.5,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        decimalPlaces: 2,
        exchangeRate: 1.25,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        decimalPlaces: 2,
        exchangeRate: 1.35,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        code: 'CHF',
        name: 'Swiss Franc',
        symbol: 'CHF',
        decimalPlaces: 2,
        exchangeRate: 0.92,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        code: 'CNY',
        name: 'Chinese Yuan',
        symbol: '¥',
        decimalPlaces: 2,
        exchangeRate: 6.45,
        isActive: true,
        lastUpdated: new Date(),
      },
    ];

    defaultCurrencies.forEach(currency => {
      this.currencies.set(currency.code, currency);
    });
  }

  // Get all supported currencies
  async getSupportedCurrencies(): Promise<Currency[]> {
    try {
      return Array.from(this.currencies.values()).filter(currency => currency.isActive);
    } catch (error) {
      throw new Error(`Failed to get supported currencies: ${error}`);
    }
  }

  // Get currency by code
  async getCurrency(code: string): Promise<Currency | null> {
    try {
      return this.currencies.get(code.toUpperCase()) || null;
    } catch (error) {
      throw new Error(`Failed to get currency: ${error}`);
    }
  }

  // Convert currency
  async convertCurrency(from: string, to: string, amount: number): Promise<{ success: boolean; message: string; conversion?: CurrencyConversion }> {
    try {
      // Validate currencies
      const fromCurrency = this.currencies.get(from.toUpperCase());
      const toCurrency = this.currencies.get(to.toUpperCase());

      if (!fromCurrency || !fromCurrency.isActive) {
        return {
          success: false,
          message: `Source currency ${from} is not supported`,
        };
      }

      if (!toCurrency || !toCurrency.isActive) {
        return {
          success: false,
          message: `Target currency ${to} is not supported`,
        };
      }

      if (amount <= 0) {
        return {
          success: false,
          message: 'Amount must be greater than 0',
        };
      }

      // Calculate conversion
      const usdAmount = amount / fromCurrency.exchangeRate;
      const convertedAmount = usdAmount * toCurrency.exchangeRate;
      const rate = toCurrency.exchangeRate / fromCurrency.exchangeRate;

      const conversion: CurrencyConversion = {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        amount,
        convertedAmount: this.roundToDecimal(convertedAmount, toCurrency.decimalPlaces),
        rate,
        timestamp: new Date(),
      };

      // Log conversion
      await this.logCurrencyConversion(conversion);

      return {
        success: true,
        message: 'Currency converted successfully',
        conversion,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to convert currency: ${error}`,
      };
    }
  }

  // Set user's preferred currency
  async setUserCurrency(request: CurrencyRequest): Promise<CurrencyResponse> {
    try {
      // Validate request
      const validation = this.validateCurrencyRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Get currency
      const currency = await this.getCurrency(request.preferredCurrency);
      if (!currency) {
        return {
          success: false,
          message: 'Currency is not supported',
        };
      }

      // Update user preferences
      await this.updateUserCurrencyPreferences(request.userId, request);

      // Send confirmation
      if (request.notificationPreferences.conversionConfirmations) {
        await this.sendCurrencyChangeNotification(request.userId, currency);
      }

      return {
        success: true,
        message: 'Currency preference updated successfully',
        currency,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to set user currency: ${error}`,
      };
    }
  }

  // Convert product price
  async convertProductPrice(productId: string, targetCurrency: string): Promise<{ success: boolean; message: string; conversion?: PriceConversion }> {
    try {
      // Get product
      const product = await this.getProduct(productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      // Get target currency
      const currency = await this.getCurrency(targetCurrency);
      if (!currency) {
        return {
          success: false,
          message: 'Target currency is not supported',
        };
      }

      // Convert price
      const usdPrice = product.price; // Assuming base price is USD
      const convertedPrice = usdPrice * currency.exchangeRate;

      const conversion: PriceConversion = {
        productId,
        originalPrice: product.price,
        originalCurrency: 'USD',
        convertedPrice: this.roundToDecimal(convertedPrice, currency.decimalPlaces),
        targetCurrency,
        exchangeRate: currency.exchangeRate,
        lastUpdated: currency.lastUpdated,
      };

      return {
        success: true,
        message: 'Product price converted successfully',
        conversion,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to convert product price: ${error}`,
      };
    }
  }

  // Update exchange rates
  async updateExchangeRates(): Promise<{ success: boolean; message: string; updated: number }> {
    try {
      // In a real app, you'd fetch from external API
      const newRates = await this.fetchExchangeRates();
      let updatedCount = 0;

      for (const [code, newRate] of Object.entries(newRates)) {
        const currency = this.currencies.get(code);
        if (currency && currency.isActive) {
          const oldRate = currency.exchangeRate;
          currency.exchangeRate = newRate;
          currency.lastUpdated = new Date();

          // Check for significant changes
          const changePercent = Math.abs((newRate - oldRate) / oldRate) * 100;
          if (changePercent > 5) { // 5% change threshold
            await this.sendRateChangeAlert(code, oldRate, newRate, changePercent);
          }

          updatedCount++;
        }
      }

      return {
        success: true,
        message: `Updated ${updatedCount} exchange rates`,
        updated: updatedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update exchange rates: ${error}`,
        updated: 0,
      };
    }
  }

  // Get user's currency preferences
  async getUserCurrencyPreferences(userId: string): Promise<any> {
    try {
      // In a real app, you'd query database
      return {
        userId,
        preferredCurrency: 'USD',
        autoConvert: true,
        notificationPreferences: {
          rateAlerts: true,
          conversionConfirmations: true,
          priceChanges: false,
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get user currency preferences: ${error}`);
    }
  }

  // Get currency statistics
  async getCurrencyStats(timeRange?: { start: Date; end: Date }): Promise<CurrencyStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalCurrencies: 8,
        activeCurrencies: 8,
        totalConversions: 500000,
        averageDailyVolume: 16667,
        topCurrencies: [
          {
            code: 'USD',
            name: 'US Dollar',
            volume: 200000,
            percentage: 40,
          },
          {
            code: 'EUR',
            name: 'Euro',
            volume: 150000,
            percentage: 30,
          },
          {
            code: 'GBP',
            name: 'British Pound',
            volume: 75000,
            percentage: 15,
          },
          {
            code: 'JPY',
            name: 'Japanese Yen',
            volume: 50000,
            percentage: 10,
          },
          {
            code: 'CAD',
            name: 'Canadian Dollar',
            volume: 25000,
            percentage: 5,
          },
        ],
        exchangeRateVolatility: [
          {
            currency: 'EUR',
            volatility: 0.025,
            trend: 'increasing',
          },
          {
            currency: 'GBP',
            volatility: 0.018,
            trend: 'decreasing',
          },
          {
            currency: 'JPY',
            volatility: 0.012,
            trend: 'stable',
          },
        ],
        monthlyTrends: [
          { month: '2024-01', conversions: 45000, volume: 1500000, averageRate: 0.85 },
          { month: '2024-02', conversions: 48000, volume: 1600000, averageRate: 0.86 },
          { month: '2024-03', conversions: 52000, volume: 1700000, averageRate: 0.87 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get currency stats: ${error}`);
    }
  }

  // Format currency amount
  formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.currencies.get(currencyCode.toUpperCase());
    if (!currency) {
      return amount.toString();
    }

    const roundedAmount = this.roundToDecimal(amount, currency.decimalPlaces);
    const formattedAmount = roundedAmount.toLocaleString('en-US', {
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    });

    return `${currency.symbol}${formattedAmount}`;
  }

  // Calculate price in user's preferred currency
  async calculatePriceInUserCurrency(userId: string, price: number, baseCurrency: string = 'USD'): Promise<{ success: boolean; message: string; formattedPrice?: string; exchangeRate?: number }> {
    try {
      // Get user preferences
      const preferences = await this.getUserCurrencyPreferences(userId);
      
      // If same currency, return as-is
      if (preferences.preferredCurrency === baseCurrency) {
        const currency = this.currencies.get(baseCurrency);
        const formattedPrice = this.formatCurrency(price, baseCurrency);
        
        return {
          success: true,
          message: 'Price calculated successfully',
          formattedPrice,
          exchangeRate: 1,
        };
      }

      // Convert to preferred currency
      const conversion = await this.convertCurrency(baseCurrency, preferences.preferredCurrency, price);
      
      if (conversion.success && conversion.conversion) {
        const formattedPrice = this.formatCurrency(conversion.conversion.convertedAmount, preferences.preferredCurrency);
        
        return {
          success: true,
          message: 'Price converted successfully',
          formattedPrice,
          exchangeRate: conversion.conversion.rate,
        };
      }

      return {
        success: false,
        message: 'Failed to convert price',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to calculate price: ${error}`,
      };
    }
  }

  // Helper methods
  private validateCurrencyRequest(request: CurrencyRequest): { valid: boolean; message: string } {
    if (!request.userId) {
      return { valid: false, message: 'User ID is required' };
    }

    if (!request.preferredCurrency) {
      return { valid: false, message: 'Preferred currency is required' };
    }

    const currency = this.currencies.get(request.preferredCurrency.toUpperCase());
    if (!currency) {
      return { valid: false, message: 'Currency is not supported' };
    }

    if (!currency.isActive) {
      return { valid: false, message: 'Currency is not active' };
    }

    return { valid: true, message: 'Currency request is valid' };
  }

  private roundToDecimal(amount: number, decimalPlaces: number): number {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(amount * factor) / factor;
  }

  private async fetchExchangeRates(): Promise<Record<string, number>> {
    // In a real app, you'd fetch from external API like Fixer.io, Open Exchange Rates, etc.
    // For now, return mock data
    return {
      USD: 1.0,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.5,
      CAD: 1.25,
      AUD: 1.35,
      CHF: 0.92,
      CNY: 6.45,
    };
  }

  private async logCurrencyConversion(conversion: CurrencyConversion): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Currency conversion logged: ${conversion.from} to ${conversion.to}, amount: ${conversion.amount}`);
  }

  private async updateUserCurrencyPreferences(userId: string, request: CurrencyRequest): Promise<void> {
    // In a real app, you'd update user preferences in database
    console.log(`Updated currency preferences for user ${userId}: ${request.preferredCurrency}`);
  }

  private async getProduct(productId: string): Promise<any> {
    // In a real app, you'd query database
    return {
      id: productId,
      name: 'Sample Product',
      price: 99.99,
      currency: 'USD',
    };
  }

  private async sendCurrencyChangeNotification(userId: string, currency: Currency): Promise<void> {
    try {
      const emailData = {
        to: 'user@example.com', // Would get from user record
        subject: 'Currency Preference Updated',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
              <h1>💱 Currency Preference Updated</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your currency preference has been updated</h2>
              <p>All prices will now be displayed in your preferred currency.</p>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>New Currency Settings</h4>
                <p><strong>Currency:</strong> ${currency.name} (${currency.code})</p>
                <p><strong>Symbol:</strong> ${currency.symbol}</p>
                <p><strong>Exchange Rate:</strong> 1 USD = ${currency.exchangeRate} ${currency.code}</p>
                <p><strong>Last Updated:</strong> ${currency.lastUpdated.toLocaleString()}</p>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>What This Means</h4>
                <ul>
                  <li>All product prices will be converted to ${currency.name}</li>
                  <li>Order totals will be calculated in ${currency.name}</li>
                  <li>You can change your preference anytime in settings</li>
                </ul>
              </div>

              <p>Happy shopping!</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send currency change notification:', error);
    }
  }

  private async sendRateChangeAlert(currencyCode: string, oldRate: number, newRate: number, changePercent: number): Promise<void> {
    try {
      const currency = this.currencies.get(currencyCode);
      if (!currency) return;

      const emailData = {
        to: 'admin@example.com', // Would get from system settings
        subject: `Significant Exchange Rate Change: ${currencyCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ffc107; color: #000; padding: 20px; text-align: center;">
              <h1>📈 Exchange Rate Alert</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Significant exchange rate change detected</h2>
              <p>The exchange rate for ${currency.name} has changed significantly.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Rate Change Details</h4>
                <p><strong>Currency:</strong> ${currency.name} (${currencyCode})</p>
                <p><strong>Previous Rate:</strong> ${oldRate.toFixed(4)}</p>
                <p><strong>New Rate:</strong> ${newRate.toFixed(4)}</p>
                <p><strong>Change:</strong> <span style="color: ${changePercent > 0 ? '#dc3545' : '#28a745'};">${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%</span></p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <p>This change may impact pricing and conversions. Please review and update as needed.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send rate change alert:', error);
    }
  }

  // Batch currency conversion
  async batchConvertCurrency(conversions: Array<{ from: string; to: string; amount: number }>): Promise<{ success: boolean; message: string; results?: CurrencyConversion[] }> {
    try {
      const results: CurrencyConversion[] = [];

      for (const conversion of conversions) {
        const result = await this.convertCurrency(conversion.from, conversion.to, conversion.amount);
        if (result.success && result.conversion) {
          results.push(result.conversion);
        }
      }

      return {
        success: true,
        message: `Batch conversion completed. ${results.length}/${conversions.length} successful`,
        results,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to perform batch conversion: ${error}`,
      };
    }
  }

  // Get exchange rate history
  async getExchangeRateHistory(currencyCode: string, days: number = 30): Promise<Array<{ date: string; rate: number }>> {
    try {
      // In a real app, you'd query database
      const history = [];
      const endDate = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        
        // Generate mock historical rates
        const baseRate = this.currencies.get(currencyCode)?.exchangeRate || 1;
        const randomVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
        const rate = baseRate * (1 + randomVariation);

        history.push({
          date: date.toISOString().split('T')[0],
          rate: parseFloat(rate.toFixed(4)),
        });
      }

      return history.reverse(); // Most recent first
    } catch (error) {
      throw new Error(`Failed to get exchange rate history: ${error}`);
    }
  }

  // Calculate currency volatility
  async calculateCurrencyVolatility(currencyCode: string, days: number = 30): Promise<{ volatility: number; trend: 'increasing' | 'decreasing' | 'stable' }> {
    try {
      const history = await this.getExchangeRateHistory(currencyCode, days);
      
      if (history.length < 2) {
        return { volatility: 0, trend: 'stable' };
      }

      // Calculate daily returns
      const returns = [];
      for (let i = 1; i < history.length; i++) {
        const dailyReturn = (history[i].rate - history[i - 1].rate) / history[i - 1].rate;
        returns.push(dailyReturn);
      }

      // Calculate volatility (standard deviation of returns)
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility

      // Determine trend
      const firstRate = history[0].rate;
      const lastRate = history[history.length - 1].rate;
      const change = (lastRate - firstRate) / firstRate;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (Math.abs(change) > 0.01) { // 1% threshold
        trend = change > 0 ? 'increasing' : 'decreasing';
      }

      return { volatility, trend };
    } catch (error) {
      throw new Error(`Failed to calculate currency volatility: ${error}`);
    }
  }
}
