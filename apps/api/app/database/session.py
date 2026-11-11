from collections.abc import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

from app.config.settings import settings
from app.core.security.passwords import hash_password
from app.database.models import (
    AuditEvent,
    Base,
    Order,
    OrderItem,
    OrderStatusHistory,
    Permission,
    PlatformSetting,
    ProductCategory,
    ProductItem,
    Quotation,
    QuotationItem,
    Role,
    User,
    utc_now,
)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


SYSTEM_PERMISSIONS = [
    # Users
    {"slug": "users.read", "name": "View Users", "module": "Users", "description": "Can view customer and staff accounts"},
    {"slug": "users.create", "name": "Create Users", "module": "Users", "description": "Can create new user accounts"},
    {"slug": "users.update", "name": "Update Users", "module": "Users", "description": "Can modify user accounts and roles"},
    {"slug": "users.delete", "name": "Delete Users", "module": "Users", "description": "Can remove user accounts"},
    {"slug": "users.suspend", "name": "Suspend Users", "module": "Users", "description": "Can suspend or revoke user access"},
    # Products
    {"slug": "products.read", "name": "View Products", "module": "Products", "description": "Can view catalogue and specifications"},
    {"slug": "products.create", "name": "Create Products", "module": "Products", "description": "Can register new formulations"},
    {"slug": "products.update", "name": "Update Products", "module": "Products", "description": "Can edit product technical details"},
    {"slug": "products.delete", "name": "Delete Products", "module": "Products", "description": "Can remove product formulations"},
    {"slug": "products.publish", "name": "Publish Products", "module": "Products", "description": "Can publish/archive products"},
    # Orders
    {"slug": "orders.read", "name": "View Orders", "module": "Orders", "description": "Can view B2B orders and inquiries"},
    {"slug": "orders.update", "name": "Update Orders", "module": "Orders", "description": "Can edit order specifications"},
    {"slug": "orders.assign", "name": "Assign Orders", "module": "Orders", "description": "Can assign orders to administrators"},
    {"slug": "orders.status", "name": "Manage Order Status", "module": "Orders", "description": "Can transition order workflows"},
    # Quotations
    {"slug": "quotations.read", "name": "View Quotations", "module": "Quotations", "description": "Can view formal quotations"},
    {"slug": "quotations.create", "name": "Create Quotations", "module": "Quotations", "description": "Can generate commercial quotations"},
    {"slug": "quotations.update", "name": "Update Quotations", "module": "Quotations", "description": "Can edit quotation terms and pricing"},
    {"slug": "quotations.approve", "name": "Approve Quotations", "module": "Quotations", "description": "Can approve and dispatch quotations"},
    # Roles
    {"slug": "roles.read", "name": "View Roles", "module": "Roles", "description": "Can inspect RBAC roles and permissions"},
    {"slug": "roles.manage", "name": "Manage Roles", "module": "Roles", "description": "Can create and assign roles and permissions"},
    # Inquiries
    {"slug": "inquiries.read", "name": "View Inquiries", "module": "Inquiries", "description": "Can view commercial inquiries"},
    {"slug": "inquiries.manage", "name": "Manage Inquiries", "module": "Inquiries", "description": "Can assign, transition, and annotate inquiries"},
    # Settings
    {"slug": "settings.read", "name": "View Settings", "module": "Settings", "description": "Can view system and business configurations"},
    {"slug": "settings.update", "name": "Update Settings", "module": "Settings", "description": "Can modify platform settings"},
    # Documents
    {"slug": "documents.read", "name": "Download Documents", "module": "Documents", "description": "Can download technical and regulatory documents"},
    {"slug": "documents.upload", "name": "Upload Documents", "module": "Documents", "description": "Can upload technical dossiers and COAs"},
    {"slug": "documents.delete", "name": "Delete Documents", "module": "Documents", "description": "Can remove attached documents"},
]


