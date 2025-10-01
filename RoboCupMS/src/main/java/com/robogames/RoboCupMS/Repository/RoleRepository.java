package com.robogames.RoboCupMS.Repository;

import java.util.Optional;

import com.robogames.RoboCupMS.Business.Enum.ERole;
import com.robogames.RoboCupMS.Entity.Role;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repozitar pro uzivatelske role
 */
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(ERole name);
    
}
