#!/usr/bin/env bash
# Penyiapan SATU KALI untuk VPS baru Ubuntu 24.04 (login sebagai root atau pakai sudo).
#
# Pemakaian:
#   sudo bash setup-server.sh nama-alamat-publik https://github.com/Dwi-Susilo/asatunes.git
#
# Yang dikerjakan: pasang Nginx, PHP, MariaDB, Node.js, yt-dlp, Composer, Certbot;
# ambil kode dari GitHub; buat database dan .env; migrasi; akun admin; cron scheduler.
set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="${2:-}"
APP_DIR=/var/www/asatunes
YTDLP_DIR=/opt/yt-dlp

if [[ $EUID -ne 0 ]]; then echo "Jalankan sebagai root: sudo bash $0 ..."; exit 1; fi
if [[ -z "$DOMAIN" || -z "$REPO_URL" ]]; then
  echo "Pemakaian: sudo bash $0 <domain-api> <url-repo-github>"; exit 1
fi
if ! grep -qi 'ubuntu' /etc/os-release; then
  echo "Skrip ini disusun untuk Ubuntu (diuji rancangannya untuk 24.04). Sistem lain: sesuaikan dulu."; exit 1
fi
if ! grep -q 'Ubuntu 24' /etc/os-release; then
  echo "PERHATIAN: sistem ini bukan Ubuntu 24.04. Versi PHP, Node.js, dan paket lain bisa berbeda;"
  echo "bila ada langkah gagal, kirim pesan galatnya. Lanjut dalam 5 detik (Ctrl+C untuk batal)..."
  sleep 5
fi

echo "== Pertanyaan (disimpan hanya di .env server) =="
read -rp  "Alamat frontend (contoh https://asatunes.vercel.app, tanpa garis miring akhir): " FRONTEND_URL
read -rp  "Email akun admin: " ADMIN_EMAIL
read -rsp "Kata sandi admin (min. 8 karakter, tanpa tanda petik tunggal '): " ADMIN_PASSWORD; echo
read -rp  "YOUTUBE_API_KEY (boleh kosong dulu, tapi Trending tidak jalan tanpa ini): " YOUTUBE_API_KEY
if [[ "$ADMIN_PASSWORD" == *"'"* || ${#ADMIN_PASSWORD} -lt 8 ]]; then
  echo "Kata sandi admin tidak valid."; exit 1
fi
if [[ "$FRONTEND_URL" == */ ]]; then FRONTEND_URL="${FRONTEND_URL%/}"; fi

export DEBIAN_FRONTEND=noninteractive
echo "== Memasang paket =="
apt-get update -y
apt-get install -y nginx mariadb-server git unzip curl ca-certificates ufw openssl \
  php-fpm php-cli php-mysql php-mbstring php-xml php-curl php-zip php-bcmath php-intl \
  certbot python3-certbot-nginx composer

PHPVER="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
echo "PHP terpasang: $PHPVER"

echo "== Node.js (dipakai yt-dlp, butuh versi 20 atau lebih baru) =="
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [[ "$(node_major)" -lt 20 ]]; then
  apt-get install -y nodejs npm || true
fi
if [[ "$(node_major)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js: $(node -v)"

echo "== yt-dlp (milik www-data supaya bisa memperbarui dirinya sendiri) =="
mkdir -p "$YTDLP_DIR"
curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o "$YTDLP_DIR/yt-dlp"
chmod 755 "$YTDLP_DIR/yt-dlp"
chown -R www-data:www-data "$YTDLP_DIR"
sudo -u www-data "$YTDLP_DIR/yt-dlp" --version

echo "== PHP-FPM: setiap pendengar memakai satu worker selama audio mengalir =="
sed -i 's/^pm.max_children = .*/pm.max_children = 20/; s/^pm.start_servers = .*/pm.start_servers = 4/; s/^pm.min_spare_servers = .*/pm.min_spare_servers = 2/; s/^pm.max_spare_servers = .*/pm.max_spare_servers = 6/' "/etc/php/$PHPVER/fpm/pool.d/www.conf"
systemctl restart "php$PHPVER-fpm"

echo "== Database =="
DB_PASS="$(openssl rand -hex 16)"
mysql -e "CREATE DATABASE IF NOT EXISTS asatunes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'asatunes'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "ALTER USER 'asatunes'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "GRANT ALL PRIVILEGES ON asatunes.* TO 'asatunes'@'localhost'; FLUSH PRIVILEGES;"

echo "== Kode dari GitHub =="
mkdir -p "$APP_DIR"
chown www-data:www-data "$APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  sudo -u www-data -H git clone "$REPO_URL" "$APP_DIR"
fi

echo "== .env produksi =="
cd "$APP_DIR/backend"
cat > .env <<ENVEOF
APP_NAME=ASATunes
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://$DOMAIN
APP_LOCALE=id
APP_FALLBACK_LOCALE=en
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=warning
BCRYPT_ROUNDS=12

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=asatunes
DB_USERNAME=asatunes
DB_PASSWORD=$DB_PASS

SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local

# Email reset password. Isi SMTP sungguhan (Brevo/Mailgun/Resend) lalu jalankan: php artisan config:cache
MAIL_MAILER=log
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="no-reply@$DOMAIN"
MAIL_FROM_NAME="ASATunes"

ADMIN_NAME="Administrator"
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD='$ADMIN_PASSWORD'

YTDLP_BINARY=$YTDLP_DIR/yt-dlp
YTDLP_JS_RUNTIME=node
YTDLP_TIMEOUT=30

FRONTEND_URL=$FRONTEND_URL
# API berjalan di belakang tunnel (Tailscale Funnel) di mesin yang sama
TRUSTED_PROXIES=127.0.0.1
YOUTUBE_API_KEY=$YOUTUBE_API_KEY
YOUTUBE_REGION=ID
ENVEOF
chown www-data:www-data .env
chmod 640 .env

echo "== Pasang dependensi, migrasi, admin =="
sudo -u www-data -H composer install --no-dev --optimize-autoloader --no-interaction
sudo -u www-data php artisan key:generate --force
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan db:seed --force
sudo -u www-data php artisan storage:link || true
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
chmod -R ug+rwX storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

echo "== Nginx =="
sed "s/__PHPVER__/$PHPVER/g" "$APP_DIR/deploy/nginx.conf.template" > /etc/nginx/sites-available/asatunes
ln -sf /etc/nginx/sites-available/asatunes /etc/nginx/sites-enabled/asatunes
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "== Cron scheduler (trending, pembaruan yt-dlp, hapus IP Pengunjung) =="
cat > /etc/cron.d/asatunes <<CRONEOF
* * * * * www-data cd $APP_DIR/backend && php artisan schedule:run >> /dev/null 2>&1
CRONEOF
chmod 644 /etc/cron.d/asatunes

echo "== Firewall =="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

cat <<DONE

Selesai. Langkah berikutnya (manual):
1. (Hanya bila memakai VPS dengan domain sendiri) Arahkan DNS: record A  $DOMAIN  ->  alamat IP server ini.
2. Buka server ke internet: ikuti deploy/README.md bagian "Membuka server ke internet"
   (Tailscale Funnel tanpa domain, atau sertifikat HTTPS biasa: sudo certbot --nginx -d $DOMAIN).
3. Uji:   curl https://ALAMAT-PUBLIK/up     dan   curl "https://ALAMAT-PUBLIK/api/v1/music/trending"
4. UJI PEMUTARAN satu lagu dari frontend. Kalau gagal "Sign in to confirm you're not a bot",
   IP VPS diblokir YouTube (lihat deploy/README.md bagian Masalah umum).
DONE
