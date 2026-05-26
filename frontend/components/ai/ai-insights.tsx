"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightItem {
  type: "positive" | "negative" | "warning" | "info";
  title: string;
  description: string;
  metric?: string;
  change?: number;
}

interface AIInsightsProps {
  districtStats?: any[];
  youthData?: any[];
  className?: string;
}

// Simulated AI insights based on the data
const generateInsights = (districtStats: any[], youthData: any[]): InsightItem[] => {
  const insights: InsightItem[] = [];

  // Analyze district performance
  if (districtStats && districtStats.length > 0) {
    const sortedByCompletion = [...districtStats].sort(
      (a, b) => b.completionRate - a.completionRate
    );
    const bestDistrict = sortedByCompletion[0];
    const worstDistrict = sortedByCompletion[sortedByCompletion.length - 1];

    insights.push({
      type: "positive",
      title: "Eng yaxshi natija ko'rsatayotgan tuman",
      description: `${bestDistrict?.districtId || "Bekobod tumani"} tumani ${bestDistrict?.completionRate || 85}% bajarish ko'rsatkichi bilan yetakchilik qilmoqda.`,
      metric: `${bestDistrict?.completionRate || 85}%`,
      change: 12,
    });

    if (worstDistrict && worstDistrict.completionRate < 60) {
      insights.push({
        type: "warning",
        title: "E'tibor talab qiluvchi tuman",
        description: `${worstDistrict.districtId} tumani ${worstDistrict.completionRate}% bajarish ko'rsatkichi bilan pastda. Qo'shimcha resurslar talab qilinishi mumkin.`,
        metric: `${worstDistrict.completionRate}%`,
        change: -8,
      });
    }
  }

  // Youth-related insights
  const totalYouth = youthData?.length || 0;
  const activeYouth = youthData?.filter((y) => y.status === "active").length || 0;

  insights.push({
    type: "info",
    title: "Umumiy yoshlar statistikasi",
    description: `Jami ${totalYouth} nafardan ${activeYouth} nafari faol dasturlarda ishtirok etmoqda.`,
    metric: `${Math.round((activeYouth / totalYouth) * 100) || 75}%`,
  });

  // Add more simulated insights
  insights.push({
    type: "positive",
    title: "Oylik progress",
    description:
      "O'tgan oyga nisbatan individual rejalar bajarilishi 15% ga oshdi.",
    metric: "+15%",
    change: 15,
  });

  insights.push({
    type: "negative",
    title: "Uchrashuvlar kamayishi",
    description:
      "Bu hafta rejalashtirilgan uchrashuvlarning 23% i o'tkazilmadi. Sabablarni aniqlash talab etiladi.",
    metric: "-23%",
    change: -23,
  });

  insights.push({
    type: "info",
    title: "AI tavsiyasi",
    description:
      "Ta'lim olishda qiyinchiliklarga duch kelgan yoshlar soni ko'paymoqda. Maxsus dastur ishlab chiqish tavsiya etiladi.",
  });

  return insights;
};

export function AIInsights({
  districtStats = [],
  youthData = [],
  className,
}: AIInsightsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<InsightItem[]>(() =>
    generateInsights(districtStats, youthData)
  );

  const refreshInsights = async () => {
    setIsLoading(true);
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setInsights(generateInsights(districtStats, youthData));
    setIsLoading(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "negative":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightBadge = (type: string) => {
    switch (type) {
      case "positive":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Ijobiy
          </Badge>
        );
      case "negative":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Salbiy
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            Ogohlantirish
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Ma'lumot
          </Badge>
        );
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          YOSH-AI Tushunchalar
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshInsights}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">
              AI ma'lumotlarni tahlil qilmoqda...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer",
                  insight.type === "warning" && "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800/50 dark:bg-yellow-950/20",
                  insight.type === "negative" && "border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        {getInsightBadge(insight.type)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                  {insight.metric && (
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold">{insight.metric}</div>
                      {insight.change !== undefined && (
                        <div
                          className={cn(
                            "flex items-center justify-end text-xs",
                            insight.change > 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {insight.change > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {Math.abs(insight.change)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Tez harakatlar
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="justify-start h-9 bg-transparent">
              <BarChart3 className="h-4 w-4 mr-2" />
              To'liq tahlil
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" size="sm" className="justify-start h-9 bg-transparent">
              <Users className="h-4 w-4 mr-2" />
              Xavfli yoshlar
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" size="sm" className="justify-start h-9 bg-transparent">
              <Target className="h-4 w-4 mr-2" />
              Maqsadlar
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" size="sm" className="justify-start h-9 bg-transparent">
              <Calendar className="h-4 w-4 mr-2" />
              Rejalar
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
