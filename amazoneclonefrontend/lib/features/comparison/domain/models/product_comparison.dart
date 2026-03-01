import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

class ProductComparison {
  final List<ProductEntity> products;

  const ProductComparison({required this.products});

  ProductComparison copyWith({
    List<ProductEntity>? products,
  }) {
    return ProductComparison(
      products: products ?? this.products,
    );
  }

  ProductComparison addProduct(ProductEntity product) {
    if (products.length >= 4) {
      return this; // Maximum 4 products for comparison
    }
    
    if (products.any((p) => p.id == product.id)) {
      return this; // Product already in comparison
    }
    
    return ProductComparison(
      products: [...products, product],
    );
  }

  ProductComparison removeProduct(String productId) {
    return ProductComparison(
      products: products.where((p) => p.id != productId).toList(),
    );
  }

  ProductComparison clear() {
    return const ProductComparison(products: []);
  }

  bool get isValid => products.length >= 2;
  bool get isFull => products.length >= 4;
  bool get isEmpty => products.isEmpty;
  bool get containsProduct => products.isNotEmpty;

  Map<String, dynamic> getComparisonData() {
    return {
      'products': products.map((p) => {
        'id': p.id,
        'name': p.name,
        'price': p.price,
        'rating': p.rating,
        'category': p.category,
        'description': p.description,
        'images': p.images,
      }).toList(),
      'comparisonCount': products.length,
      'canAddMore': !isFull,
    };
  }
}
