import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/theme/app_colors.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/custom_button.dart';
import 'package:flutter_amazon_clone_bloc/core/widgets/custom_text_field.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/account/presentation/bloc/profile_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/account/presentation/bloc/profile_event.dart';
import 'package:flutter_amazon_clone_bloc/features/account/presentation/bloc/profile_state.dart';
import '../../../../core/utils/show_snackbar.dart';

class EditProfileScreen extends StatefulWidget {
  static const String routeName = '/edit-profile';
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _updateProfile() {
    if (_formKey.currentState!.validate()) {
      context.read<ProfileBloc>().add(
        UpdateProfileEvent(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(50),
        child: AppBar(
          flexibleSpace: Container(
            decoration: BoxDecoration(gradient: AppColors.appBarGradient),
          ),
          title: const Text(
            'Edit Profile',
            style: TextStyle(color: Colors.black),
          ),
        ),
      ),
      body: BlocConsumer<ProfileBloc, ProfileState>(
        listener: (context, state) {
          if (state is ProfileUpdated) {
            showSnackBar(context, 'Profile updated successfully!');
            Navigator.pop(context);
          } else if (state is ProfileError) {
            showErrorSnackBar(context, state.message);
          }
        },
        builder: (context, state) {
          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(15.0),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    const SizedBox(height: 20),
                    CustomTextField(
                      controller: _nameController,
                      hintText: 'Full Name',
                    ),
                    const SizedBox(height: 10),
                    CustomTextField(
                      controller: _emailController,
                      hintText: 'Email Address',
                    ),
                    const SizedBox(height: 20),
                    CustomButton(
                      text: 'Save Changes',
                      onPressed: _updateProfile,
                      color: AppColors.secondaryColor,
                      isLoading: state is ProfileLoading,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
