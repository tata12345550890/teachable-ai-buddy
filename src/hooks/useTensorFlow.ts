import { useState, useCallback } from "react";
import { TensorFlowService, TensorFlowConfig, CrackPrediction, ModelLoadingProgress } from "@/services/tensorflowService";

export const useTensorFlow = () => {
  const [service] = useState(() => new TensorFlowService());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<ModelLoadingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async (config: TensorFlowConfig) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await service.loadModel(config, (progress) => {
        setLoadingProgress(progress);
      });
      
      setIsLoaded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load model';
      setError(errorMessage);
      console.error('Model loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const predict = useCallback(async (
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<CrackPrediction> => {
    if (!isLoaded) {
      throw new Error('Model not loaded');
    }
    
    return service.predict(imageElement);
  }, [service, isLoaded]);

  const getMemoryInfo = useCallback(() => {
    return service.getMemoryInfo();
  }, [service]);

  return {
    loadModel,
    predict,
    getMemoryInfo,
    isLoaded,
    isLoading,
    loadingProgress,
    error,
    service
  };
};