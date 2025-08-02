import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, X, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CrackPrediction } from "@/services/tensorflowService";

interface TensorFlowPhotoUploadProps {
  onPredict: (imageElement: HTMLImageElement) => Promise<CrackPrediction>;
  isModelLoaded: boolean;
}

export const TensorFlowPhotoUpload = ({ onPredict, isModelLoaded }: TensorFlowPhotoUploadProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<CrackPrediction | null>(null);
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
      setPrediction(null);
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
      const result = await onPredict(imageRef.current);
      setPrediction(result);
      
      toast.success(`Analysis complete! ${result.classification} detected with ${(result.confidence * 100).toFixed(1)}% confidence`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPrediction(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadResults = () => {
    if (!prediction) {
      toast.error('No prediction to download');
      return;
    }

    const results = {
      timestamp: new Date().toISOString(),
      prediction: prediction,
      image: selectedImage
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crack-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Results downloaded successfully');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return "bg-detection-confidence-high text-white";
    if (confidence > 0.6) return "bg-detection-confidence-medium text-white";
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
              <h3 className="text-lg font-medium mb-2">Upload Image for Crack Detection</h3>
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
                      Detect Cracks
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
      {prediction && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Detection Results</h3>
              <Button onClick={downloadResults} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50 border border-border/30">
                <div>
                  <div className="font-semibold text-lg">
                    {prediction.classification}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Raw Probability: {(prediction.probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Confidence: {(prediction.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <Badge className={getConfidenceColor(prediction.confidence)}>
                  {(prediction.confidence * 100).toFixed(1)}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-border/30">
                <div>
                  <span className="text-muted-foreground">Classification:</span>
                  <span className="ml-2 font-medium">{prediction.classification}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className="ml-2 font-medium">{(prediction.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};