import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../product/domain/entities/product_entity.dart';
import '../../../domain/usecases/get_keep_shopping_for.dart';
import '../../../domain/usecases/add_keep_shopping_for.dart';

part 'keep_shopping_for_state.dart';

class KeepShoppingForCubit extends Cubit<KeepShoppingForState> {
  final GetKeepShoppingFor getKeepShoppingFor;
  final AddKeepShoppingFor addKeepShoppingFor;

  KeepShoppingForCubit({
    required this.getKeepShoppingFor,
    required this.addKeepShoppingFor,
  }) : super(KeepShoppingForInitial());

  Future<void> getKeepShoppingFor() async {
    emit(KeepShoppingForLoading());
    
    final result = await getKeepShoppingFor();
    
    result.fold(
      (failure) => emit(KeepShoppingForError(failure.message)),
      (products) => emit(KeepShoppingForLoaded(products)),
    );
  }

  Future<void> addProduct(String productId) async {
    final result = await addKeepShoppingFor(productId);
    
    result.fold(
      (failure) => emit(KeepShoppingForError(failure.message)),
      (_) => getKeepShoppingFor(),
    );
  }
}
