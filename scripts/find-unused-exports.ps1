# Find unused exports in the React template
# This script identifies exports that are never imported

Write-Host "=== Finding Unused Exports ===" -ForegroundColor Cyan
Write-Host ""

$srcPath = "src"

# Step 1: Collect all exports from index.ts files
Write-Host "Step 1: Collecting exports from index files..." -ForegroundColor Yellow

$indexFiles = Get-ChildItem -Path $srcPath -Recurse -Filter "index.ts"
$exports = @{}

foreach ($indexFile in $indexFiles) {
    $content = Get-Content $indexFile.FullName -Raw
    $modulePath = $indexFile.Directory.FullName.Replace((Get-Location).Path + "\src\", "").Replace("\", "/")
    
    # Find named exports
    $matches = [regex]::Matches($content, 'export\s*\{\s*([^}]+)\s*\}')
    foreach ($match in $matches) {
        $exportList = $match.Groups[1].Value -split ',' | ForEach-Object { 
            $export = $_.Trim() -replace '\s+as\s+.*$', '' -replace 'type\s+', '' -replace '//.+$', ''
            $export.Trim()
        } | Where-Object { $_ -ne '' -and $_ -ne 'default' }
        
        foreach ($exportName in $exportList) {
            if (-not $exports.ContainsKey($exportName)) {
                $exports[$exportName] = @{
                    Locations = @()
                    Used = $false
                }
            }
            $exports[$exportName].Locations += $modulePath
        }
    }
}

Write-Host "  Found $($exports.Count) unique exports" -ForegroundColor Green

# Step 2: Find all imports
Write-Host "Step 2: Scanning for imports..." -ForegroundColor Yellow

$allFiles = Get-ChildItem -Path $srcPath -Recurse -Include *.ts,*.tsx -Exclude *.test.ts,*.spec.ts
$importCount = 0

foreach ($file in $allFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Check each export name
    foreach ($exportName in $exports.Keys) {
        # Look for this export being imported
        if ($content -match "import\s+.*\b$exportName\b.*from" -or
            $content -match "import\s*\{[^}]*\b$exportName\b[^}]*\}" -or
            $content -match "\b$exportName\b.*=.*require\(" -or
            $content -match "export.*\b$exportName\b") {
            $exports[$exportName].Used = $true
            $importCount++
        }
    }
}

Write-Host "  Found $importCount import usages" -ForegroundColor Green

# Step 3: Report unused exports
Write-Host ""
Write-Host "Step 3: Analyzing results..." -ForegroundColor Yellow
Write-Host ""

$unused = $exports.GetEnumerator() | Where-Object { -not $_.Value.Used } | Sort-Object Name
$unusedCount = ($unused | Measure-Object).Count

if ($unusedCount -eq 0) {
    Write-Host "✓ All exports are being used!" -ForegroundColor Green
} else {
    Write-Host "Found $unusedCount potentially unused exports:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($item in $unused | Select-Object -First 50) {
        $locations = $item.Value.Locations -join ', '
        Write-Host "  • $($item.Key)" -ForegroundColor Cyan
        Write-Host "    Exported from: $locations" -ForegroundColor Gray
    }
    
    if ($unusedCount -gt 50) {
        Write-Host ""
        Write-Host "  ... and $($unusedCount - 50) more" -ForegroundColor Gray
    }
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
$usedCount = ($exports.GetEnumerator() | Where-Object { $_.Value.Used } | Measure-Object).Count
Write-Host "Total exports: $($exports.Count)" -ForegroundColor White
Write-Host "Used exports: $usedCount" -ForegroundColor Green
Write-Host "Unused exports: $unusedCount" -ForegroundColor Yellow
$usagePercent = [math]::Round(($usedCount / $exports.Count) * 100, 1)
Write-Host "Usage rate: $usagePercent%" -ForegroundColor Cyan

Write-Host ""
Write-Host "Note: Some exports may be unused because they are:" -ForegroundColor Gray
Write-Host "  - Part of a public API for consumers" -ForegroundColor Gray
Write-Host "  - Used in test files" -ForegroundColor Gray
Write-Host "  - Used via dynamic imports" -ForegroundColor Gray
Write-Host "  - Template code meant for extension" -ForegroundColor Gray
