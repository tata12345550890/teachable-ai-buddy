import * as tmImage from '@teachablemachine/image';

export interface TeachableMachineConfig {
  modelUrl: string;
  metadataUrl?: string;
}

export interface Prediction {
  className: string;
  probability: number;
}

export interface ModelLoadingProgress {
  loaded: number;
  total: number;
  status: string;
}

export class TeachableMachineService {
  private model: tmImage.CustomMobileNet | null = null;
  private isLoading = false;
  private maxPredictions = 0;

  async loadModel(
    config: TeachableMachineConfig,
    onProgress?: (progress: ModelLoadingProgress) => void
  ): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    this.isLoading = true;

    try {
      onProgress?.({ loaded: 0, total: 100, status: 'Loading Teachable Machine model...' });

      // Construct URLs
      const modelURL = config.modelUrl.endsWith('/') 
        ? config.modelUrl + 'model.json' 
        : config.modelUrl + '/model.json';
      const metadataURL = config.metadataUrl || 
        (config.modelUrl.endsWith('/') 
          ? config.modelUrl + 'metadata.json' 
          : config.modelUrl + '/metadata.json');

      // Load the model and metadata
      this.model = await tmImage.load(modelURL, metadataURL);
      this.maxPredictions = this.model.getTotalClasses();

      onProgress?.({ loaded: 100, total: 100, status: 'Model loaded successfully' });
    } catch (error) {
      console.error('Failed to load Teachable Machine model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async predict(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<Prediction[]> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    try {
      const predictions = await this.model.predict(imageElement);
      return predictions.map(pred => ({
        className: pred.className,
        probability: pred.probability
      }));
    } catch (error) {
      console.error('Error during prediction:', error);
      throw error;
    }
  }

  getMaxPredictions(): number {
    return this.maxPredictions;
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
}