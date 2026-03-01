part of 'shared_wishlist_bloc.dart';

import 'package:equatable/equatable.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/wishlist/domain/models/shared_wishlist.dart';

abstract class SharedWishlistEvent extends Equatable {
  const SharedWishlistEvent();

  @override
  List<Object?> get props => [];
}

class CreateSharedWishlist extends SharedWishlistEvent {
  final String ownerName;
  final String ownerEmail;
  final String title;
  final String description;
  final List<ProductEntity> products;
  final bool isPublic;

  const CreateSharedWishlist({
    required this.ownerName,
    required this.ownerEmail,
    required this.title,
    required this.description,
    required this.products,
    this.isPublic = false,
  });

  @override
  List<Object?> get props => [
        ownerName,
        ownerEmail,
        title,
        description,
        products,
        isPublic,
      ];
}

class LoadSharedWishlist extends SharedWishlistEvent {
  final String wishlistId;
  final List<ProductEntity> products;

  const LoadSharedWishlist({
    required this.wishlistId,
    required this.products,
  });

  @override
  List<Object?> get props => [wishlistId, products];
}

class UpdateSharedWishlist extends SharedWishlistEvent {
  final SharedWishlist sharedWishlist;

  const UpdateSharedWishlist(this.sharedWishlist);

  @override
  List<Object?> get props => [sharedWishlist];
}

class DeleteSharedWishlist extends SharedWishlistEvent {
  final String wishlistId;

  const DeleteSharedWishlist(this.wishlistId);

  @override
  List<Object?> get props => [wishlistId];
}

class ShareWishlist extends SharedWishlistEvent {
  final String shareUrl;

  const ShareWishlist(this.shareUrl);

  @override
  List<Object?> get props => [shareUrl];
}

class IncrementViewCount extends SharedWishlistEvent {
  final SharedWishlist? sharedWishlist;

  const IncrementViewCount(this.sharedWishlist);

  @override
  List<Object?> get props => [sharedWishlist];
}
