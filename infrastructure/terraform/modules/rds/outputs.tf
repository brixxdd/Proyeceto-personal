output "endpoints" {
  description = "RDS instance endpoints"
  value = {
    for k, v in aws_db_instance.main : k => v.endpoint
  }
  sensitive = true
}

output "passwords" {
  description = "RDS instance passwords (stored in AWS Secrets Manager recommended)"
  value = {
    for k, v in random_password.db_passwords : k => v.result
  }
  sensitive = true
}

