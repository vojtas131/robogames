package com.robogames.RoboCupMS.Repository;

import java.util.Optional;

import com.robogames.RoboCupMS.Business.Enum.EMatchState;
import com.robogames.RoboCupMS.Entity.MatchState;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repozitar pro stavy, ve kterych se muze zapas nachazet
 */
public interface MatchStateRepository extends JpaRepository<MatchState, Long> {

    Optional<MatchState> findByName(EMatchState name);

}
