#!/usr/bin/env bash
set -e

# Configure port 5433 to avoid collision with Windows PostgreSQL 18
sed -i "s/port = 5432/port = 5433/" /etc/postgresql/16/main/postgresql.conf
echo "listen_addresses = '*'" >> /etc/postgresql/16/main/postgresql.conf
echo "host all all 0.0.0.0/0 trust" >> /etc/postgresql/16/main/pg_hba.conf
echo "host all all ::0/0 trust" >> /etc/postgresql/16/main/pg_hba.conf
echo "local all all trust" >> /etc/postgresql/16/main/pg_hba.conf

service postgresql restart
service redis-server restart

# Create user and db if not exist
su - postgres -c "psql -p 5433 -tc \"SELECT 1 FROM pg_roles WHERE rolname='shop_user'\" | grep -q 1 || psql -p 5433 -c \"CREATE USER shop_user WITH PASSWORD 'shop_password_secure_123' SUPERUSER CREATEDB;\""
su - postgres -c "psql -p 5433 -tc \"SELECT 1 FROM pg_database WHERE datname='shop_db'\" | grep -q 1 || psql -p 5433 -c \"CREATE DATABASE shop_db OWNER shop_user;\""

echo "WSL PostgreSQL (port 5433) and Redis (port 6379) are ready!"
