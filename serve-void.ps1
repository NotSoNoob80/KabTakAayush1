# Tiny static-file server for previewing the site locally.
# Started by preview-void.bat — no installs needed, PowerShell is built into Windows.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8765/')
try {
  $listener.Start()
} catch {
  Write-Host "Could not start the server: $($_.Exception.Message)"
  exit 1
}
Write-Host ""
Write-Host "  Serving: $root"
Write-Host "  Open:    http://localhost:8765/index-void.html"
Write-Host ""
Write-Host "  Keep this window open while you preview. Press Ctrl+C to stop."
Write-Host ""

$mime = @{
  '.html'='text/html'; '.css'='text/css'; '.js'='application/javascript'
  '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.png'='image/png'
  '.gif'='image/gif'; '.svg'='image/svg+xml'; '.webp'='image/webp'
  '.mp4'='video/mp4'; '.ico'='image/x-icon'; '.json'='application/json'
  '.woff'='font/woff'; '.woff2'='font/woff2'; '.ttf'='font/ttf'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')
    $full = [System.IO.Path]::GetFullPath($file)
    if ((Test-Path $full -PathType Leaf) -and $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    try { $ctx.Response.StatusCode = 500 } catch {}
  }
  try { $ctx.Response.OutputStream.Close() } catch {}
}
