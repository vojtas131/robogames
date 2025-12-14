# Robogames

This repository contains a frontend application for [IS RoboCupMS](https://github.com/0xMartin/RoboCupMS).

*TBD*

## Prerequisites

To run this web application, you need to install the following:
* Java - version 11 or higher
* Node.js
* MariaDB

## Building

```
git clone https://github.com/TMusilova/robogames.git --recursive
cd robogames
```

### Backend:
```
cd RoboCupMS
gradlew.bat build  // CMD
./gradle build      // PS, Bash
```
Build location: robogames/RoboCupMS/build/libs/

### Frontend:
```
cd robogames-frontend-app
npm install
npm run build
```

## Database setup

```
CREATE DATABASE robocup;
CREATE user 'robocup_root'@'%' identified BY '[identifier]';
GRANT all ON robocup.* TO 'robocup_root'@'%'; 
```
Backend creates all tables.

## Run

### Backend:
```
cd robogames/RoboCupMS
java -jar /build/libs/RoboCupMS-2.3.0.jar
```

### Frontend:
```
cd robogames/robogames-frontend-app
npm start
```

## Documentation

*TBD*

## License

*TBD*
