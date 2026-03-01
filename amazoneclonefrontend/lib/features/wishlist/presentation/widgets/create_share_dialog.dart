import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/wishlist/presentation/bloc/shared_wishlist_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

class CreateShareDialog extends StatefulWidget {
  final List<ProductEntity> products;
  final String userName;
  final String userEmail;

  const CreateShareDialog({
    super.key,
    required this.products,
    required this.userName,
    required this.userEmail,
  });

  @override
  State<CreateShareDialog> createState() => _CreateShareDialogState();
}

class _CreateShareDialogState extends State<CreateShareDialog> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _isPublic = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _titleController.text = 'My Wishlist';
    _descriptionController.text = 'Check out my favorite items!';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _createSharedWishlist() {
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a title')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    context.read<SharedWishlistBloc>().add(
      CreateSharedWishlist(
        ownerName: widget.userName,
        ownerEmail: widget.userEmail,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        products: widget.products,
        isPublic: _isPublic,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<SharedWishlistBloc, SharedWishlistState>(
      listener: (context, state) {
        if (state is SharedWishlistCreated) {
          setState(() {
            _isLoading = false;
          });
          _showShareSuccessDialog(state.sharedWishlist);
        } else if (state is SharedWishlistError) {
          setState(() {
            _isLoading = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      child: Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        child: Container(
          padding: const EdgeInsets.all(24),
          constraints: const BoxConstraints(maxWidth: 400),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.share,
                    color: Theme.of(context).primaryColor,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Share Wishlist',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  border: OutlineInputBorder(),
                  hintText: 'My Wishlist',
                ),
              ),
              const SizedBox(height: 16),
              
              TextField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                  hintText: 'Tell others about your wishlist',
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              
              SwitchListTile(
                title: const Text('Public Wishlist'),
                subtitle: const Text('Anyone with the link can view'),
                value: _isPublic,
                onChanged: (value) {
                  setState(() {
                    _isPublic = value;
                  });
                },
              ),
              
              const SizedBox(height: 24),
              
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isLoading ? null : () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _createSharedWishlist,
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Share'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showShareSuccessDialog(sharedWishlist) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Wishlist Shared!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle,
              color: Colors.green,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text('Your wishlist "${sharedWishlist.title}" has been shared!'),
            const SizedBox(height: 16),
            SelectableText(
              sharedWishlist.shareUrl,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.blue,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context); // Close success dialog
              Navigator.pop(context); // Close create dialog
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }
}
