"""应用配置

所有配置从环境变量读取, 提供合理的默认值用于本地开发。
生产环境必须通过 .env 或环境管理工具设置所有密钥。
"""
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 应用
    APP_NAME: str = "学迹 / Xueji"
    APP_ENV: str = Field(default="development", description="development | staging | production")
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    # 服务
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 数据库
    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://xueji:xueji@localhost:5432/xueji",
        description="PostgreSQL 连接 URL",
    )
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # 跨域 (本地开发)
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # JWT
    JWT_SECRET: str = Field(default="change-me-in-production-please", description="JWT 密钥, 生产必须改")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # 注册邀请码 (留空 = 开放注册; 多个用逗号分隔)
    INVITE_CODES: Optional[str] = None

    # 阿里云 OSS
    ALIYUN_OSS_ACCESS_KEY_ID: Optional[str] = None
    ALIYUN_OSS_ACCESS_KEY_SECRET: Optional[str] = None
    ALIYUN_OSS_BUCKET: Optional[str] = None
    ALIYUN_OSS_ENDPOINT: Optional[str] = None
    ALIYUN_OSS_CDN_DOMAIN: Optional[str] = None

    # 阿里云 OCR
    ALIYUN_OCR_ACCESS_KEY_ID: Optional[str] = None
    ALIYUN_OCR_ACCESS_KEY_SECRET: Optional[str] = None
    ALIYUN_OCR_REGION: str = "cn-shanghai"

    # 智谱 GLM
    ZHIPU_API_KEY: Optional[str] = None
    ZHIPU_MODEL: str = "glm-4-flash"  # 便宜且快, 适合错因辅助

    # 推送
    WECHAT_PUSH_APP_ID: Optional[str] = None
    WECHAT_PUSH_APP_SECRET: Optional[str] = None

    # 学习设置
    DAILY_STUDY_LIMIT_MINUTES: int = 30
    LOCK_AT_NIGHT: bool = True
    LOCK_TIME: str = "21:00"

    # 错题复习间隔 (天)
    REVIEW_INTERVALS_DAYS: list[float] = [0.17, 1, 3, 7, 14, 30]  # 4h=0.17d


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()
