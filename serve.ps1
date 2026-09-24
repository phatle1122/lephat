$port = 8080
$folder = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Server running at http://127.0.0.1:$port/"
} catch {
    Write-Host "Port $port already in use or error: $($_.Exception.Message)"
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".mp3"  = "audio/mpeg"
    ".mp4"  = "video/mp4"
    ".json" = "application/json"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    $context = $null
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = "index.html"
        }

        # Prevent path traversal
        $filePath = [System.IO.Path]::GetFullPath((Join-Path $folder $urlPath))
        if (-not $filePath.StartsWith($folder, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $filePath -PathType Leaf)) {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
        $response.ContentType = $contentType
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Accept-Ranges", "bytes")
        if ($ext -in @(".html", ".css", ".js")) {
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0")
            $response.AddHeader("Pragma", "no-cache")
            $response.AddHeader("Expires", "0")
        }

        $fileInfo = New-Object System.IO.FileInfo($filePath)
        $fileLength = $fileInfo.Length

        $rangeHeader = $request.Headers["Range"]
        if (-not [string]::IsNullOrEmpty($rangeHeader) -and $rangeHeader.StartsWith("bytes=")) {
            # Support byte range for mp4/mp3 video seeking
            $rangeVal = $rangeHeader.Substring(6)
            $parts = $rangeVal.Split('-')
            $start = if ([string]::IsNullOrEmpty($parts[0])) { 0L } else { [int64]$parts[0] }
            $end = if ($parts.Length -gt 1 -and -not [string]::IsNullOrEmpty($parts[1])) { [int64]$parts[1] } else { $fileLength - 1 }

            if ($start -ge $fileLength -or $end -ge $fileLength -or $start -gt $end) {
                $response.StatusCode = 416
                $response.AddHeader("Content-Range", "bytes */$fileLength")
                $response.Close()
                continue
            }

            $count = $end - $start + 1
            $response.StatusCode = 206
            $response.AddHeader("Content-Range", "bytes $start-$end/$fileLength")
            $response.ContentLength64 = $count

            $fs = [System.IO.File]::OpenRead($filePath)
            try {
                $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
                $buffer = New-Object byte[] 65536
                $remaining = $count
                while ($remaining -gt 0) {
                    $toRead = [int][Math]::Min($remaining, 65536L)
                    $read = $fs.Read($buffer, 0, $toRead)
                    if ($read -le 0) { break }
                    $response.OutputStream.Write($buffer, 0, $read)
                    $remaining -= $read
                }
            } finally {
                $fs.Dispose()
            }
        } else {
            # Standard full response
            $response.StatusCode = 200
            $response.ContentLength64 = $fileLength
            $fs = [System.IO.File]::OpenRead($filePath)
            try {
                $buffer = New-Object byte[] 65536
                while ($true) {
                    $read = $fs.Read($buffer, 0, 65536)
                    if ($read -le 0) { break }
                    $response.OutputStream.Write($buffer, 0, $read)
                }
            } finally {
                $fs.Dispose()
            }
        }
    } catch {
        # ignore broken pipes / client aborts
    } finally {
        if ($context -and $context.Response) {
            try { $context.Response.Close() } catch {}
        }
    }
}
