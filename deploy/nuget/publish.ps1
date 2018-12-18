$thisDir = $PSScriptRoot  
Write-Host "Current dir: $thisDir"

function Join-FsPath([string[]]$Parts) {
    [System.IO.Path]::Combine($Parts)
}

$xNuspec = New-Object xml
$xNuspec.Load((Join-Path $thisDir 'resource.js.nuspec'))
$xPackage = $xNuspec.DocumentElement
$version = $xPackage.metadata.version.Trim()

$packageDir = Join-Path $thisDir package
if (Test-Path $packageDir) {
    Remove-Item $packageDir\*
} else {
    mkdir $packageDir | Out-Null
}

$scriptPath = Join-Path $packageDir resource-$version.js
$docPath = Join-Path $packageDir resource-$version.intellisense.js
Write-Host "Copying source script to:`r`n   $scriptPath"
Copy-Item (Join-FsPath $thisDir .. .. src resource.js) $scriptPath
Copy-Item (Join-FsPath $thisDir .. .. src resource.intellisense.js) $docPath

$apiKey = (Read-Host 'Enter the resource.js nuget.org API key').Trim()

Set-Location $thisDir
[System.Environment]::CurrentDirectory = $thisDir

nuget pack resource.js.nuspec -NoPackageAnalysis

$nupkgPath = Join-Path $packageDir resource.js.$version.nupkg
Move-Item $(Join-Path $thisDir resource.js.$version.nupkg) $nupkgPath

nuget push $nupkgPath -ApiKey $apiKey -Source nuget.org
