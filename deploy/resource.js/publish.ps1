$thisDir = (Get-Item (Get-Location)).FullName
Write-Host "Current dir: $thisDir"

$xNuspec = New-Object xml
$xNuspec.Load('resource.js.nuspec')
$xPackage = $xNuspec.DocumentElement 
$version = $xPackage.metadata.version.Trim()

$packageDir = Join-Path $thisDir package
if (Test-Path $packageDir) {
    Remove-Item $packageDir\*
} else {
    mkdir $packageDir | Out-Null
}

$scriptPath = Join-Path $packageDir resource-$version.js
Write-Host "Copying source script to:`r`n   $scriptPath"
Copy-Item $thisDir\..\..\resource-js\src\resource.js $scriptPath

[void][Reflection.Assembly]::LoadWithPartialName('Microsoft.VisualBasic')
$apiKey = ([string]([Microsoft.VisualBasic.Interaction]::InputBox('Enter the resource.js nuget.org API key', 'Enter API Key'))).Trim()

nuget pack resource.js.nuspec -NoPackageAnalysis

$nupkgPath = Join-Path $packageDir resource.js.$version.nupkg

# nuget push $nupkgPath -ApiKey $apiKey -s nuget.org