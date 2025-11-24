output "cluster_arn" {
  description = "MSK cluster ARN"
  value       = aws_msk_cluster.main.arn
}

output "bootstrap_brokers" {
  description = "MSK bootstrap broker addresses"
  value       = aws_msk_cluster.main.bootstrap_brokers
  sensitive   = true
}

output "bootstrap_brokers_tls" {
  description = "MSK bootstrap broker addresses (TLS)"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
  sensitive   = true
}

output "zookeeper_connect_string" {
  description = "Zookeeper connection string"
  value       = aws_msk_cluster.main.zookeeper_connect_string
  sensitive   = true
}

