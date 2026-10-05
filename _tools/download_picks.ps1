$ErrorActionPreference = "Stop"
$root = "C:\Users\Piolo Mangilog\OneDrive\Documents\Work\nike-collage-showcase"
$out = Join-Path $root "assets\img"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$picks = @(
  @("hero-garage",      15127181, 1800),
  @("windbreaker-red",  13085468, 1400),
  @("hoodie-grey",      5319513, 1400),
  @("hoodie-white",     6551385, 1400),
  @("hoodie-detail",    7236120, 1400),
  @("bomber-green",     28774733, 1400),
  @("joggers-red",      9901666, 1400),
  @("sneaker-red",      1027130, 1400),
  @("sneaker-white",    15398044, 1400),
  @("sneaker-brown",    2043476, 1400),
  @("activewear-black", 6516172, 1400),
  @("editorial-fly",    10139621, 1800),
  @("sport-fence",      1055277, 1400),
  @("steps-white",      5692478, 1400),
  @("tennis",           7648269, 1400),
  @("leather-jacket",   32836908, 1400),
  @("street-group",     5236997, 1800),
  @("beanie-overalls",  7327029, 1400)
)

$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
foreach ($p in $picks) {
  $name = $p[0]; $id = $p[1]; $w = $p[2]
  $dest = Join-Path $out "$name.jpg"
  $url = "https://images.pexels.com/photos/$id/pexels-photo-$id.jpeg?auto=compress&cs=tinysrgb&w=$w"
  curl.exe -s --max-time 45 -A $ua -o $dest $url
  $size = (Get-Item $dest).Length
  Write-Output "$name.jpg => $size"
}
