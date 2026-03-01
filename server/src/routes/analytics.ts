import express from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { authenticateToken, isAdmin } from '../middlewares/auth';

const router = express.Router();
const analyticsService = new AnalyticsService();

// Get real-time analytics (today's data)
router.get('/realtime', authenticateToken, isAdmin, async (req, res) => {
  try {
    const analytics = await analyticsService.getRealTimeAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get weekly summary
router.get('/weekly', authenticateToken, isAdmin, async (req, res) => {
  try {
    const weeklySummary = await analyticsService.getWeeklySummary();
    res.json({
      success: true,
      data: weeklySummary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly summary',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get analytics for date range
router.get('/range', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    const analytics = await analyticsService.getAnalyticsForDateRange(start, end);
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics for date range',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Generate daily analytics (can be called by cron job)
router.post('/generate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    const analytics = await analyticsService.generateDailyAnalytics(targetDate);
    res.json({
      success: true,
      data: analytics,
      message: 'Daily analytics generated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get dashboard overview (combination of real-time and weekly data)
router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [realTimeData, weeklySummary] = await Promise.all([
      analyticsService.getRealTimeAnalytics(),
      analyticsService.getWeeklySummary(),
    ]);

    res.json({
      success: true,
      data: {
        today: realTimeData,
        weekly: weeklySummary,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
