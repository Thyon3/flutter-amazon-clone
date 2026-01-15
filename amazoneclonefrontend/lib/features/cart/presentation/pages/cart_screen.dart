import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_colors.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/custom_button.dart';
import 'package:flutter_amazon_clone_bloc/features/cart/presentation/bloc/cart_bloc.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Shopping Cart',
          style: TextStyle(color: Colors.black),
        ),
        backgroundColor: AppColors.teal,
      ),
      body: BlocBuilder<CartBloc, CartState>(
        builder: (context, state) {
          if (state is CartLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is CartLoaded) {
            if (state.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.asset(
                      'assets/images/empty_cart.png',
                      height: 200,
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Your cart is empty',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Add items to get started',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              );
            }

            return Column(
              children: [
                // Cart Items List
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(10),
                    itemCount: state.items.length,
                    itemBuilder: (context, index) {
                      final item = state.items[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(10.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Product Image
                              Container(
                                width: 100,
                                height: 100,
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey.shade300),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: CachedNetworkImage(
                                  imageUrl: item.product.images.isNotEmpty
                                      ? item.product.images[0]
                                      : '',
                                  fit: BoxFit.contain,
                                  placeholder: (context, url) => const Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                  errorWidget: (context, url, error) =>
                                      const Icon(Icons.error),
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Product Details
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.product.name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      '\$${item.product.price.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.secondaryColor,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    // Quantity Controls
                                    Row(
                                      children: [
                                        // Decrease
                                        InkWell(
                                          onTap: () {
                                            context.read<CartBloc>().add(
                                                  UpdateCartQuantityEvent(
                                                    productId: item.product.id,
                                                    quantity: item.quantity - 1,
                                                  ),
                                                );
                                          },
                                          child: Container(
                                            padding: const EdgeInsets.all(6),
                                            decoration: BoxDecoration(
                                              color: Colors.grey.shade200,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Icon(
                                              Icons.remove,
                                              size: 16,
                                            ),
                                          ),
                                        ),
                                        // Quantity
                                        Padding(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 15,
                                          ),
                                          child: Text(
                                            '${item.quantity}',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                        // Increase
                                        InkWell(
                                          onTap: () {
                                            context.read<CartBloc>().add(
                                                  UpdateCartQuantityEvent(
                                                    productId: item.product.id,
                                                    quantity: item.quantity + 1,
                                                  ),
                                                );
                                          },
                                          child: Container(
                                            padding: const EdgeInsets.all(6),
                                            decoration: BoxDecoration(
                                              color: Colors.grey.shade200,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Icon(
                                              Icons.add,
                                              size: 16,
                                            ),
                                          ),
                                        ),
                                        const Spacer(),
                                        // Remove Button
                                        TextButton.icon(
                                          onPressed: () {
                                            context.read<CartBloc>().add(
                                                  RemoveFromCartEvent(
                                                    item.product.id,
                                                  ),
                                                );
                                          },
                                          icon: const Icon(
                                            Icons.delete_outline,
                                            color: Colors.red,
                                          ),
                                          label: const Text(
                                            'Remove',
                                            style: TextStyle(color: Colors.red),
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
                ),
                // Bottom Summary
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.grey.shade300,
                        blurRadius: 5,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Subtotal (${state.totalItems} items):',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            '\$${state.subtotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.secondaryColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      CustomButton(
                        text: 'Proceed to Checkout',
                        onPressed: () {
                          // TODO: Navigate to checkout
                        },
                        color: AppColors.secondaryColor,
                        textColor: Colors.white,
                      ),
                    ],
                  ),
                ),
              ],
            );
          }

          return const Center(child: Text('Something went wrong'));
        },
      ),
    );
  }
}
