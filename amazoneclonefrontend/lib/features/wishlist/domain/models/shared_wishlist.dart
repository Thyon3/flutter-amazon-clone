import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

class SharedWishlist {
  final String id;
  final String ownerName;
  final String ownerEmail;
  final String title;
  final String description;
  final List<ProductEntity> products;
  final DateTime createdAt;
  final DateTime expiresAt;
  final bool isPublic;
  final int viewCount;
  final String? shareUrl;

  SharedWishlist({
    required this.id,
    required this.ownerName,
    required this.ownerEmail,
    required this.title,
    required this.description,
    required this.products,
    required this.createdAt,
    required this.expiresAt,
    this.isPublic = false,
    this.viewCount = 0,
    this.shareUrl,
  });

  factory SharedWishlist.fromJson(Map<String, dynamic> json) {
    return SharedWishlist(
      id: json['id'] as String,
      ownerName: json['ownerName'] as String,
      ownerEmail: json['ownerEmail'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      products: (json['products'] as List<dynamic>)
          .map((product) => ProductEntity.fromJson(product as Map<String, dynamic>))
          .toList(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      isPublic: json['isPublic'] as bool? ?? false,
      viewCount: json['viewCount'] as int? ?? 0,
      shareUrl: json['shareUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ownerName': ownerName,
      'ownerEmail': ownerEmail,
      'title': title,
      'description': description,
      'products': products.map((product) => product.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'expiresAt': expiresAt.toIso8601String(),
      'isPublic': isPublic,
      'viewCount': viewCount,
      'shareUrl': shareUrl,
    };
  }

  SharedWishlist copyWith({
    String? id,
    String? ownerName,
    String? ownerEmail,
    String? title,
    String? description,
    List<ProductEntity>? products,
    DateTime? createdAt,
    DateTime? expiresAt,
    bool? isPublic,
    int? viewCount,
    String? shareUrl,
  }) {
    return SharedWishlist(
      id: id ?? this.id,
      ownerName: ownerName ?? this.ownerName,
      ownerEmail: ownerEmail ?? this.ownerEmail,
      title: title ?? this.title,
      description: description ?? this.description,
      products: products ?? this.products,
      createdAt: createdAt ?? this.createdAt,
      expiresAt: expiresAt ?? this.expiresAt,
      isPublic: isPublic ?? this.isPublic,
      viewCount: viewCount ?? this.viewCount,
      shareUrl: shareUrl ?? this.shareUrl,
    );
  }

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get isValid => !isExpired;
  double get totalValue => products.fold(0.0, (sum, product) => sum + product.price);
  int get productCount => products.length;

  String get formattedExpiryDate {
    final now = DateTime.now();
    final difference = expiresAt.difference(now);
    
    if (difference.isNegative) return 'Expired';
    
    if (difference.inDays > 0) {
      return '${difference.inDays} days left';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hours left';
    } else {
      return '${difference.inMinutes} minutes left';
    }
  }
}
