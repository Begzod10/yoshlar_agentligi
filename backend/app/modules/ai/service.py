import json
import logging
from typing import Any

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.modules.stats.schemas import AgencyStats, AiInsight

logger = logging.getLogger(__name__)

_INSIGHTS_SYSTEM = """\
Sen O'zbekiston yoshlar agentligi uchun yuqori malakali tahlilchi AI yordamchisisan.
Yoshlar agentligi — yosh fuqarolarning kasbiy va shaxsiy rivojlanishini kuzatib boruvchi davlat tashkiloti.
Mas'ullar yoshlar bilan individual ishlaydi: rejalar tuzadi, uchrashuvlar o'tkazadi, natijalarni kuzatadi.

Vazifang: berilgan statistik ma'lumotlar asosida 5-6 ta CHUQUR va AMALIY tavsiya ber.

Har bir tavsiya quyidagi JSON formatda:
{"type": "positive"|"warning"|"info"|"critical", "text": "..."}

Turlar:
- "positive": kuchli natija (80%+) — nimani to'g'ri qilayotganini aniqla va davom ettirish yo'lini ko'rsat
- "warning": o'rta natija (50-79%) — aniq sabab va tuzatish chorasi bilan
- "critical": jiddiy muammo (50% dan past) — zudlik bilan qanday harakat kerakligini ko'rsat
- "info": strategik tavsiya yoki muhim kuzatish

Majburiy qoidalar:
- Har bir tavsiya BOSHQALARIDAN FARQLI bo'lsin (bir xil fikrni takrorlama)
- Raqamlarni faqat kontekst uchun ishlatib, ASOSAN amaliy harakat tavsiya qil
- "Mas'ullar bilan ishlash kerak" kabi umumiy gaplardan QOCHING — kimga, nima qilish kerakligini ayting
- Har bir matn 1-2 ta aniq jumladan iborat
- Faqat JSON massiv qaytaring, boshqa hech narsa yo'q
"""

_SCORING_SYSTEM = """\
Sen O'zbekiston yoshlar agentligi uchun yuqori malakali reyting tahlilchisi AI yordamchisisang.
Senga bir nechta {entity_type} ma'lumotlari beriladi. Har birini 0-100 ball bilan baholab, O'zbek tilida AMALIY izoh yoz.

Baholash mezonlari:
- Rejalar bajarilishi (plan_pct): og'irligi 55% — maqsadlarga erishish darajasi
- Uchrashuvlar davomati (meet_pct): og'irligi 35% — faollik va ishtirokchilik
- Guruh ichida nisbiy samaradorlik: 10% — boshqalar bilan solishtirganda holat

Ball diapazoni (MAJBURIY):
- Guruhning eng yaxshisi: 88-98
- Yuqori ko'rsatkich (75%+): 72-87
- O'rta ko'rsatkich (50-74%): 42-71
- Past ko'rsatkich (25-49%): 22-41
- Juda past (25% dan kam): 8-21

"comment" qoidalari:
- 1-2 aniq jumla, FAQAT shu entity haqida
- Kuchli tomonni VA zaif tomonni mention qil
- Konkret: "rejalar 80% bajarilgan, ammo davomat 40% past — uchrashuvlarni muntazam o'tkazish zarur"
- Umumiy ("yaxshi ishlayapti") gaplardan QOCHING

Faqat JSON massiv qaytargin, boshqa hech narsa yo'q:
[{{"id": "...", "score": 72.5, "comment": "..."}}, ...]
"""


