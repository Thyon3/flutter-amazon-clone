import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../../domain/usecases/get_wishlist.dart';
import '../../domain/usecases/add_to_wishlist.dart';
import '../../domain/usecases/remove_from_wishlist.dart';
import '../../domain/usecases/add_to_cart_from_wishlist.dart';
import '../../domain/usecases/check_is_wishlisted.dart';

part 'wishlist_event.dart';
part 'wishlist_state.dart';

class WishlistBloc extends Bloc<WishlistEvent, WishlistState> {
  final GetWishlist getWishlist;
  final AddToWishlist addToWishlist;
  final RemoveFromWishlist removeFromWishlist;
  final AddToCartFromWishlist addToCartFromWishlist;
  final CheckIsWishlisted checkIsWishlisted;

  WishlistBloc({
    required this.getWishlist,
    required this.addToWishlist,
    required this.removeFromWishlist,
    required this.addToCartFromWishlist,
    required this.checkIsWishlisted,
  }) : super(WishlistInitial()) {
    on<GetWishlistEvent>(_onGetWishlist);
    on<AddToWishlistEvent>(_onAddToWishlist);
    on<RemoveFromWishlistEvent>(_onRemoveFromWishlist);
    on<AddToCartFromWishlistEvent>(_onAddToCartFromWishlist);
    on<CheckIsWishlistedEvent>(_onCheckIsWishlisted);
  }

  Future<void> _onGetWishlist(
    GetWishlistEvent event,
    Emitter<WishlistState> emit,
  ) async {
    emit(WishlistLoading());
    
    final result = await getWishlist();

    result.fold(
      (failure) => emit(WishlistError(failure.message)),
      (products) => emit(WishlistLoaded(products)),
    );
  }

  Future<void> _onAddToWishlist(
    AddToWishlistEvent event,
    Emitter<WishlistState> emit,
  ) async {
    final result = await addToWishlist(event.productId);

    result.fold(
      (failure) => emit(WishlistError(failure.message)),
      (_) => add(const GetWishlistEvent()),
    );
  }

  Future<void> _onRemoveFromWishlist(
    RemoveFromWishlistEvent event,
    Emitter<WishlistState> emit,
  ) async {
    final result = await removeFromWishlist(event.productId);

    result.fold(
      (failure) => emit(WishlistError(failure.message)),
      (_) => add(const GetWishlistEvent()),
    );
  }

  Future<void> _onAddToCartFromWishlist(
    AddToCartFromWishlistEvent event,
    Emitter<WishlistState> emit,
  ) async {
    final result = await addToCartFromWishlist(event.productId);

    result.fold(
      (failure) => emit(WishlistError(failure.message)),
      (products) => emit(WishlistLoaded(products)),
    );
  }

  Future<void> _onCheckIsWishlisted(
    CheckIsWishlistedEvent event,
    Emitter<WishlistState> emit,
  ) async {
    final result = await checkIsWishlisted(event.productId);

    result.fold(
      (failure) => emit(WishlistError(failure.message)),
      (isWishlisted) => emit(WishlistChecked(isWishlisted)),
    );
  }
}
