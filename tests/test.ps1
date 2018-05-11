param([switch]$Browser)

$thisDir = $PSScriptRoot

function Write-Banner ([string]$Message, [System.ConsoleColor]$Color = 'Cyan') {
    Write-Host $('*' * 120) -ForegroundColor Cyan
    Write-Host $(' ' + $Message) -ForegroundColor Cyan
    Write-Host $('*' * 120) -ForegroundColor Cyan
}

if($Browser) {
    Write-Banner 'require.js browser tests.'
    Write-Host '  Starting local express server...'
    Start-Process node -ArgumentList "$thisDir\server.js"
    Write-Host '  Opening default browser... '
    Start-Process 'http://localhost:19021/browser/resource-test.html'
} else {
    Write-Banner 'require.js console tests'
    node "$thisDir\..\node_modules\qunit-cli\bin\qunit-cli" "$thisDir\console\console-test.js"
}