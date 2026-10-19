$path = 'D:\Object Oriented Program\Raven_Project\TASK\Lexify_Usability_Fix_List_Round2.md.pdf'
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::Latin1.GetString($bytes)
$regex = [regex]'[\x20-\x7E]{6,}'
$ms = $regex.Matches($text)
$results = $ms | ForEach-Object { $_.Value } | Where-Object { $_ -match '[a-zA-Z]{4,}' }
$results | Select-Object -First 500
