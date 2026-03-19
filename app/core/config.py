import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name: str = "Wealth Manager Arena"
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model: str = "claude-3-5-haiku-20241022"


settings = Settings()
