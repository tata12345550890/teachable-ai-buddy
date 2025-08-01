import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Zap } from "lucide-react";

interface ModelConfig {
  apiEndpoint: string;
  apiKey: string;
  modelType: "custom" | "openai" | "anthropic" | "huggingface";
  modelName?: string;
}

interface ModelSetupProps {
  onConfigSave: (config: ModelConfig) => void;
  currentConfig?: ModelConfig;
}

export const ModelSetup = ({ onConfigSave, currentConfig }: ModelSetupProps) => {
  const [config, setConfig] = useState<ModelConfig>(
    currentConfig || {
      apiEndpoint: "",
      apiKey: "",
      modelType: "custom",
      modelName: ""
    }
  );

  const [isOpen, setIsOpen] = useState(!currentConfig);

  const handleSave = () => {
    if (config.apiEndpoint && config.apiKey) {
      onConfigSave(config);
      setIsOpen(false);
    }
  };

  if (!isOpen && currentConfig) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="icon"
          className="rounded-full bg-accent/50 backdrop-blur-sm border-border/50 hover:bg-accent"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-gradient-to-r from-primary to-primary-glow">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            AI Model Setup
          </CardTitle>
          <CardDescription>
            Configure your teachable AI model to start chatting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modelType">Model Type</Label>
            <Select
              value={config.modelType}
              onValueChange={(value: any) => setConfig({ ...config, modelType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom API</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="huggingface">Hugging Face</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint</Label>
            <Input
              id="apiEndpoint"
              value={config.apiEndpoint}
              onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
              placeholder="https://api.your-model.com/v1/chat"
              className="bg-input/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Enter your API key"
              className="bg-input/50"
            />
          </div>

          {config.modelType !== "custom" && (
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name (Optional)</Label>
              <Input
                id="modelName"
                value={config.modelName || ""}
                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                placeholder="gpt-4, claude-3, etc."
                className="bg-input/50"
              />
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={!config.apiEndpoint || !config.apiKey}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:scale-105 transition-transform"
          >
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};