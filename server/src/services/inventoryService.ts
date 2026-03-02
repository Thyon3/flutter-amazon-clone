import { Inventory, IInventory } from '../model/inventory';
import { Product } from '../model/product';
import { User } from '../model/user';
import { Order } from '../model/order';
import { EmailService } from './emailService';

export interface InventoryRequest {
  productId: string;
  quantity: number;
  warehouseLocation: string;
  binLocation?: string;
  batchNumber?: string;
  expiryDate?: Date;
  supplier?: {
    name: string;
    contact: string;
    leadTime: number;
    minOrderQuantity: number;
  };
  notes?: string;
}

export interface InventoryResponse {
  success: boolean;
  message: string;
  inventory?: IInventory;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentQuantity: number;
  reorderLevel: number;
  warehouseLocation: string;
  alertType: 'low_stock' | 'out_of_stock' | 'discontinued';
  timestamp: Date;
}

export interface InventoryStats {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  discontinued: number;
  totalValue: number;
  warehouseStats: Record<string, {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  }>;
  supplierStats: Record<string, {
    totalProducts: number;
    avgLeadTime: number;
    minOrderQuantities: number[];
  }>;
  alerts: {
    lowStockAlerts: number;
    outOfStockAlerts: number;
    discontinuedProducts: number;
  };
}

