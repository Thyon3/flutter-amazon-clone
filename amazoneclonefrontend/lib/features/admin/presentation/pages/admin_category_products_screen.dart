import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/loading_widget.dart';
import '../../../../core/widgets/error_widget.dart' as custom;
import '../../../../core/utils/show_snackbar.dart';
import '../bloc/admin_products/admin_products_cubit.dart';
import '../widgets/admin_product_card.dart';

class AdminCategoryProductsScreen extends StatefulWidget {
  final String category;

  const AdminCategoryProductsScreen({
    super.key,
    required this.category,
  });

  @override
  State<AdminCategoryProductsScreen> createState() =>
      _AdminCategoryProductsScreenState();
}

class _AdminCategoryProductsScreenState
    extends State<AdminCategoryProductsScreen> {
  @override
  void initState() {
    super.initState();
    context.read<AdminProductsCubit>().getProductsByCategory(widget.category);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(50),
        child: AppBar(
          flexibleSpace: Container(
            decoration: const BoxDecoration(
              gradient: AppColors.appBarGradient,
            ),
          ),
          title: Text(widget.category),
        ),
      ),
      body: BlocConsumer<AdminProductsCubit, AdminProductsState>(
        listener: (context, state) {
          if (state is AdminProductDeleteSuccess) {
            showSuccessSnackBar(context, 'Product deleted successfully');
            context.read<AdminProductsCubit>().getProductsByCategory(widget.category);
          } else if (state is AdminProductsError) {
            showErrorSnackBar(context, state.message);
          }
        },
        builder: (context, state) {
          if (state is AdminProductsLoading) {
            return const LoadingWidget();
          } else if (state is AdminProductsError && state is! AdminProductDeleteSuccess) {
            return custom.ErrorWidget(message: state.message);
          } else if (state is AdminProductsLoaded) {
            if (state.products.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.inventory_2_outlined,
                      size: 100,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No products in ${widget.category}',
                      style: TextStyle(
                        fontSize: 18,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Add products to this category',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                context.read<AdminProductsCubit>().getProductsByCategory(widget.category);
              },
              child: GridView.builder(
                padding: const EdgeInsets.all(8),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 0.7,
                ),
                itemCount: state.products.length,
                itemBuilder: (context, index) {
                  final product = state.products[index];
                  return AdminProductCard(
                    product: product,
                    onDelete: () {
                      _showDeleteConfirmation(product.id!);
                    },
                  );
                },
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  void _showDeleteConfirmation(String productId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Product'),
        content: const Text('Are you sure you want to delete this product?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AdminProductsCubit>().deleteProduct(productId);
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
