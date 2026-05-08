$apiKey = "6b20366c-f176-44d4-91f0-1155f8b9ca56"
$placeId = "a6613ae3-3307-4ece-a3fc-53c05d1f6e2f"
$url = "https://zqkwjitdydbsorovhazw.supabase.co/functions/v1/signals"

$body = @{
    place_id = $placeId
    signal_type = "FOOT_TRAFFIC"
    signal_value = @{ count = 42 }
    confidence_impact = 15
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
        "x-api-key" = $apiKey
        "Content-Type" = "application/json"
    } -Body $body
    Write-Host "SUCCESS:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorBody = $reader.ReadToEnd()
    Write-Host "ERROR $statusCode :" -ForegroundColor Red
    Write-Host $errorBody
}
