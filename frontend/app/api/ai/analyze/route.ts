import { generateText, Output } from "ai";
import { z } from "zod";

export const maxDuration = 30;

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
  const { type, data } = await req.json();

  if (type === "youth-analysis") {
    const { youth, meetings, plans } = data;

    const { output } = await generateText({
      model: "openai/gpt-4o",
      output: Output.object({ schema: youthAnalysisSchema }),
      messages: [
        {
          role: "user",
          content: `O'zbekiston Yoshlar agentligi uchun quyidagi yoshning holatini tahlil qiling:

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

Iltimos, yoshning holatini batafsil tahlil qiling va tavsiyalar bering.`,
        },
      ],
    });

    return Response.json({ analysis: output });
  }

  if (type === "plan-recommendation") {
    const { youth, existingPlans } = data;

    const { output } = await generateText({
      model: "openai/gpt-4o",
      output: Output.object({ schema: planRecommendationSchema }),
      messages: [
        {
          role: "user",
          content: `O'zbekiston Yoshlar agentligi uchun quyidagi yosh uchun individual reja tavsiya qiling:

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

Iltimos, 3 oylik individual reja tavsiya qiling.`,
        },
      ],
    });

    return Response.json({ plan: output });
  }

  return Response.json({ error: "Noto'g'ri so'rov turi" }, { status: 400 });
}
