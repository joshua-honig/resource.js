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
    $server_path = [System.IO.Path]::Combine($thisDir, 'server.js')
    Start-Process node -ArgumentList $server_path
    Write-Host '  Opening default browser... '
    $test_url = 'http://localhost:19021/browser/resource-test.html'
    switch($PSVersionTable['Platform']) {
        Unix    { open $test_url }
        default { Start-Process $test_url }
    }
} else {
    Write-Banner 'require.js console tests'
    $cli_path  = [System.IO.Path]::Combine($thisDir, '..', 'node_modules', 'qunit-cli', 'bin', 'qunit-cli')
    $test_path = [System.IO.Path]::Combine($thisDir, 'console', 'console-test.js')
    node $cli_path $test_path
}