param()

$ErrorActionPreference = "Continue"

function Write-Ok($message) {
  Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Warn($message) {
  Write-Host "[UYARI] $message" -ForegroundColor Yellow
}

function Write-Fail($message) {
  Write-Host "[HATA] $message" -ForegroundColor Red
}

Write-Host "Melisa Terminal local kontrol" -ForegroundColor Cyan
Write-Host "Klasor: $(Get-Location)"

if (Test-Path ".git") {
  Write-Ok "Git repo bulundu"
  $branch = git branch --show-current
  Write-Host "Branch: $branch"
  Write-Host "Git status:"
  git status --short
  if (git rev-parse --verify HEAD 2>$null) {
    Write-Host "Son 5 commit:"
    git log -5 --oneline
  } else {
    Write-Warn "Henuz commit yok"
  }
  Write-Host "Degisen dosyalar:"
  git diff --name-only
} else {
  Write-Warn "Bu klasorde .git yok"
}

if (Test-Path "package.json") {
  Write-Ok "package.json bulundu"
  $package = Get-Content "package.json" -Raw | ConvertFrom-Json
  Write-Host "Scriptler:"
  $package.scripts.PSObject.Properties | ForEach-Object { Write-Host " - $($_.Name): $($_.Value)" }
} else {
  Write-Fail "package.json yok"
}

if (Test-Path "node_modules") {
  Write-Ok "node_modules bulundu"
} else {
  Write-Warn "node_modules yok; npm install gerekli"
}

if ((Test-Path "package-lock.json") -and (Test-Path "package.json")) {
  $pkg = Get-Item "package.json"
  $lock = Get-Item "package-lock.json"
  if ($pkg.LastWriteTime -gt $lock.LastWriteTime) {
    Write-Warn "package.json package-lock.json'dan yeni; npm install gerekebilir"
  } else {
    Write-Ok "npm install durumu tutarli gorunuyor"
  }
}

if ((Test-Path "package.json") -and $package.scripts.typecheck) {
  Write-Host "TypeScript kontrolu calisiyor..."
  npm run typecheck
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "TypeScript kontrolu basarili"
  } else {
    Write-Fail "TypeScript kontrolu hata verdi"
  }
} else {
  Write-Warn "typecheck scripti yok"
}

if (Get-Command npx -ErrorAction SilentlyContinue) {
  Write-Host "Expo doctor kontrolu deneniyor..."
  npx expo-doctor
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "Expo doctor basarili"
  } else {
    Write-Warn "Expo doctor calisti ama uyari/hata verdi"
  }
} else {
  Write-Warn "npx bulunamadi; Expo doctor atlandi"
}
