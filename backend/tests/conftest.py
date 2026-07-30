"""pytest 公共 fixtures"""
import asyncio
import os
import sys
from pathlib import Path

# 让 pytest 找到 app 包
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# 测试环境不连真 DB
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://xueji:xueji@localhost:5432/xueji_test")
os.environ.setdefault("JWT_SECRET", "test-secret-do-not-use-in-prod-1234567890")
