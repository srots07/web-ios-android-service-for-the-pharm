"""w12_security_hardening_columns

Revision ID: a1c4e7f90123
Revises: 54132424bde8
Create Date: 2026-11-11 18:05:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1c4e7f90123"
down_revision: str | Sequence[str] | None = "54132424bde8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema with safe idempotency checks for security hardening columns."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Add customer_id to orders, quotations, inquiries for tenant isolation
    for table in ["orders", "quotations", "inquiries"]:
        cols = [c["name"] for c in inspector.get_columns(table)]
        if "customer_id" not in cols:
            op.add_column(table, sa.Column("customer_id", sa.String(length=36), nullable=True))
            op.create_index(op.f(f"ix_{table}_customer_id"), table, ["customer_id"], unique=False)

    # 2. Add token_version to users for global access token invalidation
    user_cols = [c["name"] for c in inspector.get_columns("users")]
    if "token_version" not in user_cols:
        op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="1"))

    # 3. Add family_id to user_sessions for refresh token reuse detection
    session_cols = [c["name"] for c in inspector.get_columns("user_sessions")]
    if "family_id" not in session_cols:
        op.add_column("user_sessions", sa.Column("family_id", sa.String(length=36), nullable=True))
        op.create_index(op.f("ix_user_sessions_family_id"), "user_sessions", ["family_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema columns."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    session_cols = [c["name"] for c in inspector.get_columns("user_sessions")]
    if "family_id" in session_cols:
        op.drop_index(op.f("ix_user_sessions_family_id"), table_name="user_sessions")
        op.drop_column("user_sessions", "family_id")

    user_cols = [c["name"] for c in inspector.get_columns("users")]
    if "token_version" in user_cols:
        op.drop_column("users", "token_version")

    for table in ["orders", "quotations", "inquiries"]:
        cols = [c["name"] for c in inspector.get_columns(table)]
        if "customer_id" in cols:
            op.drop_index(op.f(f"ix_{table}_customer_id"), table_name=table)
            op.drop_column(table, "customer_id")

