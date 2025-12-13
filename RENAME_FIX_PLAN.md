# Switchyard Rename Fix Plan

## Summary of Issues

After the initial rename from Medusa to Switchyard, several structural issues remain that prevent the project from building.

---

## Issue 1: Nested Directory Structures (Critical)

The rename created nested directories that break workspace resolution.

### 1.1 `packages/switchyard-test-utils/medusa-test-utils/`
- **Problem**: Package is nested inside another directory
- **Current Path**: `packages/switchyard-test-utils/medusa-test-utils/package.json`
- **Package Name**: `@switchyard/test-utils`
- **Fix**: Flatten - move contents up one level

```bash
cd packages/switchyard-test-utils
mv medusa-test-utils/* .
rm -rf medusa-test-utils
```

### 1.2 `packages/cli/create-switchyard-app/create-medusa-app/`
- **Problem**: Package is nested inside renamed directory
- **Current Path**: `packages/cli/create-switchyard-app/create-medusa-app/`
- **Fix**: Flatten and rename inner directory

```bash
cd packages/cli/create-switchyard-app
mv create-medusa-app/* .
rm -rf create-medusa-app
```

### 1.3 `packages/modules/payment/src/providers/payment-switchyard/payment-medusa/`
- **Problem**: Double-nested provider directory
- **Fix**: Flatten the provider structure

```bash
cd packages/modules/payment/src/providers
mv payment-switchyard/payment-medusa/* payment-switchyard/
rm -rf payment-switchyard/payment-medusa
```

---

## Issue 2: Version Numbers Instead of `workspace:*` (Critical)

Some packages reference `@switchyard/ui: "4.0.29"` instead of `workspace:*`.

### Affected Files:
- `./www/packages/docs-ui/package.json`
- `./www/apps/ui/package.json`
- `./www/apps/api-reference/package.json`
- `./packages/admin/dashboard/package.json`

### Fix:
```bash
find . -name "package.json" -not -path "*/node_modules/*" \
  -exec sed -i '' 's/"@switchyard\/ui": "4.0.29"/"@switchyard\/ui": "workspace:*"/g' {} \;
```

---

## Issue 3: Workspace Configuration (Critical)

The root `package.json` workspaces array must include all package directories.

### Current Issues:
- References `packages/switchyard` but should verify all paths exist
- May be missing some renamed directories

### Fix:
Verify each workspace path exists and update if needed.

---

## Issue 4: Package Name Consistency (Medium)

The main package is named `@switchyard/medusa` which is confusing.

### Location: `packages/switchyard/package.json`
- **Current Name**: `@switchyard/medusa`
- **Recommended Name**: `@switchyard/core` (cleaner) OR keep as-is (less changes)

### Decision Required:
- **Option A**: Keep `@switchyard/medusa` (fewer changes, works now)
- **Option B**: Rename to `@switchyard/core` (cleaner, but requires updating ~50 references)

---

## Issue 5: Bin Command Names (Low Priority)

Some CLI bin commands still reference `medusa`:
- `medusa-oas` → should be `switchyard-oas`
- Others may exist

### Fix:
Update bin entries in package.json files:
```json
"bin": {
  "switchyard-oas": "./dist/index.js"
}
```

---

## Issue 6: Repository URLs (Low Priority)

Many packages still reference `github.com/medusajs/medusa`.

### Fix:
```bash
find . -name "package.json" -not -path "*/node_modules/*" \
  -exec sed -i '' 's|github.com/medusajs/medusa|github.com/switchyard/switchyard|g' {} \;
```

---

## Issue 7: Author Fields (Low Priority)

Many packages have `"author": "Medusa"`.

### Fix:
```bash
find . -name "package.json" -not -path "*/node_modules/*" \
  -exec sed -i '' 's/"author": "Medusa"/"author": "Switchyard"/g' {} \;
```

---

## Execution Order

1. **Fix nested directories** (Issue 1) - Must be first
2. **Fix version numbers** (Issue 2)
3. **Verify workspace config** (Issue 3)
4. **Run yarn install** to validate
5. **Run yarn build** to verify compilation
6. **Fix remaining issues** (4-7) if needed

---

## Validation Steps

After fixes:

```bash
# 1. Clean install
rm -rf node_modules
corepack yarn install

# 2. Build all packages
yarn build

# 3. Start dev server
cd apps/goods-backend
npx switchyard develop
```

---

## Rollback Plan

If fixes fail:
```bash
git checkout main -- .
# Or restore from the commit before rename
git checkout bf377a9b04 -- .
```
