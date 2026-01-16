part of 'save_for_later_bloc.dart';

abstract class SaveForLaterEvent extends Equatable {
  const SaveForLaterEvent();

  @override
  List<Object?> get props => [];
}

class GetSaveForLaterEvent extends SaveForLaterEvent {
  const GetSaveForLaterEvent();
}

class SaveForLaterProductEvent extends SaveForLaterEvent {
  final String productId;

  const SaveForLaterProductEvent({required this.productId});

  @override
  List<Object?> get props => [productId];
}

class DeleteFromLaterEvent extends SaveForLaterEvent {
  final String productId;

  const DeleteFromLaterEvent({required this.productId});

  @override
  List<Object?> get props => [productId];
}

class MoveToCartEvent extends SaveForLaterEvent {
  final String productId;

  const MoveToCartEvent({required this.productId});

  @override
  List<Object?> get props => [productId];
}
