import 'dart:io';
import '../../../../core/utils/typedef.dart';
import '../repositories/admin_repository.dart';

class AddProduct {
  final AdminRepository repository;

  AddProduct(this.repository);

  ResultVoid call(AddProductParams params) async {
    return await repository.addProduct(
      name: params.name,
      description: params.description,
      price: params.price,
      quantity: params.quantity,
      category: params.category,
      images: params.images,
    );
  }
}

class AddProductParams {
  final String name;
  final String description;
  final double price;
  final int quantity;
  final String category;
  final List<File> images;

  AddProductParams({
    required this.name,
    required this.description,
    required this.price,
    required this.quantity,
    required this.category,
    required this.images,
  });
}
