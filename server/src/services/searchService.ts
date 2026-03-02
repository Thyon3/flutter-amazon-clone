import { Product } from '../model/product';
import { Category } from '../model/category';
import { Brand } from '../model/brand';

export interface SearchRequest {
  query: string;
  filters: {
    categories?: string[];
    brands?: string[];
    priceRange?: {
      min: number;
      max: number;
    };
    rating?: number;
    inStock?: boolean;
    freeShipping?: boolean;
    prime?: boolean;
    sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest' | 'bestselling';
    page?: number;
    limit?: number;
  };
  userId?: string;
}

export interface SearchResponse {
  success: boolean;
  products: any[];
  total: number;
  facets: {
    categories: Array<{ name: string; count: number }>;
    brands: Array<{ name: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    ratings: Array<{ rating: number; count: number }>;
  };
  suggestions: string[];
  correctedQuery?: string;
}

export interface SearchAnalytics {
  totalSearches: number;
  topQueries: Array<{ query: string; count: number }>;
  noResultQueries: Array<{ query: string; count: number }>;
  averageResultsCount: number;
  popularFilters: Array<{ filter: string; count: number }>;
}

export class SearchService {
  // Advanced search with filters
  async searchProducts(request: SearchRequest): Promise<SearchResponse> {
    try {
      const { query, filters, userId } = request;
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build search query
      let searchQuery: any = {};

      // Text search
      if (query) {
        const searchRegex = new RegExp(query, 'i');
        searchQuery.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
          { brand: searchRegex },
          { category: searchRegex },
        ];
      }

      // Apply filters
      if (filters.categories && filters.categories.length > 0) {
        searchQuery.category = { $in: filters.categories };
      }

      if (filters.brands && filters.brands.length > 0) {
        searchQuery.brand = { $in: filters.brands };
      }

      if (filters.priceRange) {
        searchQuery.price = {
          $gte: filters.priceRange.min,
          $lte: filters.priceRange.max,
        };
      }

      if (filters.rating) {
        searchQuery.averageRating = { $gte: filters.rating };
      }

      if (filters.inStock !== undefined) {
        searchQuery.quantity = filters.inStock ? { $gt: 0 } : { $eq: 0 };
      }

      if (filters.freeShipping !== undefined) {
        searchQuery.freeShipping = filters.freeShipping;
      }

      if (filters.prime !== undefined) {
        searchQuery.prime = filters.prime;
      }

      // Sorting
      let sortOptions: any = {};
      switch (filters.sortBy) {
        case 'price_low':
          sortOptions = { price: 1 };
          break;
        case 'price_high':
          sortOptions = { price: -1 };
          break;
        case 'rating':
          sortOptions = { averageRating: -1 };
          break;
        case 'newest':
          sortOptions = { createdAt: -1 };
          break;
        case 'bestselling':
          sortOptions = { salesCount: -1 };
          break;
        case 'relevance':
        default:
          sortOptions = { score: { $meta: 'textScore' } };
          break;
      }

      // Execute search
      const products = await Product.find(searchQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('name price images category brand averageRating quantity freeShipping prime salesCount');

      const total = await Product.countDocuments(searchQuery);

      // Get facets for filtering
      const facets = await this.getSearchFacets(searchQuery);

      // Get search suggestions
      const suggestions = await this.getSearchSuggestions(query);

      // Spell correction (simple implementation)
      const correctedQuery = await this.spellCorrect(query);

      return {
        success: true,
        products,
        total,
        facets,
        suggestions,
        correctedQuery,
      };
    } catch (error) {
      return {
        success: false,
        products: [],
        total: 0,
        facets: {
          categories: [],
          brands: [],
          priceRanges: [],
          ratings: [],
        },
        suggestions: [],
      };
    }
  }

