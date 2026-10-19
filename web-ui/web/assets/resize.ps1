Add-Type -AssemblyName System.Drawing
foreach($f in @('cursor-sword', 'cursor-wand')) {
    $path = "d:\Object Oriented Program\Raven_Project\web-ui\web\assets\$f.png"
    $newPath = "d:\Object Oriented Program\Raven_Project\web-ui\web\assets\$f-32.png"
    $img = [System.Drawing.Image]::FromFile($path)
    $bmp = New-Object System.Drawing.Bitmap 32, 32
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, 32, 32)
    $g.Dispose()
    $img.Dispose()
    $bmp.Save($newPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}
