variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "food-delivery-platform"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_groups" {
  description = "EKS node group configuration"
  type = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
  }))
  default = {
    main = {
      instance_types = ["t3.medium"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
    }
  }
}

variable "rds_instances" {
  description = "RDS PostgreSQL instances configuration"
  type = map(object({
    instance_class      = string
    allocated_storage   = number
    engine_version      = string
    multi_az            = bool
    backup_retention_period = number
  }))
  default = {
    auth_db = {
      instance_class      = "db.t3.micro"
      allocated_storage   = 20
      engine_version      = "15.4"
      multi_az            = false
      backup_retention_period = 7
    }
    restaurant_db = {
      instance_class      = "db.t3.micro"
      allocated_storage   = 20
      engine_version      = "15.4"
      multi_az            = false
      backup_retention_period = 7
    }
    order_db = {
      instance_class      = "db.t3.micro"
      allocated_storage   = 20
      engine_version      = "15.4"
      multi_az            = false
      backup_retention_period = 7
    }
    delivery_db = {
      instance_class      = "db.t3.micro"
      allocated_storage   = 20
      engine_version      = "15.4"
      multi_az            = false
      backup_retention_period = 7
    }
  }
}

variable "kafka_version" {
  description = "Apache Kafka version"
  type        = string
  default     = "3.5.1"
}

variable "msk_instance_type" {
  description = "MSK broker instance type"
  type        = string
  default     = "kafka.t3.small"
}

variable "msk_broker_count" {
  description = "Number of MSK brokers"
  type        = number
  default     = 3
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "food-delivery-platform"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

