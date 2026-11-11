import os
import re

files = [
    'apps/api/app/api/v1/orders.py',
    'apps/api/app/api/v1/quotations.py',
    'apps/api/app/api/v1/documents.py',
    'apps/api/app/api/v1/enquiries.py',
    'apps/api/app/api/v1/users.py',
    'apps/api/app/api/v1/auth.py',
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Match route definitions with curly braces
    pattern = r'@router\.(get|post|put|patch|delete)\(\s*["\']([^"\']*?\{[^"\']*?\}[^"\']*?)["\'](.*?\))\s*async def\s+(\w+)\((.*?)\):'
    matches = list(re.finditer(pattern, content, re.DOTALL))
    print(f"\n=== {fpath} ({len(matches)} ID endpoints) ===")
    for m in matches:
        method = m.group(1).upper()
        path = m.group(2)
        decorator_args = m.group(3)
        fn_name = m.group(4)
        params = m.group(5)
        
        # Check permission dependency
        perm = "None"
        if "require_permission" in decorator_args or "require_permission" in params:
            p_m = re.search(r'require_permission\(["\'](.*?)["\']\)', decorator_args + params)
            perm = f"require_permission('{p_m.group(1)}')" if p_m else "require_permission"
        elif "require_admin" in decorator_args or "require_admin" in params:
            perm = "require_admin"
        elif "get_current_user" in decorator_args or "get_current_user" in params:
            perm = "get_current_user"
            
        print(f"  {method} {path} -> {fn_name}() | Role/Perm: {perm}")

