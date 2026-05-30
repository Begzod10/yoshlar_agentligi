"use client";

import React from "react"

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  User,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  MessageSquare,
  Lightbulb,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIChatProps {
  context?: any;
  className?: string;
}

const quickPrompts = [
  {
    icon: <Lightbulb className="h-4 w-4" />,
    text: "Yoshlar bilan ishlashda eng yaxshi amaliyotlar",
    prompt: "Muammoli yoshlar bilan ishlashda qanday yaxshi amaliyotlar bor?",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    text: "Individual reja tuzish bo'yicha yordam",
    prompt: "Yosh uchun individual reja qanday tuziladi?",
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    text: "Monitoring ko'rsatkichlarini tushuntiring",
    prompt: "Yoshlar monitoringida qaysi ko'rsatkichlar muhim?",
  },
  {
    icon: <MessageSquare className="h-4 w-4" />,
    text: "Psixologik yondashuv maslahatlar",
    prompt: "Muammoli yoshlar bilan suhbat o'tkazishda qanday psixologik yondashuvlar samarali?",
  },
];

export function AIChat({ context, className }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue("");
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
          "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90",
          className
        )}
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 z-50 shadow-2xl border-2",
        isMinimized ? "w-80 h-14" : "w-96 h-[600px]",
        "transition-all duration-200",
        className
      )}
    >
      {/* Header */}
      <CardHeader className="p-3 border-b bg-gradient-to-r from-primary to-accent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-background/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-primary-foreground">
                YOSH-AI Yordamchi
              </CardTitle>
              {!isMinimized && (
                <p className="text-xs text-primary-foreground/80">
                  Yoshlar bilan ishlash bo'yicha yordam
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary-foreground hover:bg-background/20"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary-foreground hover:bg-background/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(600px-60px)]">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    Salom! Men YOSH-AI yordamchiman
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Yoshlar bilan ishlash bo'yicha savollaringizga javob beraman
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">
                    Tez so'rovlar:
                  </p>
                  {quickPrompts.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      className="w-full flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <span className="text-sm text-foreground">{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-gradient-to-r from-primary to-accent">
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.parts.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <p
                              key={index}
                              className="text-sm whitespace-pre-wrap"
                            >
                              {part.text}
                            </p>
                          );
                        }
                        if (part.type === "tool-invocation") {
                          return (
                            <div key={index} className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                {part.toolInvocation.toolName}
                              </Badge>
                              {part.toolInvocation.state === "output-available" && (
                                <pre className="mt-1 text-xs bg-background/50 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(
                                    part.toolInvocation.output,
                                    null,
                                    2
                                  )}
                                </pre>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>

                    {message.role === "user" && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-secondary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-gradient-to-r from-primary to-accent">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-muted/30">
            {messages.length > 0 && (
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-xs h-7"
                >
                  Suhbatni tozalash
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Savolingizni yozing..."
                className="flex-1 h-9 text-sm"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9"
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
