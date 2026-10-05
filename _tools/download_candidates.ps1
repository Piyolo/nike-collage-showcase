$ErrorActionPreference = "Stop"
$out = "C:\Users\Piolo Mangilog\OneDrive\Documents\Work\nike-collage-showcase\_tools\cand"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$cands = @(
  # category, id
  @("hoodie", 11340657), @("hoodie", 6995877), @("hoodie", 5618175), @("hoodie", 2108816),
  @("hoodie", 6551385), @("hoodie", 7236120), @("hoodie", 5604023), @("hoodie", 7653719),
  @("hoodie", 8553999), @("hoodie", 7593007), @("hoodie", 607961), @("hoodie", 5319513),
  @("sneaker", 5560288), @("sneaker", 1027130), @("sneaker", 260044), @("sneaker", 631986),
  @("sneaker", 2043476), @("sneaker", 23692992), @("sneaker", 267301), @("sneaker", 15398044),
  @("sneaker", 5051000), @("sneaker", 1102776), @("sneaker", 4729488), @("sneaker", 12210270),
  @("street", 26760669), @("street", 16891088), @("street", 10139621), @("street", 7648269),
  @("street", 8619007), @("street", 5692478), @("street", 5236997), @("street", 12821063),
  @("street", 15127181), @("street", 7327029), @("street", 14528152), @("street", 14082367),
  @("jacket", 13085468), @("jacket", 32836908), @("jacket", 19133986), @("jacket", 19231623),
  @("jacket", 28774733), @("jacket", 30418823), @("jacket", 8497715), @("jacket", 6778573),
  @("sport", 221241), @("sport", 11844304), @("sport", 16534348), @("sport", 11900126),
  @("sport", 6516172), @("sport", 1055277), @("sport", 14139812), @("sport", 4567655),
  @("pant", 9901666), @("pant", 4853112), @("pant", 5253438), @("pant", 12645601)
)

$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
foreach ($c in $cands) {
  $cat = $c[0]; $id = $c[1]
  $file = Join-Path $out ("{0}_{1}.jpg" -f $cat, $id)
  if (Test-Path $file) { continue }
  $url = "https://images.pexels.com/photos/$id/pexels-photo-$id.jpeg?auto=compress&cs=tinysrgb&w=600"
  curl.exe -s --max-time 30 -A $ua -o $file $url
}
Get-ChildItem $out | Where-Object { $_.Length -lt 5000 } | Remove-Item -Force
Write-Output ("downloaded: " + (Get-ChildItem $out).Count)
