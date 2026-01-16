import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/constants/app_constants.dart';
import '../widgets/menu_category_container.dart';
import '../widgets/custom_floating_action_button.dart';

class AdminHomeScreen extends StatelessWidget {
  const AdminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xff84D8E3),
              Color(0xffA6E6CE),
              Color.fromARGB(255, 241, 249, 252),
            ],
            stops: [0, 0.3, 0.7],
            begin: Alignment.topLeft,
            end: Alignment.bottomCenter,
          ),
        ),
        child: GridView.builder(
          itemCount: AppConstants.categories.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.1,
            crossAxisCount: 2,
          ),
          itemBuilder: (context, index) {
            final category = AppConstants.categories[index];
            return MenuCategoryContainer(
              title: category,
              category: category,
              imageLink: _getCategoryImage(category),
              onTap: () {
                context.push('/admin/category-products/$category');
              },
            );
          },
        ),
      ),
      floatingActionButton: CustomFloatingActionButton(
        onPressed: () => context.push('/admin/add-product'),
        toolTip: 'Add a product',
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  String _getCategoryImage(String category) {
    final categoryImages = {
      'Mobiles': 'assets/images/category_images/mobiles.jpeg',
      'Fashion': 'assets/images/category_images/fashion.jpeg',
      'Electronics': 'assets/images/category_images/electronics.jpeg',
      'Home': 'assets/images/category_images/home.jpeg',
      'Beauty': 'assets/images/category_images/beauty.jpeg',
      'Appliances': 'assets/images/category_images/appliances.jpeg',
      'Grocery': 'assets/images/category_images/grocery.jpeg',
      'Books': 'assets/images/category_images/books.jpeg',
      'Essentials': 'assets/images/category_images/essentials.jpeg',
    };
    return categoryImages[category] ?? 'assets/images/category_images/mobiles.jpeg';
  }
}
