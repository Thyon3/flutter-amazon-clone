part of 'wishlist_bloc.dart';

abstract class WishlistEvent extends Equatable {
  const WishlistEvent();

  @override
  List<Object?> get props => [];
}

class GetWishlistEvent extends WishlistEvent {
  const GetWishlistEvent();
}

class AddToWishlistEvent extends WishlistEvent {
  final String productId;

  const AddToWishlistEvent({required this.productId});

  @override
  List<Object?> get props => [productId];
}

class RemoveFromWishlistEvent extends WishlistEvent {
  final String productId;

  const RemoveFromWishlistEvent({required this.productId});

  @override
  List<Object?> get props => [productId];
}

class AddToCartFromWishlistEvent extends WishlistEvent {
  final String productId;

  const AddToCartFromWishlistEvent({required this.productId});

  @override
  List<Object?> get props => [productId];
}

class CheckIsWishlistedEvent extends WishlistEvent {
  final String productId;

  const CheckIsWishlistedEvent({required this.productId});

  @override
  List<Object?> get props => [productId];
}
