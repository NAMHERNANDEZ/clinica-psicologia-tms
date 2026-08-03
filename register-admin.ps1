$body = @{
    email = "admin@clinica.com"
    password = "Admin123!"
    name = "Admin"
    clinic_name = "Neurociencia Clinica"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "https://clinica-tms-api.terapiamagneticatranscraneal.workers.dev/api/auth/register" -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Output "Status: $($response.StatusCode)"
    Write-Output "Response: $($response.Content)"
} catch {
    Write-Output "Error: $($_.Exception.Message)"
    Write-Output "Response: $($_.Exception.Response)"
}