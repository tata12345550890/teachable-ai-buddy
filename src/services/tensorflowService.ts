import * as tf from '@tensorflow/tfjs';

export interface TensorFlowConfig {
  modelUrl: string;
  inputShape: [number, number, number, number]; // [batch, height, width, channels]
  threshold?: number;
}

export interface CrackPrediction {
  probability: number;
  classification: 'Crack' | 'No Crack';
  confidence: number;
}

export interface ModelLoadingProgress {
  loaded: number;
  total: number;
  status: string;
}

export class TensorFlowService {
  private model: tf.LayersModel | null = null;
  private isLoading = false;
  private config: TensorFlowConfig | null = null;

  async loadModel(
    config: TensorFlowConfig,
    onProgress?: (progress: ModelLoadingProgress) => void
  ): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    this.isLoading = true;
    this.config = config;

    try {
      onProgress?.({ loaded: 0, total: 100, status: 'Loading TensorFlow.js model...' });

      // Load the model
      this.model = await tf.loadLayersModel(config.modelUrl);
      
      onProgress?.({ loaded: 100, total: 100, status: 'Model loaded successfully' });
      console.log('TensorFlow.js model loaded successfully');
    } catch (error) {
      console.error('Failed to load TensorFlow.js model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  preprocessImage(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): tf.Tensor {
    if (!this.config) {
      throw new Error('Model config not set');
    }

    const [, height, width] = this.config.inputShape;
    
    return tf.browser.fromPixels(imageElement)
      .resizeBilinear([height, width])
      .toFloat()
      .div(tf.scalar(255.0))
      .expandDims(0);
  }

  async predict(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<CrackPrediction> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    if (!this.config) {
      throw new Error('Model config not set');
    }

    let imageTensor: tf.Tensor | null = null;
    let predictionTensor: tf.Tensor | null = null;

    try {
      // Preprocess the image
      imageTensor = this.preprocessImage(imageElement);
      
      // Make prediction
      predictionTensor = this.model.predict(imageTensor) as tf.Tensor;
      const predictionData = await predictionTensor.data();
      const probability = predictionData[0];
      
      const threshold = this.config.threshold || 0.5;
      const classification = probability > threshold ? 'Crack' : 'No Crack';
      const confidence = classification === 'Crack' ? probability : 1 - probability;

      return {
        probability,
        classification,
        confidence
      };
    } catch (error) {
      console.error('Error during prediction:', error);
      throw error;
    } finally {
      // Clean up tensors
      imageTensor?.dispose();
      predictionTensor?.dispose();
    }
  }

  isModelLoaded(): boolean {
    return this.model !== null;
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

  getMemoryInfo(): any {
    return tf.memory();
  }
}