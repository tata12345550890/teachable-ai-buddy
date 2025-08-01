import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export const ChatMessage = ({ message, isTyping = false }: ChatMessageProps) => {
  const isUser = message.role === "user";
  
  return (
    <div
      className={cn(
        "flex w-full animate-slide-up",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg",
          isUser
            ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground"
            : "bg-chat-message-ai text-foreground border border-border"
        )}
        style={isUser ? { boxShadow: 'var(--shadow-glow)' } : { boxShadow: 'var(--shadow-message)' }}
      >
        <p className="text-sm leading-relaxed">
          {message.content}
          {isTyping && (
            <span className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1">
              |
            </span>
          )}
        </p>
        <span className="text-xs opacity-70 mt-1 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};