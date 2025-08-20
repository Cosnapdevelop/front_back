#!/bin/bash

# Production Database Backup Script for Cosnap AI
# This script creates automated backups of the PostgreSQL database

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
LOG_FILE="${LOG_FILE:-$BACKUP_DIR/backup.log}"

# Database configuration from environment or Railway
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-cosnap}"
DB_USER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-}"

# Backup configuration
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="cosnap_backup_${TIMESTAMP}.sql"
COMPRESSED_FILENAME="${BACKUP_FILENAME}.gz"

# S3/Cloud storage configuration (optional)
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_REGION="${BACKUP_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Monitoring and alerting
WEBHOOK_URL="${BACKUP_WEBHOOK_URL:-}"
SLACK_WEBHOOK="${BACKUP_SLACK_WEBHOOK:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    log "${RED}ERROR: $1${NC}"
}

log_success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

log_warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

log_info() {
    log "${BLUE}INFO: $1${NC}"
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v gzip &> /dev/null; then
        missing_deps+=("gzip")
    fi
    
    if [[ -n "$S3_BUCKET" ]] && ! command -v aws &> /dev/null; then
        missing_deps+=("awscli")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi
}

# Create backup directory
setup_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
    
    # Ensure log file exists
    touch "$LOG_FILE"
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_error "Cannot connect to database"
        log_error "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
        exit 1
    fi
    
    log_success "Database connection successful"
}

# Get database info
get_db_info() {
    log_info "Gathering database information..."
    
    local db_size
    db_size=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
    
    local table_count
    table_count=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    
    log_info "Database size: $db_size"
    log_info "Number of tables: $table_count"
    
    # Store info for post-backup verification
    echo "$db_size" > "$BACKUP_DIR/.db_size_${TIMESTAMP}"
    echo "$table_count" > "$BACKUP_DIR/.table_count_${TIMESTAMP}"
}

# Create database backup
create_backup() {
    log_info "Starting database backup..."
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILENAME"
    local compressed_path="$BACKUP_DIR/$COMPRESSED_FILENAME"
    
    # Create backup with progress monitoring
    if PGPASSWORD="$PGPASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges \
        --verbose \
        --file="$backup_path" 2>&1 | tee -a "$LOG_FILE"; then
        
        log_success "Database dump completed: $backup_path"
    else
        log_error "Database backup failed"
        exit 1
    fi
    
    # Compress backup
    log_info "Compressing backup..."
    if gzip -"$COMPRESSION_LEVEL" "$backup_path"; then
        log_success "Backup compressed: $compressed_path"
        
        # Get compressed file size
        local file_size
        file_size=$(du -h "$compressed_path" | cut -f1)
        log_info "Compressed backup size: $file_size"
        
        # Store backup info
        echo "$compressed_path" > "$BACKUP_DIR/.latest_backup"
        echo "$file_size" > "$BACKUP_DIR/.backup_size_${TIMESTAMP}"
    else
        log_error "Backup compression failed"
        exit 1
    fi
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    local compressed_path="$BACKUP_DIR/$COMPRESSED_FILENAME"
    
    # Test gzip integrity
    if gzip -t "$compressed_path"; then
        log_success "Backup compression integrity verified"
    else
        log_error "Backup compression is corrupted"
        exit 1
    fi
    
    # Check if backup file contains expected content
    if zcat "$compressed_path" | head -20 | grep -q "PostgreSQL database dump"; then
        log_success "Backup content verification passed"
    else
        log_error "Backup content verification failed"
        exit 1
    fi
    
    # Compare table count (basic consistency check)
    local backed_up_tables
    backed_up_tables=$(zcat "$compressed_path" | grep -c "CREATE TABLE" || true)
    local original_tables
    original_tables=$(cat "$BACKUP_DIR/.table_count_${TIMESTAMP}")
    
    if [[ "$backed_up_tables" -eq "$original_tables" ]]; then
        log_success "Table count verification passed ($backed_up_tables tables)"
    else
        log_warning "Table count mismatch: backup has $backed_up_tables, database has $original_tables"
    fi
}

# Upload to cloud storage
upload_to_cloud() {
    if [[ -z "$S3_BUCKET" ]]; then
        log_info "Cloud storage not configured, skipping upload"
        return 0
    fi
    
    log_info "Uploading backup to S3..."
    
    local compressed_path="$BACKUP_DIR/$COMPRESSED_FILENAME"
    local s3_path="s3://$S3_BUCKET/database-backups/$(date +%Y)/$(date +%m)/$COMPRESSED_FILENAME"
    
    if AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
       aws s3 cp "$compressed_path" "$s3_path" --region "$S3_REGION" --storage-class STANDARD_IA; then
        log_success "Backup uploaded to: $s3_path"
        
        # Add metadata
        aws s3api put-object-tagging \
            --bucket "$S3_BUCKET" \
            --key "database-backups/$(date +%Y)/$(date +%m)/$COMPRESSED_FILENAME" \
            --tagging "TagSet=[{Key=Environment,Value=${NODE_ENV:-production}},{Key=Application,Value=cosnap-ai},{Key=BackupDate,Value=$(date +%Y-%m-%d)}]" \
            --region "$S3_REGION" 2>/dev/null || true
            
    else
        log_error "Failed to upload backup to S3"
        exit 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Local cleanup
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log_info "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "cosnap_backup_*.sql.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Clean up metadata files
    find "$BACKUP_DIR" -name ".db_size_*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name ".table_count_*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name ".backup_size_*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if [[ -n "$S3_BUCKET" ]]; then
        local cutoff_date
        cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        log_info "Cleaning up S3 backups older than $cutoff_date..."
        
        # List and delete old S3 objects
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "database-backups/" \
            --query "Contents[?LastModified<='$cutoff_date'].Key" \
            --output text \
            --region "$S3_REGION" 2>/dev/null | \
        while read -r key; do
            if [[ -n "$key" && "$key" != "None" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$key" --region "$S3_REGION"
                log_info "Deleted old S3 backup: $key"
            fi
        done
    fi
    
    log_success "Cleanup completed. Deleted $deleted_count local backups"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    # Webhook notification
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\"}" \
            &>/dev/null || log_warning "Failed to send webhook notification"
    fi
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local emoji="✅"
        local color="good"
        
        if [[ "$status" == "error" ]]; then
            emoji="❌"
            color="danger"
        elif [[ "$status" == "warning" ]]; then
            emoji="⚠️"
            color="warning"
        fi
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$emoji Database Backup - $message\",\"ts\":$(date +%s)}]}" \
            &>/dev/null || log_warning "Failed to send Slack notification"
    fi
}

# Main execution
main() {
    log_info "=== Starting Cosnap AI Database Backup ==="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Environment: ${NODE_ENV:-production}"
    
    # Pre-flight checks
    check_dependencies
    setup_backup_dir
    test_connection
    
    # Backup process
    get_db_info
    create_backup
    verify_backup
    upload_to_cloud
    cleanup_old_backups
    
    # Success notification
    local backup_size
    backup_size=$(cat "$BACKUP_DIR/.backup_size_${TIMESTAMP}" 2>/dev/null || echo "unknown")
    
    log_success "=== Backup completed successfully ==="
    log_info "Backup file: $COMPRESSED_FILENAME"
    log_info "Backup size: $backup_size"
    
    send_notifications "success" "Database backup completed successfully (Size: $backup_size)"
}

# Error handling
trap 'log_error "Backup script failed on line $LINENO"; send_notifications "error" "Database backup failed - check logs for details"; exit 1' ERR

# Run main function
main "$@"