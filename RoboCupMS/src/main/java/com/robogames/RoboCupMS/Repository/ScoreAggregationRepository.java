package com.robogames.RoboCupMS.Repository;

import java.util.Optional;

import com.robogames.RoboCupMS.Business.Enum.EScoreAggregation;
import com.robogames.RoboCupMS.Entity.ScoreAggregation;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repozitar pro typ agregacni funkce skore
 */
public interface ScoreAggregationRepository extends JpaRepository<ScoreAggregation, Long> {

    Optional<ScoreAggregation> findByName(EScoreAggregation name);

}
