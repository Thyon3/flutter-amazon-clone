import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/features/search/domain/models/search_filters.dart';

class FilterBottomSheet extends StatefulWidget {
  final SearchFilters initialFilters;
  final Function(SearchFilters) onApplyFilters;

  const FilterBottomSheet({
    super.key,
    required this.initialFilters,
    required this.onApplyFilters,
  });

  @override
  State<FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<FilterBottomSheet> {
  late SearchFilters _filters;
  final List<String> _categories = [
    'All',
    'Electronics',
    'Clothing',
    'Home & Kitchen',
    'Books',
    'Sports',
    'Toys',
    'Beauty',
  ];
  
  final List<String> _sortOptions = [
    'Relevance',
    'Price: Low to High',
    'Price: High to Low',
    'Rating: High to Low',
    'Newest First',
  ];

  @override
  void initState() {
    super.initState();
    _filters = widget.initialFilters;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Filters',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton(
                onPressed: () {
                  setState(() {
                    _filters = const SearchFilters();
                  });
                },
                child: const Text('Clear All'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Filters content
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category filter
                  _buildSectionTitle('Category'),
                  _buildCategoryFilter(),
                  const SizedBox(height: 20),

                  // Price range filter
                  _buildSectionTitle('Price Range'),
                  _buildPriceRangeFilter(),
                  const SizedBox(height: 20),

                  // Rating filter
                  _buildSectionTitle('Minimum Rating'),
                  _buildRatingFilter(),
                  const SizedBox(height: 20),

                  // Sort by filter
                  _buildSectionTitle('Sort By'),
                  _buildSortByFilter(),
                  const SizedBox(height: 20),

                  // Additional filters
                  _buildSectionTitle('Additional Filters'),
                  _buildAdditionalFilters(),
                ],
              ),
            ),
          ),

          // Apply button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                widget.onApplyFilters(_filters);
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text(
                'Apply Filters',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildCategoryFilter() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _categories.map((category) {
        final isSelected = _filters.category == category;
        return FilterChip(
          label: Text(category),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              _filters = _filters.copyWith(
                category: selected ? category : null,
              );
            });
          },
        );
      }).toList(),
    );
  }

  Widget _buildPriceRangeFilter() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                decoration: const InputDecoration(
                  labelText: 'Min Price',
                  border: OutlineInputBorder(),
                  prefixText: '\$',
                ),
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  final price = double.tryParse(value);
                  setState(() {
                    _filters = _filters.copyWith(minPrice: price);
                  });
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: TextField(
                decoration: const InputDecoration(
                  labelText: 'Max Price',
                  border: OutlineInputBorder(),
                  prefixText: '\$',
                ),
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  final price = double.tryParse(value);
                  setState(() {
                    _filters = _filters.copyWith(maxPrice: price);
                  });
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRatingFilter() {
    return Row(
      children: [1, 2, 3, 4, 5].map((rating) {
        final isSelected = (_filters.minRating ?? 0) >= rating;
        return IconButton(
          icon: Icon(
            isSelected ? Icons.star : Icons.star_border,
            color: Colors.orange,
          ),
          onPressed: () {
            setState(() {
              _filters = _filters.copyWith(minRating: rating.toDouble());
            });
          },
        );
      }).toList(),
    );
  }

  Widget _buildSortByFilter() {
    return DropdownButtonFormField<String>(
      value: _filters.sortBy,
      decoration: const InputDecoration(
        border: OutlineInputBorder(),
      ),
      items: _sortOptions.map((option) {
        return DropdownMenuItem(
          value: option,
          child: Text(option),
        );
      }).toList(),
      onChanged: (value) {
        setState(() {
          _filters = _filters.copyWith(sortBy: value);
        });
      },
    );
  }

  Widget _buildAdditionalFilters() {
    return Column(
      children: [
        CheckboxListTile(
          title: const Text('Free Shipping'),
          value: _filters.freeShipping ?? false,
          onChanged: (value) {
            setState(() {
              _filters = _filters.copyWith(freeShipping: value);
            });
          },
        ),
        CheckboxListTile(
          title: const Text('Prime'),
          value: _filters.prime ?? false,
          onChanged: (value) {
            setState(() {
              _filters = _filters.copyWith(prime: value);
            });
          },
        ),
      ],
    );
  }
}
