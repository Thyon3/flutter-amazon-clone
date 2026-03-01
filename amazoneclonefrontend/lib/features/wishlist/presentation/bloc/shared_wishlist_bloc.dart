import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/models/shared_wishlist.dart';

part 'shared_wishlist_event.dart';
part 'shared_wishlist_state.dart';

class SharedWishlistBloc extends Bloc<SharedWishlistEvent, SharedWishlistState> {
  SharedWishlistBloc() : super(SharedWishlistInitial()) {
    on<CreateSharedWishlist>(_onCreateSharedWishlist);
    on<LoadSharedWishlist>(_onLoadSharedWishlist);
    on<UpdateSharedWishlist>(_onUpdateSharedWishlist);
    on<DeleteSharedWishlist>(_onDeleteSharedWishlist);
    on<ShareWishlist>(_onShareWishlist);
    on<IncrementViewCount>(_onIncrementViewCount);
  }

  Future<void> _onCreateSharedWishlist(
    CreateSharedWishlist event,
    Emitter<SharedWishlistState> emit,
  ) async {
    emit(SharedWishlistLoading());
    
    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 1));
      
      final sharedWishlist = SharedWishlist(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        ownerName: event.ownerName,
        ownerEmail: event.ownerEmail,
        title: event.title,
        description: event.description,
        products: event.products,
        createdAt: DateTime.now(),
        expiresAt: DateTime.now().add(const Duration(days: 30)),
        isPublic: event.isPublic,
        shareUrl: 'https://amazonclone.com/wishlist/${DateTime.now().millisecondsSinceEpoch}',
      );
      
      emit(SharedWishlistCreated(sharedWishlist));
    } catch (e) {
      emit(SharedWishlistError('Failed to create shared wishlist: $e'));
    }
  }

  Future<void> _onLoadSharedWishlist(
    LoadSharedWishlist event,
    Emitter<SharedWishlistState> emit,
  ) async {
    emit(SharedWishlistLoading());
    
    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 1));
      
      // For demo purposes, return a mock wishlist
      final sharedWishlist = SharedWishlist(
        id: event.wishlistId,
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        title: 'My Birthday Wishlist',
        description: 'Items I would love to receive for my birthday!',
        products: event.products,
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
        expiresAt: DateTime.now().add(const Duration(days: 25)),
        isPublic: true,
        viewCount: 42,
      );
      
      emit(SharedWishlistLoaded(sharedWishlist));
    } catch (e) {
      emit(SharedWishlistError('Failed to load shared wishlist: $e'));
    }
  }

  Future<void> _onUpdateSharedWishlist(
    UpdateSharedWishlist event,
    Emitter<SharedWishlistState> emit,
  ) async {
    emit(SharedWishlistLoading());
    
    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 1));
      
      emit(SharedWishlistUpdated(event.sharedWishlist));
    } catch (e) {
      emit(SharedWishlistError('Failed to update shared wishlist: $e'));
    }
  }

  Future<void> _onDeleteSharedWishlist(
    DeleteSharedWishlist event,
    Emitter<SharedWishlistState> emit,
  ) async {
    emit(SharedWishlistLoading());
    
    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 1));
      
      emit(SharedWishlistDeleted());
    } catch (e) {
      emit(SharedWishlistError('Failed to delete shared wishlist: $e'));
    }
  }

  Future<void> _onShareWishlist(
    ShareWishlist event,
    Emitter<SharedWishlistState> emit,
  ) async {
    try {
      // Simulate sharing functionality
      await Future.delayed(const Duration(milliseconds: 500));
      
      emit(SharedWishlistShared(event.shareUrl));
    } catch (e) {
      emit(SharedWishlistError('Failed to share wishlist: $e'));
    }
  }

  Future<void> _onIncrementViewCount(
    IncrementViewCount event,
    Emitter<SharedWishlistState> emit,
  ) async {
    try {
      // Simulate API call
      await Future.delayed(const Duration(milliseconds: 300));
      
      if (event.sharedWishlist != null) {
        final updatedWishlist = event.sharedWishlist!.copyWith(
          viewCount: event.sharedWishlist!.viewCount + 1,
        );
        emit(SharedWishlistUpdated(updatedWishlist));
      }
    } catch (e) {
      emit(SharedWishlistError('Failed to increment view count: $e'));
    }
  }
}
