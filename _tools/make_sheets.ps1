$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$cand = "C:\Users\Piolo Mangilog\OneDrive\Documents\Work\nike-collage-showcase\_tools\cand"
$outDir = "C:\Users\Piolo Mangilog\OneDrive\Documents\Work\nike-collage-showcase\_tools\sheets"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$files = Get-ChildItem $cand -Filter *.jpg | Sort-Object Name
$cols = 4; $rows = 3; $per = $cols * $rows
$tw = 260; $th = 320; $labelH = 26

for ($s = 0; $s -lt [Math]::Ceiling($files.Count / $per); $s++) {
  $bmpW = $cols * $tw; $bmpH = $rows * ($th + $labelH)
  $bmp = New-Object System.Drawing.Bitmap($bmpW, $bmpH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(30,30,30))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $font = New-Object System.Drawing.Font("Consolas", 13, [System.Drawing.FontStyle]::Bold)
  $brush = [System.Drawing.Brushes]::White
  $idx = 0
  for ($i = $s * $per; $i -lt [Math]::Min(($s + 1) * $per, $files.Count); $i++) {
    $f = $files[$i]
    $col = $idx % $cols; $row = [Math]::Floor($idx / $cols)
    $x = $col * $tw; $y = $row * ($th + $labelH)
    try {
      $img = [System.Drawing.Image]::FromFile($f.FullName)
      # cover-crop into thumb
      $scale = [Math]::Max($tw / $img.Width, $th / $img.Height)
      $dw = $img.Width * $scale; $dh = $img.Height * $scale
      $dx = $x + ($tw - $dw) / 2; $dy = $y + ($th - $dh) / 2
      $g.DrawImage($img, $dx, $dy, $dw, $dh)
      $img.Dispose()
    } catch { $g.FillRectangle([System.Drawing.Brushes]::DarkRed, $x, $y, $tw, $th) }
    $g.FillRectangle([System.Drawing.Brushes]::Black, $x, $y + $th, $tw, $labelH)
    $g.DrawString(("[{0}] {1}" -f ($i + 1), $f.BaseName), $font, $brush, $x + 4, $y + $th + 3)
    $idx++
  }
  $dest = Join-Path $outDir ("sheet_{0}.jpg" -f ($s + 1))
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $g.Dispose(); $bmp.Dispose()
  Write-Output $dest
}
Write-Output ("files: " + $files.Count)
