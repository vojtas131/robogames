package com.robogames.RoboCupMS.Repository;

import java.util.List;
import java.util.Optional;

import com.robogames.RoboCupMS.Entity.Team;
import com.robogames.RoboCupMS.Entity.UserRC;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repozitar pro tymy
 */
@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    Optional<Team> findByName(String name);

    List<Team> findAllByLeader(UserRC leader);

}
