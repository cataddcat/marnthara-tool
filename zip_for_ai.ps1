# --- Settings ---
$filesPerZip = 10
$extensions = @(".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".config.js", ".config.ts")
$excludeFolders = @("node_modules", ".git", "dist", "build", ".vscode", "coverage", "public", "AI_ZIPS")

# --- Start ---
$rootDir = Get-Location
$outputDir = Join-Path $rootDir "AI_ZIPS"

# Create/Clean Output Directory
if (Test-Path $outputDir) { Remove-Item $outputDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "Scanning files..." -ForegroundColor Cyan

# Find Files
$allFiles = Get-ChildItem -Recurse -File | Where-Object {
    $file = $_
    $relPath = $file.FullName.Replace($rootDir.Path + "\", "")
    
    $extMatch = $extensions -contains $file.Extension
    
    $folderSafe = $true
    foreach ($bad in $excludeFolders) {
        if ($relPath -like "$bad\*") { $folderSafe = $false; break }
    }
    
    $isSelf = $file.Name -eq "zip_for_ai.ps1"
    $isBat = $file.Name -eq "run_zip.bat"
    $isOutput = $relPath -like "AI_ZIPS\*"

    return $extMatch -and $folderSafe -and -not $isSelf -and -not $isBat -and -not $isOutput
}

$totalFiles = $allFiles.Count
Write-Host "Found $totalFiles files." -ForegroundColor Green

# Process Batches
$batchCount = [Math]::Ceiling($totalFiles / $filesPerZip)

for ($i = 0; $i -lt $batchCount; $i++) {
    $batchNum = $i + 1
    $startIndex = $i * $filesPerZip
    
    $batchFiles = $allFiles | Select-Object -Skip $startIndex -First $filesPerZip
    
    $tempFolder = Join-Path $outputDir "batch_$batchNum"
    New-Item -ItemType Directory -Force -Path $tempFolder | Out-Null
    
    Write-Host "Zipping Batch $batchNum / $batchCount (Flattening)..." 

    foreach ($file in $batchFiles) {
        # หา Path เดิม
        $relativePath = $file.FullName.Substring($rootDir.Path.Length + 1)
        
        # [KEY FIX] เปลี่ยนเครื่องหมาย \ เป็น __ เพื่อตั้งชื่อไฟล์ใหม่ และลบ subfolder ออก
        $flatName = $relativePath -replace "\\", "__"
        
        # Copy มาไว้ที่ Root ของ Temp Folder เลย (ไม่สร้างโฟลเดอร์ซ้อน)
        Copy-Item -Path $file.FullName -Destination (Join-Path $tempFolder $flatName)
    }

    $zipName = Join-Path $outputDir "files_part_$batchNum.zip"
    Compress-Archive -Path "$tempFolder\*" -DestinationPath $zipName
    
    Remove-Item $tempFolder -Recurse -Force
}

Write-Host "Done! Files are flattened in 'AI_ZIPS'." -ForegroundColor Yellow
Start-Process $outputDir