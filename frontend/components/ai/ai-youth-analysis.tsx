"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Target,
  Clock,
  Lightbulb,
  FileText,
  BarChart3,
} from "lucide-react";
import type { Youth, Meeting, IndividualPlan } from "@/lib/types";

interface AIYouthAnalysisProps {
  youth: Youth;
  meetings?: Meeting[];
  plans?: IndividualPlan[];
  onPlanCreate?: (plan: any) => void;
}

interface AnalysisResult {
  riskLevel: "past" | "o'rta" | "yuqori";
  riskScore: number;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  priorityActions: string[];
  estimatedTimeline: string;
  successProbability: number;
}

interface PlanRecommendation {
  title: string;
  description: string;
  activities: {
    name: string;
    frequency: string;
    responsible: string;
    duration: string;
  }[];
  milestones: {
    week: number;
    target: string;
  }[];
  expectedOutcomes: string[];
}

export function AIYouthAnalysis({
  youth,
  meetings = [],
  plans = [],
  onPlanCreate,
}: AIYouthAnalysisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [planRecommendation, setPlanRecommendation] =
    useState<PlanRecommendation | null>(null);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "youth-analysis",
          data: { youth, meetings, plans },
        }),
      });
      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlanRecommendation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "plan-recommendation",
          data: { youth, existingPlans: plans },
        }),
      });
      const data = await response.json();
      setPlanRecommendation(data.plan);
    } catch (error) {
      console.error("Plan recommendation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !analysis) {
      fetchAnalysis();
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "plan" && !planRecommendation) {
      fetchPlanRecommendation();
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "past":
        return "bg-green-500";
      case "o'rta":
        return "bg-yellow-500";
      case "yuqori":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "past":
        return "default";
      case "o'rta":
        return "secondary";
      case "yuqori":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Brain className="h-4 w-4" />
          AI Tahlil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            YOSH-AI Tahlili - {youth.fullName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Tahlil
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2">
              <FileText className="h-4 w-4" />
              Reja Tavsiyasi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">AI tahlil qilmoqda...</p>
              </div>
            ) : analysis ? (
              <>
                {/* Risk Score Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Xavf Darajasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={getRiskBadgeVariant(analysis.riskLevel)}>
                            {analysis.riskLevel.toUpperCase()}
                          </Badge>
                          <span className="text-2xl font-bold">
                            {analysis.riskScore}/100
                          </span>
                        </div>
                        <Progress
                          value={analysis.riskScore}
                          className={`h-3 ${getRiskColor(analysis.riskLevel)}`}
                        />
                      </div>
                      <div className="text-center px-4 py-2 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">
                          Muvaffaqiyat ehtimoli
                        </div>
                        <div className="text-xl font-bold text-green-600">
                          {analysis.successProbability}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Strengths and Concerns */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Kuchli Tomonlar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.strengths.map((item, index) => (
                          <li
                            key={index}
                            className="text-sm flex items-start gap-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        Tashvishli Tomonlar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.concerns.map((item, index) => (
                          <li
                            key={index}
                            className="text-sm flex items-start gap-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Tavsiyalar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((item, index) => (
                        <li
                          key={index}
                          className="text-sm flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium">
                            {index + 1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Priority Actions */}
                <Card className="border-primary/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-primary">
                      <TrendingUp className="h-4 w-4" />
                      Birinchi Navbatdagi Harakatlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Taxminiy muddat: {analysis.estimatedTimeline}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {analysis.priorityActions.map((action, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 rounded-lg border border-primary/30 bg-primary/5"
                        >
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{action}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={fetchAnalysis} variant="outline" size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Qayta Tahlil Qilish
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Tahlil yuklanmadi
              </div>
            )}
          </TabsContent>

          <TabsContent value="plan" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  AI reja tavsiya qilmoqda...
                </p>
              </div>
            ) : planRecommendation ? (
              <>
                {/* Plan Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {planRecommendation.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {planRecommendation.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Activities */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Tavsiya Etilgan Faoliyatlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {planRecommendation.activities.map((activity, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="font-medium text-sm mb-2">
                            {activity.name}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Davriyligi:</span>{" "}
                              {activity.frequency}
                            </div>
                            <div>
                              <span className="font-medium">Mas'ul:</span>{" "}
                              {activity.responsible}
                            </div>
                            <div>
                              <span className="font-medium">Muddat:</span>{" "}
                              {activity.duration}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Milestones */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Bosqichlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {planRecommendation.milestones.map((milestone, index) => (
                        <div key={index} className="flex gap-4 pb-4 last:pb-0">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                              {milestone.week}
                            </div>
                            {index <
                              planRecommendation.milestones.length - 1 && (
                              <div className="w-0.5 h-full bg-border flex-1 my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="text-xs text-muted-foreground mb-1">
                              {milestone.week}-hafta
                            </div>
                            <div className="text-sm">{milestone.target}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Expected Outcomes */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Kutilayotgan Natijalar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {planRecommendation.expectedOutcomes.map((outcome, index) => (
                        <li
                          key={index}
                          className="text-sm flex items-start gap-2"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={fetchPlanRecommendation}
                    variant="outline"
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Boshqa Variant
                  </Button>
                  {onPlanCreate && (
                    <Button
                      onClick={() => onPlanCreate(planRecommendation)}
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Bu Rejani Qo'llash
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Reja tavsiyasi yuklanmadi
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