async def init_db() -> None:
    """Initialize database tables and seed required admin, roles, permissions, and catalog records."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as session:
        # 1. Seed Permissions
        perm_map: dict[str, Permission] = {}
        for p_def in SYSTEM_PERMISSIONS:
            stmt = select(Permission).where(Permission.slug == p_def["slug"])
            res = await session.execute(stmt)
            perm = res.scalar_one_or_none()
            if not perm:
                perm = Permission(
                    slug=p_def["slug"],
                    name=p_def["name"],
                    module=p_def["module"],
                    description=p_def["description"],
                )
                session.add(perm)
                await session.flush()
            perm_map[str(perm.slug)] = perm

        # 2. Seed System Roles
        system_roles_def = [
            {
                "name": "Super Administrator",
                "slug": "super_admin",
                "description": "Full unconstrained administrative access across all platform modules.",
                "perms": list(perm_map.keys()),
            },
            {
                "name": "Platform Administrator",
                "slug": "admin",
                "description": "Enterprise administrator with full operational privileges.",
                "perms": list(perm_map.keys()),
            },
            {
                "name": "Product Manager",
                "slug": "product_manager",
                "description": "Manages formulations, regulatory dossiers, categories, and catalog listings.",
                "perms": [p for p in perm_map if p.startswith("products.") or p in ("orders.read", "quotations.read")],
            },
            {
                "name": "Commercial & Order Manager",
                "slug": "order_manager",
                "description": "Supervises procurement inquiries, quotations, batch pricing, and order fulfillment.",
                "perms": [p for p in perm_map if p.startswith(("orders.", "quotations.")) or p in ("products.read", "users.read")],
            },
            {
                "name": "Customer Support",
                "slug": "support",
                "description": "Assists healthcare professionals and institutions with order and catalog queries.",
                "perms": ["users.read", "orders.read", "quotations.read", "products.read"],
            },
        ]

        role_map: dict[str, Role] = {}
        for r_def in system_roles_def:
            stmt = select(Role).options(selectinload(Role.permissions)).where(Role.slug == r_def["slug"])
            res = await session.execute(stmt)
            role = res.scalar_one_or_none()
            if not role:
                role = Role(
                    name=r_def["name"],
                    slug=r_def["slug"],
                    description=r_def["description"],
                    is_system=True,
                    created_at=utc_now(),
                )
                session.add(role)
                await session.flush()
                # Re-query with selectinload
                stmt = select(Role).options(selectinload(Role.permissions)).where(Role.id == role.id)
                res = await session.execute(stmt)
                role = res.scalar_one()

            # Sync permissions to role
            target_perms = [perm_map[slug] for slug in r_def["perms"] if slug in perm_map]
            role.permissions = target_perms
            role_map[str(role.slug)] = role

        # 3. Seed default administrative account if missing
        stmt = select(User).options(selectinload(User.roles)).where(User.email == settings.DEFAULT_ADMIN_EMAIL.lower())
        result = await session.execute(stmt)
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                email=settings.DEFAULT_ADMIN_EMAIL.lower(),
                full_name=settings.DEFAULT_ADMIN_NAME,
                password_hash=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                role="admin",
                account_type="Platform Administrator",
                is_active=True,
                is_verified=True,
                created_at=utc_now(),
            )
            session.add(admin_user)
            await session.flush()
            stmt = select(User).options(selectinload(User.roles)).where(User.id == admin_user.id)
            res = await session.execute(stmt)
            admin_user = res.scalar_one()

            audit_log = AuditEvent(
                user_id=admin_user.id,
                event_type="SYSTEM_BOOTSTRAP",
                description=f"Initial platform administrator account ({settings.DEFAULT_ADMIN_EMAIL}) initialized.",
                created_at=utc_now(),
            )
            session.add(audit_log)

        # Attach super_admin role to admin user and ensure active admin status
        admin_user.role = "admin"
        admin_user.is_active = True
        if "super_admin" in role_map and role_map["super_admin"] not in admin_user.roles:
            admin_user.roles.append(role_map["super_admin"])

        # 4. Seed verified formulations if missing
        seed_products = [
            {
                "id": "tab-001",
                "name": "Daily Multivitamin Plus",
                "category": "Tablets",
                "sku": "TAB-001",
                "product_code": "PRM-TAB-001",
                "dosage_form": "Film-coated Tablet",
                "strength": "High-Potency Complex",
                "composition": "Vitamin A, B-Complex (B1, B2, B6, B12), C, D3, E, Zinc, Iodine, Selenium",
                "pack_size": "60 Tablets / HDPE Bottle",
                "description": "Comprehensive daily micronutrient formula supporting immune resilience, cellular metabolism, and energy vitality in adults.",
                "storage_conditions": "Store below 25°C in a dry place. Protect from direct sunlight.",
                "shelf_life": "24 Months",
                "status": "Published",
                "is_published": True,
            },
            {
                "id": "tab-002",
                "name": "Active Calcium + D3",
                "category": "Tablets",
                "sku": "TAB-002",
                "product_code": "PRM-TAB-002",
                "dosage_form": "Chewable Tablet",
                "strength": "500 mg Elemental Calcium + 400 IU D3",
                "composition": "Calcium Carbonate eq. to Elemental Calcium 500mg, Cholecalciferol (Vitamin D3) 400 IU",
                "pack_size": "30 Tablets / Blister Pack",
                "description": "High-absorption calcium supplement fortified with Vitamin D3 for optimal bone density, structural strength, and muscle function.",
                "storage_conditions": "Store in a cool, dry place away from moisture.",
                "shelf_life": "36 Months",
                "status": "Published",
                "is_published": True,
            },
            {
                "id": "syr-001",
                "name": "Paediatric Cough & Cold Relief",
                "category": "Syrups / Susp.",
                "sku": "SYR-001",
                "product_code": "PRM-SYR-001",
                "dosage_form": "Oral Suspension",
                "strength": "Paediatric formulation",
                "composition": "Dextromethorphan HBr 5mg, Chlorpheniramine Maleate 2mg per 5ml",
                "pack_size": "100 ml Amber PET Bottle with calibrated measuring cup",
                "description": "Gentle, non-drowsy paediatric cough and bronchial congestion formula with child-friendly natural berry flavoring.",
                "storage_conditions": "Store below 30°C. Do not freeze.",
                "shelf_life": "24 Months",
                "status": "Published",
                "is_published": True,
            },
            {
                "id": "drp-001",
                "name": "Vitality Kids Zinc Drops",
                "category": "Paediatric Drops",
                "sku": "DRP-001",
                "product_code": "PRM-DRP-001",
                "dosage_form": "Oral Drops",
                "strength": "10 mg/ml Elemental Zinc",
                "composition": "Zinc Gluconate eq. to Elemental Zinc 10 mg/ml",
                "pack_size": "30 ml Glass Dropper Bottle",
                "description": "Bioavailable liquid zinc drops formulated for infants and young children to support cellular immunity and healthy physical growth.",
                "storage_conditions": "Keep bottle tightly closed in a cool, dry place.",
                "shelf_life": "24 Months",
                "status": "Published",
                "is_published": True,
            },
            {
                "id": "ofc-001",
                "name": "Omega-3 Pure Marine Oil",
                "category": "Oil Filled Capsules",
                "sku": "OFC-001",
                "product_code": "PRM-OFC-001",
                "dosage_form": "Soft Gelatin Capsule",
                "strength": "1000 mg (EPA 180mg / DHA 120mg)",
                "composition": "Purified Deep Sea Fish Oil Concentrate 1000 mg",
                "pack_size": "60 Softgels / Bottle",
                "description": "Molecularly distilled, heavy metal-screened omega-3 essential fatty acids supporting cardiovascular health, cognitive clarity, and joint mobility.",
                "storage_conditions": "Store at room temperature below 25°C. Avoid excessive heat.",
                "shelf_life": "24 Months",
                "status": "Published",
                "is_published": True,
            },
            {
                "id": "cap-001",
                "name": "Probiotic Multi-Flora Digest",
                "category": "Capsules",
                "sku": "CAP-001",
                "product_code": "PRM-CAP-001",
                "dosage_form": "Delayed-Release Veg Capsule",
                "strength": "10 Billion CFU Multi-Strain",
                "composition": "Lactobacillus acidophilus, Bifidobacterium lactis, Lactobacillus rhamnosus (10 Billion Active CFU)",
                "pack_size": "30 Capsules / Alu-Alu Blister",
                "description": "Enteric-coated multi-strain probiotic designed to survive gastric acid and restore balanced gastrointestinal microbiota.",
                "storage_conditions": "Store in a cool dry place. Refrigeration recommended after opening.",
                "shelf_life": "18 Months",
                "status": "Published",
                "is_published": True,
            },
        ]

        for p_data in seed_products:
            stmt = select(ProductItem).where(ProductItem.sku == p_data["sku"])
            p_result = await session.execute(stmt)
            existing_prod = p_result.scalar_one_or_none()
            if not existing_prod:
                product = ProductItem(
                    id=p_data["id"],
                    name=p_data["name"],
                    category=p_data["category"],
                    sku=p_data["sku"],
                    product_code=p_data.get("product_code"),
                    dosage_form=p_data.get("dosage_form"),
                    strength=p_data.get("strength"),
                    composition=p_data.get("composition"),
                    pack_size=p_data["pack_size"],
                    description=p_data["description"],
                    storage_conditions=p_data.get("storage_conditions"),
                    shelf_life=p_data.get("shelf_life"),
                    status=p_data.get("status", "Published"),
                    is_published=p_data.get("is_published", True),
                    created_at=utc_now(),
                    updated_at=utc_now(),
                )
                session.add(product)
            else:
                # Update empty fields if already seeded previously
                if not existing_prod.description:
                    existing_prod.description = p_data["description"]
                    existing_prod.product_code = p_data.get("product_code")
                    existing_prod.dosage_form = p_data.get("dosage_form")
                    existing_prod.strength = p_data.get("strength")
                    existing_prod.composition = p_data.get("composition")
                    existing_prod.storage_conditions = p_data.get("storage_conditions")
                    existing_prod.shelf_life = p_data.get("shelf_life")
                    existing_prod.status = "Published"

        # 5. Seed initial commercial order and quotation if none exist
        stmt = select(Order)
        order_res = await session.execute(stmt)
        if not order_res.scalars().first():
            order_1 = Order(
                order_number="ORD-2026-00101",
                customer_name="Dr. Marcus Vance",
                customer_email="m.vance@stjudehospital.org",
                organization="St. Jude Regional Healthcare Center",
                country="United Kingdom",
                status="In Review",
                assigned_admin_id=admin_user.id,
                total_estimated_amount="$28,400.00",
                delivery_terms="CIF London Gateway (Incoterms 2020)",
                internal_notes="Institutional tender requisition. Target delivery within 45 days.",
                created_at=utc_now(),
                updated_at=utc_now(),
            )
            session.add(order_1)
            await session.flush()

            item_1 = OrderItem(
                order_id=order_1.id,
                product_id="tab-001",
                product_name="Daily Multivitamin Plus",
                sku="TAB-001",
                quantity=5000,
                target_pack_size="60 Tablets / Bottle",
            )
            item_2 = OrderItem(
                order_id=order_1.id,
                product_id="ofc-001",
                product_name="Omega-3 Pure Marine Oil",
                sku="OFC-001",
                quantity=3000,
                target_pack_size="60 Softgels / Bottle",
            )
            session.add_all([item_1, item_2])

            history_1 = OrderStatusHistory(
                order_id=order_1.id,
                previous_status="Submitted",
                new_status="In Review",
                changed_by=admin_user.full_name,
                reason="Commercial qualification verified and assigned to Chief Medical Officer.",
                created_at=utc_now(),
            )
            session.add(history_1)

            # Seed a quotation for order_1
            quotation_1 = Quotation(
                quotation_number="QT-2026-0881",
                order_id=order_1.id,
                recipient_name="Dr. Marcus Vance",
                recipient_email="m.vance@stjudehospital.org",
                organization="St. Jude Regional Healthcare Center",
                country="United Kingdom",
                status="Sent",
                valid_until=utc_now(),
                currency="USD",
                total_amount=28400.0,
                commercial_terms="Payment: 50% deposit upon proforma invoice, 50% against bill of lading. Valid for 30 days.",
                created_by_user_id=admin_user.id,
                created_at=utc_now(),
            )
            session.add(quotation_1)
            await session.flush()

            q_item_1 = QuotationItem(
                quotation_id=quotation_1.id,
                product_id="tab-001",
                product_name="Daily Multivitamin Plus",
                sku="TAB-001",
                quantity=5000,
                unit_price=3.20,
                total_price=16000.0,
            )
            q_item_2 = QuotationItem(
                quotation_id=quotation_1.id,
                product_id="ofc-001",
                product_name="Omega-3 Pure Marine Oil",
                sku="OFC-001",
                quantity=3000,
                unit_price=4.133,
                total_price=12400.0,
            )
            session.add_all([q_item_1, q_item_2])

        # 6. Seed Product Categories if missing
        seed_categories = [
            {"id": "cat-tab", "name": "Tablets", "slug": "tablets", "description": "Film-coated and chewable solid oral dosage formulations", "display_order": 1},
            {"id": "cat-syr", "name": "Syrups / Susp.", "slug": "syrups-susp", "description": "Liquid oral suspensions, paediatric expectorants and tonics", "display_order": 2},
            {"id": "cat-drp", "name": "Paediatric Drops", "slug": "paediatric-drops", "description": "Concentrated oral micronutrient and antibiotic drop formulations", "display_order": 3},
            {"id": "cat-cap", "name": "Capsules", "slug": "capsules", "description": "Hard gelatin and delayed-release enteric vegetable capsules", "display_order": 4},
            {"id": "cat-ofc", "name": "Oil Filled Capsules", "slug": "oil-filled-capsules", "description": "Soft gelatin encapsulated marine and lipid formulations", "display_order": 5},
        ]
        for c_data in seed_categories:
            c_stmt = select(ProductCategory).where(ProductCategory.slug == c_data["slug"])
            c_res = await session.execute(c_stmt)
            if not c_res.scalar_one_or_none():
                cat = ProductCategory(
                    id=c_data["id"],
                    name=c_data["name"],
                    slug=c_data["slug"],
                    description=c_data["description"],
                    display_order=c_data["display_order"],
                    created_at=utc_now(),
                )
                session.add(cat)

        # 7. Seed Platform Settings if missing
        seed_settings = [
            {"key": "company_name", "value": "PRIME by Activist Healthcare", "description": "Registered company and brand name", "category": "general"},
            {"key": "support_email", "value": "contact@primebyactivist.com", "description": "Primary institutional contact email", "category": "general"},
            {"key": "support_phone", "value": "+91 (0) 22 4567 8900", "description": "Global regulatory and procurement desk", "category": "general"},
            {"key": "default_currency", "value": "USD", "description": "Base commercial quotation currency", "category": "commercial"},
            {"key": "quote_validity_days", "value": "30", "description": "Default validity period for proforma invoices", "category": "commercial"},
            {"key": "order_notification_email", "value": "orders@primebyactivist.com", "description": "Internal dispatch notification receiver", "category": "orders"},
            {"key": "maintenance_mode", "value": "false", "description": "Administrative maintenance gate flag", "category": "system"},
        ]
        for s_data in seed_settings:
            s_stmt = select(PlatformSetting).where(PlatformSetting.key == s_data["key"])
            s_res = await session.execute(s_stmt)
            if not s_res.scalar_one_or_none():
                setting = PlatformSetting(
                    key=s_data["key"],
                    value=s_data["value"],
                    description=s_data["description"],
                    category=s_data["category"],
                    updated_at=utc_now(),
                )
                session.add(setting)

        await session.commit()


