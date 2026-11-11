import os
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies.auth import require_permission
from app.database.models import AuditEvent, UploadedFileRecord, User, utc_now
from app.database.session import get_db

router = APIRouter(prefix="/admin/documents", tags=["Admin Documents & File Storage"])

STORAGE_DIR = Path("storage/uploads").resolve()
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_TYPES = {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit


def detect_magic_type(content: bytes) -> str | None:
    """Detect binary signature (magic bytes) to strictly identify MIME type."""
    if not content or len(content) < 4:
        return None
    if content.startswith(b"%PDF-"):
        return "application/pdf"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"RIFF") and len(content) >= 16 and b"WEBP" in content[8:16]:
        return "image/webp"
    if content.startswith(b"PK\x03\x04"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return None


def validate_magic_bytes(content: bytes, content_type: str) -> bool:
    """Validate binary file header signatures against claimed MIME type."""
    detected = detect_magic_type(content)
    if not detected:
        return False
    if content_type in ("image/jpeg", "image/jpg") and detected == "image/jpeg":
        return True
    return detected == content_type


class UploadedFileResponse(BaseModel):
    id: str
    filename: str
    stored_filename: str
    content_type: str
    file_size: int
    category: str
    download_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedFilesResponse(BaseModel):
    items: list[UploadedFileResponse]
    total: int
    page: int
    limit: int


@router.post("/upload", response_model=UploadedFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("general"),
    current_user: User = Depends(require_permission("products.update")),
    db: AsyncSession = Depends(get_db),
):
    """Securely upload product dossiers, COAs, or commercial files with strict MIME and size checks."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File name must not be empty.")

    # 1. Reject path traversal attempts and sanitize metadata filename
    if ".." in file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path traversal sequences '..' are strictly prohibited in filename.",
        )

    raw_name = os.path.basename(file.filename)
    original_name = re.sub(r'[^\w.\- ]', '_', raw_name).strip()[:128]
    if not original_name:
        original_name = "upload"
    extension = os.path.splitext(original_name)[1].lower()

    # 2. Validate MIME type & extension
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES or extension not in ALLOWED_MIME_TYPES[content_type]:
        valid_exts = [ext for exts in ALLOWED_MIME_TYPES.values() for ext in exts]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Permitted extensions: {', '.join(valid_exts)}",
        )

    # 3. Read content in bounded chunks and enforce size limits (prevents memory DoS)
    chunks: list[bytes] = []
    file_size = 0
    chunk_size = 64 * 1024  # 64 KB
    while chunk := await file.read(chunk_size):
        file_size += len(chunk)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE if hasattr(status, "HTTP_413_CONTENT_TOO_LARGE") else 413,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)

    if file_size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file cannot be 0 bytes.")

    content = b"".join(chunks)

    # 4. Strict binary magic signature validation & extension verification
    detected_type = detect_magic_type(content)
    if not detected_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match any recognized permitted file signature.",
        )
    if not validate_magic_bytes(content, content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Binary content does not match signature for claimed MIME type '{content_type}'.",
        )
    if extension not in ALLOWED_MIME_TYPES.get(detected_type, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{extension}' does not match detected binary type '{detected_type}'.",
        )

    # 5. Generate purely random storage filename (<uuid>.<ext>), never user-derived
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    target_path = STORAGE_DIR / stored_filename

    # Ensure resolved path is strictly inside STORAGE_DIR
    if not str(target_path.resolve()).startswith(str(STORAGE_DIR)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file destination path.")

    with open(target_path, "wb") as f:
        f.write(content)

    # 5. Persist record in database
    record = UploadedFileRecord(
        filename=original_name,
        stored_filename=stored_filename,
        file_path=str(target_path),
        content_type=content_type,
        file_size=file_size,
        category=category.strip().lower(),
        uploader_id=current_user.id,
        created_at=utc_now(),
    )
    db.add(record)

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="DOCUMENT_UPLOADED",
        description=f"File '{original_name}' ({file_size} bytes, category: {category}) uploaded by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(record)

    return UploadedFileResponse(
        id=record.id,
        filename=record.filename,
        stored_filename=record.stored_filename,
        content_type=record.content_type,
        file_size=record.file_size,
        category=record.category,
        download_url=f"/api/v1/admin/documents/{record.id}/download",
        created_at=record.created_at,
    )


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: User = Depends(require_permission("products.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve and stream authorized private pharmaceutical dossiers with RBAC enforcement."""
    stmt = select(UploadedFileRecord).where(UploadedFileRecord.id == document_id)
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document record not found.")

    file_path = Path(record.file_path)
    if not file_path.exists() or not str(file_path.resolve()).startswith(str(STORAGE_DIR)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical document file missing on server.")

    audit_entry = AuditEvent(
        user_id=current_user.id,
        event_type="DOCUMENT_DOWNLOADED",
        description=f"File '{record.filename}' (ID: {record.id}) downloaded by {current_user.email}.",
        created_at=utc_now(),
    )
    db.add(audit_entry)
    await db.commit()

    safe_filename = re.sub(r'[\r\n",;/\\]', '_', record.filename)
    return FileResponse(
        path=str(file_path),
        filename=record.filename,
        media_type=record.content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("", response_model=PaginatedFilesResponse)
async def list_uploaded_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    category: str | None = Query(None),
    current_user: User = Depends(require_permission("products.read")),
    db: AsyncSession = Depends(get_db),
):
    """List all persisted document records."""
    query = select(UploadedFileRecord)
    if category:
        query = query.where(UploadedFileRecord.category == category.strip().lower())

    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    offset = (page - 1) * limit
    paged_query = query.order_by(UploadedFileRecord.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(paged_query)
    records = res.scalars().all()

    items = [
        UploadedFileResponse(
            id=r.id,
            filename=r.filename,
            stored_filename=r.stored_filename,
            content_type=r.content_type,
            file_size=r.file_size,
            category=r.category,
            download_url=f"/api/v1/admin/documents/{r.id}/download",
            created_at=r.created_at,
        )
        for r in records
    ]

    return PaginatedFilesResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )

