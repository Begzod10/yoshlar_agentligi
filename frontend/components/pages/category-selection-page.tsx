"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, Users, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type YouthCategory = "jinoyatchilik" | "boshqa";

interface CategorySelectionPageProps {
  onCategorySelect: (category: YouthCategory) => void;
}

const categories = [
  {
    id: "jinoyatchilik" as YouthCategory,
    title: "Jinoyatchilikka moyil bo'lgan yoshlar",
    description:
      "Huquqbuzarlik yoki jinoyat sodir etgan, qamoqdan ozod qilingan, yoki jinoyatchilikka moyil deb tan olingan yoshlar bilan ishlash",
    icon: AlertTriangle,
    stats: {
      label: "Jami ro'yxatda",
      value: "324",
    },
    color: "border-destructive/30 hover:border-destructive/60",
    selectedColor: "border-destructive bg-destructive/5",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  {
    id: "boshqa" as YouthCategory,
    title: "Boshqa kategoriyadagi yoshlar",
    description:
      "Ijtimoiy himoyaga muhtoj, oilaviy muammolari bor, ta'limdan chetlashgan yoki boshqa sabablarga ko'ra nazoratga olingan yoshlar",
    icon: Users,
    stats: {
      label: "Jami ro'yxatda",
      value: "254",
    },
    color: "border-primary/30 hover:border-primary/60",
    selectedColor: "border-primary bg-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
];

export function CategorySelectionPage({
  onCategorySelect,
}: CategorySelectionPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<YouthCategory | null>(null);

  const handleContinue = () => {
    if (selectedCategory) {
      onCategorySelect(selectedCategory);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Yoshlar Agentligi
              </h1>
              <p className="text-xs text-muted-foreground">
                Toshkent viloyati - Monitoring tizimi
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl space-y-8">
          {/* Title */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-balance">
              Yoshlar kategoriyasini tanlang
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tizimga kirish uchun ishlash kerak bo'lgan yoshlar kategoriyasini
              tanlang. Tanlangan kategoriya bo'yicha ma'lumotlar ko'rsatiladi.
            </p>
          </div>

          {/* Category Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;

              return (
                <Card
                  key={category.id}
                  className={cn(
                    "relative cursor-pointer transition-all duration-200 border-2",
                    isSelected ? category.selectedColor : category.color
                  )}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <CardContent className="p-6 space-y-4">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center",
                        category.iconBg
                      )}
                    >
                      <Icon className={cn("h-6 w-6", category.iconColor)} />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {category.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {category.stats.label}
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          {category.stats.value}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              disabled={!selectedCategory}
              onClick={handleContinue}
              className="min-w-[200px] h-12 text-base"
            >
              Davom etish
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Info Note */}
          <p className="text-center text-xs text-muted-foreground">
            Kategoriyani keyinchalik sozlamalar orqali o'zgartirish mumkin
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            2024 Yoshlar ishlari agentligi. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </div>
  );
}
