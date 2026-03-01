import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/features/comparison/domain/models/product_comparison.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/rating_bar.dart';

class ComparisonTable extends StatelessWidget {
  final ProductComparison comparison;

  const ComparisonTable({
    super.key,
    required this.comparison,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SingleChildScrollView(
        child: DataTable(
          columnSpacing: 16,
          horizontalMargin: 16,
          columns: [
            const DataColumn(
              label: Text(
                'Feature',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            ...comparison.products.map((product) => DataColumn(
              label: SizedBox(
                width: 120,
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        product.images.isNotEmpty ? product.images[0] : '',
                        height: 80,
                        width: 80,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            height: 80,
                            width: 80,
                            color: Colors.grey[300],
                            child: const Icon(Icons.image, color: Colors.grey),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      product.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )),
          ],
          rows: [
            _buildPriceRow(),
            _buildRatingRow(),
            _buildCategoryRow(),
            _buildDescriptionRow(),
            _buildActionRow(context),
          ],
        ),
      ),
    );
  }

  DataRow _buildPriceRow() {
    return DataRow(
      cells: [
        const DataCell(
          Text(
            'Price',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        ...comparison.products.map((product) => DataCell(
          Text(
            '\$${product.price.toStringAsFixed(2)}',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.green[700],
              fontSize: 16,
            ),
          ),
        )),
      ],
    );
  }

  DataRow _buildRatingRow() {
    return DataRow(
      cells: [
        const DataCell(
          Text(
            'Rating',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        ...comparison.products.map((product) => DataCell(
          Row(
            children: [
              Text(
                product.rating.toStringAsFixed(1),
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.star, color: Colors.orange, size: 16),
            ],
          ),
        )),
      ],
    );
  }

  DataRow _buildCategoryRow() {
    return DataRow(
      cells: [
        const DataCell(
          Text(
            'Category',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        ...comparison.products.map((product) => DataCell(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.blue[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              product.category,
              style: TextStyle(
                color: Colors.blue[800],
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        )),
      ],
    );
  }

  DataRow _buildDescriptionRow() {
    return DataRow(
      cells: [
        const DataCell(
          Text(
            'Description',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        ...comparison.products.map((product) => DataCell(
          SizedBox(
            width: 120,
            child: Text(
              product.description,
              style: const TextStyle(fontSize: 12),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        )),
      ],
    );
  }

  DataRow _buildActionRow(BuildContext context) {
    return DataRow(
      cells: [
        const DataCell(
          Text(
            'Actions',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        ...comparison.products.map((product) => DataCell(
          Column(
            children: [
              ElevatedButton(
                onPressed: () {
                  // Navigate to product details
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  minimumSize: Size.zero,
                ),
                child: const Text('View', style: TextStyle(fontSize: 12)),
              ),
              const SizedBox(height: 4),
              OutlinedButton(
                onPressed: () {
                  // Add to cart
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  minimumSize: Size.zero,
                ),
                child: const Text('Add to Cart', style: TextStyle(fontSize: 10)),
              ),
            ],
          ),
        )),
      ],
    );
  }
}
