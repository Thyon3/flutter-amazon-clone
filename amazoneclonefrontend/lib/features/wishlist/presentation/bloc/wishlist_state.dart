part of 'wishlist_bloc.dart';

abstract class WishlistState extends Equatable {
  const WishlistState();

  @override
  List<Object?> get props => [];
}

class WishlistInitial extends WishlistState {}

class WishlistLoading extends WishlistState {}

class WishlistLoaded extends WishlistState {
  final List<ProductEntity> products;

  const WishlistLoaded(this.products);

  @override
  List<Object?> get props => [products];
}

class WishlistChecked extends WishlistState {
  final bool isWishlisted;

  const WishlistChecked(this.isWishlisted);

  @override
  List<Object?> get props => [isWishlisted];
}

class WishlistError extends WishlistState {
  final String message;

  const WishlistError(this.message);

  @override
  List<Object?> get props => [message];
}
