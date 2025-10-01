package com.robogames.RoboCupMS.Repository;

import java.util.Optional;

import com.robogames.RoboCupMS.Entity.Robot;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repozitar pro soutezni roboty
 */
public interface RobotRepository extends JpaRepository<Robot, Long> {

    Optional<Robot> findByNumber(Long number);

    Optional<Robot> findByName(String name);

}
