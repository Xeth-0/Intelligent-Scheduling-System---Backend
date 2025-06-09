from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
	APP_ENV: str = os.getenv("APP_ENV", "development")
	APP_NAME: str = "Scheduling Service API"
	SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")

settings = Settings()
