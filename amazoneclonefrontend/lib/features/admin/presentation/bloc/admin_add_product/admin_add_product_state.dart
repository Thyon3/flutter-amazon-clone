part of 'admin_add_product_cubit.dart';

abstract class AdminAddProductState extends Equatable {
  const AdminAddProductState();

  @override
  List<Object?> get props => [];
}

class AdminAddProductInitial extends AdminAddProductState {}

class AdminAddProductLoading extends AdminAddProductState {}

class AdminAddProductSuccess extends AdminAddProductState {}

class AdminAddProductError extends AdminAddProductState {
  final String message;

  const AdminAddProductError(this.message);

  @override
  List<Object?> get props => [message];
}
