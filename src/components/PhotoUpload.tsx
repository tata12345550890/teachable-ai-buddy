import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, X, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Prediction } from "@/services/teachableMachineService";

interface PhotoUploadProps {
  onPredict: (imageElement: HTMLImageElement) => Promise<Prediction[]>;
  isModelLoaded: boolean;
}

export const PhotoUpload = ({ onPredict, isModelLoaded }: PhotoUploadProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Image size should be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImage(result);
      setPredictions([]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const analyzeImage = async () => {
    if (!selectedImage || !imageRef.current || !isModelLoaded) {
      toast.error('Please select an image and ensure the model is loaded');
      return;
    }

    setIsAnalyzing(true);
    try {
      const results = await onPredict(imageRef.current);
      setPredictions(results);
      
      const highConfidencePredictions = results.filter(p => p.probability > 0.5);
      if (highConfidencePredictions.length > 0) {
        toast.success(`Analysis complete! Found ${highConfidencePredictions.length} high-confidence prediction(s)`);
      } else {
        toast.success('Analysis complete');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPredictions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadResults = () => {
    if (!predictions.length) {
      toast.error('No predictions to download');
      return;
    }

    const results = {
      timestamp: new Date().toISOString(),
      predictions: predictions,
      totalPredictions: predictions.length,
      highConfidencePredictions: predictions.filter(p => p.probability > 0.5).length
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Results downloaded successfully');
  };

  const getConfidenceColor = (probability: number) => {
    if (probability > 0.8) return "bg-detection-confidence-high text-white";
    if (probability > 0.5) return "bg-detection-confidence-medium text-white";
    return "bg-detection-confidence-low text-white";
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          {!selectedImage ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Image for Analysis</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG, WebP (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Selected for analysis"
                  className="w-full max-h-96 object-contain rounded-lg bg-muted"
                  crossOrigin="anonymous"
                />
                <Button
                  onClick={clearImage}
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={analyzeImage}
                  disabled={!isModelLoaded || isAnalyzing}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:scale-105 transition-transform"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Analyze Image
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="icon"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {predictions.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Analysis Results</h3>
              <Button onClick={downloadResults} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="space-y-2">
              {predictions
                .sort((a, b) => b.probability - a.probability)
                .map((prediction, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border/30"
                  >
                    <div>
                      <span className="font-medium capitalize">
                        {prediction.className}
                      </span>
                      <div className="text-sm text-muted-foreground">
                        Confidence: {(prediction.probability * 100).toFixed(1)}%
                      </div>
                    </div>
                    <Badge className={getConfidenceColor(prediction.probability)}>
                      {(prediction.probability * 100).toFixed(1)}%
                    </Badge>
                  </div>
                ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Classes:</span>
                  <span className="ml-2 font-medium">{predictions.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Best Match:</span>
                  <span className="ml-2 font-medium">
                    {predictions.length > 0 ? (predictions[0].probability * 100).toFixed(1) + '%' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};