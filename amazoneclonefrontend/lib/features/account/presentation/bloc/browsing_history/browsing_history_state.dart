part of 'browsing_history_cubit.dart';

abstract class BrowsingHistoryState extends Equatable {
  const BrowsingHistoryState();

  @override
  List<Object?> get props => [];
}

class BrowsingHistoryInitial extends BrowsingHistoryState {}

class BrowsingHistoryLoading extends BrowsingHistoryState {}

class BrowsingHistoryLoaded extends BrowsingHistoryState {
  final List<ProductEntity> products;

  const BrowsingHistoryLoaded(this.products);

  @override
  List<Object?> get props => [products];
}

class BrowsingHistoryCleared extends BrowsingHistoryState {}

class BrowsingHistoryError extends BrowsingHistoryState {
  final String message;

  const BrowsingHistoryError(this.message);

  @override
  List<Object?> get props => [message];
}
