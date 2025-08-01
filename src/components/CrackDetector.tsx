import { useState, useEffect, useCallback } from "react";
import { useCamera } from "@/hooks/useCamera";
import { CrackDetectionService, Detection, ModelLoadingProgress } from "@/services/crackDetectionService";
import { CanvasOverlay } from "./CanvasOverlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Camera, 
  CameraOff, 
  Pause, 
  Play, 
  Download, 
  SwitchCamera,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export const CrackDetector = () => {
  const {
    videoRef,
    isActive: isCameraActive,
    error: cameraError,
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame
  } = useCamera();

  const [detectionService] = useState(() => new CrackDetectionService());
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [modelProgress, setModelProgress] = useState<ModelLoadingProgress | null>(null);
  const [stats, setStats] = useState({
    totalDetections: 0,
    highConfidenceDetections: 0,
    avgConfidence: 0
  });

  // Load model on component mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        // In a real application, replace this with your actual model URL
        const modelUrl = '/models/crack-detection/model.json';
        await detectionService.loadModel(modelUrl, setModelProgress);
      } catch (error) {
        console.error('Failed to load model:', error);
        toast.error('Failed to load AI model. Using demo mode.');
      }
    };

    loadModel();

    return () => {
      detectionService.dispose();
    };
  }, [detectionService]);

  // Run detection loop
  useEffect(() => {
    if (!isCameraActive || isPaused || !detectionService.isModelLoaded()) {
      return;
    }

    let animationFrame: number;
    
    const runDetection = async () => {
      if (videoRef.current && isDetecting) {
        try {
          const newDetections = await detectionService.detectCracks(videoRef.current);
          setDetections(newDetections);
          
          // Update stats
          const totalDets = newDetections.length;
          const highConfDets = newDetections.filter(d => d.score > 0.8).length;
          const avgConf = totalDets > 0 
            ? newDetections.reduce((sum, d) => sum + d.score, 0) / totalDets 
            : 0;
          
          setStats({
            totalDetections: totalDets,
            highConfidenceDetections: highConfDets,
            avgConfidence: avgConf
          });
        } catch (error) {
          console.error('Detection error:', error);
        }
      }
      
      animationFrame = requestAnimationFrame(runDetection);
    };

    animationFrame = requestAnimationFrame(runDetection);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isCameraActive, isDetecting, isPaused, detectionService, videoRef]);

  const handleStartCamera = async () => {
    await startCamera();
    setIsDetecting(true);
  };

  const handleStopCamera = () => {
    stopCamera();
    setIsDetecting(false);
    setDetections([]);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      toast.success("Detection paused");
    } else {
      toast.success("Detection resumed");
    }
  };

  const handleCapture = () => {
    const imageData = captureFrame();
    if (imageData) {
      // Create download link
      const link = document.createElement('a');
      link.download = `crack-detection-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Frame captured and downloaded");
    } else {
      toast.error("Failed to capture frame");
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score > 0.8) return "bg-detection-confidence-high";
    if (score > 0.6) return "bg-detection-confidence-medium";
    return "bg-detection-confidence-low";
  };

  const getStatusIcon = () => {
    if (!detectionService.isModelLoaded() && modelProgress) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (detections.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-detection-highlight" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-detection-confidence-high" />;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-primary to-primary-glow">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Surface Crack Detector
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real-time AI-powered crack detection using your device camera. 
            Detects surface cracks with confidence scoring and precise bounding boxes.
          </p>
        </div>

        {/* Model Loading Progress */}
        {modelProgress && modelProgress.loaded < 100 && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{modelProgress.status}</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-300"
                      style={{ width: `${modelProgress.loaded}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {modelProgress.loaded}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {isCameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <CanvasOverlay 
                        detections={detections}
                        videoRef={videoRef}
                        isActive={isCameraActive && !isPaused}
                      />
                      
                      {/* Detection Status Overlay */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                          {getStatusIcon()}
                          <span className="text-white text-sm font-medium">
                            {isPaused ? 'PAUSED' : isDetecting ? 'DETECTING' : 'READY'}
                          </span>
                        </div>
                        
                        {detections.length > 0 && (
                          <Badge variant="destructive" className="bg-detection-highlight">
                            {detections.length} crack{detections.length !== 1 ? 's' : ''} detected
                          </Badge>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center space-y-4">
                        <Camera className="h-16 w-16 mx-auto opacity-50" />
                        <div>
                          <p className="text-lg font-medium">Camera Feed</p>
                          <p className="text-sm">Start camera to begin crack detection</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Camera Controls */}
            <div className="flex flex-wrap gap-3">
              {!isCameraActive ? (
                <Button 
                  onClick={handleStartCamera}
                  disabled={!!cameraError}
                  className="bg-gradient-to-r from-primary to-primary-glow hover:scale-105 transition-transform"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button onClick={handleStopCamera} variant="outline">
                    <CameraOff className="h-4 w-4 mr-2" />
                    Stop Camera
                  </Button>
                  
                  <Button onClick={handlePauseResume} variant="outline">
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                  
                  <Button onClick={handleCapture} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </>
              )}

              {devices.length > 1 && (
                <Select value={selectedDeviceId} onValueChange={switchCamera}>
                  <SelectTrigger className="w-48">
                    <SwitchCamera className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {cameraError && (
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h3 className="font-medium text-destructive">Camera Error</h3>
                      <p className="text-sm text-destructive/80 mt-1">{cameraError.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Detection Panel */}
          <div className="space-y-4">
            {/* Stats Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Detection Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Detections</span>
                    <Badge variant="outline">{stats.totalDetections}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">High Confidence</span>
                    <Badge className="bg-detection-confidence-high text-white">
                      {stats.highConfidenceDetections}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Confidence</span>
                    <Badge variant="outline">
                      {(stats.avgConfidence * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Detections */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-detection-highlight" />
                  Active Detections
                </h3>
                
                {detections.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No cracks detected
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detections.map((detection, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-lg bg-accent/50 border border-border/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">
                            {detection.class.replace('_', ' ')}
                          </span>
                          <Badge 
                            className={`${getConfidenceColor(detection.score)} text-white text-xs`}
                          >
                            {(detection.score * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Position: ({(detection.bbox[0] * 100).toFixed(1)}%, {(detection.bbox[1] * 100).toFixed(1)}%)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Size: {(detection.bbox[2] * 100).toFixed(1)}% × {(detection.bbox[3] * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="font-medium mb-4">Instructions</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Point camera at concrete, asphalt, or other surfaces</p>
                  <p>• Ensure good lighting for best detection results</p>
                  <p>• Keep camera steady for accurate measurements</p>
                  <p>• Red boxes indicate detected surface cracks</p>
                  <p>• Higher confidence scores indicate more certain detections</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};