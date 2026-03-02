export interface Translation {
  key: string;
  value: string;
  context?: string;
  plural?: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  enabled: boolean;
  translations: Translation[];
}

export interface LocalizationRequest {
  languageCode: string;
  translations: Translation[];
}

export interface LocalizationResponse {
  success: boolean;
  message: string;
  language?: Language;
}

export class LocalizationService {
  private languages: Map<string, Language> = new Map();
  private defaultLanguage = 'en';

  constructor() {
    this.initializeLanguages();
  }

  // Initialize supported languages
  private initializeLanguages(): void {
    const supportedLanguages: Language[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        rtl: false,
        enabled: true,
        translations: this.getEnglishTranslations(),
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        rtl: false,
        enabled: true,
        translations: this.getSpanishTranslations(),
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        rtl: false,
        enabled: true,
        translations: this.getFrenchTranslations(),
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        rtl: false,
        enabled: true,
        translations: this.getGermanTranslations(),
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        rtl: false,
        enabled: true,
        translations: this.getChineseTranslations(),
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        rtl: false,
        enabled: true,
        translations: this.getJapaneseTranslations(),
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        rtl: true,
        enabled: true,
        translations: this.getArabicTranslations(),
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        rtl: false,
        enabled: true,
        translations: this.getPortugueseTranslations(),
      },
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        rtl: false,
        enabled: true,
        translations: this.getRussianTranslations(),
      },
      {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        rtl: false,
        enabled: true,
        translations: this.getHindiTranslations(),
      },
    ];

    supportedLanguages.forEach(language => {
      this.languages.set(language.code, language);
    });
  }

  // Get all supported languages
  getSupportedLanguages(): Language[] {
    return Array.from(this.languages.values()).filter(lang => lang.enabled);
  }

  // Get language by code
  getLanguage(languageCode: string): Language | null {
    return this.languages.get(languageCode) || null;
  }

  // Translate text
  translate(key: string, languageCode: string = this.defaultLanguage, context?: string): string {
    const language = this.languages.get(languageCode);
    
    if (!language) {
      console.warn(`Language ${languageCode} not supported, falling back to default`);
      return this.translate(key, this.defaultLanguage, context);
    }

    const translation = language.translations.find(t => 
      t.key === key && (!context || t.context === context)
    );

    return translation?.value || key;
  }

  // Translate with plural support
  translatePlural(
    key: string, 
    count: number, 
    languageCode: string = this.defaultLanguage
  ): string {
    const language = this.languages.get(languageCode);
    
    if (!language) {
      return this.translatePlural(key, count, this.defaultLanguage);
    }

    const translation = language.translations.find(t => t.key === key);
    
    if (!translation) {
      return key;
    }

    // Simple pluralization logic (in a real app, you'd use ICU MessageFormat)
    if (count === 1 && translation.value) {
      return translation.value.replace('{count}', count.toString());
    } else if (translation.plural) {
      return translation.plural.replace('{count}', count.toString());
    }

    return translation.value.replace('{count}', count.toString());
  }

  // Format currency
  formatCurrency(amount: number, languageCode: string = this.defaultLanguage): string {
    const language = this.languages.get(languageCode);
    
    if (!language) {
      return this.formatCurrency(amount, this.defaultLanguage);
    }

    const locale = this.getLocaleForLanguage(languageCode);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.getCurrencyForLanguage(languageCode),
    }).format(amount);
  }

  // Format date
  formatDate(date: Date, languageCode: string = this.defaultLanguage): string {
    const language = this.languages.get(languageCode);
    
    if (!language) {
      return this.formatDate(date, this.defaultLanguage);
    }

    const locale = this.getLocaleForLanguage(languageCode);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  // Format number
  formatNumber(number: number, languageCode: string = this.defaultLanguage): string {
    const language = this.languages.get(languageCode);
    
    if (!language) {
      return this.formatNumber(number, this.defaultLanguage);
    }

    const locale = this.getLocaleForLanguage(languageCode);
    return new Intl.NumberFormat(locale).format(number);
  }

  // Get locale for language
  private getLocaleForLanguage(languageCode: string): string {
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ar': 'ar-SA',
      'pt': 'pt-BR',
      'ru': 'ru-RU',
      'hi': 'hi-IN',
    };

    return localeMap[languageCode] || 'en-US';
  }

  // Get currency for language
  private getCurrencyForLanguage(languageCode: string): string {
    const currencyMap: Record<string, string> = {
      'en': 'USD',
      'es': 'EUR',
      'fr': 'EUR',
      'de': 'EUR',
      'zh': 'CNY',
      'ja': 'JPY',
      'ar': 'SAR',
      'pt': 'BRL',
      'ru': 'RUB',
      'hi': 'INR',
    };

    return currencyMap[languageCode] || 'USD';
  }

  // Add or update translations
  addTranslations(request: LocalizationRequest): LocalizationResponse {
    try {
      const language = this.languages.get(request.languageCode);
      
      if (!language) {
        return {
          success: false,
          message: `Language ${request.languageCode} not supported`,
        };
      }

      // Update existing translations or add new ones
      request.translations.forEach(newTranslation => {
        const existingIndex = language.translations.findIndex(t => 
          t.key === newTranslation.key && t.context === newTranslation.context
        );

        if (existingIndex >= 0) {
          language.translations[existingIndex] = newTranslation;
        } else {
          language.translations.push(newTranslation);
        }
      });

      this.languages.set(request.languageCode, language);

      return {
        success: true,
        message: 'Translations updated successfully',
        language,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update translations: ${error}`,
      };
    }
  }

  // Get translations for a language
  getTranslations(languageCode: string): Translation[] {
    const language = this.languages.get(languageCode);
    return language?.translations || [];
  }

  // Detect language from request
  detectLanguage(request: any): string {
    // Check Accept-Language header
    const acceptLanguage = request.headers?.['accept-language'];
    if (acceptLanguage) {
      const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];
      if (this.languages.has(preferredLanguage)) {
        return preferredLanguage;
      }
    }

    // Check query parameter
    const langParam = request.query?.lang;
    if (langParam && this.languages.has(langParam)) {
      return langParam;
    }

    // Check user preference (in a real app, you'd get this from user profile)
    const userLanguage = request.user?.language;
    if (userLanguage && this.languages.has(userLanguage)) {
      return userLanguage;
    }

    // Default to English
    return this.defaultLanguage;
  }

  // Validate translations
  validateTranslations(translations: Translation[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    translations.forEach((translation, index) => {
      if (!translation.key) {
        errors.push(`Translation ${index + 1}: Key is required`);
      }

      if (!translation.value) {
        errors.push(`Translation ${index + 1}: Value is required`);
      }

      if (translation.key.length > 100) {
        errors.push(`Translation ${index + 1}: Key too long (max 100 characters)`);
      }

      if (translation.value.length > 1000) {
        errors.push(`Translation ${index + 1}: Value too long (max 1000 characters)`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Export translations
  exportTranslations(languageCode: string): string {
    const language = this.languages.get(languageCode);
    
    if (!language) {
      throw new Error(`Language ${languageCode} not found`);
    }

    return JSON.stringify(language.translations, null, 2);
  }

  // Import translations
  importTranslations(languageCode: string, translationsData: string): LocalizationResponse {
    try {
      const translations: Translation[] = JSON.parse(translationsData);
      
      const validation = this.validateTranslations(translations);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid translations: ${validation.errors.join(', ')}`,
        };
      }

      return this.addTranslations({
        languageCode,
        translations,
      });
    } catch (error) {
      return {
        success: false,
        message: `Failed to import translations: ${error}`,
      };
    }
  }

  // Translation methods for different languages
  private getEnglishTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'Welcome' },
      { key: 'login', value: 'Login' },
      { key: 'register', value: 'Register' },
      { key: 'cart', value: 'Cart' },
      { key: 'wishlist', value: 'Wishlist' },
      { key: 'search', value: 'Search' },
      { key: 'products', value: 'Products' },
      { key: 'price', value: 'Price' },
      { key: 'quantity', value: 'Quantity' },
      { key: 'add_to_cart', value: 'Add to Cart' },
      { key: 'buy_now', value: 'Buy Now' },
      { key: 'out_of_stock', value: 'Out of Stock' },
      { key: 'in_stock', value: 'In Stock' },
      { key: 'free_shipping', value: 'Free Shipping' },
      { key: 'customer_reviews', value: 'Customer Reviews' },
      { key: 'product_details', value: 'Product Details' },
      { key: 'shipping_info', value: 'Shipping Information' },
      { key: 'returns', value: 'Returns' },
      { key: 'help', value: 'Help' },
      { key: 'contact_us', value: 'Contact Us' },
      { key: 'about_us', value: 'About Us' },
      { key: 'terms_conditions', value: 'Terms & Conditions' },
      { key: 'privacy_policy', value: 'Privacy Policy' },
      { key: 'order_placed', value: 'Order Placed Successfully' },
      { key: 'payment_successful', value: 'Payment Successful' },
      { key: 'thank_you', value: 'Thank You' },
      { key: 'items_count', value: '{count} items', plural: '{count} items' },
      { key: 'rating', value: 'Rating' },
      { key: 'review', value: 'Review' },
      { key: 'reviews', value: 'Reviews' },
      { key: 'no_reviews', value: 'No reviews yet' },
      { key: 'write_review', value: 'Write a Review' },
      { key: 'verified_purchase', value: 'Verified Purchase' },
      { key: 'helpful', value: 'Helpful' },
      { key: 'report', value: 'Report' },
      { key: 'share', value: 'Share' },
      { key: 'copy_link', value: 'Copy Link' },
      { key: 'email', value: 'Email' },
      { key: 'password', value: 'Password' },
      { key: 'confirm_password', value: 'Confirm Password' },
      { key: 'first_name', value: 'First Name' },
      { key: 'last_name', value: 'Last Name' },
      { key: 'phone', value: 'Phone' },
      { key: 'address', value: 'Address' },
      { key: 'city', value: 'City' },
      { key: 'state', value: 'State' },
      { key: 'zip_code', value: 'ZIP Code' },
      { key: 'country', value: 'Country' },
      { key: 'save', value: 'Save' },
      { key: 'cancel', value: 'Cancel' },
      { key: 'delete', value: 'Delete' },
      { key: 'edit', value: 'Edit' },
      { key: 'update', value: 'Update' },
      { key: 'loading', value: 'Loading...' },
      { key: 'error', value: 'Error' },
      { key: 'success', value: 'Success' },
      { key: 'warning', value: 'Warning' },
      { key: 'info', value: 'Information' },
    ];
  }

  private getSpanishTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'Bienvenido' },
      { key: 'login', value: 'Iniciar Sesión' },
      { key: 'register', value: 'Registrarse' },
      { key: 'cart', value: 'Carrito' },
      { key: 'wishlist', value: 'Lista de Deseos' },
      { key: 'search', value: 'Buscar' },
      { key: 'products', value: 'Productos' },
      { key: 'price', value: 'Precio' },
      { key: 'quantity', value: 'Cantidad' },
      { key: 'add_to_cart', value: 'Agregar al Carrito' },
      { key: 'buy_now', value: 'Comprar Ahora' },
      { key: 'out_of_stock', value: 'Sin Stock' },
      { key: 'in_stock', value: 'En Stock' },
      { key: 'free_shipping', value: 'Envío Gratis' },
      { key: 'customer_reviews', value: 'Reseñas de Clientes' },
      { key: 'product_details', value: 'Detalles del Producto' },
      { key: 'shipping_info', value: 'Información de Envío' },
      { key: 'returns', value: 'Devoluciones' },
      { key: 'help', value: 'Ayuda' },
      { key: 'contact_us', value: 'Contáctanos' },
      { key: 'about_us', value: 'Acerca de Nosotros' },
      { key: 'terms_conditions', value: 'Términos y Condiciones' },
      { key: 'privacy_policy', value: 'Política de Privacidad' },
      { key: 'order_placed', value: 'Pedido Realizado con Éxito' },
      { key: 'payment_successful', value: 'Pago Exitoso' },
      { key: 'thank_you', value: 'Gracias' },
      { key: 'items_count', value: '{count} artículo', plural: '{count} artículos' },
      { key: 'rating', value: 'Calificación' },
      { key: 'review', value: 'Reseña' },
      { key: 'reviews', value: 'Reseñas' },
      { key: 'no_reviews', value: 'Sin reseñas aún' },
      { key: 'write_review', value: 'Escribir una Reseña' },
      { key: 'verified_purchase', value: 'Compra Verificada' },
      { key: 'helpful', value: 'Útil' },
      { key: 'report', value: 'Reportar' },
      { key: 'share', value: 'Compartir' },
      { key: 'copy_link', value: 'Copiar Enlace' },
      { key: 'email', value: 'Correo Electrónico' },
      { key: 'password', value: 'Contraseña' },
      { key: 'confirm_password', value: 'Confirmar Contraseña' },
      { key: 'first_name', value: 'Nombre' },
      { key: 'last_name', value: 'Apellido' },
      { key: 'phone', value: 'Teléfono' },
      { key: 'address', value: 'Dirección' },
      { key: 'city', value: 'Ciudad' },
      { key: 'state', value: 'Estado' },
      { key: 'zip_code', value: 'Código Postal' },
      { key: 'country', value: 'País' },
      { key: 'save', value: 'Guardar' },
      { key: 'cancel', value: 'Cancelar' },
      { key: 'delete', value: 'Eliminar' },
      { key: 'edit', value: 'Editar' },
      { key: 'update', value: 'Actualizar' },
      { key: 'loading', value: 'Cargando...' },
      { key: 'error', value: 'Error' },
      { key: 'success', value: 'Éxito' },
      { key: 'warning', value: 'Advertencia' },
      { key: 'info', value: 'Información' },
    ];
  }

  private getFrenchTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'Bienvenue' },
      { key: 'login', value: 'Connexion' },
      { key: 'register', value: "S'inscrire" },
      { key: 'cart', value: 'Panier' },
      { key: 'wishlist', value: 'Liste de Souhaits' },
      { key: 'search', value: 'Rechercher' },
      { key: 'products', value: 'Produits' },
      { key: 'price', value: 'Prix' },
      { key: 'quantity', value: 'Quantité' },
      { key: 'add_to_cart', value: 'Ajouter au Panier' },
      { key: 'buy_now', value: 'Acheter Maintenant' },
      { key: 'out_of_stock', value: 'Rupture de Stock' },
      { key: 'in_stock', value: 'En Stock' },
      { key: 'free_shipping', value: 'Livraison Gratuite' },
      { key: 'customer_reviews', value: 'Avis Clients' },
      { key: 'product_details', value: 'Détails du Produit' },
      { key: 'shipping_info', value: 'Informations de Livraison' },
      { key: 'returns', value: 'Retours' },
      { key: 'help', value: 'Aide' },
      { key: 'contact_us', value: 'Nous Contacter' },
      { key: 'about_us', value: 'À Propos de Nous' },
      { key: 'terms_conditions', value: 'Termes et Conditions' },
      { key: 'privacy_policy', value: 'Politique de Confidentialité' },
      { key: 'order_placed', value: 'Commande Passée avec Succès' },
      { key: 'payment_successful', value: 'Payment Réussi' },
      { key: 'thank_you', value: 'Merci' },
      { key: 'items_count', value: '{count} article', plural: '{count} articles' },
      { key: 'rating', value: 'Note' },
      { key: 'review', value: 'Avis' },
      { key: 'reviews', value: 'Avis' },
      { key: 'no_reviews', value: 'Aucun avis pour le moment' },
      { key: 'write_review', value: 'Écrire un Avis' },
      { key: 'verified_purchase', value: 'Achat Vérifié' },
      { key: 'helpful', value: 'Utile' },
      { key: 'report', value: 'Signaler' },
      { key: 'share', value: 'Partager' },
      { key: 'copy_link', value: 'Copier le Lien' },
      { key: 'email', value: 'Email' },
      { key: 'password', value: 'Mot de Passe' },
      { key: 'confirm_password', value: 'Confirmer le Mot de Passe' },
      { key: 'first_name', value: 'Prénom' },
      { key: 'last_name', value: 'Nom' },
      { key: 'phone', value: 'Téléphone' },
      { key: 'address', value: 'Adresse' },
      { key: 'city', value: 'Ville' },
      { key: 'state', value: 'État' },
      { key: 'zip_code', value: 'Code Postal' },
      { key: 'country', value: 'Pays' },
      { key: 'save', value: 'Sauvegarder' },
      { key: 'cancel', value: 'Annuler' },
      { key: 'delete', value: 'Supprimer' },
      { key: 'edit', value: 'Modifier' },
      { key: 'update', value: 'Mettre à Jour' },
      { key: 'loading', value: 'Chargement...' },
      { key: 'error', value: 'Erreur' },
      { key: 'success', value: 'Succès' },
      { key: 'warning', value: 'Avertissement' },
      { key: 'info', value: 'Information' },
    ];
  }

  private getGermanTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'Willkommen' },
      { key: 'login', value: 'Anmelden' },
      { key: 'register', value: 'Registrieren' },
      { key: 'cart', value: 'Warenkorb' },
      { key: 'wishlist', value: 'Wunschliste' },
      { key: 'search', value: 'Suchen' },
      { key: 'products', value: 'Produkte' },
      { key: 'price', value: 'Preis' },
      { key: 'quantity', value: 'Menge' },
      { key: 'add_to_cart', value: 'In den Warenkorb' },
      { key: 'buy_now', value: 'Jetzt Kaufen' },
      { key: 'out_of_stock', value: 'Nicht Vorhanden' },
      { key: 'in_stock', value: 'Auf Lager' },
      { key: 'free_shipping', value: 'Kostenloser Versand' },
      { key: 'customer_reviews', value: 'Kundenbewertungen' },
      { key: 'product_details', value: 'Produktdetails' },
      { key: 'shipping_info', value: 'Versandinformationen' },
      { key: 'returns', value: 'Rücksendungen' },
      { key: 'help', value: 'Hilfe' },
      { key: 'contact_us', value: 'Kontaktieren Sie Uns' },
      { key: 'about_us', value: 'Über Uns' },
      { key: 'terms_conditions', value: 'Geschäftsbedingungen' },
      { key: 'privacy_policy', value: 'Datenschutzrichtlinie' },
      { key: 'order_placed', value: 'Bestellung Erfolgreich Aufgegeben' },
      { key: 'payment_successful', value: 'Zahlung Erfolgreich' },
      { key: 'thank_you', value: 'Danke' },
      { key: 'items_count', value: '{count} Artikel', plural: '{count} Artikel' },
      { key: 'rating', value: 'Bewertung' },
      { key: 'review', value: 'Bewertung' },
      { key: 'reviews', value: 'Bewertungen' },
      { key: 'no_reviews', value: 'Noch keine Bewertungen' },
      { key: 'write_review', value: 'Bewertung Schreiben' },
      { key: 'verified_purchase', value: 'Verifizierter Kauf' },
      { key: 'helpful', value: 'Hilfreich' },
      { key: 'report', value: 'Melden' },
      { key: 'share', value: 'Teilen' },
      { key: 'copy_link', value: 'Link Kopieren' },
      { key: 'email', value: 'E-Mail' },
      { key: 'password', value: 'Passwort' },
      { key: 'confirm_password', value: 'Passwort Bestätigen' },
      { key: 'first_name', value: 'Vorname' },
      { key: 'last_name', value: 'Nachname' },
      { key: 'phone', value: 'Telefon' },
      { key: 'address', value: 'Adresse' },
      { key: 'city', value: 'Stadt' },
      { key: 'state', value: 'Bundesland' },
      { key: 'zip_code', value: 'Postleitzahl' },
      { key: 'country', value: 'Land' },
      { key: 'save', value: 'Speichern' },
      { key: 'cancel', value: 'Abbrechen' },
      { key: 'delete', value: 'Löschen' },
      { key: 'edit', value: 'Bearbeiten' },
      { key: 'update', value: 'Aktualisieren' },
      { key: 'loading', value: 'Laden...' },
      { key: 'error', value: 'Fehler' },
      { key: 'success', value: 'Erfolg' },
      { key: 'warning', value: 'Warnung' },
      { key: 'info', value: 'Information' },
    ];
  }

  private getChineseTranslations(): Translation[] {
    return [
      { key: 'welcome', value: '欢迎' },
      { key: 'login', value: '登录' },
      { key: 'register', value: '注册' },
      { key: 'cart', value: '购物车' },
      { key: 'wishlist', value: '愿望清单' },
      { key: 'search', value: '搜索' },
      { key: 'products', value: '产品' },
      { key: 'price', value: '价格' },
      { key: 'quantity', value: '数量' },
      { key: 'add_to_cart', value: '加入购物车' },
      { key: 'buy_now', value: '立即购买' },
      { key: 'out_of_stock', value: '缺货' },
      { key: 'in_stock', value: '有货' },
      { key: 'free_shipping', value: '免费送货' },
      { key: 'customer_reviews', value: '客户评价' },
      { key: 'product_details', value: '产品详情' },
      { key: 'shipping_info', value: '配送信息' },
      { key: 'returns', value: '退货' },
      { key: 'help', value: '帮助' },
      { key: 'contact_us', value: '联系我们' },
      { key: 'about_us', value: '关于我们' },
      { key: 'terms_conditions', value: '条款和条件' },
      { key: 'privacy_policy', value: '隐私政策' },
      { key: 'order_placed', value: '订单成功下单' },
      { key: 'payment_successful', value: '支付成功' },
      { key: 'thank_you', value: '谢谢' },
      { key: 'items_count', value: '{count} 件商品', plural: '{count} 件商品' },
      { key: 'rating', value: '评分' },
      { key: 'review', value: '评价' },
      { key: 'reviews', value: '评价' },
      { key: 'no_reviews', value: '暂无评价' },
      { key: 'write_review', value: '写评价' },
      { key: 'verified_purchase', value: '已验证购买' },
      { key: 'helpful', value: '有用' },
      { key: 'report', value: '举报' },
      { key: 'share', value: '分享' },
      { key: 'copy_link', value: '复制链接' },
      { key: 'email', value: '电子邮件' },
      { key: 'password', value: '密码' },
      { key: 'confirm_password', value: '确认密码' },
      { key: 'first_name', value: '名字' },
      { key: 'last_name', value: '姓氏' },
      { key: 'phone', value: '电话' },
      { key: 'address', value: '地址' },
      { key: 'city', value: '城市' },
      { key: 'state', value: '省/州' },
      { key: 'zip_code', value: '邮政编码' },
      { key: 'country', value: '国家' },
      { key: 'save', value: '保存' },
      { key: 'cancel', value: '取消' },
      { key: 'delete', value: '删除' },
      { key: 'edit', value: '编辑' },
      { key: 'update', value: '更新' },
      { key: 'loading', value: '加载中...' },
      { key: 'error', value: '错误' },
      { key: 'success', value: '成功' },
      { key: 'warning', value: '警告' },
      { key: 'info', value: '信息' },
    ];
  }

  private getJapaneseTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'ようこそ' },
      { key: 'login', value: 'ログイン' },
      { key: 'register', value: '登録' },
      { key: 'cart', value: 'カート' },
      { key: 'wishlist', value: 'ウィッシュリスト' },
      { key: 'search', value: '検索' },
      { key: 'products', value: '商品' },
      { key: 'price', value: '価格' },
      { key: 'quantity', value: '数量' },
      { key: 'add_to_cart', value: 'カートに追加' },
      { key: 'buy_now', value: '今すぐ購入' },
      { key: 'out_of_stock', value: '在庫切れ' },
      { key: 'in_stock', value: '在庫あり' },
      { key: 'free_shipping', value: '送料無料' },
      { key: 'customer_reviews', value: 'カスタマーレビュー' },
      { key: 'product_details', value: '商品詳細' },
      { key: 'shipping_info', value: '配送情報' },
      { key: 'returns', value: '返品' },
      { key: 'help', value: 'ヘルプ' },
      { key: 'contact_us', value: 'お問い合わせ' },
      { key: 'about_us', value: '私たちについて' },
      { key: 'terms_conditions', value: '利用規約' },
      { key: 'privacy_policy', value: 'プライバシーポリシー' },
      { key: 'order_placed', value: '注文が正常に完了しました' },
      { key: 'payment_successful', value: '支払いが成功しました' },
      { key: 'thank_you', value: 'ありがとうございます' },
      { key: 'items_count', value: '{count} 点', plural: '{count} 点' },
      { key: 'rating', value: '評価' },
      { key: 'review', value: 'レビュー' },
      { key: 'reviews', value: 'レビュー' },
      { key: 'no_reviews', value: 'まだレビューがありません' },
      { key: 'write_review', value: 'レビューを書く' },
      { key: 'verified_purchase', value: '認証済み購入' },
      { key: 'helpful', value: '役に立つ' },
      { key: 'report', value: '報告' },
      { key: 'share', value: '共有' },
      { key: 'copy_link', value: 'リンクをコピー' },
      { key: 'email', value: 'メール' },
      { key: 'password', value: 'パスワード' },
      { key: 'confirm_password', value: 'パスワードを確認' },
      { key: 'first_name', value: '名' },
      { key: 'last_name', value: '姓' },
      { key: 'phone', value: '電話番号' },
      { key: 'address', value: '住所' },
      { key: 'city', value: '市' },
      { key: 'state', value: '都道府県' },
      { key: 'zip_code', value: '郵便番号' },
      { key: 'country', value: '国' },
      { key: 'save', value: '保存' },
      { key: 'cancel', value: 'キャンセル' },
      { key: 'delete', value: '削除' },
      { key: 'edit', value: '編集' },
      { key: 'update', value: '更新' },
      { key: 'loading', value: '読み込み中...' },
      { key: 'error', value: 'エラー' },
      { key: 'success', value: '成功' },
      { key: 'warning', value: '警告' },
      { key: 'info', value: '情報' },
    ];
  }

  private getArabicTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'مرحباً' },
      { key: 'login', value: 'تسجيل الدخول' },
      { key: 'register', value: 'تسجيل' },
      { key: 'cart', value: 'سلة التسوق' },
      { key: 'wishlist', value: 'قائمة الرغبات' },
      { key: 'search', value: 'بحث' },
      { key: 'products', value: 'المنتجات' },
      { key: 'price', value: 'السعر' },
      { key: 'quantity', value: 'الكمية' },
      { key: 'add_to_cart', value: 'أضف إلى السلة' },
      { key: 'buy_now', value: 'اشتر الآن' },
      { key: 'out_of_stock', value: 'نفد المخزون' },
      { key: 'in_stock', value: 'متوفر' },
      { key: 'free_shipping', value: 'شحن مجاني' },
      { key: 'customer_reviews', value: 'مراجعات العملاء' },
      { key: 'product_details', value: 'تفاصيل المنتج' },
      { key: 'shipping_info', value: 'معلومات الشحن' },
      { key: 'returns', value: 'المرتجعات' },
      { key: 'help', value: 'مساعدة' },
      { key: 'contact_us', value: 'اتصل بنا' },
      { key: 'about_us', value: 'من نحن' },
      { key: 'terms_conditions', value: 'الشروط والأحكام' },
      { key: 'privacy_policy', value: 'سياسة الخصوصية' },
      { key: 'order_placed', value: 'تم تقديم الطلب بنجاح' },
      { key: 'payment_successful', value: 'تم الدفع بنجاح' },
      { key: 'thank_you', value: 'شكراً لك' },
      { key: 'items_count', value: '{count} عنصر', plural: '{count} عناصر' },
      { key: 'rating', value: 'التقييم' },
      { key: 'review', value: 'مراجعة' },
      { key: 'reviews', value: 'المراجعات' },
      { key: 'no_reviews', value: 'لا توجد مراجعات بعد' },
      { key: 'write_review', value: 'اكتب مراجعة' },
      { key: 'verified_purchase', value: 'شراء موثق' },
      { key: 'helpful', value: 'مفيد' },
      { key: 'report', value: 'بلغ' },
      { key: 'share', value: 'مشاركة' },
      { key: 'copy_link', value: 'نسخ الرابط' },
      { key: 'email', value: 'البريد الإلكتروني' },
      { key: 'password', value: 'كلمة المرور' },
      { key: 'confirm_password', value: 'تأكيد كلمة المرور' },
      { key: 'first_name', value: 'الاسم الأول' },
      { key: 'last_name', value: 'الاسم الأخير' },
      { key: 'phone', value: 'الهاتف' },
      { key: 'address', value: 'العنوان' },
      { key: 'city', value: 'المدينة' },
      { key: 'state', value: 'الولاية' },
      { key: 'zip_code', value: 'الرمز البريدي' },
      { key: 'country', value: 'البلد' },
      { key: 'save', value: 'حفظ' },
      { key: 'cancel', value: 'إلغاء' },
      { key: 'delete', value: 'حذف' },
      { key: 'edit', value: 'تحرير' },
      { key: 'update', value: 'تحديث' },
      { key: 'loading', value: 'جاري التحميل...' },
      { key: 'error', value: 'خطأ' },
      { key: 'success', value: 'نجح' },
      { key: 'warning', value: 'تحذير' },
      { key: 'info', value: 'معلومات' },
    ];
  }

  private getPortugueseTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'Bem-vindo' },
      { key: 'login', value: 'Entrar' },
      { key: 'register', value: 'Cadastrar' },
      { key: 'cart', value: 'Carrinho' },
      { key: 'wishlist', value: 'Lista de Desejos' },
      { key: 'search', value: 'Pesquisar' },
      { key: 'products', value: 'Produtos' },
      { key: 'price', value: 'Preço' },
      { key: 'quantity', value: 'Quantidade' },
      { key: 'add_to_cart', value: 'Adicionar ao Carrinho' },
      { key: 'buy_now', value: 'Comprar Agora' },
      { key: 'out_of_stock', value: 'Fora de Estoque' },
      { key: 'in_stock', value: 'Em Estoque' },
      { key: 'free_shipping', value: 'Frete Grátis' },
      { key: 'customer_reviews', value: 'Avaliações de Clientes' },
      { key: 'product_details', value: 'Detalhes do Produto' },
      { key: 'shipping_info', value: 'Informações de Envio' },
      { key: 'returns', value: 'Devoluções' },
      { key: 'help', value: 'Ajuda' },
      { key: 'contact_us', value: 'Entre em Contato' },
      { key: 'about_us', value: 'Sobre Nós' },
      { key: 'terms_conditions', value: 'Termos e Condições' },
      { key: 'privacy_policy', value: 'Política de Privacidade' },
      { key: 'order_placed', value: 'Pedido Realizado com Sucesso' },
      { key: 'payment_successful', value: 'Pagamento Bem-sucedido' },
      { key: 'thank_you', value: 'Obrigado' },
      { key: 'items_count', value: '{count} item', plural: '{count} itens' },
      { key: 'rating', value: 'Classificação' },
      { key: 'review', value: 'Avaliação' },
      { key: 'reviews', value: 'Avaliações' },
      { key: 'no_reviews', value: 'Nenhuma avaliação ainda' },
      { key: 'write_review', value: 'Escrever uma Avaliação' },
      { key: 'verified_purchase', value: 'Compra Verificada' },
      { key: 'helpful', value: 'Útil' },
      { key: 'report', value: 'Denunciar' },
      { key: 'share', value: 'Compartilhar' },
      { key: 'copy_link', value: 'Copiar Link' },
      { key: 'email', value: 'E-mail' },
      { key: 'password', value: 'Senha' },
      { key: 'confirm_password', value: 'Confirmar Senha' },
      { key: 'first_name', value: 'Nome' },
      { key: 'last_name', value: 'Sobrenome' },
      { key: 'phone', value: 'Telefone' },
      { key: 'address', value: 'Endereço' },
      { key: 'city', value: 'Cidade' },
      { key: 'state', value: 'Estado' },
      { key: 'zip_code', value: 'CEP' },
      { key: 'country', value: 'País' },
      { key: 'save', value: 'Salvar' },
      { key: 'cancel', value: 'Cancelar' },
      { key: 'delete', value: 'Excluir' },
      { key: 'edit', value: 'Editar' },
      { key: 'update', value: 'Atualizar' },
      { key: 'loading', value: 'Carregando...' },
      { key: 'error', value: 'Erro' },
      { key: 'success', value: 'Sucesso' },
      { key: 'warning', value: 'Aviso' },
      { key: 'info', value: 'Informação' },
    ];
  }

  private getRussianTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'Добро пожаловать' },
      { key: 'login', value: 'Войти' },
      { key: 'register', value: 'Регистрация' },
      { key: 'cart', value: 'Корзина' },
      { key: 'wishlist', value: 'Список желаний' },
      { key: 'search', value: 'Поиск' },
      { key: 'products', value: 'Товары' },
      { key: 'price', value: 'Цена' },
      { key: 'quantity', value: 'Количество' },
      { key: 'add_to_cart', value: 'Добавить в корзину' },
      { key: 'buy_now', value: 'Купить сейчас' },
      { key: 'out_of_stock', value: 'Нет в наличии' },
      { key: 'in_stock', value: 'В наличии' },
      { key: 'free_shipping', value: 'Бесплатная доставка' },
      { key: 'customer_reviews', value: 'Отзывы клиентов' },
      { key: 'product_details', value: 'Детали товара' },
      { key: 'shipping_info', value: 'Информация о доставке' },
      { key: 'returns', value: 'Возвраты' },
      { key: 'help', value: 'Помощь' },
      { key: 'contact_us', value: 'Свяжитесь с нами' },
      { key: 'about_us', value: 'О нас' },
      { key: 'terms_conditions', value: 'Условия использования' },
      { key: 'privacy_policy', value: 'Политика конфиденциальности' },
      { key: 'order_placed', value: 'Заказ успешно оформлен' },
      { key: 'payment_successful', value: 'Платеж успешен' },
      { key: 'thank_you', value: 'Спасибо' },
      { key: 'items_count', value: '{count} товар', plural: '{count} товаров' },
      { key: 'rating', value: 'Рейтинг' },
      { key: 'review', value: 'Отзыв' },
      { key: 'reviews', value: 'Отзывы' },
      { key: 'no_reviews', value: 'Пока нет отзывов' },
      { key: 'write_review', value: 'Написать отзыв' },
      { key: 'verified_purchase', value: 'Подтвержденная покупка' },
      { key: 'helpful', value: 'Полезно' },
      { key: 'report', value: 'Пожаловаться' },
      { key: 'share', value: 'Поделиться' },
      { key: 'copy_link', value: 'Копировать ссылку' },
      { key: 'email', value: 'Электронная почта' },
      { key: 'password', value: 'Пароль' },
      { key: 'confirm_password', value: 'Подтвердить пароль' },
      { key: 'first_name', value: 'Имя' },
      { key: 'last_name', value: 'Фамилия' },
      { key: 'phone', value: 'Телефон' },
      { key: 'address', value: 'Адрес' },
      { key: 'city', value: 'Город' },
      { key: 'state', value: 'Штат' },
      { key: 'zip_code', value: 'Почтовый индекс' },
      { key: 'country', value: 'Страна' },
      { key: 'save', value: 'Сохранить' },
      { key: 'cancel', value: 'Отмена' },
      { key: 'delete', value: 'Удалить' },
      { key: 'edit', value: 'Редактировать' },
      { key: 'update', value: 'Обновить' },
      { key: 'loading', value: 'Загрузка...' },
      { key: 'error', value: 'Ошибка' },
      { key: 'success', value: 'Успех' },
      { key: 'warning', value: 'Предупреждение' },
      { key: 'info', value: 'Информация' },
    ];
  }

  private getHindiTranslations(): Translation[] {
    return [
      { key: 'welcome', value: 'स्वागत है' },
      { key: 'login', value: 'लॉग इन' },
      { key: 'register', value: 'रजिस्टर' },
      { key: 'cart', value: 'कार्ट' },
      { key: 'wishlist', value: 'इच्छा सूची' },
      { key: 'search', value: 'खोजें' },
      { key: 'products', value: 'उत्पाद' },
      { key: 'price', value: 'मूल्य' },
      { key: 'quantity', value: 'मात्रा' },
      { key: 'add_to_cart', value: 'कार्ट में जोड़ें' },
      { key: 'buy_now', value: 'अभी खरीदें' },
      { key: 'out_of_stock', value: 'स्टॉक में नहीं' },
      { key: 'in_stock', value: 'स्टॉक में' },
      { key: 'free_shipping', value: 'मुफ्त शिपिंग' },
      { key: 'customer_reviews', value: 'ग्राहक समीक्षा' },
      { key: 'product_details', value: 'उत्पाद विवरण' },
      { key: 'shipping_info', value: 'शिपिंग जानकारी' },
      { key: 'returns', value: 'वापसी' },
      { key: 'help', value: 'सहायता' },
      { key: 'contact_us', value: 'हमसे संपर्क करें' },
      { key: 'about_us', value: 'हमारे बारे में' },
      { key: 'terms_conditions', value: 'नियम और शर्तें' },
      { key: 'privacy_policy', value: 'गोपनीयता नीति' },
      { key: 'order_placed', value: 'ऑर्डर सफलतापूर्वक दिया गया' },
      { key: 'payment_successful', value: 'भुगतान सफल' },
      { key: 'thank_you', value: 'धन्यवाद' },
      { key: 'items_count', value: '{count} आइटम', plural: '{count} आइटम्स' },
      { key: 'rating', value: 'रेटिंग' },
      { key: 'review', value: 'समीक्षा' },
      { key: 'reviews', value: 'समीक्षा' },
      { key: 'no_reviews', value: 'अभी तक कोई समीक्षा नहीं' },
      { key: 'write_review', value: 'समीक्षा लिखें' },
      { key: 'verified_purchase', value: 'सत्यापित खरीद' },
      { key: 'helpful', value: 'उपयोगी' },
      { key: 'report', value: 'रिपोर्ट' },
      { key: 'share', value: 'साझा करें' },
      { key: 'copy_link', value: 'लिंक कॉपी करें' },
      { key: 'email', value: 'ईमेल' },
      { key: 'password', value: 'पासवर्ड' },
      { key: 'confirm_password', value: 'पासवर्ड की पुष्टि करें' },
      { key: 'first_name', value: 'पहला नाम' },
      { key: 'last_name', value: 'अंतिम नाम' },
      { key: 'phone', value: 'फोन' },
      { key: 'address', value: 'पता' },
      { key: 'city', value: 'शहर' },
      { key: 'state', value: 'राज्य' },
      { key: 'zip_code', value: 'पिन कोड' },
      { key: 'country', value: 'देश' },
      { key: 'save', value: 'सहेजें' },
      { key: 'cancel', value: 'रद्द करें' },
      { key: 'delete', value: 'हटाएं' },
      { key: 'edit', value: 'संपादित करें' },
      { key: 'update', value: 'अपडेट करें' },
      { key: 'loading', value: 'लोड हो रहा है...' },
      { key: 'error', value: 'त्रुटि' },
      { key: 'success', value: 'सफलता' },
      { key: 'warning', value: 'चेतावनी' },
      { key: 'info', value: 'जानकारी' },
    ];
  }
}