export class InventoryService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Add or update inventory
  async addOrUpdateInventory(request: InventoryRequest): Promise<InventoryResponse> {
    try {
      // Validate product exists
      const product = await Product.findById(request.productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      // Find existing inventory record
      let inventory = await Inventory.findOne({ productId: request.productId });

      if (inventory) {
        // Update existing inventory
        inventory.quantity = request.quantity;
        inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - (request.quantity - inventory.quantity));
        inventory.warehouseLocation = request.warehouseLocation;
        inventory.binLocation = request.binLocation;
        inventory.batchNumber = request.batchNumber;
        inventory.expiryDate = request.expiryDate;
        inventory.restockDate = new Date();
        inventory.lastRestockDate = new Date();
        
        if (request.supplier) {
          inventory.supplier = request.supplier;
        }
        
        if (request.notes) {
          inventory.notes = request.notes;
        }

        // Update status based on quantity
        if (request.quantity === 0) {
          inventory.status = 'out_of_stock';
        } else if (request.quantity <= inventory.reorderLevel) {
          inventory.status = 'low_stock';
        } else {
          inventory.status = 'in_stock';
        }

        await inventory.save();
      } else {
        // Create new inventory record
        const status = request.quantity === 0 ? 'out_of_stock' : 
                     request.quantity <= (request.reorderLevel || 1) ? 'low_stock' : 'in_stock';

        inventory = new Inventory({
          productId: request.productId,
          quantity: request.quantity,
          reservedQuantity: 0,
          reorderLevel: request.reorderLevel || 1,
          warehouseLocation: request.warehouseLocation,
          binLocation: request.binLocation,
          batchNumber: request.batchNumber,
          expiryDate: request.expiryDate,
          restockDate: new Date(),
          lastRestockDate: new Date(),
          supplier: request.supplier || {
            name: 'Default Supplier',
            contact: 'supplier@example.com',
            leadTime: 7,
            minOrderQuantity: 1,
          },
          status,
          notes: request.notes,
        });

        await inventory.save();
      }

      // Check if stock is low and send alert
      if (inventory.quantity <= inventory.reorderLevel) {
        await this.sendLowStockAlert(inventory);
      }

      return {
        success: true,
        message: 'Inventory updated successfully',
        inventory,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update inventory: ${error}`,
      };
    }
  }

  // Get inventory by product ID
  async getInventoryByProductId(productId: string): Promise<IInventory | null> {
    try {
      const inventory = await Inventory.findOne({ productId });
      return inventory;
    } catch (error) {
      throw new Error(`Failed to get inventory: ${error}`);
    }
  }

  // Get all inventory for a warehouse
  async getWarehouseInventory(
    warehouseLocation: string,
    status?: string[],
    page: number = 1,
    limit: number = 50
  ): Promise<{ inventory: IInventory[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let filter: any = { warehouseLocation };

      if (status && status.length > 0) {
        filter.status = { $in: status };
      }

      const inventory = await Inventory.find(filter)
        .populate('productId', 'name price images')
        .sort({ quantity: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Inventory.countDocuments(filter);

      return { inventory, total };
    } catch (error) {
      throw new Error(`Failed to get warehouse inventory: ${error}`);
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(
    warehouseLocation?: string,
    alertTypes?: string[],
    page: number = 1,
    limit: number = 20
  ): Promise<{ alerts: LowStockAlert[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let filter: any = {};

      if (warehouseLocation) {
        filter.warehouseLocation = warehouseLocation;
      }

      if (alertTypes && alertTypes.length > 0) {
        filter.status = { $in: alertTypes };
      }

      const alerts = await Inventory.find(filter)
        .populate('productId', 'name images price')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Inventory.countDocuments(filter);

      const lowStockAlerts: LowStockAlert[] = [];

      alerts.forEach(alert => {
        if (alert.quantity <= alert.reorderLevel) {
          lowStockAlerts.push({
            productId: alert.productId.toString(),
            productName: (alert.productId as any).name,
            currentQuantity: alert.quantity,
            reorderLevel: alert.reorderLevel,
            warehouseLocation: alert.warehouseLocation,
            alertType: alert.status as 'low_stock' | 'out_of_stock' | 'discontinued',
            timestamp: alert.updatedAt,
          });
        }
      });

      return { alerts: lowStockAlerts, total: lowStockAlerts.length };
    } catch (error) {
      throw new Error(`Failed to get low stock alerts: ${error}`);
    }
  }

  // Get inventory statistics
  async getInventoryStats(warehouseLocation?: string): Promise<InventoryStats> {
    try {
      let filter: any = {};
      
      if (warehouseLocation) {
        filter.warehouseLocation = warehouseLocation;
      }

      const totalProducts = await Inventory.countDocuments(filter);
      const inStockCount = await Inventory.countDocuments({ ...filter, status: 'in_stock' });
      const lowStockCount = await Inventory.countDocuments({ ...filter, status: 'low_stock' });
      const outOfStockCount = await Inventory.countDocuments({ ...filter, status: 'out_of_stock' });
      const discontinuedCount = await Inventory.countDocuments({ ...filter, status: 'discontinued' });

      // Get warehouse statistics
      const warehouseStats = await Inventory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$warehouseLocation',
            totalProducts: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
            inStock: { $sum: { $cond: [{ $eq: ['$status', 'in_stock'] }, 1, 0] } },
            lowStock: { $sum: { $cond: [{ $eq: ['$status', 'low_stock'] }, 1, 0] } },
            outOfStock: { $sum: { $cond: [{ $eq: ['$status', 'out_of_stock'] }, 1, 0] } },
          },
        },
      ]);

      const warehouseStatsMap = warehouseStats.reduce((acc, item) => {
        const location = item._id;
        acc[location] = {
          totalProducts: item.totalProducts,
          totalValue: Math.round(item.totalValue * 100) / 100,
          inStock: item.inStock,
          lowStock: item.lowStock,
          outOfStock: item.outOfStock,
        };
        return acc;
      }, {} as Record<string, any>);

      // Get supplier statistics
      const supplierStats = await Inventory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$supplier.name',
            totalProducts: { $sum: 1 },
            avgLeadTime: { $avg: '$supplier.leadTime' },
            minOrderQuantities: { $push: '$supplier.minOrderQuantity' },
          },
        },
        { $sort: { totalProducts: -1 } },
      ]);

      const supplierStatsMap = supplierStats.reduce((acc, item) => {
        acc[item._id] = {
          totalProducts: item.totalProducts,
          avgLeadTime: Math.round(item.avgLeadTime * 10) / 10,
          minOrderQuantities: item.minOrderQuantities,
        };
        return acc;
      }, {} as Record<string, any>);

      // Get alerts count
      const alerts = await this.getLowStockAlerts(warehouseLocation);

      return {
        totalProducts,
        inStock: inStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        discontinued: discontinuedCount,
        totalValue: Math.round(warehouseStats.reduce((sum, item) => sum + item.totalValue, 0) * 100) / 100,
        warehouseStats: warehouseStatsMap,
        supplierStats: supplierStatsMap,
        alerts: {
          lowStockAlerts: alerts.total,
          outOfStockAlerts: alerts.alerts.filter(a => a.alertType === 'out_of_stock').length,
          discontinuedProducts: alerts.alerts.filter(a => a.alertType === 'discontinued').length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get inventory stats: ${error}`);
    }
  }

  // Send low stock alert
  private async sendLowStockAlert(inventory: IInventory): Promise<void> {
    try {
      const product = await Product.findById(inventory.productId);
      if (!product) return;

      const emailData = {
        to: 'inventory@amazonclone.com', // In real app, you'd get supplier email
        subject: `Low Stock Alert - ${product.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ffc107; color: #000; padding: 20px; text-align: center;">
              <h1>⚠️ Low Stock Alert</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Low Stock Alert</h2>
              <p>The following product is running low on stock:</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>${product.name}</h3>
                <p><strong>Current Stock:</strong> ${inventory.quantity}</p>
                <p><strong>Reorder Level:</strong> ${inventory.reorderLevel}</p>
                <p><strong>Location:</strong> ${inventory.warehouseLocation}</p>
                <p><strong>SKU:</strong> ${inventory.metadata.sku}</p>
              </div>

              <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Action Required</h4>
                <p>Please restock this item to avoid stockouts.</p>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send low stock alert:', error);
    }
  }

  // Get inventory health metrics
  async getInventoryHealth(): Promise<any> {
    try {
      const totalProducts = await Inventory.countDocuments();
      const inStock = await Inventory.countDocuments({ status: 'in_stock' });
      const lowStock = await Inventory.countDocuments({ status: 'low_stock' });
      const outOfStock = await Inventory.countDocuments({ status: 'out_of_stock' });
      const discontinued = await Inventory.countDocuments({ status: 'discontinued' });

      const healthScore = totalProducts > 0 
        ? (inStock / totalProducts) * 100 
        : 0;

      return {
        healthScore: Math.round(healthScore * 10) / 10,
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
        discontinued,
        issues: {
          outOfStockCount: outOfStock,
          lowStockCount: lowStock,
          discontinuedCount: discontinued,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get inventory health: ${error}`);
    }
  }

  // Search inventory
  async searchInventory(
    query: string,
    warehouseLocation?: string,
    status?: string[],
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    try {
      const searchRegex = new RegExp(query, 'i');
      const skip = (page - 1) * limit;
      let filter: any = {};

      if (warehouseLocation) {
        filter.warehouseLocation = warehouseLocation;
      }

      if (status && status.length > 0) {
        filter.status = { $in: status };
      }

      const inventories = await Inventory.find({
        $or: [
          { 'metadata.sku': searchRegex },
          { 'notes': searchRegex },
        ],
        ...filter,
      })
        .populate('productId', 'name price images')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Inventory.countDocuments({
        $or: [
          { 'metadata.sku': searchRegex },
          { 'notes': searchRegex },
          ...filter,
        ],
      });

      return {
        inventories,
        total,
      };
    } catch (error) {
      throw new Error(`Failed to search inventory: ${error}`);
    }
  }
}
