package com.robogames.RoboCupMS.Repository;

import com.robogames.RoboCupMS.Entity.TeamRegistration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repozitar pro regstrace tymu
 */
@Repository
public interface TeamRegistrationRepository extends JpaRepository<TeamRegistration, Long> {

}
