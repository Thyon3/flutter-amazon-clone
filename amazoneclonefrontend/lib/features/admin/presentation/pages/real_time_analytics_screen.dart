import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:syncfusion_flutter_charts/charts.dart';
import 'package:flutter_amazon_clone_bloc/features/admin/presentation/bloc/real_time_analytics_bloc.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/loading_widget.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/error_widget.dart';

class RealTimeAnalyticsScreen extends StatefulWidget {
  const RealTimeAnalyticsScreen({super.key});

  @override
  State<RealTimeAnalyticsScreen> createState() => _RealTimeAnalyticsScreenState();
}

class _RealTimeAnalyticsScreenState extends State<RealTimeAnalyticsScreen> {
  @override
  void initState() {
    super.initState();
    // Load real-time analytics when screen initializes
    context.read<RealTimeAnalyticsBloc>().add(LoadRealTimeAnalytics());
    
    // Set up periodic refresh every 30 seconds
    _refreshTimer();
  }

  void _refreshTimer() {
    Future.delayed(const Duration(seconds: 30), () {
      if (mounted) {
        context.read<RealTimeAnalyticsBloc>().add(LoadRealTimeAnalytics());
        _refreshTimer();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Real-Time Analytics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<RealTimeAnalyticsBloc>().add(LoadRealTimeAnalytics());
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: BlocBuilder<RealTimeAnalyticsBloc, RealTimeAnalyticsState>(
        builder: (context, state) {
          if (state is RealTimeAnalyticsLoading) {
            return const LoadingWidget();
          }

          if (state is RealTimeAnalyticsError) {
            return CustomErrorWidget(
              message: state.message,
              onRetry: () {
                context.read<RealTimeAnalyticsBloc>().add(LoadRealTimeAnalytics());
              },
            );
          }

          if (state is RealTimeAnalyticsLoaded) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Key Metrics Cards
                  _buildKeyMetrics(state.analytics),
                  const SizedBox(height: 24),
                  
                  // Revenue Chart
                  _buildRevenueChart(state.analytics.weeklyData),
                  const SizedBox(height: 24),
                  
                  // Top Products
                  _buildTopProducts(state.analytics.today.topProducts),
                  const SizedBox(height: 24),
                  
                  // User Activity
                  _buildUserActivity(state.analytics),
                ],
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildKeyMetrics(analytics) {
    return Column(
      children: [
        const Text(
          'Today\'s Performance',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          childAspectRatio: 1.5,
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          children: [
            _buildMetricCard(
              'Total Revenue',
              '\$${analytics.today.totalRevenue.toStringAsFixed(2)}',
              Icons.attach_money,
              Colors.green,
            ),
            _buildMetricCard(
              'Orders',
              analytics.today.totalOrders.toString(),
              Icons.shopping_cart,
              Colors.blue,
            ),
            _buildMetricCard(
              'Active Users',
              analytics.today.activeUsers.toString(),
              Icons.people,
              Colors.orange,
            ),
            _buildMetricCard(
              'Conversion Rate',
              '${analytics.today.conversionRate.toStringAsFixed(1)}%',
              Icons.trending_up,
              Colors.purple,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 24),
                const Spacer(),
                Icon(Icons.more_vert, color: Colors.grey[400]),
              ],
            ),
            const Spacer(),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueChart(weeklyData) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Weekly Revenue Trend',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: SfCartesianChart(
                primaryXAxis: CategoryAxis(),
                primaryYAxis: NumericAxis(
                  labelFormat: '\${value}',
                ),
                series: [
                  LineSeries<SalesData, String>(
                    dataSource: weeklyData,
                    xValueMapper: (SalesData sales, _) => sales.day,
                    yValueMapper: (SalesData sales, _) => sales.revenue,
                    color: Colors.green,
                    dataLabelSettings: const DataLabelSettings(isVisible: true),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopProducts(topProducts) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Top Products Today',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: topProducts.length,
              itemBuilder: (context, index) {
                final product = topProducts[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.blue[100],
                    child: Text('${index + 1}'),
                  ),
                  title: Text(product.productName),
                  subtitle: Text('${product.sales} sales'),
                  trailing: Text(
                    '\$${product.revenue.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserActivity(analytics) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'User Activity',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildActivityItem(
                    'Page Views',
                    analytics.today.pageViews.toString(),
                    Icons.visibility,
                  ),
                ),
                Expanded(
                  child: _buildActivityItem(
                    'Unique Visitors',
                    analytics.today.uniqueVisitors.toString(),
                    Icons.person,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildActivityItem(
                    'Bounce Rate',
                    '${analytics.today.bounceRate.toStringAsFixed(1)}%',
                    Icons.exit_to_app,
                  ),
                ),
                Expanded(
                  child: _buildActivityItem(
                    'Avg Order Value',
                    '\$${analytics.today.averageOrderValue.toStringAsFixed(2)}',
                    Icons.shopping_basket,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 32, color: Colors.grey[600]),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}

// Sample data classes for charts
class SalesData {
  final String day;
  final double revenue;

  SalesData(this.day, this.revenue);
}
