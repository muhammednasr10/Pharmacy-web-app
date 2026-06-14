Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot

$src = Join-Path $root "public\victory-logo.png"
$dst = Join-Path $root "public\victory-logo-transparent.png"

$bmp = [System.Drawing.Bitmap]::FromFile($src)
for ($x = 0; $x -lt $bmp.Width; $x++) {
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    $p = $bmp.GetPixel($x, $y)
    if ($p.R -ge 245 -and $p.G -ge 245 -and $p.B -ge 245) {
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $p.R, $p.G, $p.B))
    }
  }
}
$bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "Created $dst"
