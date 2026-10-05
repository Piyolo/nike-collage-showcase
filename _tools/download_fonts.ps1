$ErrorActionPreference = "Stop"
$root = "C:\Users\Piolo Mangilog\OneDrive\Documents\Work\nike-collage-showcase"
$fontDir = Join-Path $root "assets\fonts"
New-Item -ItemType Directory -Force -Path $fontDir | Out-Null

$css = Get-Content "$env:TEMP\gf.css" -Raw
# Split into @font-face blocks
$blocks = [regex]::Matches($css, '@font-face\s*\{[^}]+\}')
$outCss = @()
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

foreach ($b in $blocks) {
  $text = $b.Value
  if ($text -notmatch 'U\+0000-00FF') { continue }  # latin subset only
  $fam = [regex]::Match($text, "font-family:\s*'([^']+)'").Groups[1].Value
  $weight = [regex]::Match($text, "font-weight:\s*(\d+)").Groups[1].Value
  if (-not $weight) { $weight = "400" }
  $url = [regex]::Match($text, "url\((https://[^)]+\.woff2)\)").Groups[1].Value
  if (-not $url) { continue }
  $slug = ($fam -replace '\s+', '-').ToLower() + "-" + $weight
  $file = "$slug.woff2"
  $dest = Join-Path $fontDir $file
  if (-not (Test-Path $dest)) { curl.exe -s --max-time 30 -A $ua -o $dest $url }
  $size = (Get-Item $dest).Length
  Write-Output "$file => $size bytes"
  $outCss += "@font-face{font-family:'$fam';font-style:normal;font-weight:$weight;font-display:swap;src:url('../assets/fonts/$file') format('woff2');}"
}
$outCss -join "`n" | Out-File -Encoding utf8 (Join-Path $root "css\fonts.css")
Write-Output "fonts.css written"
