import { useRef, useEffect } from "react";
import { Detection } from "@/services/crackDetectionService";

interface CanvasOverlayProps {
  detections: Detection[];
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
}

export const CanvasOverlay = ({ detections, videoRef, isActive }: CanvasOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvas = () => {
      // Match canvas size to video size
      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw detections
      detections.forEach((detection) => {
        const [x, y, width, height] = detection.bbox;
        
        // Convert normalized coordinates to canvas coordinates
        const canvasX = x * canvas.width;
        const canvasY = y * canvas.height;
        const canvasWidth = width * canvas.width;
        const canvasHeight = height * canvas.height;
        
        // Determine color based on confidence
        let color = '#ef4444'; // Red for cracks
        if (detection.score > 0.8) {
          color = '#ef4444'; // High confidence - bright red
        } else if (detection.score > 0.6) {
          color = '#f97316'; // Medium confidence - orange
        } else {
          color = '#eab308'; // Low confidence - yellow
        }
        
        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
        
        // Draw filled background for label
        const labelText = `${detection.class} ${(detection.score * 100).toFixed(1)}%`;
        ctx.font = '14px Inter, sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 16;
        const labelHeight = 24;
        
        ctx.fillStyle = color;
        ctx.fillRect(canvasX, canvasY - labelHeight, labelWidth, labelHeight);
        
        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(labelText, canvasX + 8, canvasY - 6);
        
        // Draw corner markers for better visibility
        const cornerSize = 12;
        ctx.lineWidth = 4;
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(canvasX, canvasY + cornerSize);
        ctx.lineTo(canvasX, canvasY);
        ctx.lineTo(canvasX + cornerSize, canvasY);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(canvasX + canvasWidth - cornerSize, canvasY);
        ctx.lineTo(canvasX + canvasWidth, canvasY);
        ctx.lineTo(canvasX + canvasWidth, canvasY + cornerSize);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(canvasX, canvasY + canvasHeight - cornerSize);
        ctx.lineTo(canvasX, canvasY + canvasHeight);
        ctx.lineTo(canvasX + cornerSize, canvasY + canvasHeight);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(canvasX + canvasWidth - cornerSize, canvasY + canvasHeight);
        ctx.lineTo(canvasX + canvasWidth, canvasY + canvasHeight);
        ctx.lineTo(canvasX + canvasWidth, canvasY + canvasHeight - cornerSize);
        ctx.stroke();
      });
    };

    // Update canvas on video resize
    const resizeObserver = new ResizeObserver(updateCanvas);
    resizeObserver.observe(video);
    
    // Initial update
    updateCanvas();
    
    // Animate canvas updates
    const animationFrame = requestAnimationFrame(function animate() {
      updateCanvas();
      requestAnimationFrame(animate);
    });

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [detections, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ 
        width: '100%', 
        height: '100%',
        objectFit: 'cover'
      }}
    />
  );
};