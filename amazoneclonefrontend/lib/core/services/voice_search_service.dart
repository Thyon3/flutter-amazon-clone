import 'package:speech_to_text/speech_to_text.dart';

class VoiceSearchService {
  static final VoiceSearchService _instance = VoiceSearchService._internal();
  factory VoiceSearchService() => _instance;
  VoiceSearchService._internal();

  final SpeechToText _speechToText = SpeechToText();
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;
  bool get isAvailable => _speechToText.isAvailable;

  Future<bool> initialize() async {
    if (_isInitialized) return true;

    try {
      _isInitialized = await _speechToText.initialize(
        onError: (error) {
          print('Speech recognition error: $error');
        },
        onStatus: (status) {
          print('Speech recognition status: $status');
        },
      );
      return _isInitialized;
    } catch (e) {
      print('Failed to initialize speech recognition: $e');
      return false;
    }
  }

  Future<bool> startListening({
    required Function(String) onResult,
    required Function(String) onError,
    Duration? listenFor,
  }) async {
    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) {
        onError('Speech recognition not available');
        return false;
      }
    }

    if (!_speechToText.isAvailable) {
      onError('Speech recognition not available on this device');
      return false;
    }

    try {
      await _speechToText.listen(
        onResult: (result) {
          final words = result.recognizedWords;
          onResult(words);
        },
        listenFor: listenFor ?? const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
        localeId: 'en_US',
        cancelOnError: true,
        listenMode: ListenMode.confirmation,
      );
      return true;
    } catch (e) {
      onError('Failed to start listening: $e');
      return false;
    }
  }

  Future<void> stopListening() async {
    try {
      await _speechToText.stop();
    } catch (e) {
      print('Error stopping speech recognition: $e');
    }
  }

  Future<void> cancelListening() async {
    try {
      await _speechToText.cancel();
    } catch (e) {
      print('Error canceling speech recognition: $e');
    }
  }

  String get lastWords => _speechToText.lastRecognizedWords;
  bool get isListening => _speechToText.isListening;

  void dispose() {
    _speechToText.stop();
  }
}
