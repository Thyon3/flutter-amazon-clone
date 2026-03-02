import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/services/notification_service.dart';

class NotificationPermissionDialog extends StatefulWidget {
  const NotificationPermissionDialog({super.key});

  @override
  State<NotificationPermissionDialog> createState() => _NotificationPermissionDialogState();
}

class _NotificationPermissionDialogState extends State<NotificationPermissionDialog> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxWidth: 400),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.notifications_active,
              size: 64,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(height: 16),
            const Text(
              'Stay Updated',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Enable notifications to get updates on your orders, exclusive deals, and personalized recommendations.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isLoading ? null : () => _handlePermission(false),
                    child: const Text('Maybe Later'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : () => _handlePermission(true),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Enable'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handlePermission(bool enable) async {
    if (enable) {
      setState(() {
        _isLoading = true;
      });

      try {
        final notificationService = NotificationService();
        await notificationService.initialize();
        
        // Subscribe to general notifications
        await notificationService.subscribeToTopic('general');
        await notificationService.subscribeToTopic('orders');
        await notificationService.subscribeToTopic('promotions');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Notifications enabled successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context, true);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to enable notifications: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    } else {
      Navigator.pop(context, false);
    }
  }
}
