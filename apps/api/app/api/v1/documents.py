import os
import uuid
import re
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from app.database.session import get_db
from app.database.models import UploadedFileRecord, User, AuditEvent, utc_now
from app.core.dependencies.auth import require_admin_user, require_permission

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
    items: List[UploadedFileResponse]
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

    # 1. Clean original filename & extension
    original_name = os.path.basename(file.filename)
    extension = os.path.splitext(original_name)[1].lower()

    # 2. Validate MIME type & extension
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES or extension not in ALLOWED_MIME_TYPES[content_type]:
        valid_exts = [ext for exts in ALLOWED_MIME_TYPES.values() for ext in exts]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Permitted extensions: {', '.join(valid_exts)}",
        )

    # 3. Read content and enforce size limits
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file cannot be 0 bytes.")

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    # 4. Generate unique, safe storage filename preventing path traversal
    clean_base = re.sub(r'[^a-zA-Z0-9_\-]', '', os.path.splitext(original_name)[0])[:32]
    stored_filename = f"{uuid.uuid4().hex[:12]}_{clean_base}{extension}"
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

    return FileResponse(
        path=str(file_path),
        filename=record.filename,
        media_type=record.content_type,
    )


@router.get("", response_model=PaginatedFilesResponse)
async def list_uploaded_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    category: Optional[str] = Query(None),
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

