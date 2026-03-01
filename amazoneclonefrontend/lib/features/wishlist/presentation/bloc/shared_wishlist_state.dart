part of 'shared_wishlist_bloc.dart';

import 'package:equatable/equatable.dart';
import 'package:flutter_amazon_clone_bloc/features/wishlist/domain/models/shared_wishlist.dart';

abstract class SharedWishlistState extends Equatable {
  const SharedWishlistState();

  @override
  List<Object?> get props => [];
}

class SharedWishlistInitial extends SharedWishlistState {
  const SharedWishlistInitial();
}

class SharedWishlistLoading extends SharedWishlistState {
  const SharedWishlistLoading();
}

class SharedWishlistCreated extends SharedWishlistState {
  final SharedWishlist sharedWishlist;

  const SharedWishlistCreated(this.sharedWishlist);

  @override
  List<Object?> get props => [sharedWishlist];
}

class SharedWishlistLoaded extends SharedWishlistState {
  final SharedWishlist sharedWishlist;

  const SharedWishlistLoaded(this.sharedWishlist);

  @override
  List<Object?> get props => [sharedWishlist];
}

class SharedWishlistUpdated extends SharedWishlistState {
  final SharedWishlist sharedWishlist;

  const SharedWishlistUpdated(this.sharedWishlist);

  @override
  List<Object?> get props => [sharedWishlist];
}

class SharedWishlistDeleted extends SharedWishlistState {
  const SharedWishlistDeleted();
}

class SharedWishlistShared extends SharedWishlistState {
  final String shareUrl;

  const SharedWishlistShared(this.shareUrl);

  @override
  List<Object?> get props => [shareUrl];
}

class SharedWishlistError extends SharedWishlistState {
  final String message;

  const SharedWishlistError(this.message);

  @override
  List<Object?> get props => [message];
}