  // Get search facets
  private async getSearchFacets(baseQuery: any): Promise<any> {
    try {
      // Category facets
      const categoryFacets = await Product.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Brand facets
      const brandFacets = await Product.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Price range facets
      const priceFacets = await Product.aggregate([
        { $match: baseQuery },
        {
          $bucket: {
            groupBy: '$price',
            boundaries: [0, 25, 50, 100, 200, 500, 1000, Infinity],
            default: 'Other',
            output: { count: { $sum: 1 } },
          },
        },
        { $sort: { '_id': 1 } },
      ]);

      // Rating facets
      const ratingFacets = await Product.aggregate([
        { $match: { ...baseQuery, averageRating: { $exists: true, $gt: 0 } } },
        {
          $bucket: {
            groupBy: '$averageRating',
            boundaries: [0, 1, 2, 3, 4, 5],
            default: 'Other',
            output: { count: { $sum: 1 } },
          },
        },
        { $sort: { '_id': 1 } },
      ]);

      return {
        categories: categoryFacets.map(f => ({ name: f._id, count: f.count })),
        brands: brandFacets.map(f => ({ name: f._id, count: f.count })),
        priceRanges: priceFacets.map(f => ({
          range: this.getPriceRangeLabel(f._id),
          count: f.count,
        })),
        ratings: ratingFacets.map(f => ({ rating: f._id, count: f.count })),
      };
    } catch (error) {
      console.error('Failed to get search facets:', error);
      return {
        categories: [],
        brands: [],
        priceRanges: [],
        ratings: [],
      };
    }
  }

  // Get price range label
  private getPriceRangeLabel(range: number): string {
    const ranges = {
      0: 'Under $25',
      25: '$25 - $50',
      50: '$50 - $100',
      100: '$100 - $200',
      200: '$200 - $500',
      500: '$500 - $1000',
      1000: 'Over $1000',
    };
    return ranges[range] || 'Other';
  }

  // Get search suggestions
  private async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      if (!query || query.length < 2) return [];

      const searchRegex = new RegExp(query, 'i');
      
      // Get product names that match
      const productSuggestions = await Product.find({
        name: searchRegex,
      })
        .select('name')
        .limit(5);

      // Get category suggestions
      const categorySuggestions = await Category.find({
        name: searchRegex,
      })
        .select('name')
        .limit(3);

      // Get brand suggestions
      const brandSuggestions = await Brand.find({
        name: searchRegex,
      })
        .select('name')
        .limit(2);

      const suggestions = [
        ...productSuggestions.map(p => p.name),
        ...categorySuggestions.map(c => c.name),
        ...brandSuggestions.map(b => b.name),
      ];

      return [...new Set(suggestions)].slice(0, 10);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  // Simple spell correction
  private async spellCorrect(query: string): Promise<string | undefined> {
    try {
      if (!query || query.length < 3) return undefined;

      // Get all product names and brands for spell checking
      const products = await Product.find({})
        .select('name brand')
        .limit(1000);

      const allWords = new Set<string>();
      
      products.forEach(product => {
        product.name.split(' ').forEach(word => allWords.add(word.toLowerCase()));
        if (product.brand) {
          allWords.add(product.brand.toLowerCase());
        }
      });

      const queryWords = query.toLowerCase().split(' ');
      const correctedWords: string[] = [];

      for (const word of queryWords) {
        if (allWords.has(word)) {
          correctedWords.push(word);
        } else {
          // Find closest match
          const closestMatch = this.findClosestMatch(word, Array.from(allWords));
          if (closestMatch && this.getLevenshteinDistance(word, closestMatch) <= 2) {
            correctedWords.push(closestMatch);
          } else {
            correctedWords.push(word);
          }
        }
      }

      const correctedQuery = correctedWords.join(' ');
      return correctedQuery !== query.toLowerCase() ? correctedQuery : undefined;
    } catch (error) {
      console.error('Failed to spell correct:', error);
      return undefined;
    }
  }

