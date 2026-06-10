import json
import logging
from typing import Any

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.modules.stats.schemas import AgencyStats, AiInsight

logger = logging.getLogger(__name__)

_INSIGHTS_SYSTEM = """\
Sen O'zbekiston yoshlar agentligi uchun tahlil qiluvchi AI yordamchisisan.
Yoshlar agentligi — yosh fuqarolarning rivojlanishini kuzatib boradigan davlat tashkiloti.
Mas'ullar yoshlar bilan ishlaydi, rejalar tuzadi va uchrashuvlar o'tkazadi.

Senga berilgan statistik ma'lumotlar asosida 4-6 ta foydali tavsiya va xulosalar ber.

Har bir tavsiya quyidagi JSON formatda bo'lsin:
{"type": "positive"|"warning"|"info"|"critical", "text": "O'zbek tilida aniq va amaliy tavsiya"}

Turlar:
- "positive": yaxshi natijalar (80%+ bajarilish, yuqori davomat)
- "warning": e'tibor talab qiladigan holat (50-79%)
- "critical": jiddiy muammo (50% dan past ko'rsatkich)
- "info": foydali ma'lumot yoki tavsiya

Qoidalar:
- Faqat raqamlarni takrorlamang — aniq, amaliy tavsiya bering
- Har bir matn 1-2 jumladan iborat bo'lsin
- Faqat JSON massiv qaytaring, boshqa matn yo'q
"""

_SCORING_SYSTEM = """\
Sen O'zbekiston yoshlar agentligi uchun reyting hisoblash AI yordamchisisang.
Senga bir nechta {entity_type} ma'lumotlari beriladi. Har birini 0-100 ball bilan baholab ber.

Baholash mezonlari:
- Rejalar bajarilishi (plan_pct): asosiy mezon, og'irligi 55%
- Uchrashuvlar davomati (meet_pct): ikkinchi mezon, og'irligi 35%
- Nisbiy samaradorlik (guruh ichida taqqoslash): 10%

Qoidalar:
- Guruh ichida nisbiy baholash: eng yaxshisi 88-98 ball, eng yomoni 8-22 ball
- O'rta ko'rsatkich: 45-65 ball atrofida
- Barcha ko'rsatkichlar 0 bo'lsa ham minimal ball ber (8-15)
- Ball 0.1 aniqlikda bo'lsin

Faqat JSON massiv qaytargin, boshqa matn yo'q:
[{{"id": "...", "score": 72.5}}, ...]
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
    ) -> dict[str, float]:
        """Score a list of entities 0-100. Returns {str(id): score}. Empty dict on failure."""
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
                max_tokens=1200,
                timeout=20.0,
            )
            content = response.choices[0].message.content or "[]"
            raw: list[dict[str, Any]] = json.loads(content)
            return {
                str(item["id"]): round(float(item["score"]), 1)
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
