Add-Type -AssemblyName System.Drawing
$iconPath = "C:\Users\onurc\.gemini\antigravity-ide\brain\180a8342-2fe3-4119-a984-480f4140aef1\.user_uploaded\media_1788286100793.jpg"
$iconImg = [System.Drawing.Image]::FromFile($iconPath)

$w = 1024
$h = 500
$dest = "c:\Users\onurc\OneDrive\Desktop\Cursor\PortTrack\PortTrackAndroid\assets\feature_graphic_1024x500.png"

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1. Dark Gradient Background (#090d16 to #13122b)
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$c1 = [System.Drawing.ColorTranslator]::FromHtml("#090d16")
$c2 = [System.Drawing.ColorTranslator]::FromHtml("#161433")
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
$g.FillRectangle($brush, $rect)

# 2. Draw User Icon on Left (Size: 320x320)
$iconSize = 320
$iconX = 80
$iconY = ($h - $iconSize) / 2
$g.DrawImage($iconImg, $iconX, $iconY, $iconSize, $iconSize)

# 3. Draw Typography on Right
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 52, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$fontDesc = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)

$textX = 440
$textY = 135

# Title "PortTrack"
$brushTitle = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.DrawString("PortTrack", $fontTitle, $brushTitle, $textX, $textY)

# Subtitle
$brushSub = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#a855f7"))
$g.DrawString("Portfoy & Fon Takip Platformu", $fontSub, $brushSub, $textX, $textY + 95)

# Features line
$brushDesc = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#94a3b8"))
$g.DrawString("BIST  •  TEFAS  •  BES  •  Doviz  •  Kripto", $fontDesc, $brushDesc, $textX, $textY + 145)

# Save
$bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$iconImg.Dispose()
Write-Host "Feature Graphic generated strictly with user uploaded icon: $dest"
