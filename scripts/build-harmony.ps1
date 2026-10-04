param([string]$DevEcoPath = 'C:\Program Files\Huawei\DevEco Studio')
$ErrorActionPreference = 'Stop'
$projectPath = Join-Path $PSScriptRoot '..\harmony'
$nodePath = Join-Path $DevEcoPath 'tools\node\node.exe'
$hvigorPath = Join-Path $DevEcoPath 'tools\hvigor\bin\hvigorw.js'
if (!(Test-Path -LiteralPath $nodePath) -or !(Test-Path -LiteralPath $hvigorPath)) {
  throw 'DevEco Studio was not found. Pass -DevEcoPath with the installed directory.'
}
$previousJava = $env:JAVA_HOME
$previousSdk = $env:DEVECO_SDK_HOME
$previousNode = $env:NODE_HOME
$previousPath = $env:Path
try {
  $env:JAVA_HOME = Join-Path $DevEcoPath 'jbr'
  $env:DEVECO_SDK_HOME = Join-Path $DevEcoPath 'sdk'
  $env:NODE_HOME = Join-Path $DevEcoPath 'tools\node'
  $env:Path = "$($env:NODE_HOME);$($env:JAVA_HOME)\bin;$($env:Path)"
  Push-Location -LiteralPath $projectPath
  try {
    & $nodePath $hvigorPath --mode module -p product=default -p module=entry@default assembleHap --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "HarmonyOS build failed (exit $LASTEXITCODE)." }
  } finally { Pop-Location }
} finally {
  $env:JAVA_HOME = $previousJava
  $env:DEVECO_SDK_HOME = $previousSdk
  $env:NODE_HOME = $previousNode
  $env:Path = $previousPath
}
