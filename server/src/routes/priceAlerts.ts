import express from 'express';
import { PriceAlertService } from '../services/priceAlertService';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();
const priceAlertService = new PriceAlertService();

// Create a new price alert
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { productId, targetPrice } = req.body;
    const userId = (req as any).user.id;

    if (!productId || !targetPrice) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and target price are required',
      });
    }

    if (targetPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target price must be greater than 0',
      });
    }

    const alert = await priceAlertService.createPriceAlert(userId, productId, targetPrice);
    
    res.json({
      success: true,
      message: 'Price alert created successfully',
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create price alert',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all price alerts for a user
router.get('/my-alerts', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const alerts = await priceAlertService.getUserPriceAlerts(userId);
    
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get price alerts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete a price alert
router.delete('/:alertId', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user.id;

    const deleted = await priceAlertService.deletePriceAlert(alertId, userId);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Price alert deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Price alert not found',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete price alert',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get price drop statistics for a user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const stats = await priceAlertService.getPriceDropStats(userId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get price drop statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Check price alerts (can be called by cron job or manually)
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const triggeredCount = await priceAlertService.checkPriceAlerts(productId);
    
    res.json({
      success: true,
      message: `Checked price alerts and triggered ${triggeredCount} notifications`,
      data: { triggeredCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check price alerts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Cleanup expired alerts (admin only)
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const deletedCount = await priceAlertService.cleanupExpiredAlerts();
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired alerts`,
      data: { deletedCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired alerts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
