import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!apiKey) return null;
  return createOpenAI({ apiKey, baseURL });
}

const youthAnalysisSchema = z.object({
  riskLevel: z.enum(["past", "o'rta", "yuqori"]).describe("Xavf darajasi"),
  riskScore: z.number().min(0).max(100).describe("Xavf balli (0-100)"),
  strengths: z.array(z.string()).describe("Yoshning kuchli tomonlari"),
  concerns: z.array(z.string()).describe("Tashvish tug'diruvchi omillar"),
  recommendations: z.array(z.string()).describe("Tavsiyalar ro'yxati"),
  priorityActions: z.array(z.string()).describe("Birinchi navbatdagi harakatlar"),
  estimatedTimeline: z.string().describe("Taxminiy muddat"),
  successProbability: z.number().min(0).max(100).describe("Muvaffaqiyat ehtimoli %"),
});

const planRecommendationSchema = z.object({
  title: z.string().describe("Reja nomi"),
  description: z.string().describe("Reja tavsifi"),
  activities: z.array(
    z.object({
      name: z.string().describe("Faoliyat nomi"),
      frequency: z.string().describe("Takrorlanish davriyligi"),
      responsible: z.string().describe("Mas'ul shaxs turi"),
      duration: z.string().describe("Davomiyligi"),
    })
  ).describe("Tavsiya etilgan faoliyatlar"),
  milestones: z.array(
    z.object({
      week: z.number().describe("Hafta raqami"),
      target: z.string().describe("Maqsad"),
    })
  ).describe("Bosqichlar"),
  expectedOutcomes: z.array(z.string()).describe("Kutilayotgan natijalar"),
});

export async function POST(req: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return Response.json(
      { error: "OPENAI_API_KEY sozlanmagan" },
      { status: 503 }
    );
  }

  const { type, data } = await req.json();
  const model = openai("gpt-4.1-mini");

  if (type === "youth-analysis") {
    const { youth, meetings, plans } = data;

    const { object } = await generateObject({
      model,
      schema: youthAnalysisSchema,
      prompt: `O'zbekiston Yoshlar agentligi uchun quyidagi yoshning holatini tahlil qiling:

Yosh ma'lumotlari:
- Ism: ${youth.fullName}
- Tug'ilgan sana: ${youth.birthDate ?? "noma'lum"}
- Kategoriya: ${youth.category ?? "noma'lum"}
- Tuman: ${youth.districtId}
- Joriy status: ${youth.status}
- Hozirgi AI ball: ${youth.aiScore ?? "N/A"}

Uchrashuvlar soni: ${meetings?.length ?? 0}
Rejalar soni: ${plans?.length ?? 0}

Yoshning holatini batafsil tahlil qiling va amaliy tavsiyalar bering. Uzbek tilida javob bering.`,
    });

    return Response.json({ analysis: object });
  }

  if (type === "plan-recommendation") {
    const { youth, existingPlans } = data;

    const { object } = await generateObject({
      model,
      schema: planRecommendationSchema,
      prompt: `O'zbekiston Yoshlar agentligi uchun quyidagi yosh uchun 3 oylik individual reja tavsiya qiling:

Yosh ma'lumotlari:
- Ism: ${youth.fullName}
- Kategoriya: ${youth.category ?? "noma'lum"}
- Tuman: ${youth.districtId}
- Joriy status: ${youth.status}

Mavjud rejalar soni: ${existingPlans?.length ?? 0}

Kategoriya bo'yicha yo'nalish:
${youth.category === "Oilada muammoli vaziyatda" ? "- Oilaviy terapiya va ijtimoiy yordam" : ""}
${youth.category === "Ta'lim olishda qiyinchiliklarga duch kelgan" ? "- Ta'lim ko'magi va kasbiy yo'nalish" : ""}
${youth.category === "Huquqbuzarlik sodir etgan" ? "- Profilaktika ishlari va huquqiy ma'rifat" : ""}
${youth.category === "Narkotik moddalardan foydalanuvchi" ? "- Tibbiy reabilitatsiya va psixologik yordam" : ""}
${youth.category === "Ruhiy-psixologik muammolarga ega" ? "- Professional psixolog va terapiya" : ""}

Uzbek tilida javob bering.`,
    });

    return Response.json({ plan: object });
  }

  return Response.json({ error: "Noto'g'ri so'rov turi" }, { status: 400 });
}
