param(
  [string]$RemoteUrl = "https://github.com/phjanoreynoso-debug/Calendario.git",
  [string]$Branch = "main",
  [string]$CommitMessage = "Inicial: calendario con drag-and-drop y persistencia"
)

function Ensure-GitInstalled {
  try {
    git --version | Out-Null
  } catch {
    Write-Error "Git no está instalado o no está en PATH. Instálalo desde https://git-scm.com/download/win"
    exit 1
  }
}

function Run-Git {
  param([string]$Args)
  Write-Host "→ git $Args" -ForegroundColor Cyan
  & git $Args
  if ($LASTEXITCODE -ne 0) { Write-Error "Fallo al ejecutar: git $Args"; exit $LASTEXITCODE }
}

Ensure-GitInstalled

# Inicializa repo si no existe
if (-not (Test-Path ".git")) {
  Run-Git "init"
}

# Añadir y comitear
Run-Git "add ."
Run-Git "commit -m `"$CommitMessage`""

# Configurar rama principal
Run-Git "branch -M $Branch"

# Configurar remoto (actualiza si existe)
$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $existingRemote) {
  Write-Host "Remoto origin ya existe: $existingRemote" -ForegroundColor Yellow
  if ($existingRemote -ne $RemoteUrl) {
    Run-Git "remote set-url origin $RemoteUrl"
  }
} else {
  Run-Git "remote add origin $RemoteUrl"
}

# Push inicial
Run-Git "push -u origin $Branch"

Write-Host "Publicación completada en $RemoteUrl (rama $Branch)" -ForegroundColor Green