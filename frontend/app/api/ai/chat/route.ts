import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
  tool,
} from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, context }: { messages: UIMessage[]; context?: any } =
    await req.json();

  const systemPrompt = `Siz O'zbekiston Yoshlar agentligi muammoli yoshlar bilan ishlash va monitoring axborot tizimining AI yordamchisi (YOSH-AI) siz.

Sizning vazifaliz:
1. Mas'ul hodimlar va direktorlarga yoshlar bilan ishlashda yordam berish
2. Individual rejalar tuzishda maslahat berish
3. Yoshlarning holati va progressini tahlil qilish
4. Eng yaxshi amaliyotlar va tavsiyalar berish
5. Hisobotlar va statistika tahlili

Javob berishda quyidagilarga amal qiling:
- Har doim o'zbek tilida javob bering
- Aniq va professional bo'ling
- Faqat tegishli ma'lumotlarni taqdim eting
- Maxfiy ma'lumotlarni himoya qiling
- Yoshlar bilan ishlashda ijobiy yondashuvni qo'llab-quvvatlang

Toshkent viloyatining 14 tumani:
Bekobod, Bo'ka, Bo'stonliq, Chinoz, Qibray, Ohangaron, Oqqo'rg'on, Parkent, Piskent, Quyi Chirchiq, Yangiyo'l, Yuqori Chirchiq, Zangiota, Toshkent tumani

Yoshlar kategoriyalari:
- Oilada muammoli vaziyatda (OG'B) - oilaviy muammolar
- Ijtimoiy himoyaga muhtoj - kam ta'minlangan
- Ta'lim olishda qiyinchiliklarga duch kelgan - maktabdan chetlashgan
- Huquqbuzarlik sodir etgan - huquqiy muammolar
- Narkotik moddalardan foydalanuvchi - tibbiy yordam kerak
- Ruhiy-psixologik muammolarga ega - terapiya talab qilinadi

${context ? `Joriy kontekst: ${JSON.stringify(context)}` : ""}`;

  const result = streamText({
    model: "openai/gpt-4o",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: {
      analyzeYouth: tool({
        description: "Yoshning holatini tahlil qilish va ball hisoblash",
        inputSchema: z.object({
          youthId: z.string().describe("Yosh ID raqami"),
          factors: z
            .array(z.string())
            .describe("Tahlil qilinadigan omillar ro'yxati"),
        }),
        execute: async ({ youthId, factors }) => {
          // Simulate analysis
          const score = Math.floor(Math.random() * 40) + 60;
          return {
            youthId,
            analyzedFactors: factors,
            riskScore: score,
            recommendation:
              score > 80
                ? "Yaxshi progress - davom ettirish tavsiya etiladi"
                : score > 60
                  ? "O'rtacha holat - qo'shimcha e'tibor kerak"
                  : "Yuqori xavf - shoshilinch choralar ko'rish lozim",
          };
        },
      }),
      suggestPlan: tool({
        description: "Individual reja taklif qilish",
        inputSchema: z.object({
          category: z.string().describe("Yosh kategoriyasi"),
          currentStatus: z.string().describe("Joriy holat"),
        }),
        execute: async ({ category, currentStatus }) => {
          const plans: Record<string, string[]> = {
            "Oilada muammoli vaziyatda": [
              "Oila bilan konsultatsiya o'tkazish",
              "Psixolog bilan uchrashuvlar rejalashtirish",
              "Ijtimoiy ko'mak dasturlariga yo'naltirish",
            ],
            "Ta'lim olishda qiyinchiliklarga duch kelgan": [
              "Repetitorlik xizmatlarini tashkil etish",
              "Maktab rahbariyati bilan uchrashish",
              "Kasbiy yo'nalish berish",
            ],
            "Huquqbuzarlik sodir etgan": [
              "Profilaktika suhbatlari o'tkazish",
              "Jamoat ishlarida ishtirokini ta'minlash",
              "Huquqiy ma'rifat darslari",
            ],
            default: [
              "Doimiy monitoring",
              "Oylik uchrashuvlar",
              "Ijtimoiy ko'nikmalar treningi",
            ],
          };
          return {
            suggestedActivities:
              plans[category] || plans.default,
            estimatedDuration: "3-6 oy",
            priorityLevel:
              currentStatus === "active" ? "O'rta" : "Yuqori",
          };
        },
      }),
      getDistrictStats: tool({
        description: "Tuman statistikasini olish",
        inputSchema: z.object({
          districtName: z.string().describe("Tuman nomi"),
        }),
        execute: async ({ districtName }) => {
          // Return mock stats
          return {
            district: districtName,
            totalYouth: Math.floor(Math.random() * 100) + 50,
            activePrograms: Math.floor(Math.random() * 30) + 10,
            completionRate: `${Math.floor(Math.random() * 30) + 60}%`,
            topCategories: [
              "Oilada muammoli vaziyatda",
              "Ta'lim olishda qiyinchiliklarga duch kelgan",
            ],
          };
        },
      }),
    },
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  });
}
