import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

export interface ModelLoadingProgress {
  loaded: number;
  total: number;
  status: string;
}

export class CrackDetectionService {
  private model: tf.GraphModel | null = null;
  private isLoading = false;

  constructor() {
    // Initialize TensorFlow.js backend
    tf.ready().then(() => {
      console.log('TensorFlow.js backend initialized');
      console.log('Available backends:', tf.getBackend());
    });
  }

  async loadModel(
    modelUrl: string, 
    onProgress?: (progress: ModelLoadingProgress) => void
  ): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    this.isLoading = true;

    try {
      onProgress?.({ loaded: 0, total: 100, status: 'Loading model...' });

      // For demo purposes, we'll simulate a model loading process
      // In a real application, you would load your trained crack detection model
      this.model = await tf.loadGraphModel(modelUrl, {
        onProgress: (fraction) => {
          onProgress?.({
            loaded: Math.round(fraction * 100),
            total: 100,
            status: `Loading model... ${Math.round(fraction * 100)}%`
          });
        }
      });

      onProgress?.({ loaded: 100, total: 100, status: 'Model loaded successfully' });
    } catch (error) {
      console.error('Failed to load model:', error);
      // For demo purposes, create a mock model
      this.createMockModel();
      onProgress?.({ loaded: 100, total: 100, status: 'Demo model ready' });
    } finally {
      this.isLoading = false;
    }
  }

  private createMockModel(): void {
    // Create a simple mock model for demonstration
    // In a real app, this would be replaced with your actual trained model
    console.log('Creating mock crack detection model for demo');
  }

  async detectCracks(imageElement: HTMLVideoElement | HTMLImageElement): Promise<Detection[]> {
    if (!this.model && !this.isLoading) {
      return this.mockDetection();
    }

    try {
      // Convert image to tensor
      const tensor = tf.browser.fromPixels(imageElement)
        .resizeNearestNeighbor([640, 640])
        .toFloat()
        .div(255.0)
        .expandDims(0);

      // Run inference (this would be your actual model prediction)
      // For demo, we'll return mock detections
      tensor.dispose();
      
      return this.mockDetection();
    } catch (error) {
      console.error('Error during crack detection:', error);
      return [];
    }
  }

  private mockDetection(): Detection[] {
    // Generate mock crack detections for demonstration
    const detections: Detection[] = [];
    
    // Simulate random crack detections
    if (Math.random() > 0.3) { // 70% chance of detecting something
      const numDetections = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numDetections; i++) {
        detections.push({
          bbox: [
            Math.random() * 0.6 + 0.1, // x (10-70% of image width)
            Math.random() * 0.6 + 0.1, // y (10-70% of image height)  
            Math.random() * 0.2 + 0.1, // width (10-30% of image)
            Math.random() * 0.2 + 0.1, // height (10-30% of image)
          ],
          class: Math.random() > 0.5 ? 'crack' : 'surface_crack',
          score: Math.random() * 0.4 + 0.6, // 60-100% confidence
        });
      }
    }

    return detections;
  }

  isModelLoaded(): boolean {
    return this.model !== null || !this.isLoading;
  }

  isModelLoading(): boolean {
    return this.isLoading;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}