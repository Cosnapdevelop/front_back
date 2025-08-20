#!/bin/bash

# Production Database Restore Script for Cosnap AI
# This script restores the PostgreSQL database from backups

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
LOG_FILE="${LOG_FILE:-$BACKUP_DIR/restore.log}"

# Database configuration
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-cosnap}"
DB_USER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-}"

# Restore configuration
BACKUP_FILE="${1:-}"
FORCE_RESTORE="${FORCE_RESTORE:-false}"
CREATE_BACKUP_BEFORE_RESTORE="${CREATE_BACKUP_BEFORE_RESTORE:-true}"

# S3/Cloud storage configuration
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_REGION="${BACKUP_S3_REGION:-us-east-1}"

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

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [BACKUP_FILE]

Restore Cosnap AI database from backup

Arguments:
    BACKUP_FILE    Path to backup file (local or S3 URL)
                   If not provided, will use the latest local backup

Options:
    --force        Force restore without confirmation
    --no-backup    Skip creating backup before restore

Environment Variables:
    FORCE_RESTORE                 Set to 'true' to skip confirmation
    CREATE_BACKUP_BEFORE_RESTORE  Set to 'false' to skip pre-restore backup
    BACKUP_DIR                    Directory containing backups
    BACKUP_S3_BUCKET             S3 bucket for remote backups

