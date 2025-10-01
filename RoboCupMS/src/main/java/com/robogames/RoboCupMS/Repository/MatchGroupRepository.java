package com.robogames.RoboCupMS.Repository;

import com.robogames.RoboCupMS.Entity.MatchGroup;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repozitar pro zapasove skupiny
 */
public interface MatchGroupRepository extends JpaRepository<MatchGroup, Long> {

}
