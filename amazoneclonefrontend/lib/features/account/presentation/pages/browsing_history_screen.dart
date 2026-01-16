import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/loading_widget.dart';
import '../../../../core/widgets/error_widget.dart' as custom;
import '../../../../core/utils/show_snackbar.dart';
import '../bloc/browsing_history/browsing_history_cubit.dart';
import '../../../product/presentation/widgets/product_card.dart';

class BrowsingHistoryScreen extends StatefulWidget {
  const BrowsingHistoryScreen({super.key});

  @override
  State<BrowsingHistoryScreen> createState() => _BrowsingHistoryScreenState();
}

class _BrowsingHistoryScreenState extends State<BrowsingHistoryScreen> {
  @override
  void initState() {
    super.initState();
    context.read<BrowsingHistoryCubit>().getBrowsingHistory();
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
          title: const Text('Browsing History'),
          actions: [
            BlocBuilder<BrowsingHistoryCubit, BrowsingHistoryState>(
              builder: (context, state) {
                if (state is BrowsingHistoryLoaded && state.products.isNotEmpty) {
                  return IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () {
                      _showClearConfirmation();
                    },
                    tooltip: 'Clear history',
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ],
        ),
      ),
      body: BlocConsumer<BrowsingHistoryCubit, BrowsingHistoryState>(
        listener: (context, state) {
          if (state is BrowsingHistoryCleared) {
            showSuccessSnackBar(context, 'Browsing history cleared');
            context.read<BrowsingHistoryCubit>().getBrowsingHistory();
          } else if (state is BrowsingHistoryError) {
            showErrorSnackBar(context, state.message);
          }
        },
        builder: (context, state) {
          if (state is BrowsingHistoryLoading) {
            return const LoadingWidget();
          } else if (state is BrowsingHistoryError && state is! BrowsingHistoryCleared) {
            return custom.ErrorWidget(message: state.message);
          } else if (state is BrowsingHistoryLoaded) {
            if (state.products.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.history,
                      size: 100,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No browsing history',
                      style: TextStyle(
                        fontSize: 18,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Products you view will appear here',
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
                context.read<BrowsingHistoryCubit>().getBrowsingHistory();
              },
              child: Column(
                children: [
                  // Info Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue[200]!),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue[700]),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Your recently viewed products (${state.products.length})',
                            style: TextStyle(
                              color: Colors.blue[900],
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Products Grid
                  Expanded(
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
                        return ProductCard(product: product);
                      },
                    ),
                  ),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  void _showClearConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Browsing History'),
        content: const Text(
          'Are you sure you want to clear your browsing history? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<BrowsingHistoryCubit>().clearBrowsingHistory();
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}
