
$body = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            id = "WHATSAPP_ID"
            changes = @(
                @{
                    value = @{
                        messaging_product = "whatsapp"
                        metadata = @{
                            display_phone_number = "123456789"
                            phone_number_id = "PHONE_ID"
                        }
                        contacts = @(
                            @{
                                profile = @{ name = "Test User PowerShell" }
                                wa_id = "34600000002"
                            }
                        )
                        messages = @(
                            @{
                                from = "34600000002"
                                id = "wamid.TESTPS"
                                timestamp = 1719230000
                                text = @{ body = "Hola desde PowerShell" }
                                type = "text"
                            }
                        )
                    }
                    field = "messages"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/webhook" -Method Post -Body $body -ContentType "application/json"
