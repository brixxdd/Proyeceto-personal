variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_ids" {
  description = "Subnet IDs for RDS"
  type        = list(string)
}

variable "db_instances" {
  description = "RDS instances configuration"
  type = map(object({
    instance_class      = string
    allocated_storage   = number
    engine_version      = string
    multi_az            = bool
    backup_retention_period = number
  }))
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}

