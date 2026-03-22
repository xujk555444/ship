param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Source,

    [Parameter(Position = 1)]
    [string]$Output,

    [Parameter(Position = 2)]
    [string]$Template
)

$ErrorActionPreference = "Stop"

$skillScript = "C:\Users\PC16\.codex\skills\unload-sheet-workflow\scripts\process_unload_workbook.py"
$defaultTemplateRoot = "C:\Users\PC16\Desktop\auto"

function Resolve-DefaultTemplate {
    if (-not (Test-Path -LiteralPath $defaultTemplateRoot)) {
        throw "Default template root not found: $defaultTemplateRoot"
    }

    $candidates = Get-ChildItem -LiteralPath $defaultTemplateRoot -Recurse -Filter "*.xlsx" |
        Sort-Object FullName

    if (-not $candidates -or $candidates.Count -eq 0) {
        throw "No template .xlsx file found under: $defaultTemplateRoot"
    }

    return $candidates[0].FullName
}

if (-not (Test-Path -LiteralPath $skillScript)) {
    throw "Skill script not found: $skillScript"
}

if (-not (Test-Path -LiteralPath $Source)) {
    throw "Source workbook not found: $Source"
}

if (-not $Template) {
    $Template = Resolve-DefaultTemplate
}

if (-not (Test-Path -LiteralPath $Template)) {
    throw "Template workbook not found: $Template"
}

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$templatePath = (Resolve-Path -LiteralPath $Template).Path

$arguments = @(
    $skillScript
    "--source"
    $sourcePath
    "--template"
    $templatePath
)

if ($Output) {
    $arguments += @("--output", $Output)
}

Write-Host "Starting unload sheet processing..." -ForegroundColor Cyan
Write-Host "Source: $sourcePath"
Write-Host "Template: $templatePath"
if ($Output) {
    Write-Host "Output: $Output"
}

& python @arguments
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    throw "Processing failed with exit code: $exitCode"
}

Write-Host "Processing completed." -ForegroundColor Green
