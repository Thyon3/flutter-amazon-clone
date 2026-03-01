import 'package:flutter/material.dart';
import 'package:flutter_amazon_clone_bloc/core/services/voice_search_service.dart';

class VoiceSearchButton extends StatefulWidget {
  final Function(String) onVoiceResult;
  final Function(String)? onError;

  const VoiceSearchButton({
    super.key,
    required this.onVoiceResult,
    this.onError,
  });

  @override
  State<VoiceSearchButton> createState() => _VoiceSearchButtonState();
}

class _VoiceSearchButtonState extends State<VoiceSearchButton>
    with TickerProviderStateMixin {
  final VoiceSearchService _voiceService = VoiceSearchService();
  bool _isListening = false;
  bool _isProcessing = false;
  String _lastWords = '';
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _pulseController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _pulseController.reverse();
      } else if (status == AnimationStatus.dismissed) {
        _pulseController.forward();
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _voiceService.dispose();
    super.dispose();
  }

  Future<void> _toggleListening() async {
    if (_isListening) {
      await _stopListening();
    } else {
      await _startListening();
    }
  }

  Future<void> _startListening() async {
    setState(() {
      _isProcessing = true;
    });

    final success = await _voiceService.startListening(
      onResult: (result) {
        setState(() {
          _lastWords = result;
        });
      },
      onError: (error) {
        setState(() {
          _isListening = false;
          _isProcessing = false;
        });
        _pulseController.stop();
        widget.onError?.call(error);
        _showErrorSnackBar(error);
      },
      listenFor: const Duration(seconds: 10),
    );

    if (success) {
      setState(() {
        _isListening = true;
        _isProcessing = false;
      });
      _pulseController.repeat();
    } else {
      setState(() {
        _isProcessing = false;
      });
      widget.onError?.call('Failed to start voice recognition');
    }
  }

  Future<void> _stopListening() async {
    await _voiceService.stopListening();
    setState(() {
      _isListening = false;
    });
    _pulseController.stop();

    if (_lastWords.isNotEmpty) {
      widget.onVoiceResult(_lastWords);
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _isListening ? _pulseAnimation.value : 1.0,
          child: IconButton(
            icon: _isProcessing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Icon(
                    _isListening ? Icons.mic : Icons.mic_none,
                    color: _isListening ? Colors.red : Colors.white,
                  ),
            onPressed: _isProcessing ? null : _toggleListening,
            tooltip: _isListening ? 'Stop listening' : 'Voice search',
          ),
        );
      },
    );
  }
}
