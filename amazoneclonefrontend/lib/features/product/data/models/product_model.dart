import 'dart:convert';
import '../../domain/entities/product_entity.dart';

class ProductModel extends ProductEntity {
  const ProductModel({
    required super.id,
    required super.name,
    required super.description,
    required super.quantity,
    required super.images,
    required super.category,
    required super.price,
    required super.ratings,
  });

  Map<String, dynamic> toMap() {
    return {
      '_id': id,
      'name': name,
      'description': description,
      'quantity': quantity,
      'images': images,
      'category': category,
      'price': price,
      'ratings': ratings.map((x) => (x as RatingModel).toMap()).toList(),
    };
  }

  factory ProductModel.fromMap(Map<String, dynamic> map) {
    return ProductModel(
      id: map['_id'] ?? '',
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      quantity: map['quantity']?.toInt() ?? 0,
      images: List<String>.from(map['images'] ?? []),
      category: map['category'] ?? '',
      price: map['price']?.toDouble() ?? 0.0,
      ratings: map['ratings'] != null
          ? List<RatingModel>.from(
              map['ratings']?.map((x) => RatingModel.fromMap(x)) ?? [],
            )
          : [],
    );
  }

  String toJson() => json.encode(toMap());

  factory ProductModel.fromJson(String source) =>
      ProductModel.fromMap(json.decode(source));

  ProductModel copyWith({
    String? id,
    String? name,
    String? description,
    int? quantity,
    List<String>? images,
    String? category,
    double? price,
    List<RatingEntity>? ratings,
  }) {
    return ProductModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      images: images ?? this.images,
      category: category ?? this.category,
      price: price ?? this.price,
      ratings: ratings ?? this.ratings,
    );
  }
}

class RatingModel extends RatingEntity {
  const RatingModel({
    required super.userId,
    required super.rating,
    super.review,
  });

  Map<String, dynamic> toMap() {
    return {'userId': userId, 'rating': rating, 'review': review};
  }

  factory RatingModel.fromMap(Map<String, dynamic> map) {
    return RatingModel(
      userId: map['userId'] ?? '',
      rating: map['rating']?.toDouble() ?? 0.0,
      review: map['review'],
    );
  }

  String toJson() => json.encode(toMap());

  factory RatingModel.fromJson(String source) =>
      RatingModel.fromMap(json.decode(source));
}
