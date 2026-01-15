import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_amazon_clone_bloc/core/constants/app_constants.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_colors.dart';
import 'package:flutter_amazon_clone_bloc/features/home/presentation/widgets/category_tile.dart';
import 'package:flutter_amazon_clone_bloc/features/home/presentation/widgets/deal_of_day_widget.dart';
import 'package:flutter_amazon_clone_bloc/features/product/presentation/bloc/product_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/presentation/bloc/auth_bloc.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Load deal of the day
    context.read<ProductBloc>().add(const FetchDealOfTheDayEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'assets/images/amazon_in.png',
              height: 45,
            ),
          ],
        ),
        backgroundColor: AppColors.teal,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.black),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.search, color: Colors.black),
            onPressed: () {
              // TODO: Navigate to search
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Address Bar
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.teal.withOpacity(0.5),
                    AppColors.teal.withOpacity(0.3),
                  ],
                ),
              ),
              child: BlocBuilder<AuthBloc, AuthState>(
                builder: (context, state) {
                  if (state is AuthAuthenticated) {
                    return Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 20),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            state.user.address.isEmpty
                                ? 'Select delivery location'
                                : 'Deliver to ${state.user.name} - ${state.user.address}',
                            style: const TextStyle(fontSize: 13),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const Icon(Icons.arrow_drop_down, size: 20),
                      ],
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ),

            // Categories
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Shop by Category',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 110,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: AppConstants.productCategories.length,
                      itemBuilder: (context, index) {
                        final category = AppConstants.productCategories[index];
                        return Padding(
                          padding: const EdgeInsets.only(right: 15),
                          child: CategoryTile(
                            title: category,
                            imagePath:
                                'assets/images/category_images/${category.toLowerCase()}.jpeg',
                            onTap: () {
                              // TODO: Navigate to category products
                            },
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Deal of the Day
            BlocBuilder<ProductBloc, ProductState>(
              builder: (context, state) {
                if (state is ProductLoading) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                if (state is DealOfTheDayLoaded) {
                  return DealOfDayWidget(
                    product: state.product,
                    onTap: () {
                      // TODO: Navigate to product details
                    },
                  );
                }

                return const SizedBox.shrink();
              },
            ),

            // Bottom Offers Section
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'More to explore',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 10),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 3,
                    children: [
                      _buildOfferCard('Amazon Pay', 'assets/images/bottom_offers/amazon_pay.png'),
                      _buildOfferCard('Recharge', 'assets/images/bottom_offers/amazon_recharge.png'),
                      _buildOfferCard('Rewards', 'assets/images/bottom_offers/amazon_rewards.png'),
                      _buildOfferCard('Bills', 'assets/images/bottom_offers/amazon_bills.png'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfferCard(String title, String imagePath) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Image.asset(
            imagePath,
            height: 30,
            width: 30,
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
