import { useState, useCallback } from "react";
import { TeachableMachineService, TeachableMachineConfig, Prediction, ModelLoadingProgress } from "@/services/teachableMachineService";

export const useTeachableMachine = () => {
  const [service] = useState(() => new TeachableMachineService());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<ModelLoadingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async (config: TeachableMachineConfig) => {
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
  ): Promise<Prediction[]> => {
    if (!isLoaded) {
      throw new Error('Model not loaded');
    }
    
    return service.predict(imageElement);
  }, [service, isLoaded]);

  const getMaxPredictions = useCallback(() => {
    return service.getMaxPredictions();
  }, [service]);

  return {
    loadModel,
    predict,
    getMaxPredictions,
    isLoaded,
    isLoading,
    loadingProgress,
    error,
    service
  };
};