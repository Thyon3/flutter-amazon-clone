import 'package:flutter/material.dart';
import 'package:model_viewer/model_viewer.dart';
import 'package:flutter_amazon_clone_bloc/core/services/ar_service.dart';

class ARProductViewer extends StatefulWidget {
  final String productId;
  final String productName;
  final String? modelUrl;

  const ARProductViewer({
    super.key,
    required this.productId,
    required this.productName,
    this.modelUrl,
  });

  @override
  State<ARProductViewer> createState() => _ARProductViewerState();
}

class _ARProductViewerState extends State<ARProductViewer> {
  final ARService _arService = ARService();
  bool _isLoading = true;
  bool _isARSupported = false;
  bool _hasModel = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeAR();
  }

  Future<void> _initializeAR() async {
    try {
      await _arService.initialize();
      
      final hasModel = await _arService.hasProduct3DModel(widget.productId);
      final modelUrl = widget.modelUrl ?? _arService.getProduct3DModelUrl(widget.productId);
      
      setState(() {
        _isARSupported = _arService.isARSupported;
        _hasModel = hasModel;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to initialize AR: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading AR capabilities...'),
            ],
          ),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(
          title: Text('AR Preview - ${widget.productName}'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Colors.red,
                ),
                const SizedBox(height: 16),
                Text(
                  'Error',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(_errorMessage!),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Go Back'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!_isARSupported) {
      return _buildUnsupportedView();
    }

    if (!_hasModel) {
      return _buildNoModelView();
    }

    return _buildARViewer();
  }

  Widget _buildUnsupportedView() {
    return Scaffold(
      appBar: AppBar(
        title: Text('AR Preview - ${widget.productName}'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.view_in_ar,
                size: 64,
                color: Colors.grey,
              ),
              const SizedBox(height: 16),
              Text(
                'AR Not Supported',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text(
                'Your device doesn\'t support augmented reality features.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 24),
              const Text(
                'AR requires:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ..._arService.getARTroubleshootingTips().map((tip) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text('• $tip'),
              )),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoModelView() {
    return Scaffold(
      appBar: AppBar(
        title: Text('AR Preview - ${widget.productName}'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.view_in_ar_outlined,
                size: 64,
                color: Colors.orange,
              ),
              const SizedBox(height: 16),
              Text(
                '3D Model Not Available',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text(
                'This product doesn\'t have a 3D model available for AR preview yet.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildARViewer() {
    return Scaffold(
      appBar: AppBar(
        title: Text('AR Preview - ${widget.productName}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showInstructions(),
            tooltip: 'AR Instructions',
          ),
        ],
      ),
      body: Column(
        children: [
          // 3D Model Viewer
          Expanded(
            child: ModelViewer(
              src: widget.modelUrl ?? _arService.getProduct3DModelUrl(widget.productId),
              alt: '3D model of ${widget.productName}',
              ar: true,
              arModes: ['scene-viewer', 'webxr', 'quick-look'],
              autoRotate: true,
              cameraControls: true,
              backgroundColor: '#f0f0f0',
              iosSrc: widget.modelUrl?.replaceAll('.glb', '.usdz') ?? 
                       _arService.getProduct3DModelUrl(widget.productId).replaceAll('.glb', '.usdz'),
            ),
          ),
          // Controls and info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AR Controls',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                const Text('• Pinch to zoom'),
                const Text('• Drag to rotate'),
                const Text('• Tap to place in AR'),
                const SizedBox(height: 8),
                Text(
                  'Device: ${_arService.getARCapabilities()['platform']}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Close'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _showInstructions(),
                        child: const Text('Help'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showInstructions() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('AR Instructions'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('How to use AR preview:'),
              const SizedBox(height: 16),
              Text(_arService.getARInstructions()),
              const SizedBox(height: 16),
              const Text('Troubleshooting:', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ..._arService.getARTroubleshootingTips().map((tip) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text('• $tip'),
              )),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}
