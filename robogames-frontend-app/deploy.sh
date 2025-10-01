#!/usr/bin/env bash

# 1. Smaž starý build ve /var/www/robogames (ať tam nejsou zbytky)
sudo rm -rf /var/www/robogames/*

# 2. Zkopíruj nový build z React app (předpoklad: build byl vytvořen v /home/mainuser/robogames/robogames-frontend-app)
sudo cp -r /home/mainuser/robogames/robogames-frontend-app/build/* /var/www/robogames/

# 3. Nastav práva pro webserver
sudo chown -R www-data:www-data /var/www/robogames
sudo chmod -R 755 /var/www/robogames
