import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class CustomFloatingActionButton extends StatelessWidget {
  const CustomFloatingActionButton({
    super.key,
    required this.onPressed,
    required this.toolTip,
  });

  final void Function()? onPressed;
  final String toolTip;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      onPressed: onPressed,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(50),
      ),
      backgroundColor: AppColors.selectedNavBarColor,
      tooltip: toolTip,
      child: const Icon(Icons.add),
    );
  }
}
