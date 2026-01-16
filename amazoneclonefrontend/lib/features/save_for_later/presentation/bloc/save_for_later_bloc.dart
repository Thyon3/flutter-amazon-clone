import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../../domain/usecases/get_save_for_later.dart';
import '../../domain/usecases/save_for_later.dart';
import '../../domain/usecases/delete_from_later.dart';
import '../../domain/usecases/move_to_cart.dart';

part 'save_for_later_event.dart';
part 'save_for_later_state.dart';

class SaveForLaterBloc extends Bloc<SaveForLaterEvent, SaveForLaterState> {
  final GetSaveForLater getSaveForLater;
  final SaveForLater saveForLater;
  final DeleteFromLater deleteFromLater;
  final MoveToCart moveToCart;

  SaveForLaterBloc({
    required this.getSaveForLater,
    required this.saveForLater,
    required this.deleteFromLater,
    required this.moveToCart,
  }) : super(SaveForLaterInitial()) {
    on<GetSaveForLaterEvent>(_onGetSaveForLater);
    on<SaveForLaterEvent>(_onSaveForLater);
    on<DeleteFromLaterEvent>(_onDeleteFromLater);
    on<MoveToCartEvent>(_onMoveToCart);
  }

  Future<void> _onGetSaveForLater(
    GetSaveForLaterEvent event,
    Emitter<SaveForLaterState> emit,
  ) async {
    emit(SaveForLaterLoading());
    
    final result = await getSaveForLater();

    result.fold(
      (failure) => emit(SaveForLaterError(failure.message)),
      (products) => emit(SaveForLaterLoaded(products)),
    );
  }

  Future<void> _onSaveForLater(
    SaveForLaterEvent event,
    Emitter<SaveForLaterState> emit,
  ) async {
    final result = await saveForLater(event.productId);

    result.fold(
      (failure) => emit(SaveForLaterError(failure.message)),
      (_) => add(const GetSaveForLaterEvent()),
    );
  }

  Future<void> _onDeleteFromLater(
    DeleteFromLaterEvent event,
    Emitter<SaveForLaterState> emit,
  ) async {
    final result = await deleteFromLater(event.productId);

    result.fold(
      (failure) => emit(SaveForLaterError(failure.message)),
      (_) => add(const GetSaveForLaterEvent()),
    );
  }

  Future<void> _onMoveToCart(
    MoveToCartEvent event,
    Emitter<SaveForLaterState> emit,
  ) async {
    final result = await moveToCart(event.productId);

    result.fold(
      (failure) => emit(SaveForLaterError(failure.message)),
      (_) => add(const GetSaveForLaterEvent()),
    );
  }
}
