#!/bin/bash
# Run seed SQL as APP_USER (testuser) against the XEPDB1 PDB
# gvenzl/oracle-xe runs .sh scripts as root, so we connect explicitly
echo "🔄 Seeding Oracle XEPDB1 as testuser..."
sqlplus testuser/TestPass123@localhost:1521/XEPDB1 @/container-entrypoint-initdb.d/01_seed.sql
echo "✅ Oracle seed complete"
