param([switch]$Mobile)
$ErrorActionPreference = 'Stop'
$v3QaRoot = Join-Path $PSScriptRoot 'qa'
New-Item -ItemType Directory -Force $v3QaRoot | Out-Null
$v3Chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
if (!(Test-Path -LiteralPath $v3Chrome)) { throw 'Chrome is not installed at the configured path.' }
$v3Profile = Join-Path $env:TEMP ('fieldwork-v3-test-' + [guid]::NewGuid().ToString('N'))
$v3Label = if ($Mobile) { 'mobile' } else { 'desktop' }
$v3Size = if ($Mobile) { '390,2300' } else { '1512,2300' }
$v3File = Join-Path (Split-Path $PSScriptRoot) 'fieldwork-v3.html'
$v3Url = ([uri]$v3File).AbsoluteUri
if ($Mobile) {
 $v3FrameFile = Join-Path $v3QaRoot 'mobile-frame.html'
 Set-Content -Encoding UTF8 $v3FrameFile ('<!doctype html><style>body{margin:0}iframe{display:block;width:390px;height:2300px;border:0}</style><iframe src="' + $v3Url + '"></iframe>')
 $v3Url = ([uri]$v3FrameFile).AbsoluteUri
}
$v3Args = @('--headless=new','--disable-gpu','--no-sandbox','--disable-gpu-sandbox','--disable-software-rasterizer','--no-first-run','--no-default-browser-check','--hide-scrollbars','--autoplay-policy=no-user-gesture-required',('--window-size=' + $v3Size),'--virtual-time-budget=120000',('--user-data-dir="' + $v3Profile + '"'),('--screenshot="' + (Join-Path $v3QaRoot ($v3Label + '.png')) + '"'),'--dump-dom',('"' + $v3Url + '"'))
$v3Process = Start-Process -FilePath $v3Chrome -ArgumentList $v3Args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $v3QaRoot ($v3Label + '.html')) -RedirectStandardError (Join-Path $v3QaRoot ($v3Label + '.log'))
if (!$v3Process.WaitForExit(45000)) { $v3Process.Kill(); throw 'The isolated browser check timed out.' }
if ($null -ne $v3Process.ExitCode -and $v3Process.ExitCode -ne 0) { throw ('Browser exited with code ' + $v3Process.ExitCode) }
Write-Output ($v3Label + ': captured standalone page')
