part of 'save_for_later_bloc.dart';

abstract class SaveForLaterState extends Equatable {
  const SaveForLaterState();

  @override
  List<Object?> get props => [];
}

class SaveForLaterInitial extends SaveForLaterState {}

class SaveForLaterLoading extends SaveForLaterState {}

class SaveForLaterLoaded extends SaveForLaterState {
  final List<ProductEntity> products;

  const SaveForLaterLoaded(this.products);

  @override
  List<Object?> get props => [products];
}

class SaveForLaterError extends SaveForLaterState {
  final String message;

  const SaveForLaterError(this.message);

  @override
  List<Object?> get props => [message];
}
