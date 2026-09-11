# One-command live deploy (fast path via C: drive)
param(
    [ValidateSet("code", "data", "tests", "figures", "all")]
    [string]$Target = "code",
    [switch]$NoBump
)

$deployArgs = @("-Mode", $Target)
if (-not $NoBump) { $deployArgs += "-Bump" }
& "$PSScriptRoot\scripts\deploy-fast.ps1" @deployArgs