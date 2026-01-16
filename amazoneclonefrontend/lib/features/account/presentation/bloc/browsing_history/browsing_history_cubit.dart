import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../product/domain/entities/product_entity.dart';
import '../../../domain/usecases/get_browsing_history.dart';
import '../../../domain/usecases/clear_browsing_history.dart';
import '../../../domain/usecases/add_to_browsing_history.dart';

part 'browsing_history_state.dart';

class BrowsingHistoryCubit extends Cubit<BrowsingHistoryState> {
  final GetBrowsingHistory getBrowsingHistory;
  final ClearBrowsingHistory clearBrowsingHistory;
  final AddToBrowsingHistory addToBrowsingHistory;

  BrowsingHistoryCubit({
    required this.getBrowsingHistory,
    required this.clearBrowsingHistory,
    required this.addToBrowsingHistory,
  }) : super(BrowsingHistoryInitial());

  Future<void> getBrowsingHistory() async {
    emit(BrowsingHistoryLoading());
    
    final result = await getBrowsingHistory();
    
    result.fold(
      (failure) => emit(BrowsingHistoryError(failure.message)),
      (products) => emit(BrowsingHistoryLoaded(products)),
    );
  }

  Future<void> clearBrowsingHistory() async {
    final result = await clearBrowsingHistory();
    
    result.fold(
      (failure) => emit(BrowsingHistoryError(failure.message)),
      (_) => emit(BrowsingHistoryCleared()),
    );
  }

  Future<void> addProductToHistory(String productId) async {
    final result = await addToBrowsingHistory(productId);
    
    result.fold(
      (failure) => emit(BrowsingHistoryError(failure.message)),
      (_) {}, // Silent add, don't refresh
    );
  }
}
