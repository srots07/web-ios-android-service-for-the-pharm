from passlib.context import CryptContext

# Use Argon2id as required by enterprise security specification
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)


def hash_password(password: str) -> str:
    """Hash password using Argon2id algorithm."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash."""
    return pwd_context.verify(plain_password, hashed_password)


# Precomputed valid Argon2id hash for constant-time dummy verification on unknown accounts
DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$ypmzVso5h9DaOwdA6H0PAQ$25PeH026v93/fdJ7EZeO7hFYhdkWbL4c75caKg3khbk"

