CREATE DATABASE robocup;

CREATE user 'robocup_root'@'%' identified BY 'a63W9bXZYhcwAT9B';

GRANT all ON robocup.* TO 'robocup_root'@'%'; 
