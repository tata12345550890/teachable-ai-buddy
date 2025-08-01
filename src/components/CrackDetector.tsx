import { useState, useEffect, useCallback } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useTeachableMachine } from "@/hooks/useTeachableMachine";
import { Prediction } from "@/services/teachableMachineService";
import { PhotoUpload } from "./PhotoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Upload,
  Settings
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

  const {
    loadModel,
    predict,
    getMaxPredictions,
    isLoaded: isModelLoaded,
    isLoading: isModelLoading,
    loadingProgress,
    error: modelError
  } = useTeachableMachine();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [modelUrl, setModelUrl] = useState("https://teachablemachine.withgoogle.com/models/QVK-ZBGvn/");
  const [isConfiguring, setIsConfiguring] = useState(false);

  const [stats, setStats] = useState({
    totalPredictions: 0,
    highConfidencePredictions: 0,
    avgConfidence: 0,
    topPrediction: ''
  });

  // Load model on component mount
  useEffect(() => {
    const initializeModel = async () => {
      try {
        await loadModel({ modelUrl });
        toast.success("Teachable Machine model loaded successfully!");
      } catch (error) {
        console.error('Failed to load model:', error);
        toast.error('Failed to load model. Please check the URL.');
      }
    };

    if (modelUrl) {
      initializeModel();
    }
  }, [modelUrl, loadModel]);

  // Run detection loop for camera feed
  useEffect(() => {
    if (!isCameraActive || isPaused || !isModelLoaded) {
      return;
    }

    let animationFrame: number;
    
    const runDetection = async () => {
      if (videoRef.current && isDetecting) {
        try {
          const newPredictions = await predict(videoRef.current);
          setPredictions(newPredictions);
          
          // Update stats
          const totalPreds = newPredictions.length;
          const highConfPreds = newPredictions.filter(p => p.probability > 0.8).length;
          const avgConf = totalPreds > 0 
            ? newPredictions.reduce((sum, p) => sum + p.probability, 0) / totalPreds 
            : 0;
          const topPred = newPredictions.length > 0 
            ? newPredictions.sort((a, b) => b.probability - a.probability)[0].className
            : '';
          
          setStats({
            totalPredictions: totalPreds,
            highConfidencePredictions: highConfPreds,
            avgConfidence: avgConf,
            topPrediction: topPred
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
  }, [isCameraActive, isDetecting, isPaused, isModelLoaded, predict, videoRef]);

  const handleStartCamera = async () => {
    await startCamera();
    setIsDetecting(true);
  };

  const handleStopCamera = () => {
    stopCamera();
    setIsDetecting(false);
    setPredictions([]);
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
      link.download = `image-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Frame captured and downloaded");
    } else {
      toast.error("Failed to capture frame");
    }
  };

  const handleConfigSave = async () => {
    try {
      await loadModel({ modelUrl });
      setIsConfiguring(false);
      toast.success("Model configuration updated!");
    } catch (error) {
      toast.error("Failed to load model. Please check the URL.");
    }
  };

  const getConfidenceColor = (probability: number) => {
    if (probability > 0.8) return "bg-detection-confidence-high";
    if (probability > 0.6) return "bg-detection-confidence-medium";
    return "bg-detection-confidence-low";
  };

  const getStatusIcon = () => {
    if (isModelLoading && loadingProgress) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (predictions.length > 0 && predictions[0].probability > 0.7) {
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
            Teachable Machine Detector
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI-powered image classification using Google's Teachable Machine. 
            Analyze images in real-time or upload photos for classification.
          </p>
        </div>

        {/* Model Configuration */}
        {isConfiguring && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Model Configuration</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelUrl">Teachable Machine Model URL</Label>
                  <Input
                    id="modelUrl"
                    value={modelUrl}
                    onChange={(e) => setModelUrl(e.target.value)}
                    placeholder="https://teachablemachine.withgoogle.com/models/YOUR-MODEL/"
                    className="bg-input/50"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleConfigSave} disabled={isModelLoading}>
                    {isModelLoading ? 'Loading...' : 'Save Configuration'}
                  </Button>
                  <Button onClick={() => setIsConfiguring(false)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model Loading Progress */}
        {loadingProgress && loadingProgress.loaded < 100 && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{loadingProgress.status}</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress.loaded}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {loadingProgress.loaded}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Tabs */}
        <Tabs defaultValue="camera" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="camera">Live Camera</TabsTrigger>
              <TabsTrigger value="upload">Upload Photo</TabsTrigger>
            </TabsList>
            
            <Button 
              onClick={() => setIsConfiguring(!isConfiguring)}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Model
            </Button>
          </div>
          <TabsContent value="camera" className="space-y-6">
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
                          
                          {/* Predictions Overlay */}
                          <div className="absolute top-4 left-4 space-y-2">
                            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                              {getStatusIcon()}
                              <span className="text-white text-sm font-medium">
                                {isPaused ? 'PAUSED' : isDetecting ? 'DETECTING' : 'READY'}
                              </span>
                            </div>
                            
                            {predictions.length > 0 && predictions[0].probability > 0.5 && (
                              <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                                <div className="text-white text-sm font-medium">
                                  {predictions[0].className}
                                </div>
                                <div className="text-white/80 text-xs">
                                  {(predictions[0].probability * 100).toFixed(1)}% confidence
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center space-y-4">
                            <Camera className="h-16 w-16 mx-auto opacity-50" />
                            <div>
                              <p className="text-lg font-medium">Camera Feed</p>
                              <p className="text-sm">Start camera to begin real-time detection</p>
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
                      disabled={!!cameraError || !isModelLoaded}
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
                    <select 
                      value={selectedDeviceId} 
                      onChange={(e) => switchCamera(e.target.value)}
                      className="px-3 py-2 rounded-md border border-border bg-background text-foreground"
                    >
                      {devices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                        </option>
                      ))}
                    </select>
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
                        <span className="text-sm text-muted-foreground">Total Classes</span>
                        <Badge variant="outline">{isModelLoaded ? getMaxPredictions() : 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">High Confidence</span>
                        <Badge className="bg-detection-confidence-high text-white">
                          {stats.highConfidencePredictions}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Confidence</span>
                        <Badge variant="outline">
                          {(stats.avgConfidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      {stats.topPrediction && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Top Prediction</span>
                          <Badge className="bg-primary text-primary-foreground capitalize">
                            {stats.topPrediction}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Predictions */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      Live Predictions
                    </h3>
                    
                    {predictions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No predictions available
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {predictions
                          .sort((a, b) => b.probability - a.probability)
                          .slice(0, 5)
                          .map((prediction, index) => (
                            <div 
                              key={index}
                              className="p-3 rounded-lg bg-accent/50 border border-border/30"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">
                                  {prediction.className}
                                </span>
                                <Badge 
                                  className={`${getConfidenceColor(prediction.probability)} text-white text-xs`}
                                >
                                  {(prediction.probability * 100).toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div 
                                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${prediction.probability * 100}%` }}
                                />
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
                      <p>• Point camera at objects you want to classify</p>
                      <p>• Ensure good lighting for best results</p>
                      <p>• Keep camera steady for accurate predictions</p>
                      <p>• Higher confidence scores indicate more certain predictions</p>
                      <p>• Configure model URL to use your own Teachable Machine model</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload">
            <PhotoUpload 
              onPredict={predict}
              isModelLoaded={isModelLoaded}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};