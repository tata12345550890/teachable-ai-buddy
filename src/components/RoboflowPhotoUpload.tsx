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
      
      // Draw bounding boxes on canvas
      if (result.predictions.length > 0 && imagePreview) {
        drawBoundingBoxes(result);
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

  const drawBoundingBoxes = (result: CrackDetectionResult) => {
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

      // Draw bounding boxes
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.font = '16px Arial';
      ctx.fillStyle = '#ef4444';

      result.predictions.forEach((prediction, index) => {
        const x = prediction.x - prediction.width / 2;
        const y = prediction.y - prediction.height / 2;
        
        // Draw rectangle
        ctx.strokeRect(x, y, prediction.width, prediction.height);
        
        // Draw label
        const label = `${prediction.class} ${Math.round(prediction.confidence * 100)}%`;
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, y - 25, textWidth + 10, 20);
        ctx.fillStyle = 'white';
        ctx.fillText(label, x + 5, y - 8);
      });
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
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {detectionResult.hasCracks ? 'CRACK DETECTED' : 'NO CRACKS'}
                    </p>
                    <p className="text-muted-foreground">Classification</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {Math.round(detectionResult.confidence * 100)}%
                    </p>
                    <p className="text-muted-foreground">Max Confidence</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {detectionResult.totalCracks}
                    </p>
                    <p className="text-muted-foreground">Total Detections</p>
                  </div>
                </div>

                {detectionResult.predictions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Detection Details:</h4>
                    <div className="space-y-2">
                      {detectionResult.predictions.map((prediction, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <span className="font-medium">{prediction.class}</span>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(prediction.confidence * 100)}% confidence
                          </span>
                        </div>
                      ))}
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