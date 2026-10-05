$hist = Join-Path $env:APPDATA 'Cursor\User\History'
Get-ChildItem $hist -Directory | ForEach-Object {
  $e = Join-Path $_.FullName 'entries.json'
  if (Test-Path $e) {
    $t = Get-Content $e -Raw -ErrorAction SilentlyContinue
    if ($t -and ($t -match 'useAppStore' -or $t -match 'SistemaPadaria')) {
      Write-Output ("HIT: " + $_.FullName)
      Write-Output $t.Substring(0, [Math]::Min(400, $t.Length))
      Write-Output '---'
    }
  }
}
