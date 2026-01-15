import 'package:equatable/equatable.dart';

class ProductEntity extends Equatable {
  final String id;
  final String name;
  final String description;
  final int quantity;
  final List<String> images;
  final String category;
  final double price;
  final List<RatingEntity> ratings;

  const ProductEntity({
    required this.id,
    required this.name,
    required this.description,
    required this.quantity,
    required this.images,
    required this.category,
    required this.price,
    required this.ratings,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        quantity,
        images,
        category,
        price,
        ratings,
      ];

  double get averageRating {
    if (ratings.isEmpty) return 0.0;
    final sum = ratings.fold<double>(0, (prev, rating) => prev + rating.rating);
    return sum / ratings.length;
  }

  bool get isInStock => quantity > 0;
}

class RatingEntity extends Equatable {
  final String userId;
  final double rating;

  const RatingEntity({
    required this.userId,
    required this.rating,
  });

  @override
  List<Object?> get props => [userId, rating];
}
