Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\onurc\.gemini\antigravity-ide\brain\180a8342-2fe3-4119-a984-480f4140aef1\.user_uploaded\media_1788286100793.jpg"
$img = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($w, $h, $dest) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $dest ($w x $h)"
}

Resize-Image 512 512 "c:\Users\onurc\OneDrive\Desktop\Cursor\PortTrack\PortTrackAndroid\assets\icon.png"
Resize-Image 512 512 "c:\Users\onurc\OneDrive\Desktop\Cursor\PortTrack\PortTrackAndroid\assets\adaptive-icon.png"
Resize-Image 512 512 "c:\Users\onurc\OneDrive\Desktop\Cursor\PortTrack\PortTrackAndroid\assets\splash-icon.png"
Resize-Image 512 512 "c:\Users\onurc\OneDrive\Desktop\Cursor\PortTrack\PortTrackAndroid\assets\favicon.png"
Resize-Image 512 512 "c:\Users\onurc\OneDrive\Desktop\Cursor\PortTrack\PortTrackAndroid\assets\playstore_icon_512.png"

$img.Dispose()
