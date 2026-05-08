$API_KEY  = "6b20366c-f176-44d4-91f0-1155f8b9ca56"
$PLACE_ID = "a6613ae3-3307-4ece-a3fc-53c05d1f6e2f"
$BASE_URL = "https://zqkwjitdydbsorovhazw.supabase.co/functions/v1"

$headers = @{
    "x-api-key"    = $API_KEY
    "Content-Type" = "application/json"
}

function Send-Signal {
    param($signalType, $signalValue, $impact, $label)
    Write-Host ""
    Write-Host "[$label] Sending $signalType ..." -ForegroundColor Cyan
    $body = ConvertTo-Json -Depth 5 -InputObject @{
        place_id          = $PLACE_ID
        signal_type       = $signalType
        signal_value      = $signalValue
        confidence_impact = $impact
    }
    try {
        $res = Invoke-RestMethod -Uri "$BASE_URL/signals" -Method POST -Headers $headers -Body $body
        Write-Host "  OK  New Score: $($res.newScore)%" -ForegroundColor Green
        return $res.newScore
    } catch {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "  FAIL: $($reader.ReadToEnd())" -ForegroundColor Red
        return 0
    }
}

Write-Host "=== anyWays Step 11 - Full System Test ===" -ForegroundColor Magenta

$s1 = Send-Signal "FOOT_TRAFFIC"    @{ count = 87 }             20 "1/5"
Start-Sleep -Milliseconds 300
$s2 = Send-Signal "PHONE_VERIFIED"  @{ status = "connected" }   15 "2/5"
Start-Sleep -Milliseconds 300
$s3 = Send-Signal "OCR_MENU"        @{ items_found = 12 }       18 "3/5"
Start-Sleep -Milliseconds 300
$s4 = Send-Signal "HOURS_VERIFIED"  @{ open_now = $true }       12 "4/5"
Start-Sleep -Milliseconds 300
$s5 = Send-Signal "SOCIAL_SENTIMENT" @{ score = 0.82 }          10 "5/5"

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Magenta
Write-Host "Signal 1 FOOT_TRAFFIC    -> $s1%" -ForegroundColor Yellow
Write-Host "Signal 2 PHONE_VERIFIED  -> $s2%" -ForegroundColor Yellow
Write-Host "Signal 3 OCR_MENU        -> $s3%" -ForegroundColor Yellow
Write-Host "Signal 4 HOURS_VERIFIED  -> $s4%" -ForegroundColor Yellow
Write-Host "Signal 5 SOCIAL_SENTIMENT-> $s5%" -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to dashboard -> Places -> click your place to see all 5 signals!" -ForegroundColor Cyan
