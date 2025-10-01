package com.robogames.RoboCupMS.Repository;

import java.util.Optional;

import com.robogames.RoboCupMS.Entity.Playground;
import com.robogames.RoboCupMS.Entity.Robot;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repozitar pro soutezni hriste
 */
public interface PlaygroundRepository extends JpaRepository<Playground, Long> {

    Optional<Robot> findByNumber(Long number);

    Optional<Robot> findByName(String name);

}
