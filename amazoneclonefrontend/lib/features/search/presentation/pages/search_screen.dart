import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_colors.dart';
import 'package:flutter_amazon_clone_bloc/core/utils/show_snackbar.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/voice_search_button.dart';
import 'package:flutter_amazon_clone_bloc/features/product/presentation/bloc/product_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/product/presentation/widgets/product_card.dart';
import 'package:flutter_amazon_clone_bloc/features/search/domain/models/search_filters.dart';
import 'package:flutter_amazon_clone_bloc/features/search/presentation/widgets/filter_bottom_sheet.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  SearchFilters _filters = const SearchFilters();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _performSearch() {
    final query = _searchController.text.trim();
    if (query.isNotEmpty) {
      context.read<ProductBloc>().add(
        SearchProductsWithFiltersEvent(
          query: query,
          filters: _filters,
        ),
      );
    }
  }

  void _onVoiceResult(String result) {
    _searchController.text = result;
    _performSearch();
    showSuccessSnackBar(context, 'Voice search completed');
  }

  void _onVoiceError(String error) {
    showErrorSnackBar(context, error);
  }

  void _showFilterBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => FilterBottomSheet(
        initialFilters: _filters,
        onApplyFilters: (filters) {
          setState(() {
            _filters = filters;
          });
          _performSearch();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.teal,
        title: TextField(
          controller: _searchController,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Search products',
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_filters.hasAnyFilter)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.orange,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'Active',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                VoiceSearchButton(
                  onVoiceResult: _onVoiceResult,
                  onError: _onVoiceError,
                ),
                IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: _performSearch,
                ),
              ],
            ),
          ),
          onSubmitted: (value) => _performSearch(),
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.tune,
              color: _filters.hasAnyFilter ? Colors.orange : Colors.white,
            ),
            onPressed: _showFilterBottomSheet,
            tooltip: 'Filters',
          ),
        ],
      ),
      body: BlocConsumer<ProductBloc, ProductState>(
        listener: (context, state) {
          if (state is ProductError) {
            showErrorSnackBar(context, state.message);
          }
        },
        builder: (context, state) {
          if (state is ProductLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ProductsLoaded) {
            if (state.products.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.search_off,
                      size: 80,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'No products found',
                      style: TextStyle(
                        fontSize: 18,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Try searching with different keywords',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              );
            }

            return GridView.builder(
              padding: const EdgeInsets.all(10),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.7,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: state.products.length,
              itemBuilder: (context, index) {
                final product = state.products[index];
                return ProductCard(
                  product: product,
                  onTap: () {
                    // TODO: Navigate to product details
                  },
                );
              },
            );
          }

          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.search,
                  size: 80,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 20),
                Text(
                  'Search for products',
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
