export interface RoboflowConfig {
  apiKey: string;
  modelEndpoint: string; // format: "workspace/project/version"
  threshold?: number;
}

export interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  points?: Array<{x: number, y: number}>; // For instance segmentation
}

export interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image: {
    width: number;
    height: number;
  };
}

export interface CrackDetectionResult {
  hasCracks: boolean;
  predictions: RoboflowPrediction[];
  confidence: number;
  totalCracks: number;
}

export class RoboflowService {
  private config: RoboflowConfig | null = null;

  setConfig(config: RoboflowConfig): void {
    this.config = config;
  }

  async detectCracks(
    imageFile: File | Blob | string
  ): Promise<CrackDetectionResult> {
    if (!this.config) {
      throw new Error('Roboflow configuration not set');
    }

    try {
      const formData = new FormData();
      
      if (typeof imageFile === 'string') {
        // Handle base64 data URL
        const response = await fetch(imageFile);
        const blob = await response.blob();
        formData.append('file', blob, 'image.jpg');
      } else {
        formData.append('file', imageFile);
      }

      const apiUrl = `https://detect.roboflow.com/${this.config.modelEndpoint}`;
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        confidence: (this.config.threshold || 0.5).toString(),
        format: 'json',
        stroke: '5',
        labels: 'true'
      });

      const response = await fetch(`${apiUrl}?${params}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Roboflow API error: ${response.status} ${response.statusText}`);
      }

      const result: RoboflowResponse = await response.json();
      
      const crackPredictions = result.predictions.filter(
        prediction => prediction.class.toLowerCase().includes('crack')
      );

      const hasCracks = crackPredictions.length > 0;
      const confidence = hasCracks 
        ? Math.max(...crackPredictions.map(p => p.confidence))
        : 0;

      return {
        hasCracks,
        predictions: crackPredictions,
        confidence,
        totalCracks: crackPredictions.length
      };
    } catch (error) {
      console.error('Roboflow detection error:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.config !== null && 
           !!this.config.apiKey && 
           !!this.config.modelEndpoint;
  }
}