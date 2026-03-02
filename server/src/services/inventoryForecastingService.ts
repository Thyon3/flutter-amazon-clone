import { Product } from '../model/product';
import { Order } from '../model/order';
import { EmailService } from './emailService';

export interface ForecastRequest {
  productId?: string;
  category?: string;
  timeHorizon: number; // days
  forecastType: 'demand' | 'sales' | 'revenue' | 'stockout' | 'seasonal';
  confidence: number; // 0-1
  includeFactors: {
    historical?: boolean;
    seasonal?: boolean;
    promotional?: boolean;
    competitor?: boolean;
    economic?: boolean;
    weather?: boolean;
  };
  customFactors?: {
    [key: string]: number;
  };
}

export interface ForecastResponse {
  success: boolean;
  message: string;
  forecast?: ForecastData;
}

export interface ForecastData {
  id: string;
  productId?: string;
  category?: string;
  forecastType: string;
  timeHorizon: number;
  confidence: number;
  predictions: Array<{
    date: string;
    predictedValue: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  }>;
  factors: {
    historical: number;
    seasonal: number;
    promotional: number;
    competitor: number;
    economic: number;
    weather: number;
  };
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    mae: number; // Mean Absolute Error
    bias: number; // Forecast bias
  };
  recommendations: Array<{
    type: 'reorder' | 'promotion' | 'price_adjustment' | 'inventory_adjustment';
    priority: 'low' | 'medium' | 'high';
    description: string;
    actionRequired: boolean;
    estimatedImpact: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  alertType: 'stockout' | 'overstock' | 'slow_moving' | 'obsolescence' | 'reorder_point';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentStock: number;
  recommendedAction: string;
  estimatedDate: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForecastingModel {
  id: string;
  name: string;
  description: string;
  type: 'arima' | 'exponential_smoothing' | 'linear_regression' | 'neural_network' | 'ensemble';
  parameters: {
    [key: string]: any;
  };
  accuracy: {
    trainingMape: number;
    validationMape: number;
    lastUpdated: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForecastingStats {
  totalForecasts: number;
  activeForecasts: number;
  averageAccuracy: number;
  totalAlerts: number;
  resolvedAlerts: number;
  modelPerformance: Array<{
    modelId: string;
    modelName: string;
    accuracy: number;
    usage: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    forecastAccuracy: number;
    alertCount: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    forecasts: number;
    alerts: number;
    accuracy: number;
  }>;
}

export class InventoryForecastingService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Generate forecast
  async generateForecast(request: ForecastRequest): Promise<ForecastResponse> {
    try {
      // Validate request
      const validation = this.validateForecastRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Get historical data
      const historicalData = await this.getHistoricalData(request.productId, request.category);

      // Apply forecasting model
      const model = await this.getBestForecastingModel(request);
      const predictions = await this.applyForecastingModel(historicalData, request, model);

      // Calculate accuracy metrics
      const accuracy = await this.calculateForecastAccuracy(predictions, historicalData);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(predictions, request);

      // Create forecast data
      const forecastData: ForecastData = {
        id: this.generateId(),
        productId: request.productId,
        category: request.category,
        forecastType: request.forecastType,
        timeHorizon: request.timeHorizon,
        confidence: request.confidence,
        predictions,
        factors: await this.calculateInfluenceFactors(historicalData, request),
        accuracy,
        recommendations,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save forecast
      await this.saveForecast(forecastData);

      // Check for alerts
      await this.checkInventoryAlerts(forecastData);

      return {
        success: true,
        message: 'Forecast generated successfully',
        forecast: forecastData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate forecast: ${error}`,
      };
    }
  }

  // Get forecast
  async getForecast(forecastId: string): Promise<{ success: boolean; message: string; forecast?: ForecastData }> {
    try {
      const forecast = await this.getForecastById(forecastId);
      if (!forecast) {
        return {
          success: false,
          message: 'Forecast not found',
        };
      }

      return {
        success: true,
        message: 'Forecast retrieved successfully',
        forecast,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get forecast: ${error}`,
      };
    }
  }

  // Update forecast
  async updateForecast(forecastId: string, updates: Partial<ForecastData>): Promise<{ success: boolean; message: string }> {
    try {
      const forecast = await this.getForecastById(forecastId);
      if (!forecast) {
        return {
          success: false,
          message: 'Forecast not found',
        };
      }

      // Update forecast
      Object.assign(forecast, updates);
      forecast.updatedAt = new Date();

      await this.updateForecastData(forecast);

      return {
        success: true,
        message: 'Forecast updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update forecast: ${error}`,
      };
    }
  }

  // Create forecasting model
  async createForecastingModel(model: Partial<ForecastingModel>): Promise<{ success: boolean; message: string; forecastingModel?: ForecastingModel }> {
    try {
      // Validate model
      const validation = this.validateForecastingModel(model);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Create model
      const forecastingModel: ForecastingModel = {
        id: this.generateId(),
        name: model.name || '',
        description: model.description || '',
        type: model.type || 'exponential_smoothing',
        parameters: model.parameters || {},
        accuracy: {
          trainingMape: 0,
          validationMape: 0,
          lastUpdated: new Date(),
        },
        isActive: model.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Train model
      await this.trainForecastingModel(forecastingModel);

      return {
        success: true,
        message: 'Forecasting model created successfully',
        forecastingModel,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create forecasting model: ${error}`,
      };
    }
  }

  // Process inventory alerts
  async processInventoryAlerts(): Promise<{ success: boolean; message: string; processed: number; alerts?: InventoryAlert[] }> {
    try {
      // Get active forecasts
      const activeForecasts = await this.getActiveForecasts();
      const alerts: InventoryAlert[] = [];

      for (const forecast of activeForecasts) {
        const forecastAlerts = await this.generateInventoryAlerts(forecast);
        alerts.push(...forecastAlerts);
      }

      // Save alerts
      for (const alert of alerts) {
        await this.saveInventoryAlert(alert);
      }

      // Send notifications for critical alerts
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
      for (const alert of criticalAlerts) {
        await this.sendInventoryAlertNotification(alert);
      }

      return {
        success: true,
        message: `Processed ${alerts.length} inventory alerts`,
        processed: alerts.length,
        alerts,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process inventory alerts: ${error}`,
        processed: 0,
      };
    }
  }

  // Get forecasting statistics
  async getForecastingStats(timeRange?: { start: Date; end: Date }): Promise<ForecastingStats> {
    try {
      // In a real app, you'd calculate from database
      return {
        totalForecasts: 10000,
        activeForecasts: 2500,
        averageAccuracy: 0.87,
        totalAlerts: 1500,
        resolvedAlerts: 1200,
        modelPerformance: [
          {
            modelId: '1',
            modelName: 'ARIMA Model',
            accuracy: 0.89,
            usage: 1500,
          },
          {
            modelId: '2',
            modelName: 'Exponential Smoothing',
            accuracy: 0.85,
            usage: 800,
          },
          {
            modelId: '3',
            modelName: 'Neural Network',
            accuracy: 0.91,
            usage: 200,
          },
        ],
        topProducts: [
          {
            productId: '1',
            name: 'iPhone 15 Pro',
            forecastAccuracy: 0.92,
            alertCount: 5,
          },
          {
            productId: '2',
            name: 'Nike Air Max',
            forecastAccuracy: 0.88,
            alertCount: 8,
          },
          {
            productId: '3',
            name: 'Sony PlayStation 5',
            forecastAccuracy: 0.90,
            alertCount: 3,
          },
        ],
        monthlyTrends: [
          { month: '2024-01', forecasts: 800, alerts: 45, accuracy: 0.86 },
          { month: '2024-02', forecasts: 850, alerts: 52, accuracy: 0.87 },
          { month: '2024-03', forecasts: 900, alerts: 48, accuracy: 0.88 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get forecasting stats: ${error}`);
    }
  }

  // Run automatic forecasting
  async runAutomaticForecasting(): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      // Get products that need forecasting
      const products = await this.getProductsForForecasting();
      let processedCount = 0;

      for (const product of products) {
        // Generate forecast for each product
        const forecastRequest: ForecastRequest = {
          productId: product.id,
          timeHorizon: 30, // 30 days
          forecastType: 'demand',
          confidence: 0.8,
          includeFactors: {
            historical: true,
            seasonal: true,
            promotional: true,
            competitor: false,
            economic: false,
            weather: false,
          },
        };

        const result = await this.generateForecast(forecastRequest);
        if (result.success) {
          processedCount++;
        }
      }

      return {
        success: true,
        message: `Processed ${processedCount} product forecasts`,
        processed: processedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to run automatic forecasting: ${error}`,
        processed: 0,
      };
    }
  }

  // Helper methods
  private validateForecastRequest(request: ForecastRequest): { valid: boolean; message: string } {
    if (!request.timeHorizon || request.timeHorizon <= 0) {
      return { valid: false, message: 'Time horizon must be greater than 0' };
    }

    if (!request.forecastType) {
      return { valid: false, message: 'Forecast type is required' };
    }

    if (request.confidence < 0 || request.confidence > 1) {
      return { valid: false, message: 'Confidence must be between 0 and 1' };
    }

    if (!request.productId && !request.category) {
      return { valid: false, message: 'Either product ID or category is required' };
    }

    return { valid: true, message: 'Forecast request is valid' };
  }

  private validateForecastingModel(model: Partial<ForecastingModel>): { valid: boolean; message: string } {
    if (!model.name) {
      return { valid: false, message: 'Model name is required' };
    }

    if (!model.type) {
      return { valid: false, message: 'Model type is required' };
    }

    return { valid: true, message: 'Forecasting model is valid' };
  }

  private async getHistoricalData(productId?: string, category?: string): Promise<any[]> {
    // In a real app, you'd query database for historical sales/inventory data
    return [
      {
        date: '2024-01-01',
        sales: 100,
        inventory: 500,
        price: 99.99,
        promotions: 0,
        seasonality: 1.2,
      },
      {
        date: '2024-01-02',
        sales: 120,
        inventory: 480,
        price: 99.99,
        promotions: 1,
        seasonality: 1.2,
      },
      // ... more historical data points
    ];
  }

  private async getBestForecastingModel(request: ForecastRequest): Promise<ForecastingModel> {
    // In a real app, you'd select model based on data characteristics
    return {
      id: '1',
      name: 'ARIMA Model',
      description: 'AutoRegressive Integrated Moving Average model',
      type: 'arima',
      parameters: {
        p: 1,
        d: 1,
        q: 1,
        seasonalPeriod: 7,
      },
      accuracy: {
        trainingMape: 0.08,
        validationMape: 0.09,
        lastUpdated: new Date(),
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async applyForecastingModel(historicalData: any[], request: ForecastRequest, model: ForecastingModel): Promise<any[]> {
    const predictions: any[] = [];
    const startDate = new Date();

    for (let i = 0; i < request.timeHorizon; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      // Apply model-specific forecasting logic
      let predictedValue = 0;

      switch (model.type) {
        case 'exponential_smoothing':
          predictedValue = await this.applyExponentialSmoothing(historicalData, i);
          break;
        case 'linear_regression':
          predictedValue = await this.applyLinearRegression(historicalData, i);
          break;
        case 'arima':
          predictedValue = await this.applyARIMA(historicalData, model.parameters, i);
          break;
        case 'neural_network':
          predictedValue = await this.applyNeuralNetwork(historicalData, i);
          break;
        default:
          predictedValue = await this.applyExponentialSmoothing(historicalData, i);
      }

      // Apply confidence intervals
      const confidenceInterval = this.calculateConfidenceInterval(predictedValue, request.confidence);

      predictions.push({
        date: currentDate.toISOString().split('T')[0],
        predictedValue,
        lowerBound: confidenceInterval.lower,
        upperBound: confidenceInterval.upper,
        confidence: request.confidence,
      });
    }

    return predictions;
  }

  private async applyExponentialSmoothing(data: any[], horizon: number): Promise<number> {
    // Simple exponential smoothing implementation
    const alpha = 0.3; // smoothing parameter
    let smoothedValue = data[0]?.sales || 0;

    for (let i = 1; i < data.length; i++) {
      smoothedValue = alpha * data[i].sales + (1 - alpha) * smoothedValue;
    }

    // Add trend and seasonality if needed
    const trend = this.calculateTrend(data);
    const seasonality = this.calculateSeasonality(data);

    return smoothedValue + trend * horizon + seasonality;
  }

  private async applyLinearRegression(data: any[], horizon: number): Promise<number> {
    // Simple linear regression implementation
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i].sales;
      sumXY += i * data[i].sales;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * (n + horizon) + intercept;
  }

  private async applyARIMA(data: any[], parameters: any, horizon: number): Promise<number> {
    // Simplified ARIMA implementation
    const { p, d, q } = parameters;
    
    // Differencing
    const differenced = [];
    for (let i = d; i < data.length; i++) {
      differenced.push(data[i].sales - data[i - d].sales);
    }

    // Auto-regression part
    let prediction = 0;
    for (let i = 0; i < Math.min(p, differenced.length); i++) {
      prediction += 0.5 * differenced[differenced.length - 1 - i]; // Simplified AR coefficients
    }

    // Moving average part
    for (let i = 0; i < Math.min(q, differenced.length); i++) {
      prediction += 0.3 * (Math.random() - 0.5); // Simplified MA with noise
    }

    return data[data.length - 1].sales + prediction;
  }

  private async applyNeuralNetwork(data: any[], horizon: number): Promise<number> {
    // Simplified neural network implementation
    // In a real app, you'd use a trained neural network
    const lastValue = data[data.length - 1].sales;
    const trend = this.calculateTrend(data);
    const seasonality = this.calculateSeasonality(data);

    return lastValue + trend * horizon + seasonality * Math.sin(horizon * Math.PI / 6);
  }

  private calculateTrend(data: any[]): number {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.sales, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.sales, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / (data.length / 2);
  }

  private calculateSeasonality(data: any[]): number {
    // Simple seasonality calculation (weekly pattern)
    const weeklyPattern = [0, 0, 0, 0, 0, 0, 0];
    
    for (let i = 0; i < data.length; i++) {
      const dayOfWeek = new Date(data[i].date).getDay();
      weeklyPattern[dayOfWeek] += data[i].sales;
    }

    const avgWeekly = weeklyPattern.reduce((sum, val) => sum + val, 0) / 7;
    const currentDay = new Date().getDay();
    
    return (weeklyPattern[currentDay] / avgWeekly) - 1;
  }

  private calculateConfidenceInterval(value: number, confidence: number): { lower: number; upper: number } {
    // Simplified confidence interval calculation
    const zScore = confidence === 0.95 ? 1.96 : confidence === 0.9 ? 1.645 : 1.28;
    const standardError = value * 0.1; // 10% standard error

    const margin = zScore * standardError;

    return {
      lower: value - margin,
      upper: value + margin,
    };
  }

  private async calculateInfluenceFactors(historicalData: any[], request: ForecastRequest): Promise<any> {
    const factors = {
      historical: 0,
      seasonal: 0,
      promotional: 0,
      competitor: 0,
      economic: 0,
      weather: 0,
    };

    if (request.includeFactors?.historical) {
      factors.historical = 0.6; // Historical data is primary factor
    }

    if (request.includeFactors?.seasonal) {
      factors.seasonal = this.calculateSeasonality(historicalData);
    }

    if (request.includeFactors?.promotional) {
      const promotionalImpact = historicalData.filter(d => d.promotions > 0).length / historicalData.length;
      factors.promotional = promotionalImpact * 0.3;
    }

    if (request.includeFactors?.competitor) {
      factors.competitor = 0.1; // Competitor pricing impact
    }

    if (request.includeFactors?.economic) {
      factors.economic = 0.05; // Economic indicators impact
    }

    if (request.includeFactors?.weather) {
      factors.weather = 0.02; // Weather impact for relevant products
    }

    return factors;
  }

  private async calculateForecastAccuracy(predictions: any[], historicalData: any[]): Promise<any> {
    if (predictions.length === 0 || historicalData.length === 0) {
      return {
        mape: 0,
        rmse: 0,
        mae: 0,
        bias: 0,
      };
    }

    // Calculate accuracy metrics
    let sumAbsoluteError = 0;
    let sumSquaredError = 0;
    let sumPercentageError = 0;
    let sumError = 0;

    const n = Math.min(predictions.length, historicalData.length);

    for (let i = 0; i < n; i++) {
      const actual = historicalData[i]?.sales || 0;
      const predicted = predictions[i]?.predictedValue || 0;

      const error = actual - predicted;
      const absoluteError = Math.abs(error);
      const percentageError = actual !== 0 ? Math.abs(error / actual) : 0;

      sumAbsoluteError += absoluteError;
      sumSquaredError += error * error;
      sumPercentageError += percentageError;
      sumError += error;
    }

    return {
      mape: (sumPercentageError / n) * 100,
      rmse: Math.sqrt(sumSquaredError / n),
      mae: sumAbsoluteError / n,
      bias: sumError / n,
    };
  }

  private async generateRecommendations(predictions: any[], request: ForecastRequest): Promise<any[]> {
    const recommendations: any[] = [];
    const lastPrediction = predictions[predictions.length - 1];

    if (!lastPrediction) return recommendations;

    // Stockout risk
    if (lastPrediction.lowerBound < 10) {
      recommendations.push({
        type: 'reorder',
        priority: 'high',
        description: 'Risk of stockout detected. Recommend immediate reorder.',
        actionRequired: true,
        estimatedImpact: lastPrediction.predictedValue * 0.8, // Potential lost sales
      });
    }

    // Overstock risk
    if (lastPrediction.upperBound > 1000) {
      recommendations.push({
        type: 'inventory_adjustment',
        priority: 'medium',
        description: 'Risk of overstock detected. Consider promotional activities.',
        actionRequired: true,
        estimatedImpact: lastPrediction.predictedValue * 0.1, // Holding cost
      });
    }

    // Slow moving inventory
    const trend = this.calculateTrend(predictions.map(p => ({ sales: p.predictedValue })));
    if (trend < -5) {
      recommendations.push({
        type: 'promotion',
        priority: 'low',
        description: 'Declining trend detected. Consider promotional pricing.',
        actionRequired: false,
        estimatedImpact: Math.abs(trend) * 10,
      });
    }

    return recommendations;
  }

  private async generateInventoryAlerts(forecast: ForecastData): Promise<InventoryAlert[]> {
    const alerts: InventoryAlert[] = [];
    const lastPrediction = forecast.predictions[forecast.predictions.length - 1];

    if (!lastPrediction) return alerts;

    // Stockout alert
    if (lastPrediction.lowerBound < 5) {
      alerts.push({
        id: this.generateId(),
        productId: forecast.productId || '',
        alertType: 'stockout',
        severity: 'critical',
        message: 'Stockout risk within forecast period',
        currentStock: 5,
        recommendedAction: 'Immediate reorder required',
        estimatedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Overstock alert
    if (lastPrediction.upperBound > 500) {
      alerts.push({
        id: this.generateId(),
        productId: forecast.productId || '',
        alertType: 'overstock',
        severity: 'medium',
        message: 'Overstock risk detected',
        currentStock: 500,
        recommendedAction: 'Consider promotional activities',
        estimatedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return alerts;
  }

  private async checkInventoryAlerts(forecast: ForecastData): Promise<void> {
    const alerts = await this.generateInventoryAlerts(forecast);
    
    for (const alert of alerts) {
      await this.saveInventoryAlert(alert);
      
      if (alert.severity === 'critical') {
        await this.sendInventoryAlertNotification(alert);
      }
    }
  }

  private async trainForecastingModel(model: ForecastingModel): Promise<void> {
    // In a real app, you'd train the model with historical data
    console.log(`Training forecasting model: ${model.id}`);
    
    // Update accuracy metrics
    model.accuracy.trainingMape = 0.08;
    model.accuracy.validationMape = 0.09;
    model.accuracy.lastUpdated = new Date();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Database helper methods
  private async saveForecast(forecast: ForecastData): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Forecast saved: ${forecast.id}`);
  }

  private async updateForecastData(forecast: ForecastData): Promise<void> {
    // In a real app, you'd update database
    console.log(`Forecast updated: ${forecast.id}`);
  }

  private async getForecastById(forecastId: string): Promise<ForecastData | null> {
    // In a real app, you'd query database
    return null;
  }

  private async getActiveForecasts(): Promise<ForecastData[]> {
    // In a real app, you'd query database
    return [];
  }

  private async getProductsForForecasting(): Promise<any[]> {
    // In a real app, you'd query database for products that need forecasting
    return [];
  }

  private async saveInventoryAlert(alert: InventoryAlert): Promise<void> {
    // In a real app, you'd save to database
    console.log(`Inventory alert saved: ${alert.id}`);
  }

  // Email notification method
  private async sendInventoryAlertNotification(alert: InventoryAlert): Promise<void> {
    try {
      const emailData = {
        to: 'inventory@example.com', // Would get from system settings
        subject: `Critical Inventory Alert: ${alert.alertType.replace('_', ' ').toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${alert.severity === 'critical' ? '#dc3545' : '#ffc107'}; color: white; padding: 20px; text-align: center;">
              <h1>🚨 ${alert.severity.toUpperCase()} Inventory Alert</h1>
            </div>
            <div style="padding: 20px;">
              <h2>${alert.message}</h2>
              
              <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Alert Details</h4>
                <p><strong>Product ID:</strong> ${alert.productId}</p>
                <p><strong>Alert Type:</strong> ${alert.alertType.replace('_', ' ')}</p>
                <p><strong>Severity:</strong> ${alert.severity}</p>
                <p><strong>Current Stock:</strong> ${alert.currentStock}</p>
                <p><strong>Recommended Action:</strong> ${alert.recommendedAction}</p>
                <p><strong>Estimated Date:</strong> ${alert.estimatedDate.toLocaleDateString()}</p>
              </div>

              <p>Please take immediate action to resolve this alert.</p>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send inventory alert notification:', error);
    }
  }
}
