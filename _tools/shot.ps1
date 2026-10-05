param(
  [string[]]$Only = @()
)
$shots = "C:\Users\Piolo Mangilog\OneDrive\Documents\Work\nike-collage-showcase\_tools\shots"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $shots | Out-Null

function Get-Quality([string]$path) {
  if (-not (Test-Path $path)) { return 0 }
  $b = New-Object System.Drawing.Bitmap($path)
  $seen = @{}
  for ($y = 0; $y -lt $b.Height; $y += 40) {
    for ($x = 0; $x -lt $b.Width; $x += 40) {
      $c = $b.GetPixel($x, $y)
      $k = "$($c.R),$($c.G),$($c.B)"
      if ($seen.ContainsKey($k)) { $seen[$k]++ } else { $seen[$k] = 1 }
    }
  }
  $b.Dispose()
  return $seen.Count
}

$targets = @(
  @{ n = '01-cover';     u = 'http://localhost:4173/?shot=1' },
  @{ n = '02-manifesto'; u = 'http://localhost:4173/?shot=1#manifesto' },
  @{ n = '03-fits';      u = 'http://localhost:4173/?shot=1#fits' },
  @{ n = '04-motion';    u = 'http://localhost:4173/?shot=1#motion' },
  @{ n = '05-shift';     u = 'http://localhost:4173/?shot=1#shift' },
  @{ n = '06-archive';   u = 'http://localhost:4173/?shot=1#archive' },
  @{ n = '07-lookbook';  u = 'http://localhost:4173/?shot=1#lookbook' },
  @{ n = '08-outro';     u = 'http://localhost:4173/?shot=1#outro' },
  @{ n = '09-fits2';     u = 'http://localhost:4173/?shot=1&y=2600' },
  @{ n = '10-wipe';      u = 'http://localhost:4173/?shot=1&y=7000' }
)

foreach ($t in $targets) {
  if ($Only.Count -gt 0 -and $Only -notcontains $t.n) { continue }
  $out = "$shots\$($t.n).png"
  $ok = $false
  for ($attempt = 1; $attempt -le 3 -and -not $ok; $attempt++) {
    Remove-Item $out -ErrorAction SilentlyContinue
    $ud = "$env:TEMP\eshot_" + [guid]::NewGuid().ToString('N').Substring(0, 8)
    New-Item -ItemType Directory -Force -Path $ud | Out-Null
    $args = @(
      '--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader', '--hide-scrollbars',
      '--no-first-run', "--user-data-dir=$ud", '--window-size=1440,900',
      '--timeout=6000', "--screenshot=$out", $t.u
    )
    & $edge $args 2>$null | Out-Null
    Remove-Item $ud -Recurse -Force -ErrorAction SilentlyContinue
    $q = Get-Quality $out
    if ($q -ge 25) {
      $ok = $true
      Write-Output ("{0}  attempt={1} bytes={2} colors={3}" -f $t.n, $attempt, (Get-Item $out).Length, $q)
    } else {
      Write-Output ("{0}  attempt={1} BLANK (colors={2})" -f $t.n, $attempt, $q)
      Start-Sleep -Milliseconds 800
    }
  }
  if (-not $ok) { Write-Output ("{0}  FAILED after 3 attempts" -f $t.n) }
}
