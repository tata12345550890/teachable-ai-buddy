import { useState, useEffect, useCallback } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useTensorFlow } from "@/hooks/useTensorFlow";
import { useRoboflow } from "@/hooks/useRoboflow";
import { CrackPrediction } from "@/services/tensorflowService";
import { TensorFlowPhotoUpload } from "./TensorFlowPhotoUpload";
import { RoboflowPhotoUpload } from "./RoboflowPhotoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Settings,
  ChevronDown
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
    isLoaded: isModelLoaded,
    isLoading: isModelLoading,
    loadingProgress,
    error: modelError
  } = useTensorFlow();

  const {
    configure: configureRoboflow,
    detectCracks,
    isConfigured: isRoboflowConfigured,
    isDetecting: isRoboflowDetecting,
    error: roboflowError
  } = useRoboflow();

  // AI Model selection
  const [selectedAI, setSelectedAI] = useState<"tensorflow" | "roboflow">("tensorflow");

  const [prediction, setPrediction] = useState<CrackPrediction | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // TensorFlow Configuration
  const [modelUrl, setModelUrl] = useState("");
  const [inputShape, setInputShape] = useState([1, 128, 128, 3]);
  const [threshold, setThreshold] = useState(0.5);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Roboflow Configuration
  const [roboflowApiKey, setRoboflowApiKey] = useState("Ao2SRjCDmSKganFBnK3u");
  const [roboflowEndpoint, setRoboflowEndpoint] = useState("apex-crackai/2");
  const [roboflowThreshold, setRoboflowThreshold] = useState(0.4);
  const [isRoboflowConfiguring, setIsRoboflowConfiguring] = useState(false);

  const [stats, setStats] = useState({
    totalDetections: 0,
    cracksDetected: 0,
    avgConfidence: 0,
    lastDetection: ''
  });

  // Load TensorFlow model when configuration changes
  useEffect(() => {
    const initializeModel = async () => {
      if (!modelUrl.trim() || selectedAI !== "tensorflow") return;
      
      try {
        await loadModel({ 
          modelUrl: modelUrl.trim(),
          inputShape: inputShape as [number, number, number, number],
          threshold
        });
        toast.success("TensorFlow.js model loaded successfully!");
      } catch (error) {
        console.error('Failed to load model:', error);
        toast.error('Failed to load model. Please check the URL.');
      }
    };

    if (modelUrl && selectedAI === "tensorflow") {
      initializeModel();
    }
  }, [modelUrl, inputShape, threshold, loadModel, selectedAI]);

  // Configure Roboflow when settings change
  useEffect(() => {
    if (selectedAI === "roboflow" && roboflowApiKey && roboflowEndpoint) {
      configureRoboflow({
        apiKey: roboflowApiKey,
        modelEndpoint: roboflowEndpoint,
        threshold: roboflowThreshold
      });
    }
  }, [roboflowApiKey, roboflowEndpoint, roboflowThreshold, selectedAI, configureRoboflow]);

  // Run detection loop for camera feed (TensorFlow only)
  useEffect(() => {
    if (!isCameraActive || isPaused || selectedAI !== "tensorflow" || !isModelLoaded) {
      return;
    }

    let animationFrame: number;
    
    const runDetection = async () => {
      if (videoRef.current && isDetecting) {
        try {
          const newPrediction = await predict(videoRef.current);
          setPrediction(newPrediction);
          
          // Update stats
          setStats(prev => ({
            totalDetections: prev.totalDetections + 1,
            cracksDetected: prev.cracksDetected + (newPrediction.classification === 'Crack' ? 1 : 0),
            avgConfidence: (prev.avgConfidence * prev.totalDetections + newPrediction.confidence) / (prev.totalDetections + 1),
            lastDetection: newPrediction.classification
          }));
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
  }, [isCameraActive, isDetecting, isPaused, isModelLoaded, predict, videoRef, selectedAI]);

  const handleStartCamera = async () => {
    await startCamera();
    if (selectedAI === "tensorflow") {
      setIsDetecting(true);
    }
  };

  const handleStopCamera = () => {
    stopCamera();
    setIsDetecting(false);
    setPrediction(null);
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
      link.download = `crack-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
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
    if (!modelUrl.trim()) {
      toast.error("Please enter a model URL");
      return;
    }

    try {
      await loadModel({ 
        modelUrl: modelUrl.trim(),
        inputShape: inputShape as [number, number, number, number],
        threshold
      });
      setIsConfiguring(false);
      toast.success("TensorFlow model configuration updated!");
    } catch (error) {
      toast.error("Failed to load model. Please check the URL.");
    }
  };

  const handleRoboflowConfigSave = () => {
    if (!roboflowApiKey.trim() || !roboflowEndpoint.trim()) {
      toast.error("Please enter API key and model endpoint");
      return;
    }

    configureRoboflow({
      apiKey: roboflowApiKey.trim(),
      modelEndpoint: roboflowEndpoint.trim(),
      threshold: roboflowThreshold
    });
    setIsRoboflowConfiguring(false);
    toast.success("Roboflow configuration saved!");
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return "bg-detection-confidence-high";
    if (confidence > 0.6) return "bg-detection-confidence-medium";
    return "bg-detection-confidence-low";
  };

  const getStatusIcon = () => {
    if (selectedAI === "tensorflow" && isModelLoading && loadingProgress) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (prediction && prediction.classification === 'Crack' && prediction.confidence > 0.7) {
      return <AlertTriangle className="h-4 w-4 text-detection-highlight" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-detection-confidence-high" />;
  };

  const isCurrentModelReady = () => {
    if (selectedAI === "tensorflow") return isModelLoaded;
    if (selectedAI === "roboflow") return isRoboflowConfigured;
    return false;
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
            AI-Powered Crack Detector
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI-powered crack detection using TensorFlow.js and Roboflow. 
            Analyze images in real-time or upload photos for crack detection.
          </p>
        </div>

        {/* AI Model Selection */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>AI Model Selection</CardTitle>
            <CardDescription>Choose which AI service to use for crack detection</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedAI} onValueChange={(value) => setSelectedAI(value as "tensorflow" | "roboflow")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tensorflow">TensorFlow.js</TabsTrigger>
                <TabsTrigger value="roboflow">Roboflow AI</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* TensorFlow Configuration */}
        {selectedAI === "tensorflow" && (
          <Collapsible open={isConfiguring} onOpenChange={setIsConfiguring}>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        TensorFlow Model Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure your custom TensorFlow.js model settings
                      </CardDescription>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isConfiguring ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="modelUrl">Model URL</Label>
                    <Input
                      id="modelUrl"
                      type="url"
                      placeholder="https://example.com/model.json"
                      value={modelUrl}
                      onChange={(e) => setModelUrl(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inputHeight">Input Height</Label>
                      <Input
                        id="inputHeight"
                        type="number"
                        min="32"
                        max="1024"
                        step="32"
                        value={inputShape[1]}
                        onChange={(e) => setInputShape([1, Number(e.target.value), inputShape[2], 3])}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inputWidth">Input Width</Label>
                      <Input
                        id="inputWidth"
                        type="number"
                        min="32"
                        max="1024"
                        step="32"
                        value={inputShape[2]}
                        onChange={(e) => setInputShape([1, inputShape[1], Number(e.target.value), 3])}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="threshold">Detection Threshold: {threshold}</Label>
                    <Input
                      id="threshold"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <Button onClick={handleConfigSave} className="w-full" disabled={isModelLoading}>
                    {isModelLoading ? 'Loading...' : 'Save Configuration'}
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Roboflow Configuration */}
        {selectedAI === "roboflow" && (
          <Collapsible open={isRoboflowConfiguring} onOpenChange={setIsRoboflowConfiguring}>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Roboflow API Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure your Roboflow API settings for crack detection
                      </CardDescription>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isRoboflowConfiguring ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roboflowApiKey">API Key</Label>
                    <Input
                      id="roboflowApiKey"
                      type="password"
                      placeholder="Your Roboflow API key"
                      value={roboflowApiKey}
                      onChange={(e) => setRoboflowApiKey(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="roboflowEndpoint">Model Endpoint</Label>
                    <Input
                      id="roboflowEndpoint"
                      placeholder="workspace/project/version"
                      value={roboflowEndpoint}
                      onChange={(e) => setRoboflowEndpoint(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Format: workspace/project/version (e.g., "my-workspace/crack-detection/1")
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roboflowThreshold">Detection Threshold: {roboflowThreshold}</Label>
                    <Input
                      id="roboflowThreshold"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={roboflowThreshold}
                      onChange={(e) => setRoboflowThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <Button onClick={handleRoboflowConfigSave} className="w-full">
                    Save Configuration
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Model Loading Progress */}
        {selectedAI === "tensorflow" && isModelLoading && loadingProgress && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading TensorFlow Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{loadingProgress.status}</span>
                  <span>{Math.round((loadingProgress.loaded / loadingProgress.total) * 100)}%</span>
                </div>
                <Progress value={(loadingProgress.loaded / loadingProgress.total) * 100} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Tabs */}
        <Tabs defaultValue="camera" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
            <TabsTrigger value="camera">Live Camera</TabsTrigger>
            <TabsTrigger value="upload">Upload Photo</TabsTrigger>
          </TabsList>
          
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
                          
                          {/* Predictions Overlay - Only for TensorFlow */}
                          {selectedAI === "tensorflow" && (
                            <div className="absolute top-4 left-4 space-y-2">
                              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                                {getStatusIcon()}
                                <span className="text-white text-sm font-medium">
                                  {isPaused ? 'PAUSED' : isDetecting ? 'DETECTING' : 'READY'}
                                </span>
                              </div>
                              
                              {prediction && prediction.confidence > 0.5 && (
                                <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                                  <div className="text-white text-sm font-medium">
                                    {prediction.classification}
                                  </div>
                                  <div className="text-white/80 text-xs">
                                    {(prediction.confidence * 100).toFixed(1)}% confidence
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Roboflow Status */}
                          {selectedAI === "roboflow" && (
                            <div className="absolute top-4 left-4">
                              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                                <Camera className="h-4 w-4 text-white" />
                                <span className="text-white text-sm font-medium">
                                  Roboflow Ready - Use Upload Tab
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center space-y-4">
                            <Camera className="h-16 w-16 mx-auto opacity-50" />
                            <div>
                              <p className="text-lg font-medium">Camera Feed</p>
                              <p className="text-sm">
                                {selectedAI === "tensorflow" 
                                  ? "Start camera to begin real-time crack detection" 
                                  : "Camera preview (Roboflow uses upload mode)"}
                              </p>
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
                      disabled={!!cameraError || !isCurrentModelReady()}
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
                      
                      {selectedAI === "tensorflow" && (
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
                      )}
                      
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

              {/* Detection Panel - Only for TensorFlow */}
              {selectedAI === "tensorflow" && (
                <div className="space-y-4">
                  {/* Stats Card */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Detection Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">{stats.totalDetections}</div>
                          <div className="text-sm text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-detection-highlight">{stats.cracksDetected}</div>
                          <div className="text-sm text-muted-foreground">Cracks</div>
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">
                          {stats.avgConfidence > 0 ? `${(stats.avgConfidence * 100).toFixed(1)}%` : '0%'}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Confidence</div>
                      </div>

                      {stats.lastDetection && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Last Detection</div>
                          <div className="font-medium">{stats.lastDetection}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Current Prediction */}
                  {prediction && (
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getStatusIcon()}
                          Current Prediction
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Classification:</span>
                          <Badge variant={prediction.classification === 'Crack' ? 'destructive' : 'secondary'}>
                            {prediction.classification}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Confidence:</span>
                          <span className={`font-bold ${getConfidenceColor(prediction.confidence)}`}>
                            {(prediction.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Probability:</span>
                          <span>{(prediction.probability * 100).toFixed(2)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Instructions */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Instructions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>• Configure your TensorFlow.js model first</p>
                      <p>• Allow camera access when prompted</p>
                      <p>• Point camera at surfaces to detect cracks</p>
                      <p>• Use pause/resume to control detection</p>
                      <p>• Capture frames to save analysis results</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Roboflow Info Panel */}
              {selectedAI === "roboflow" && (
                <div className="space-y-4">
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Roboflow Detection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Status:</span>
                        <Badge variant={isRoboflowConfigured ? 'default' : 'secondary'}>
                          {isRoboflowConfigured ? 'Configured' : 'Not Configured'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Roboflow detection works with uploaded images. 
                        Use the "Upload Photo" tab to analyze images with bounding box detection.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload">
            {selectedAI === "tensorflow" ? (
              <TensorFlowPhotoUpload 
                onPredict={predict}
                isModelLoaded={isModelLoaded}
              />
            ) : (
              <RoboflowPhotoUpload 
                onDetect={detectCracks}
                isConfigured={isRoboflowConfigured}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};