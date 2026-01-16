import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/utils/show_snackbar.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../../core/widgets/custom_button.dart';
import '../bloc/admin_add_product/admin_add_product_cubit.dart';

class AdminAddProductScreen extends StatefulWidget {
  const AdminAddProductScreen({super.key});

  @override
  State<AdminAddProductScreen> createState() => _AdminAddProductScreenState();
}

class _AdminAddProductScreenState extends State<AdminAddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _quantityController = TextEditingController();
  
  String _selectedCategory = AppConstants.categories[0];
  final List<File> _images = [];

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _quantityController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    try {
      final ImagePicker picker = ImagePicker();
      final List<XFile> pickedImages = await picker.pickMultiImage();
      
      if (pickedImages.isNotEmpty) {
        setState(() {
          for (var image in pickedImages) {
            _images.add(File(image.path));
          }
        });
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Error picking images: $e');
      }
    }
  }

  void _removeImage(int index) {
    setState(() {
      _images.removeAt(index);
    });
  }

  void _submitProduct() {
    if (_formKey.currentState!.validate()) {
      if (_images.isEmpty) {
        showErrorSnackBar(context, 'Please add at least one product image');
        return;
      }

      context.read<AdminAddProductCubit>().addProduct(
            name: _nameController.text.trim(),
            description: _descriptionController.text.trim(),
            price: double.parse(_priceController.text.trim()),
            quantity: int.parse(_quantityController.text.trim()),
            category: _selectedCategory,
            images: _images,
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
            decoration: const BoxDecoration(
              gradient: AppColors.appBarGradient,
            ),
          ),
          title: const Text('Add Product'),
        ),
      ),
      body: BlocListener<AdminAddProductCubit, AdminAddProductState>(
        listener: (context, state) {
          if (state is AdminAddProductSuccess) {
            showSuccessSnackBar(context, 'Product added successfully!');
            Navigator.pop(context);
          } else if (state is AdminAddProductError) {
            showErrorSnackBar(context, state.message);
          }
        },
        child: BlocBuilder<AdminAddProductCubit, AdminAddProductState>(
          builder: (context, state) {
            final isLoading = state is AdminAddProductLoading;

            return SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Images Section
                      const Text(
                        'Product Images',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      if (_images.isNotEmpty)
                        SizedBox(
                          height: 120,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: _images.length,
                            itemBuilder: (context, index) {
                              return Stack(
                                children: [
                                  Container(
                                    width: 120,
                                    height: 120,
                                    margin: const EdgeInsets.only(right: 8),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.grey),
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.file(
                                        _images[index],
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    top: 4,
                                    right: 12,
                                    child: GestureDetector(
                                      onTap: () => _removeImage(index),
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: const BoxDecoration(
                                          color: Colors.red,
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.close,
                                          color: Colors.white,
                                          size: 16,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      
                      const SizedBox(height: 12),
                      
                      OutlinedButton.icon(
                        onPressed: isLoading ? null : _pickImages,
                        icon: const Icon(Icons.add_photo_alternate),
                        label: Text(_images.isEmpty ? 'Add Images' : 'Add More Images'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 50),
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Product Name
                      CustomTextField(
                        controller: _nameController,
                        hintText: 'Product Name',
                        enabled: !isLoading,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter product name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      // Description
                      CustomTextField(
                        controller: _descriptionController,
                        hintText: 'Description',
                        maxLines: 5,
                        enabled: !isLoading,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter description';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      // Price
                      CustomTextField(
                        controller: _priceController,
                        hintText: 'Price',
                        keyboardType: TextInputType.number,
                        enabled: !isLoading,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter price';
                          }
                          if (double.tryParse(value) == null) {
                            return 'Please enter a valid price';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      // Quantity
                      CustomTextField(
                        controller: _quantityController,
                        hintText: 'Quantity',
                        keyboardType: TextInputType.number,
                        enabled: !isLoading,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter quantity';
                          }
                          if (int.tryParse(value) == null) {
                            return 'Please enter a valid quantity';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      // Category Dropdown
                      const Text(
                        'Category',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        items: AppConstants.categories.map((category) {
                          return DropdownMenuItem(
                            value: category,
                            child: Text(category),
                          );
                        }).toList(),
                        onChanged: isLoading
                            ? null
                            : (value) {
                                if (value != null) {
                                  setState(() {
                                    _selectedCategory = value;
                                  });
                                }
                              },
                      ),
                      const SizedBox(height: 24),
                      
                      // Submit Button
                      CustomButton(
                        text: isLoading ? 'Adding Product...' : 'Add Product',
                        onPressed: isLoading ? null : _submitProduct,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
