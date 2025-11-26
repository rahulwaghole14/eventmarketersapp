# PostgreSQL Database Backup and Restore Guide

## Current Database Configuration
- **Host**: dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com
- **Database**: eventmarketers_db
- **User**: eventmarketers_user
- **Port**: 5432 (default PostgreSQL port)

## Backup Methods

### Method 1: Using pg_dump (Command Line)
```bash
# Create a backup
pg_dump "postgresql://eventmarketers_user:XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G@dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com/eventmarketers_db" > backup_$(date +%Y%m%d_%H%M%S).sql

# Create a compressed backup
pg_dump "postgresql://eventmarketers_user:XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G@dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com/eventmarketers_db" | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Method 2: Using Prisma (Application Level)
```bash
# Generate Prisma client and create schema backup
npx prisma db pull
npx prisma generate

# Export data using Prisma Studio or custom script
```

## Restore Methods

### Method 1: Using psql (Command Line)
```bash
# Restore from backup file
psql "postgresql://eventmarketers_user:XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G@dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com/eventmarketers_db" < backup_file.sql

# Restore from compressed backup
gunzip -c backup_file.sql.gz | psql "postgresql://eventmarketers_user:XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G@dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com/eventmarketers_db"
```

### Method 2: Using Prisma
```bash
# Reset database and apply schema
npx prisma db push --force-reset

# Seed data if you have seed files
npx prisma db seed
```

## Emergency Recovery Steps

### If Database is Completely Lost:
1. **Create New Database on Render**
   - Go to Render dashboard
   - Create new PostgreSQL database
   - Update DATABASE_URL in environment variables

2. **Restore Schema**
   ```bash
   npx prisma db push
   ```

3. **Restore Data**
   - Use backup file if available
   - Or restore from Render's automatic backups

### If You Need to Restore to a Specific Point in Time:
1. **Check Render Backups**
   - Go to database service in Render dashboard
   - Check "Backups" tab for available restore points
   - Choose the closest backup before the issue occurred

2. **Restore from Backup**
   - Click "Restore" on the desired backup
   - Wait for restoration to complete

## Best Practices

### Regular Backups
- Set up automated daily backups in Render
- Keep local backups of critical data
- Test restore procedures regularly

### Before Major Changes
- Always create a manual backup before:
  - Schema migrations
  - Data migrations
  - Major application updates
  - Bulk data operations

### Monitoring
- Monitor database health
- Set up alerts for database issues
- Keep backup retention policies

## Troubleshooting

### Common Issues
1. **Connection Timeout**: Check network connectivity and credentials
2. **Permission Denied**: Verify user permissions
3. **Schema Conflicts**: Use `--force-reset` with Prisma if needed
4. **Large Backup Files**: Use compression and consider incremental backups

### Recovery Time Objectives
- **RTO (Recovery Time Objective)**: 15-30 minutes for Render backups
- **RPO (Recovery Point Objective)**: Up to 24 hours (depending on backup frequency)

## Security Notes
- Never commit database credentials to version control
- Use environment variables for all database connections
- Regularly rotate database passwords
- Monitor database access logs
