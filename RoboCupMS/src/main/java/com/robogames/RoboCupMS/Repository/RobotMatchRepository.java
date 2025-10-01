package com.robogames.RoboCupMS.Repository;

import com.robogames.RoboCupMS.Entity.RobotMatch;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repozitar pro zapasove skupiny
 */
public interface RobotMatchRepository extends JpaRepository<RobotMatch, Long> {

}
