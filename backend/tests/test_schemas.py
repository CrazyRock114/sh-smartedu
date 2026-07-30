"""Pydantic schema 校验测试"""
import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.child import (
    SUBJECTS,
    TEXTBOOK_VERSIONS,
    ChildCreate,
    SubjectTextbookVersion,
)
from app.schemas.error import (
    ERROR_TYPES,
    ErrorItemCreate,
    ReviewSubmitRequest,
)
from app.schemas.push import (
    PUSH_CHANNELS,
    PUSH_TYPES,
    PushPreferenceUpdate,
    SubscribeRequest,
)


class TestAuthSchemas:
    def test_register_valid(self):
        r = RegisterRequest(email="a@b.com", password="12345678", nickname="石头")
        assert r.email == "a@b.com"
        assert r.nickname == "石头"
        assert r.invite_code is None

    def test_register_password_too_short(self):
        with pytest.raises(ValidationError) as exc:
            RegisterRequest(email="a@b.com", password="short")
        assert "password" in str(exc.value).lower()

    def test_register_invalid_email(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="not-an-email", password="12345678")

    def test_login_valid(self):
        l = LoginRequest(email="a@b.com", password="anything")
        assert l.email == "a@b.com"


class TestChildSchemas:
    def test_child_create_with_textbook(self):
        c = ChildCreate(
            name="小宝",
            grade=3,
            textbook_versions=[
                SubjectTextbookVersion(subject="math", version="沪教版"),
                SubjectTextbookVersion(subject="chinese", version="统编版"),
            ],
        )
        assert c.name == "小宝"
        assert c.grade == 3
        assert len(c.textbook_versions) == 2

    def test_grade_out_of_range(self):
        with pytest.raises(ValidationError):
            ChildCreate(name="x", grade=7, textbook_versions=[])

    def test_textbook_invalid_subject(self):
        with pytest.raises(ValidationError) as exc:
            ChildCreate(
                name="x",
                grade=3,
                textbook_versions=[SubjectTextbookVersion(subject="physics", version="x")],
            )
        assert "不支持的学科" in str(exc.value) or "subject" in str(exc.value).lower()

    def test_textbook_invalid_version(self):
        # 沪教版数学允许: ['沪教版', '人教版', '北师大版', '苏教版']
        # 用一个不存在的版本触发校验失败
        with pytest.raises(ValidationError) as exc:
            ChildCreate(
                name="x",
                grade=3,
                textbook_versions=[SubjectTextbookVersion(subject="math", version="外星版")],
            )
        assert "不支持" in str(exc.value) or "version" in str(exc.value).lower()

    def test_subjects_have_consistent_textbook_config(self):
        for s in SUBJECTS:
            assert s in TEXTBOOK_VERSIONS, f"{s} not in TEXTBOOK_VERSIONS"


class TestErrorSchemas:
    def test_error_item_create_valid(self):
        e = ErrorItemCreate(
            subject="math",
            question_text="1+1=?",
            correct_answer="2",
            student_answer="3",
            error_type="CARELESS",
        )
        assert e.subject == "math"
        assert e.source == "manual"  # 默认值

    def test_invalid_error_type(self):
        with pytest.raises(ValidationError):
            ErrorItemCreate(
                subject="math",
                question_text="1+1=?",
                correct_answer="2",
                student_answer="3",
                error_type="RANDOM_GUESS",
            )

    def test_all_error_types_listed(self):
        # 至少 7 类
        assert len(ERROR_TYPES) >= 7
        assert "CARELESS" in ERROR_TYPES
        assert "KNOWLEDGE_GAP" in ERROR_TYPES

    def test_review_result_valid(self):
        r = ReviewSubmitRequest(result="correct", time_spent_seconds=30)
        assert r.result == "correct"

    def test_review_result_invalid(self):
        with pytest.raises(ValidationError):
            ReviewSubmitRequest(result="maybe")


class TestPushSchemas:
    def test_subscribe_valid(self):
        s = SubscribeRequest(push_type="weekly", push_time="19:30")
        assert s.push_time == "19:30"

    def test_invalid_push_time(self):
        with pytest.raises(ValidationError):
            SubscribeRequest(push_type="weekly", push_time="25:99")

    def test_invalid_push_type(self):
        with pytest.raises(ValidationError):
            SubscribeRequest(push_type="hourly")

    def test_push_types_complete(self):
        assert {"daily", "weekly", "alert", "monthly"}.issubset(set(PUSH_TYPES))
        assert "wechat_sub" in PUSH_CHANNELS

    def test_preference_update_partial(self):
        p = PushPreferenceUpdate(daily_limit_minutes=45, lock_at_night=False)
        assert p.daily_limit_minutes == 45
        assert p.push_time is None  # 字段可选

    def test_preference_update_daily_limit_range(self):
        with pytest.raises(ValidationError):
            PushPreferenceUpdate(daily_limit_minutes=2)  # 最小 5
        with pytest.raises(ValidationError):
            PushPreferenceUpdate(daily_limit_minutes=300)  # 最大 180
