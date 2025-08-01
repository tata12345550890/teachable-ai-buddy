import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ModelSetup } from "./ModelSetup";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ModelConfig {
  apiEndpoint: string;
  apiKey: string;
  modelType: "custom" | "openai" | "anthropic" | "huggingface";
  modelName?: string;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const callAI = async (userMessage: string): Promise<string> => {
    if (!modelConfig) {
      throw new Error("Model configuration not set");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Set authorization header based on model type
    if (modelConfig.modelType === "openai") {
      headers["Authorization"] = `Bearer ${modelConfig.apiKey}`;
    } else if (modelConfig.modelType === "anthropic") {
      headers["x-api-key"] = modelConfig.apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else if (modelConfig.modelType === "huggingface") {
      headers["Authorization"] = `Bearer ${modelConfig.apiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${modelConfig.apiKey}`;
    }

    const body = {
      messages: [{ role: "user", content: userMessage }],
      ...(modelConfig.modelName && { model: modelConfig.modelName }),
      max_tokens: 1000,
      temperature: 0.7,
    };

    const response = await fetch(modelConfig.apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different API response formats
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    } else if (data.content && data.content[0]) {
      return data.content[0].text;
    } else if (data.generated_text) {
      return data.generated_text;
    } else if (typeof data === "string") {
      return data;
    } else {
      throw new Error("Unexpected API response format");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!modelConfig) {
      toast.error("Please configure your AI model first");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create placeholder AI message for typing effect
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);
    setTypingMessageId(aiMessageId);

    try {
      const response = await callAI(content);
      
      // Simulate typing effect
      let currentText = "";
      const words = response.split(" ");
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? " " : "") + words[i];
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: currentText }
              : msg
          )
        );
        
        // Random delay between words for realistic typing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      }
      
      setTypingMessageId(null);
      toast.success("Response received!");
      
    } catch (error) {
      console.error("Error calling AI:", error);
      setMessages(prev => prev.filter(msg => msg.id !== aiMessageId));
      toast.error(error instanceof Error ? error.message : "Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat cleared");
  };

  const exportChat = () => {
    const chatData = {
      messages,
      exportedAt: new Date().toISOString(),
      modelConfig: modelConfig ? { ...modelConfig, apiKey: "[HIDDEN]" } : null
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Chat exported successfully!");
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-primary to-primary-glow animate-glow">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              AI Assistant
            </h1>
            <p className="text-sm text-muted-foreground">
              {modelConfig ? "Ready to chat" : "Configure your model to start"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <Button
                onClick={exportChat}
                variant="outline"
                size="sm"
                className="border-border/50 hover:bg-accent"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={clearChat}
                variant="outline"
                size="sm"
                className="border-border/50 hover:bg-destructive/20 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="animate-float mb-6">
                <Brain className="h-16 w-16 mx-auto text-primary opacity-60" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Welcome to Your AI Assistant
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {modelConfig 
                  ? "Start a conversation by typing a message below. Your AI model is ready to help!"
                  : "Configure your AI model first, then start chatting with your intelligent assistant."
                }
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isTyping={typingMessageId === message.id}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-card/30 backdrop-blur-sm border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder={
              modelConfig 
                ? "Ask your AI anything..." 
                : "Configure your model first to start chatting"
            }
          />
        </div>
      </div>

      {/* Model Setup Modal */}
      <ModelSetup
        onConfigSave={setModelConfig}
        currentConfig={modelConfig || undefined}
      />
    </div>
  );
};