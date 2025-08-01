import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface CameraError {
  name: string;
  message: string;
}

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const getDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length > 0 && !selectedDeviceId) {
        // Prefer back camera on mobile devices
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting devices:', err);
    }
  };

  const startCamera = async (deviceId?: string) => {
    try {
      setError(null);
      
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId || selectedDeviceId,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: deviceId || selectedDeviceId ? undefined : { ideal: 'environment' }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsActive(true);
          toast.success("Camera started successfully");
        };
      }
      
      await getDevices();
    } catch (err) {
      const error = err as Error;
      console.error('Error starting camera:', error);
      
      let errorMessage = "Failed to access camera";
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera access denied. Please allow camera permissions.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found on this device.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is already in use by another application.";
      }
      
      setError({ name: error.name, message: errorMessage });
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    toast.success("Camera stopped");
  };

  const switchCamera = async (deviceId: string) => {
    if (isActive) {
      stopCamera();
    }
    setSelectedDeviceId(deviceId);
    await startCamera(deviceId);
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !isActive) return null;

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/png');
    }
    
    return null;
  };

  useEffect(() => {
    getDevices();
    
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, []);

  return {
    videoRef,
    isActive,
    error,
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame
  };
};