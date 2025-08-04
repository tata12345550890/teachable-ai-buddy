import { useState, useCallback } from "react";
import { RoboflowService, RoboflowConfig, CrackDetectionResult } from "@/services/roboflowService";

export const useRoboflow = () => {
  const [service] = useState(() => new RoboflowService());
  const [isConfigured, setIsConfigured] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configure = useCallback((config: RoboflowConfig) => {
    try {
      service.setConfig(config);
      setIsConfigured(service.isConfigured());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to configure Roboflow';
      setError(errorMessage);
      setIsConfigured(false);
    }
  }, [service]);

  const detectCracks = useCallback(async (
    imageFile: File | Blob | string
  ): Promise<CrackDetectionResult> => {
    if (!isConfigured) {
      throw new Error('Roboflow not configured');
    }

    try {
      setIsDetecting(true);
      setError(null);
      
      const result = await service.detectCracks(imageFile);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Detection failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDetecting(false);
    }
  }, [service, isConfigured]);

  return {
    configure,
    detectCracks,
    isConfigured,
    isDetecting,
    error,
    service
  };
};