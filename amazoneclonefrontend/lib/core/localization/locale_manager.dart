import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocaleManager extends ChangeNotifier {
  static const String _localeKey = 'locale';
  Locale _locale = const Locale('en');

  Locale get locale => _locale;

  List<Locale> get supportedLocales => [
    const Locale('en'), // English
    const Locale('es'), // Spanish
    const Locale('fr'), // French
    const Locale('de'), // German
  ];

  Map<String, String> get localeNames => {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
  };

  LocaleManager() {
    _loadLocale();
  }

  Future<void> _loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final savedLocale = prefs.getString(_localeKey);
    
    if (savedLocale != null) {
      _locale = Locale(savedLocale);
      notifyListeners();
    }
  }

  Future<void> changeLocale(Locale locale) async {
    if (!supportedLocales.contains(locale)) return;
    
    _locale = locale;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localeKey, locale.languageCode);
    
    notifyListeners();
  }

  String getLanguageName(Locale locale) {
    return localeNames[locale.languageCode] ?? locale.languageCode.toUpperCase();
  }

  String getCurrentLanguageName() {
    return getLanguageName(_locale);
  }
}
