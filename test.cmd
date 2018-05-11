if '%1'=='-browser' (
    powershell -noprofile -f tests\test.ps1 -Browser
) else (
    powershell -noprofile -f tests\test.ps1
)
