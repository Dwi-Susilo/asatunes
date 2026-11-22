#!/usr/bin/env bash
# Perbarui backend di VPS setelah ada perubahan di GitHub.
# Pemakaian (dari VPS):   sudo -u www-data -H bash /var/www/asatunes/deploy/deploy.sh
set -euo pipefail

APP_DIR=/var/www/asatunes
cd "$APP_DIR"

echo "== Ambil kode terbaru =="
git fetch origin
git pull --ff-only origin main

cd backend
echo "== Dependensi =="
composer install --no-dev --optimize-autoloader --no-interaction

echo "== Migrasi database =="
php artisan migrate --force

echo "== Cache konfigurasi dan rute =="
php artisan config:cache
php artisan route:cache

echo "Selesai: $(git rev-parse --short HEAD)"
