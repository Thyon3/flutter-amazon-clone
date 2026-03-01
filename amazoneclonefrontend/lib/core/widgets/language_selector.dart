import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_amazon_clone_bloc/core/localization/locale_manager.dart';

class LanguageSelector extends StatelessWidget {
  const LanguageSelector({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleManager>(
      builder: (context, localeManager, child) {
        return PopupMenuButton<Locale>(
          icon: Icon(
            Icons.language,
            color: Theme.of(context).iconTheme.color,
          ),
          tooltip: 'Change Language',
          onSelected: (Locale locale) {
            localeManager.changeLocale(locale);
          },
          itemBuilder: (BuildContext context) {
            return localeManager.supportedLocales.map((Locale locale) {
              return PopupMenuItem<Locale>(
                value: locale,
                child: Row(
                  children: [
                    Text(
                      localeManager.getLanguageName(locale),
                      style: TextStyle(
                        fontWeight: localeManager.locale == locale
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                    if (localeManager.locale == locale) ...[
                      const Spacer(),
                      Icon(
                        Icons.check,
                        color: Theme.of(context).primaryColor,
                        size: 20,
                      ),
                    ],
                  ],
                ),
              );
            }).toList();
          },
        );
      },
    );
  }
}
