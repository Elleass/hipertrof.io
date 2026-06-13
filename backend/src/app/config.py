from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Hipertrof.io API"
    database_url: str = "sqlite:///./hipertrof_dev.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    demo_athlete_id: int = 1

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
