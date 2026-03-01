import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/wishlist/presentation/bloc/shared_wishlist_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/wishlist/presentation/widgets/create_share_dialog.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

class ShareWishlistButton extends StatelessWidget {
  final List<ProductEntity> products;
  final String userName;
  final String userEmail;

  const ShareWishlistButton({
    super.key,
    required this.products,
    required this.userName,
    required this.userEmail,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SharedWishlistBloc, SharedWishlistState>(
      builder: (context, state) {
        return IconButton(
          icon: const Icon(Icons.share),
          onPressed: products.isEmpty ? null : () => _showShareDialog(context),
          tooltip: 'Share Wishlist',
        );
      },
    );
  }

  void _showShareDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => CreateShareDialog(
        products: products,
        userName: userName,
        userEmail: userEmail,
      ),
    );
  }
}
