from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.invitations import router as invitations_router
from app.api.routes.leads import router as leads_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.prediction import router as prediction_router
from app.api.routes.users import router as users_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.activities import router as activities_router
from app.api.routes.workload import router as workload_router
from app.api.routes.analytics import router as analytics_router
from app.core.config import settings

api_router = APIRouter(prefix=settings.API_V1_STR)
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(prediction_router, tags=["prediction"])
api_router.include_router(users_router, tags=["users"])
api_router.include_router(leads_router, tags=["leads"])
api_router.include_router(dashboard_router, tags=["dashboard"])
api_router.include_router(invitations_router, tags=["invitations"])
api_router.include_router(tasks_router, tags=["tasks"])
api_router.include_router(activities_router, tags=["activities"])
api_router.include_router(workload_router, tags=["workload"])
api_router.include_router(analytics_router, tags=["analytics"])
