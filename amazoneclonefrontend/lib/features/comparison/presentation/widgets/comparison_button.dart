import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/comparison/presentation/bloc/comparison_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';

class ComparisonButton extends StatelessWidget {
  final ProductEntity product;
  final bool showText;

  const ComparisonButton({
    super.key,
    required this.product,
    this.showText = true,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ComparisonBloc, ComparisonState>(
      builder: (context, state) {
        bool isInComparison = false;
        bool canAdd = true;

        if (state is ComparisonUpdated) {
          isInComparison = state.comparison.products.any((p) => p.id == product.id);
          canAdd = !state.comparison.isFull;
        }

        return IconButton(
          onPressed: () {
            if (isInComparison) {
              context.read<ComparisonBloc>().add(
                RemoveProductFromComparison(product.id),
              );
              _showSnackBar(context, 'Removed from comparison');
            } else if (canAdd) {
              context.read<ComparisonBloc>().add(
                AddProductToComparison(product),
              );
              _showSnackBar(context, 'Added to comparison');
            } else {
              _showSnackBar(context, 'Cannot add more than 4 products');
            }
          },
          icon: Icon(
            isInComparison ? Icons.compare : Icons.compare_arrows,
            color: isInComparison ? Colors.orange : Colors.grey[600],
          ),
          tooltip: isInComparison ? 'Remove from comparison' : 'Add to comparison',
        );
      },
    );
  }

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
