import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Trash2, Eye, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CrackDetectionResult } from "@/services/roboflowService";

interface RoboflowPhotoUploadProps {
  onDetect: (imageFile: File) => Promise<CrackDetectionResult>;
  isConfigured: boolean;
}

export const RoboflowPhotoUpload: React.FC<RoboflowPhotoUploadProps> = ({
  onDetect,
  isConfigured
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<CrackDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setDetectionResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const analyzeImage = async () => {
    if (!selectedImage || !isConfigured) return;

    try {
      setIsAnalyzing(true);
      const result = await onDetect(selectedImage);
      setDetectionResult(result);
      
      // Draw segmentation masks on canvas
      if (result.predictions.length > 0 && imagePreview) {
        drawSegmentationMasks(result);
      }

      toast({
        title: "Analysis Complete",
        description: result.hasCracks 
          ? `Found ${result.totalCracks} crack(s) with ${Math.round(result.confidence * 100)}% confidence`
          : "No cracks detected",
        variant: result.hasCracks ? "destructive" : "default"
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const drawSegmentationMasks = (result: CrackDetectionResult) => {
    const canvas = canvasRef.current;
    const img = new Image();
    
    img.onload = () => {
      if (!canvas) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Draw instance segmentation masks
      result.predictions.forEach((prediction, index) => {
        // Determine if it's a crack based on class name and confidence
        const isCrack = prediction.class.toLowerCase().includes('crack') && prediction.confidence > 0.4;
        const label = isCrack ? 'CRACK' : 'NON CRACK';
        const confidence = `${Math.round(prediction.confidence * 100)}%`;
        
        // Set colors based on detection
        const strokeColor = isCrack ? '#ef4444' : '#10b981';
        const fillColor = isCrack ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
        
        // Draw segmentation mask if points are available
        if (prediction.points && prediction.points.length > 0) {
          // Create path for segmentation mask
          ctx.beginPath();
          ctx.moveTo(prediction.points[0].x, prediction.points[0].y);
          
          for (let i = 1; i < prediction.points.length; i++) {
            ctx.lineTo(prediction.points[i].x, prediction.points[i].y);
          }
          ctx.closePath();
          
          // Fill the segmentation area
          ctx.fillStyle = fillColor;
          ctx.fill();
          
          // Stroke the boundary
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Find centroid for label placement
          const centroidX = prediction.points.reduce((sum, point) => sum + point.x, 0) / prediction.points.length;
          const centroidY = prediction.points.reduce((sum, point) => sum + point.y, 0) / prediction.points.length;
          
          // Draw label at centroid
          ctx.font = 'bold 16px Arial';
          const labelText = `${label} ${confidence}`;
          const textWidth = ctx.measureText(labelText).width;
          
          ctx.fillStyle = strokeColor;
          ctx.fillRect(centroidX - textWidth/2 - 6, centroidY - 20, textWidth + 12, 25);
          
          ctx.fillStyle = 'white';
          ctx.fillText(labelText, centroidX - textWidth/2, centroidY - 2);
        } else {
          // Fallback to bounding box if no segmentation points
          const x = prediction.x - prediction.width / 2;
          const y = prediction.y - prediction.height / 2;
          
          // Draw filled rectangle background
          ctx.fillStyle = fillColor;
          ctx.fillRect(x, y, prediction.width, prediction.height);
          
          // Draw border
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, prediction.width, prediction.height);
          
          // Draw label
          ctx.font = 'bold 16px Arial';
          const labelText = `${label} ${confidence}`;
          const textWidth = ctx.measureText(labelText).width;
          
          ctx.fillStyle = strokeColor;
          ctx.fillRect(x, y - 30, textWidth + 12, 25);
          
          ctx.fillStyle = 'white';
          ctx.fillText(labelText, x + 6, y - 10);
        }
      });

      // If no specific predictions but we have overall result, show it
      if (result.predictions.length === 0) {
        const overallLabel = result.hasCracks ? 'CRACK DETECTED' : 'NO CRACK DETECTED';
        
        ctx.font = 'bold 24px Arial';
        const textWidth = ctx.measureText(overallLabel).width;
        const centerX = (canvas.width - textWidth) / 2;
        
        // Background
        ctx.fillStyle = result.hasCracks ? '#ef4444' : '#10b981';
        ctx.fillRect(centerX - 10, 20, textWidth + 20, 35);
        
        // Text
        ctx.fillStyle = 'white';
        ctx.fillText(overallLabel, centerX, 45);
      }
    };
    
    img.src = imagePreview!;
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setDetectionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadResults = () => {
    if (!detectionResult || !selectedImage) return;

    const results = {
      filename: selectedImage.name,
      timestamp: new Date().toISOString(),
      detection: detectionResult,
      summary: {
        hasCracks: detectionResult.hasCracks,
        totalCracks: detectionResult.totalCracks,
        maxConfidence: detectionResult.confidence
      }
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roboflow-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Roboflow Not Configured
          </CardTitle>
          <CardDescription>
            Please configure your Roboflow API settings first
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedImage ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Image for Analysis</CardTitle>
            <CardDescription>
              Select an image to detect cracks using Roboflow AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Drop your image here</p>
              <p className="text-muted-foreground mb-4">or click to browse files</p>
              <Button variant="outline">
                Select Image
              </Button>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Image Analysis</span>
                <div className="flex gap-2">
                  <Button
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </Button>
                  <Button variant="outline" onClick={clearImage}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {detectionResult && detectionResult.predictions.length > 0 ? (
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto rounded-lg border"
                  />
                ) : (
                  <img
                    src={imagePreview!}
                    alt="Selected"
                    className="max-w-full h-auto rounded-lg border"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {detectionResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {detectionResult.hasCracks ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  Detection Results
                </CardTitle>
                <div className="flex justify-between items-center">
                  <CardDescription>
                    Roboflow AI Analysis Complete
                  </CardDescription>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadResults}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Results
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`text-center p-6 rounded-lg border-2 ${
                    detectionResult.hasCracks 
                      ? 'bg-destructive/10 border-destructive/20' 
                      : 'bg-green-500/10 border-green-500/20'
                  }`}>
                    <p className={`text-2xl font-bold ${
                      detectionResult.hasCracks ? 'text-destructive' : 'text-green-600'
                    }`}>
                      {detectionResult.hasCracks ? 'CRACK DETECTED' : 'NO CRACKS'}
                    </p>
                    <p className="text-muted-foreground">Classification</p>
                  </div>
                  <div className="text-center p-6 bg-primary/10 border-2 border-primary/20 rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(detectionResult.confidence * 100)}%
                    </p>
                    <p className="text-muted-foreground">Max Confidence</p>
                  </div>
                  <div className="text-center p-6 bg-muted/50 border-2 border-border rounded-lg">
                    <p className="text-2xl font-bold">
                      {detectionResult.totalCracks}
                    </p>
                    <p className="text-muted-foreground">Total Detections</p>
                  </div>
                </div>

                {detectionResult.predictions.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Individual Detection Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {detectionResult.predictions.map((prediction, index) => {
                        const isCrack = prediction.class.toLowerCase().includes('crack') && prediction.confidence > 0.4;
                        return (
                          <div key={index} className={`p-4 rounded-lg border-2 ${
                            isCrack 
                              ? 'bg-destructive/10 border-destructive/20' 
                              : 'bg-green-500/10 border-green-500/20'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className={`font-bold text-lg ${
                                isCrack ? 'text-destructive' : 'text-green-600'
                              }`}>
                                {isCrack ? 'CRACK' : 'NON CRACK'}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                isCrack 
                                  ? 'bg-destructive text-destructive-foreground' 
                                  : 'bg-green-600 text-white'
                              }`}>
                                {Math.round(prediction.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Detection #{index + 1} • Original class: {prediction.class}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};