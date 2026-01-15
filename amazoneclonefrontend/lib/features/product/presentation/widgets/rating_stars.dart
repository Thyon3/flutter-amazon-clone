import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_colors.dart';

class RatingStars extends StatelessWidget {
  final double rating;
  final double size;

  const RatingStars({
    super.key,
    required this.rating,
    this.size = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        if (index < rating.floor()) {
          return Icon(
            Icons.star,
            color: AppColors.starColor,
            size: size,
          );
        } else if (index < rating) {
          return Icon(
            Icons.star_half,
            color: AppColors.starColor,
            size: size,
          );
        } else {
          return Icon(
            Icons.star_border,
            color: AppColors.starColor,
            size: size,
          );
        }
      }),
    );
  }
}
