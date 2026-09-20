#!/usr/bin/env bash
set -e

# Put trust rules at the very top of pg_hba.conf
cat << 'EOF' > /etc/postgresql/16/main/pg_hba.conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
host    all             all             0.0.0.0/0               trust
host    all             all             ::/0                    trust
EOF

service postgresql restart
service redis-server restart

echo "PostgreSQL pg_hba configured with trust at top and restarted!"