  // Find closest match using Levenshtein distance
  private findClosestMatch(word: string, candidates: string[]): string | null {
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const candidate of candidates) {
      const distance = this.getLevenshteinDistance(word, candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  }

  // Calculate Levenshtein distance
  private getLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Trending searches
  async getTrendingSearches(limit: number = 10): Promise<string[]> {
    try {
      // In a real app, you'd track search queries in a separate collection
      // For now, we'll return some popular search terms
      const trendingTerms = [
        'laptop',
        'phone',
        'headphones',
        'shoes',
        'watch',
        'camera',
        'tablet',
        'gaming',
        'fitness',
        'kitchen',
      ];

      return trendingTerms.slice(0, limit);
    } catch (error) {
      console.error('Failed to get trending searches:', error);
      return [];
    }
  }

  // Search analytics
  async getSearchAnalytics(): Promise<SearchAnalytics> {
    try {
      // In a real app, you'd have a search analytics collection
      // For now, we'll return mock data
      return {
        totalSearches: 1000000,
        topQueries: [
          { query: 'laptop', count: 50000 },
          { query: 'phone', count: 45000 },
          { query: 'headphones', count: 35000 },
          { query: 'shoes', count: 30000 },
          { query: 'watch', count: 25000 },
        ],
        noResultQueries: [
          { query: 'xyz123', count: 100 },
          { query: 'invalid product', count: 85 },
          { query: 'not found', count: 70 },
        ],
        averageResultsCount: 25.5,
        popularFilters: [
          { filter: 'price_range', count: 150000 },
          { filter: 'category', count: 120000 },
          { filter: 'brand', count: 100000 },
          { filter: 'rating', count: 80000 },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get search analytics: ${error}`);
    }
  }

  // Autocomplete
  async autocomplete(query: string, limit: number = 10): Promise<string[]> {
    try {
      if (!query || query.length < 2) return [];

      const searchRegex = new RegExp(`^${query}`, 'i');
      
      // Get matching products
      const productMatches = await Product.find({
        name: searchRegex,
      })
        .select('name')
        .limit(limit);

      return productMatches.map(p => p.name);
    } catch (error) {
      console.error('Failed to autocomplete:', error);
      return [];
    }
  }

  // Similar products
  async getSimilarProducts(productId: string, limit: number = 10): Promise<any[]> {
    try {
      const product = await Product.findById(productId);
      if (!product) return [];

      // Find products with similar attributes
      const similarProducts = await Product.find({
        _id: { $ne: productId },
        $or: [
          { category: product.category },
          { brand: product.brand },
          { tags: { $in: product.tags } },
        ],
      })
        .sort({ averageRating: -1, salesCount: -1 })
        .limit(limit)
        .select('name price images category brand averageRating');

      return similarProducts;
    } catch (error) {
      console.error('Failed to get similar products:', error);
      return [];
    }
  }

  // Recently viewed products
  async getRecentlyViewed(productIds: string[], limit: number = 10): Promise<any[]> {
    try {
      if (!productIds || productIds.length === 0) return [];

      const products = await Product.find({
        _id: { $in: productIds },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name price images category brand averageRating');

      return products;
    } catch (error) {
      console.error('Failed to get recently viewed:', error);
      return [];
    }
  }

  // Advanced filtering
  async getAdvancedFilters(): Promise<any> {
    try {
      // Get all categories
      const categories = await Category.find({})
        .select('name')
        .sort({ name: 1 });

      // Get all brands
      const brands = await Brand.find({})
        .select('name')
        .sort({ name: 1 });

      // Get price ranges
      const priceRanges = await Product.aggregate([
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
          },
        },
      ]);

      const minPrice = priceRanges[0]?.minPrice || 0;
      const maxPrice = priceRanges[0]?.maxPrice || 1000;

      return {
        categories: categories.map(c => c.name),
        brands: brands.map(b => b.name),
        priceRange: {
          min: minPrice,
          max: maxPrice,
        },
        ratings: [1, 2, 3, 4, 5],
        features: [
          'freeShipping',
          'prime',
          'inStock',
          'onSale',
          'newArrival',
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get advanced filters: ${error}`);
    }
  }

  // Search history
  async saveSearchHistory(userId: string, query: string, filters: any): Promise<void> {
    try {
      // In a real app, you'd save search history to a collection
      console.log(`Search saved for user ${userId}: ${query}`);
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }

  // Get search history
  async getSearchHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      // In a real app, you'd retrieve from search history collection
      // For now, return mock data
      return [
        { query: 'laptop', timestamp: new Date() },
        { query: 'phone', timestamp: new Date() },
        { query: 'headphones', timestamp: new Date() },
      ].slice(0, limit);
    } catch (error) {
      console.error('Failed to get search history:', error);
      return [];
    }
  }

  // Clear search history
  async clearSearchHistory(userId: string): Promise<void> {
    try {
      // In a real app, you'd clear search history from collection
      console.log(`Search history cleared for user ${userId}`);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }
}
