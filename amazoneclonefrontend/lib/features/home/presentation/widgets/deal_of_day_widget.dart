import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_colors.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

class DealOfDayWidget extends StatelessWidget {
  final ProductEntity product;
  final VoidCallback onTap;

  const DealOfDayWidget({
    super.key,
    required this.product,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.all(10),
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.shade300,
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                const Text(
                  'Deal of the Day',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: onTap,
                  child: const Text('View all'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Product Image
            Center(
              child: CachedNetworkImage(
                imageUrl: product.images.isNotEmpty ? product.images[0] : '',
                height: 200,
                fit: BoxFit.contain,
                placeholder: (context, url) => const Center(
                  child: CircularProgressIndicator(),
                ),
                errorWidget: (context, url, error) => const Icon(Icons.error),
              ),
            ),
            const SizedBox(height: 15),
            // Product Name
            Text(
              product.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            // Price
            Text(
              '\$${product.price.toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.secondaryColor,
              ),
            ),
            const SizedBox(height: 5),
            // Rating
            Row(
              children: [
                const Icon(
                  Icons.star,
                  color: AppColors.starColor,
                  size: 18,
                ),
                const SizedBox(width: 3),
                Text(
                  '${product.averageRating.toStringAsFixed(1)} (${product.ratings.length})',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
