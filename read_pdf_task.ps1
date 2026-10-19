param([string]$pdfPath)

$stream = [System.IO.FileStream]::new($pdfPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
$len = [int]$stream.Length
$buf = New-Object byte[] $len
[void]$stream.Read($buf, 0, $len)
$stream.Close()
$stream.Dispose()

$enc = [System.Text.Encoding]::GetEncoding(28591)
$text = $enc.GetString($buf)

$matches2 = [regex]::Matches($text, '[\x20-\x7E]{6,}')
foreach ($m in $matches2) {
    $val = $m.Value
    if ($val -match '[a-zA-Z]{4,}') {
        Write-Output $val
    }
}