class AiService:
    def __init__(self) -> None:
        settings = get_settings()
        self._client: AsyncOpenAI | None = None
        if settings.openai_api_key:
            kwargs: dict[str, Any] = {"api_key": settings.openai_api_key}
            if settings.openai_base_url:
                kwargs["base_url"] = settings.openai_base_url
            self._client = AsyncOpenAI(**kwargs)

    async def generate_insights(self, stats: AgencyStats) -> list[AiInsight]:
        if self._client is None:
            return _static_fallback(stats)

        plan_pct = round(stats.completed_plans / stats.total_plans * 100) if stats.total_plans else 0
        attend_pct = round(stats.attended_meetings / stats.total_meetings * 100) if stats.total_meetings else 0
        ratio = round(stats.active_youth / stats.total_masullar, 1) if stats.total_masullar else 0
        active_pct = round(stats.active_youth / stats.total_youth * 100) if stats.total_youth else 0

        context = (
            f"Agentlik statistikasi:\n"
            f"- Jami yoshlar: {stats.total_youth} "
            f"(faol: {stats.active_youth} [{active_pct}%], "
            f"bitiruvchi: {stats.graduated_youth}, chiqarilgan: {stats.removed_youth})\n"
            f"- Tashkilotlar: {stats.total_organizations}, Mas'ullar: {stats.total_masullar}\n"
            f"- Har bir mas'ulga o'rtacha {ratio} nafar faol yosh\n"
            f"- Rejalar: jami {stats.total_plans}, bajarilgan {stats.completed_plans} ({plan_pct}%), "
            f"jarayonda {stats.in_progress_plans}\n"
            f"- Uchrashuvlar: jami {stats.total_meetings}, qatnashilgan {stats.attended_meetings} ({attend_pct}%)\n"
        )

        try:
            response = await self._client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": _INSIGHTS_SYSTEM},
                    {"role": "user", "content": context},
                ],
                temperature=0.4,
                max_tokens=900,
                timeout=15.0,
            )
            content = response.choices[0].message.content or "[]"
            raw: list[dict[str, str]] = json.loads(content)
            return [
                AiInsight(type=item["type"], text=item["text"])
                for item in raw
                if isinstance(item, dict) and "type" in item and "text" in item
            ]
        except Exception as exc:
            logger.warning("AI insights generation failed, using static fallback: %s", exc)
            return _static_fallback(stats)

    async def score_entities(
        self,
        entity_type: str,
        entities: list[dict[str, Any]],
    ) -> dict[str, tuple[float, str]]:
        """Score a list of entities 0-100 with a comment.
        Returns {str(id): (score, comment)}. Empty dict on failure."""
        if self._client is None or not entities:
            return {}

        system = _SCORING_SYSTEM.format(entity_type=entity_type)
        data = json.dumps(entities, ensure_ascii=False, default=str)

        try:
            response = await self._client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": data},
                ],
                temperature=0.2,
                max_tokens=1600,
                timeout=25.0,
            )
            content = response.choices[0].message.content or "[]"
            raw: list[dict[str, Any]] = json.loads(content)
            return {
                str(item["id"]): (round(float(item["score"]), 1), str(item.get("comment", "")))
                for item in raw
                if isinstance(item, dict) and "id" in item and "score" in item
            }
        except Exception as exc:
            logger.warning("AI scoring failed for %s, using formula: %s", entity_type, exc)
            return {}


def _static_fallback(stats: AgencyStats) -> list[AiInsight]:
    insights: list[AiInsight] = []

    plan_pct = round(stats.completed_plans / stats.total_plans * 100) if stats.total_plans else 0
    if plan_pct >= 80:
        insights.append(AiInsight(
            type="positive",
            text=f"Rejalar bajarish darajasi {plan_pct}% — bu a'lo natija! Yoshlar maqsadlarga intilmoqda.",
        ))
    elif plan_pct >= 50:
        insights.append(AiInsight(
            type="warning",
            text=f"Rejalar bajarish darajasi {plan_pct}%. Yaxshi natija, ammo yaxshilash imkoni bor.",
        ))
    else:
        insights.append(AiInsight(
            type="critical",
            text=f"Rejalar bajarish darajasi {plan_pct}% — past ko'rsatkich. Mas'ullar bilan ishlash zarur.",
        ))

    attend_pct = round(stats.attended_meetings / stats.total_meetings * 100) if stats.total_meetings else 0
    if attend_pct >= 75:
        insights.append(AiInsight(
            type="positive",
            text=f"Uchrashuvlarga davomat {attend_pct}% — yoshlar faol ishtirok etmoqda.",
        ))
    else:
        insights.append(AiInsight(
            type="warning",
            text=f"Uchrashuvlarga davomat {attend_pct}%. Davomat ko'rsatkichini oshirish tavsiya etiladi.",
        ))

    if stats.total_masullar > 0:
        ratio = round(stats.active_youth / stats.total_masullar, 1)
        insights.append(AiInsight(
            type="info",
            text=f"Har bir mas'ulga o'rtacha {ratio} nafar faol yosh to'g'ri keladi.",
        ))

    return insights
