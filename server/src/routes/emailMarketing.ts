import express from 'express';
import { EmailService } from '../services/emailService';
import { authenticateToken, isAdmin } from '../middlewares/auth';

const router = express.Router();
const emailService = new EmailService();

// Send welcome email
router.post('/welcome', authenticateToken, async (req, res) => {
  try {
    const { to, name } = req.body;

    if (!to || !name) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and name are required',
      });
    }

    const success = await emailService.sendWelcomeEmail(to, name);
    
    if (success) {
      res.json({
        success: true,
        message: 'Welcome email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send welcome email',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send welcome email',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Send order confirmation email
router.post('/order-confirmation', authenticateToken, async (req, res) => {
  try {
    const orderData = req.body;

    if (!orderData.to || !orderData.orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order data is incomplete',
      });
    }

    const success = await emailService.sendOrderConfirmation(orderData.to, orderData);
    
    if (success) {
      res.json({
        success: true,
        message: 'Order confirmation email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send order confirmation email',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send order confirmation email',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Send promotional emails (admin only)
router.post('/promotional', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { recipients, deals } = req.body;

    if (!recipients || !Array.isArray(recipients) || !deals || !Array.isArray(deals)) {
      return res.status(400).json({
        success: false,
        message: 'Recipients and deals arrays are required',
      });
    }

    const success = await emailService.sendPromotionalEmail(recipients, deals);
    
    if (success) {
      res.json({
        success: true,
        message: 'Promotional emails sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send promotional emails',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send promotional emails',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Send abandoned cart email
router.post('/abandoned-cart', authenticateToken, async (req, res) => {
  try {
    const cartData = req.body;

    if (!cartData.to || !cartData.cartItems) {
      return res.status(400).json({
        success: false,
        message: 'Cart data is incomplete',
      });
    }

    const success = await emailService.sendAbandonedCartEmail(cartData.to, cartData);
    
    if (success) {
      res.json({
        success: true,
        message: 'Abandoned cart email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send abandoned cart email',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send abandoned cart email',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Send review request email
router.post('/review-request', authenticateToken, async (req, res) => {
  try {
    const { to, productName } = req.body;

    if (!to || !productName) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and product name are required',
      });
    }

    const success = await emailService.sendReviewRequest(to, productName);
    
    if (success) {
      res.json({
        success: true,
        message: 'Review request email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send review request email',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send review request email',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Send custom email (admin only)
router.post('/custom', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and subject are required',
      });
    }

    const success = await emailService.sendEmail({
      to,
      subject,
      html,
      text,
    });
    
    if (success) {
      res.json({
        success: true,
        message: 'Custom email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send custom email',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send custom email',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Verify email service connection (admin only)
router.get('/verify', authenticateToken, isAdmin, async (req, res) => {
  try {
    const isConnected = await emailService.verifyConnection();
    
    res.json({
      success: true,
      data: {
        connected: isConnected,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify email service connection',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get email templates (admin only)
router.get('/templates', authenticateToken, isAdmin, async (req, res) => {
  try {
    // This would return available email templates
    const templates = {
      welcome: 'Welcome email for new users',
      orderConfirmation: 'Order confirmation after purchase',
      promotional: 'Promotional offers and deals',
      abandonedCart: 'Cart abandonment reminder',
      reviewRequest: 'Product review request',
    };

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email templates',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