Examples:
    $0                                    # Restore from latest local backup
    $0 cosnap_backup_20231201_120000.sql.gz # Restore from specific local backup
    $0 s3://bucket/path/to/backup.sql.gz    # Restore from S3 backup
    $0 --force                              # Restore without confirmation

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_usage
                exit 0
                ;;
            --force)
                FORCE_RESTORE="true"
                shift
                ;;
            --no-backup)
                CREATE_BACKUP_BEFORE_RESTORE="false"
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [[ -z "$BACKUP_FILE" ]]; then
                    BACKUP_FILE="$1"
                else
                    log_error "Multiple backup files specified"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v psql &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v gzip &> /dev/null; then
        missing_deps+=("gzip")
    fi
    
    if [[ "$BACKUP_FILE" =~ ^s3:// ]] && ! command -v aws &> /dev/null; then
        missing_deps+=("awscli")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT 1;" &> /dev/null; then
        log_error "Cannot connect to database server"
        exit 1
    fi
    
    log_success "Database connection successful"
}

# Find latest backup if none specified
find_latest_backup() {
    if [[ -n "$BACKUP_FILE" ]]; then
        return 0
    fi
    
    log_info "Looking for latest backup..."
    
    # Check for latest backup marker
    if [[ -f "$BACKUP_DIR/.latest_backup" ]]; then
        BACKUP_FILE=$(cat "$BACKUP_DIR/.latest_backup")
        if [[ -f "$BACKUP_FILE" ]]; then
            log_info "Found latest backup: $(basename "$BACKUP_FILE")"
            return 0
        fi
    fi
    
    # Find most recent backup file
    local latest_backup
    latest_backup=$(find "$BACKUP_DIR" -name "cosnap_backup_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)
    
    if [[ -n "$latest_backup" ]]; then
        BACKUP_FILE="$latest_backup"
        log_info "Found latest backup: $(basename "$BACKUP_FILE")"
    else
        log_error "No backup files found in $BACKUP_DIR"
        exit 1
    fi
}

# Download backup from S3 if needed
download_backup() {
    if [[ ! "$BACKUP_FILE" =~ ^s3:// ]]; then
        return 0
    fi
    
    log_info "Downloading backup from S3..."
    
    local s3_path="$BACKUP_FILE"
    local filename
    filename=$(basename "$s3_path")
    local local_path="$BACKUP_DIR/$filename"
    
    if aws s3 cp "$s3_path" "$local_path" --region "$S3_REGION"; then
        BACKUP_FILE="$local_path"
        log_success "Backup downloaded: $local_path"
    else
        log_error "Failed to download backup from S3"
        exit 1
    fi
}

# Verify backup file
verify_backup() {
    log_info "Verifying backup file..."
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    # Check if file is compressed
    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        # Test gzip integrity
        if ! gzip -t "$BACKUP_FILE"; then
            log_error "Backup file is corrupted (gzip test failed)"
            exit 1
        fi
        
        # Check content
        if ! zcat "$BACKUP_FILE" | head -20 | grep -q "PostgreSQL database dump"; then
            log_error "Backup file does not appear to be a valid PostgreSQL dump"
            exit 1
        fi
    else
        # Check uncompressed file
        if ! head -20 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"; then
            log_error "Backup file does not appear to be a valid PostgreSQL dump"
            exit 1
        fi
    fi
    
    local file_size
    file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup file verified (Size: $file_size)"
}

# Get backup information
get_backup_info() {
    log_info "Analyzing backup file..."
    
    local cat_cmd="cat"
    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        cat_cmd="zcat"
    fi
    
    # Extract backup timestamp and other info
    local backup_date
    backup_date=$($cat_cmd "$BACKUP_FILE" | grep "Dumped from database version" | head -1 || echo "Unknown")
    
    local table_count
    table_count=$($cat_cmd "$BACKUP_FILE" | grep -c "CREATE TABLE" || echo "0")
    
    log_info "Backup information:"
    log_info "  File: $(basename "$BACKUP_FILE")"
    log_info "  Tables: $table_count"
    log_info "  Database version: $backup_date"
}

# Create backup before restore
create_pre_restore_backup() {
    if [[ "$CREATE_BACKUP_BEFORE_RESTORE" != "true" ]]; then
        log_info "Skipping pre-restore backup"
        return 0
    fi
    
    log_info "Creating backup before restore..."
    
    local timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_filename="pre_restore_backup_${timestamp}.sql.gz"
    local backup_path="$BACKUP_DIR/$backup_filename"
    
    # Check if database exists
    if PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        
        if PGPASSWORD="$PGPASSWORD" pg_dump \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$DB_NAME" \
            --format=plain \
            --no-owner \
            --no-privileges \
            --file=/dev/stdout | gzip > "$backup_path"; then
            
            log_success "Pre-restore backup created: $backup_filename"
        else
            log_error "Failed to create pre-restore backup"
            exit 1
        fi
    else
        log_info "Database does not exist, skipping pre-restore backup"
    fi
}

# Drop existing database
drop_database() {
    log_info "Dropping existing database..."
    
    # Check if database exists
    if PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        
        # Terminate existing connections
        PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '$DB_NAME'
            AND pid <> pg_backend_pid();
        " &>/dev/null || true
        
        # Drop database
        if PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "DROP DATABASE \"$DB_NAME\";"; then
            log_success "Database dropped successfully"
        else
            log_error "Failed to drop database"
            exit 1
        fi
    else
        log_info "Database does not exist"
    fi
}

# Create new database
create_database() {
    log_info "Creating new database..."
    
    if PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE \"$DB_NAME\";"; then
        log_success "Database created successfully"
    else
        log_error "Failed to create database"
        exit 1
    fi
}

# Restore database
restore_database() {
    log_info "Restoring database from backup..."
    
    local cat_cmd="cat"
    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        cat_cmd="zcat"
    fi
    
    # Restore with error handling
    if $cat_cmd "$BACKUP_FILE" | PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1; then
        log_success "Database restored successfully"
    else
        log_error "Database restore failed"
        exit 1
    fi
}

# Verify restore
verify_restore() {
    log_info "Verifying database restore..."
    
    # Check database connection
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        log_error "Cannot connect to restored database"
        exit 1
    fi
    
    # Count tables
    local table_count
    table_count=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    
    # Get database size
    local db_size
    db_size=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
    
    log_success "Database verification completed:"
    log_info "  Tables: $table_count"
    log_info "  Size: $db_size"
    
    # Run basic integrity checks
    log_info "Running integrity checks..."
    
    # Check for critical tables (adjust based on your schema)
    local critical_tables=("User" "Task" "Effect" "Payment")
    for table in "${critical_tables[@]}"; do
        if PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM \"$table\" LIMIT 1;" &>/dev/null; then
            log_success "  Table '$table' exists and accessible"
        else
            log_warning "  Table '$table' may be missing or inaccessible"
        fi
    done
}

# Confirm restore action
confirm_restore() {
    if [[ "$FORCE_RESTORE" == "true" ]]; then
        return 0
    fi
    
    echo
    log_warning "=== DATABASE RESTORE CONFIRMATION ==="
    log_warning "This operation will COMPLETELY REPLACE the existing database!"
    log_warning "Database: $DB_NAME"
    log_warning "Host: $DB_HOST:$DB_PORT"
    log_warning "Backup file: $(basename "$BACKUP_FILE")"
    echo
    
    read -p "Are you sure you want to proceed? Type 'yes' to continue: " -r
    echo
    
    if [[ ! $REPLY =~ ^yes$ ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
}

# Main execution
main() {
    log_info "=== Starting Cosnap AI Database Restore ==="
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Parse arguments
    parse_arguments "$@"
    
    # Pre-flight checks
    check_dependencies
    test_connection
    find_latest_backup
    download_backup
    verify_backup
    get_backup_info
    
    # Confirmation
    confirm_restore
    
    # Backup current database
    create_pre_restore_backup
    
    # Restore process
    drop_database
    create_database
    restore_database
    verify_restore
    
    log_success "=== Database restore completed successfully ==="
    log_info "Database: $DB_NAME"
    log_info "Backup file: $(basename "$BACKUP_FILE")"
}

# Error handling
trap 'log_error "Restore script failed on line $LINENO"; exit 1' ERR

# Check for help
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"