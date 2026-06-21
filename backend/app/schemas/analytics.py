from pydantic import BaseModel

class TrendData(BaseModel):
    date: str
    count: int

class CategoryDistribution(BaseModel):
    category: str
    count: int

class SeverityDistribution(BaseModel):
    severity: str
    count: int

class AnalyticsResponse(BaseModel):
    total_reviews: int
    reviews_this_week: int
    reviews_this_month: int
    trends: list[TrendData]
    category_distribution: list[CategoryDistribution]
    severity_distribution: list[SeverityDistribution]
