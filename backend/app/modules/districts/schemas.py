from app.core.base_schema import CamelModel, schema_example


class DistrictRead(CamelModel):
    model_config = schema_example(
        {"id": "Bekobod tumani", "name": "Bekobod tumani"}
    )
    id: str
    name: str
