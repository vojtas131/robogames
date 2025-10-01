#!/usr/bin/env bash

npx @openapitools/openapi-generator-cli generate -i auth_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/auth_api.html 

npx @openapitools/openapi-generator-cli generate -i competition_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/competition_api.html 

npx @openapitools/openapi-generator-cli generate -i discipline_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/discipline_api.html 

npx @openapitools/openapi-generator-cli generate -i match_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/match_api.html 

npx @openapitools/openapi-generator-cli generate -i match_group_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/match_group_api.html 

npx @openapitools/openapi-generator-cli generate -i playground_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/playground_api.html 

npx @openapitools/openapi-generator-cli generate -i robot_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/robot_api.html 

npx @openapitools/openapi-generator-cli generate -i team_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/team_api.html 

npx @openapitools/openapi-generator-cli generate -i team_registration_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/team_registration_api.html 

npx @openapitools/openapi-generator-cli generate -i user_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/user_api.html 

npx @openapitools/openapi-generator-cli generate -i order_management_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/order_management_api.html 

npx @openapitools/openapi-generator-cli generate -i competition_evaluation_api.yaml -g html2 -o ../../RoboCupMS-API-Dokumentace/ && mv ../../RoboCupMS-API-Dokumentace/index.html ../../RoboCupMS-API-Dokumentace/competition_evaluation_api.html 
