import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/save_for_later_bloc.dart';
import '../../../../core/widgets/loading_widget.dart';
import '../../../../core/widgets/error_widget.dart' as custom;

class SaveForLaterScreen extends StatefulWidget {
  const SaveForLaterScreen({super.key});

  @override
  State<SaveForLaterScreen> createState() => _SaveForLaterScreenState();
}

class _SaveForLaterScreenState extends State<SaveForLaterScreen> {
  @override
  void initState() {
    super.initState();
    context.read<SaveForLaterBloc>().add(const GetSaveForLaterEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved for Later'),
        elevation: 0,
      ),
      body: BlocBuilder<SaveForLaterBloc, SaveForLaterState>(
        builder: (context, state) {
          if (state is SaveForLaterLoading) {
            return const LoadingWidget();
          } else if (state is SaveForLaterError) {
            return custom.ErrorWidget(message: state.message);
          } else if (state is SaveForLaterLoaded) {
            if (state.products.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.bookmark_border,
                      size: 100,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No items saved for later',
                      style: TextStyle(
                        fontSize: 18,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Save items from your cart to buy later',
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
                context.read<SaveForLaterBloc>().add(const GetSaveForLaterEvent());
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(8),
                itemCount: state.products.length,
                itemBuilder: (context, index) {
                  final product = state.products[index];
                  return Card(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Row(
                        children: [
                          // Product Image
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              product.images.first,
                              width: 100,
                              height: 100,
                              fit: BoxFit.cover,
                            ),
                          ),
                          const SizedBox(width: 12),
                          
                          // Product Details
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  product.name,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '\$${product.price.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFFFF9900),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    // Move to Cart Button
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () {
                                          context.read<SaveForLaterBloc>().add(
                                                MoveToCartEvent(
                                                  productId: product.id!,
                                                ),
                                              );
                                        },
                                        icon: const Icon(
                                          Icons.shopping_cart,
                                          size: 16,
                                        ),
                                        label: const Text('Move to Cart'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFFFFBF00),
                                          foregroundColor: Colors.black,
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 8,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    // Delete Button
                                    IconButton(
                                      onPressed: () {
                                        context.read<SaveForLaterBloc>().add(
                                              DeleteFromLaterEvent(
                                                productId: product.id!,
                                              ),
                                            );
                                      },
                                      icon: const Icon(
                                        Icons.delete_outline,
                                        color: Colors.red,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
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
}
