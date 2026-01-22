#!/usr/bin/env bash
# Volat pouze v adresáři robogames-frontend-app

# 1. Sestavení nové verze React aplikace
npm run build

# 2. Smaž starý build ve /var/www/html (ať tam nejsou zbytky)
sudo rm -rf /var/www/html/*

# 3. Zkopíruj nový build z React app (předpoklad: build byl vytvořen v /home/mainuser/robogames/robogames-frontend-app)
sudo cp -r ./build/* /var/www/html/

# 4. Nastav práva pro webserver
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
