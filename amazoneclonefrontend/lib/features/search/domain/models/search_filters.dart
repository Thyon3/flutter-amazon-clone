class SearchFilters {
  final String? category;
  final double? minPrice;
  final double? maxPrice;
  final double? minRating;
  final String? sortBy;
  final bool? freeShipping;
  final bool? prime;

  const SearchFilters({
    this.category,
    this.minPrice,
    this.maxPrice,
    this.minRating,
    this.sortBy,
    this.freeShipping,
    this.prime,
  });

  SearchFilters copyWith({
    String? category,
    double? minPrice,
    double? maxPrice,
    double? minRating,
    String? sortBy,
    bool? freeShipping,
    bool? prime,
  }) {
    return SearchFilters(
      category: category ?? this.category,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      minRating: minRating ?? this.minRating,
      sortBy: sortBy ?? this.sortBy,
      freeShipping: freeShipping ?? this.freeShipping,
      prime: prime ?? this.prime,
    );
  }

  bool get hasAnyFilter =>
      category != null ||
      minPrice != null ||
      maxPrice != null ||
      minRating != null ||
      sortBy != null ||
      freeShipping != null ||
      prime != null;

  Map<String, dynamic> toMap() {
    return {
      if (category != null) 'category': category,
      if (minPrice != null) 'minPrice': minPrice,
      if (maxPrice != null) 'maxPrice': maxPrice,
      if (minRating != null) 'minRating': minRating,
      if (sortBy != null) 'sortBy': sortBy,
      if (freeShipping != null) 'freeShipping': freeShipping,
      if (prime != null) 'prime': prime,
    };
  }
}
