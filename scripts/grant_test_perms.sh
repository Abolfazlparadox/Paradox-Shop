#!/usr/bin/env bash
set -e
su - postgres -c "psql -p 5433 -c 'GRANT ALL ON DATABASE postgres TO shop_user; GRANT ALL ON SCHEMA public TO shop_user;'"
echo "Permissions on database postgres granted to shop_user."
