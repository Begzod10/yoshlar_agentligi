import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { mockYouth } from "@/lib/mock-data";

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
  activities: z
    .array(
      z.object({
        name: z.string().describe("Faoliyat nomi"),
        frequency: z.string().describe("Takrorlanish davriyligi"),
        responsible: z.string().describe("Mas'ul shaxs turi"),
        duration: z.string().describe("Davomiyligi"),
      })
    )
    .describe("Tavsiya etilgan faoliyatlar"),
  milestones: z
    .array(
      z.object({
        week: z.number().describe("Hafta raqami"),
        target: z.string().describe("Maqsad"),
      })
    )
    .describe("Bosqichlar"),
  expectedOutcomes: z.array(z.string()).describe("Kutilayotgan natijalar"),
});

function checkYouthOwnership(
  youthId: string,
  userId?: string
): { youth: (typeof mockYouth)[0] | null; forbidden: boolean } {
  const youth = mockYouth.find((item) => item.id === youthId) ?? null;
  if (!youth) return { youth: null, forbidden: false };
  if (!userId) return { youth, forbidden: false };
  return { youth, forbidden: youth.assignedMasulId !== userId };
}

export async function POST(req: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return Response.json({ error: "OPENAI_API_KEY sozlanmagan" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Noto'g'ri JSON" }, { status: 400 });
  }

  const { type, data, youthId, userId } = body as {
    type: string;
    data?: Record<string, unknown>;
    youthId?: string;
    userId?: string;
  };

  const model = openai("gpt-4.1-mini");

  if (type === "youth-analysis") {
    const clientData = (data ?? {}) as any;
    const targetYouthId = (youthId ?? clientData?.youth?.id) as string | undefined;

    if (targetYouthId) {
      const { forbidden } = checkYouthOwnership(targetYouthId, userId);
      if (forbidden) {
        return Response.json(
          { error: "forbidden", message: "Bu yosh sizga biriktirilmagan" },
          { status: 403 }
        );
      }
    }

    const meetings = clientData.meetings ?? [];
    const plans = clientData.plans ?? [];
    const youth = mockYouth.find((item) => item.id === targetYouthId) ?? clientData.youth;

    if (!youth) {
      return Response.json({ error: "Yosh topilmadi" }, { status: 404 });
    }

    try {
      const { object } = await generateObject({
        model,
        schema: youthAnalysisSchema,
        prompt: `O'zbekiston Yoshlar agentligi uchun quyidagi yoshning holatini tahlil qiling:

Yosh ma'lumotlari:
- Ism: ${youth.fullName}
- Tug'ilgan sana: ${youth.birthDate}
- Kategoriya: ${youth.category}
- Tuman: ${youth.districtId}
- Joriy status: ${youth.status}
- Hozirgi AI ball: ${youth.aiScore}

Uchrashuvlar soni: ${meetings?.length || 0}
Rejalar soni: ${plans?.length || 0}

So'nggi uchrashuvlar:
${meetings?.slice(0, 3).map((m: any) => `- ${m.date}: ${m.notes}`).join("\n") || "Ma'lumot yo'q"}

Yoshning holatini batafsil tahlil qiling va amaliy tavsiyalar bering. Uzbek tilida javob bering.`,
      });

      return Response.json({ analysis: object });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return Response.json({ error: "ai_error", message: msg }, { status: 502 });
    }
  }

  if (type === "plan-recommendation") {
    const clientData = (data ?? {}) as any;
    const targetYouthId = (youthId ?? clientData?.youth?.id) as string | undefined;

    if (!targetYouthId) {
      return Response.json({ error: "youthId majburiy" }, { status: 400 });
    }

    const { youth: serverYouth, forbidden } = checkYouthOwnership(targetYouthId, userId);
    if (forbidden) {
      return Response.json(
        { error: "forbidden", message: "Bu yosh sizga biriktirilmagan" },
        { status: 403 }
      );
    }

    const youth = serverYouth ?? clientData.youth;
    if (!youth) {
      return Response.json({ error: "Yosh topilmadi" }, { status: 404 });
    }

    const existingPlans = clientData.existingPlans ?? [];

    try {
      const { object } = await generateObject({
        model,
        schema: planRecommendationSchema,
        prompt: `O'zbekiston Yoshlar agentligi uchun quyidagi yosh uchun individual reja tavsiya qiling:

Yosh ma'lumotlari:
- Ism: ${youth.fullName}
- Kategoriya: ${youth.category}
- Tuman: ${youth.districtId}
- Joriy status: ${youth.status}

Mavjud rejalar soni: ${existingPlans?.length || 0}

Kategoriya bo'yicha tavsiyalar:
${youth.category === "Oilada muammoli vaziyatda" ? "- Oilaviy terapiya va ijtimoiy yordam kerak" : ""}
${youth.category === "Ta'lim olishda qiyinchiliklarga duch kelgan" ? "- Ta'lim ko'magi va kasbiy yo'nalish kerak" : ""}
${youth.category === "Huquqbuzarlik sodir etgan" ? "- Profilaktika ishlari va huquqiy ma'rifat kerak" : ""}
${youth.category === "Narkotik moddalardan foydalanuvchi" ? "- Tibbiy reabilitatsiya va psixologik yordam kerak" : ""}
${youth.category === "Ruhiy-psixologik muammolarga ega" ? "- Professional psixolog va terapiya kerak" : ""}
${youth.category === "Ijtimoiy himoya" ? "- Ijtimoiy xizmatlar va yordam dasturlari kerak" : ""}
${youth.category === "Ta'lim" ? "- O'quv rejasi, kasbiy yo'naltirish va mentorlik kerak" : ""}
${youth.category === "Bandlik" ? "- Kasb-hunar o'qitish va ish joylari bilan bog'lash kerak" : ""}

3 oylik individual reja tavsiya qiling. Uzbek tilida javob bering.`,
      });

      return Response.json({ plan: object });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return Response.json({ error: "ai_error", message: msg }, { status: 502 });
    }
  }

  return Response.json({ error: "Noto'g'ri so'rov turi" }, { status: 400 });
}
